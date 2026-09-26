// ======================================
// Sentinel SIEM - Incident Management
// incidents.js
// ======================================
//
// Rows come from GET /api/incidents. Assignment and closure go through the
// real PATCH endpoints, so the incident lifecycle is persisted rather than
// reset on every reload.

const state = {

    page: 1,

    limit: 25,

    status: "ALL",

    priority: "ALL",

    search: "",

    rows: []
};

const busy = new Set();

// Analysts available to assign. Read from the user list so a newly created
// account is assignable without touching this file.
let analysts = [];

// ---------- Render ----------

const renderRows = (rows) => {

    const body = document.getElementById("incidentTable");

    if (!body) {
        return;
    }

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <strong>No matching incidents</strong>
                    Try a different status or clear the search box.
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = rows.map(incident => {

        const locked = busy.has(incident._id);
        const closed = incident.status === "Closed";

        return `
        <tr class="row-fade">
            <td class="mono">${escapeHtml(incident.incidentId)}</td>
            <td>${escapeHtml(formatDateTime(incident.timestamp))}</td>
            <td><span class="badge badge-${severityClass(incident.priority)}">${escapeHtml(incident.priority)}</span></td>
            <td class="left" title="${escapeHtml(incident.description || "")}">${escapeHtml(incident.title)}</td>
            <td>${escapeHtml(incident.assignedTo || "Unassigned")}</td>
            <td><span class="badge badge-${String(incident.status || "").toLowerCase().replace(/\s+/g, "-")}">${escapeHtml(incident.status)}</span></td>
            <td class="actions">
                ${closed
                    ? `<span class="muted">${escapeHtml(formatRelative(incident.closedAt))}</span>`
                    : `
                    <button class="btn btn-sm btn-ghost" data-assign="${incident._id}" ${locked ? "disabled" : ""}>
                        ${incident.assignedTo && incident.assignedTo !== "Unassigned" ? "Reassign" : "Assign"}
                    </button>
                    <button class="btn btn-sm btn-ok" data-close="${incident._id}" ${locked ? "disabled" : ""}>
                        Close
                    </button>
                `}
            </td>
        </tr>
    `;

    }).join("");

    body.querySelectorAll("[data-assign]").forEach(button => {
        button.addEventListener("click", () => openAssignModal(button.dataset.assign));
    });

    body.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", () => closeIncident(button.dataset.close));
    });

};

const renderSummary = (stats) => {

    setText("totalIncidents", stats.total);
    setText("openIncidents", stats.open);
    setText("progressIncidents", stats.inProgress);
    setText("closedIncidents", stats.closed);
    setText("unassignedCount", stats.unassigned);

};

// ---------- Load ----------

const load = async () => {

    try {

        const query = buildQuery({
            page: state.page,
            limit: state.limit,
            status: state.status,
            priority: state.priority,
            search: state.search
        });

        const data = await apiGet(`/incidents${query}`);

        if (data.page > data.pages) {
            state.page = data.pages;
            return load();
        }

        state.rows = data.data;

        renderRows(data.data);

        renderPagination("incidentPagination", data, page => {
            state.page = page;
            load();
        });

    } catch (error) {

        console.error(error);
        toast(error.message || "Could not load incidents", "error");

    }

};

const loadStats = async () => {

    try {

        const data = await apiGet("/incidents/stats");

        renderSummary(data.statistics);

    } catch (error) {

        console.error(error);

    }

};

// Assigning needs a list of who exists. Failure here is not fatal: the
// incident list still works, the analyst just types a name instead.
const loadAnalysts = async () => {

    try {

        const data = await apiGet("/users");

        analysts = data.data
            .filter(user => user.active)
            .map(user => ({ id: user._id, name: user.displayName, role: user.role }));

        const select = document.getElementById("assignSelect");

        if (select) {
            select.innerHTML = analysts
                .map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)} (${escapeHtml(a.role)})</option>`)
                .join("");
        }

    } catch (error) {

        console.error(error);

    }

};

// ---------- Actions ----------

let assigningId = null;

const openAssignModal = (id) => {

    assigningId = id;

    const incident = state.rows.find(row => row._id === id);

    const title = document.getElementById("assignIncidentTitle");

    if (title && incident) {
        title.textContent = `${incident.incidentId} - ${incident.title}`;
    }

    const backdrop = document.getElementById("assignModal");

    if (backdrop) {
        backdrop.classList.add("open");
    }

};

const closeModal = () => {

    assigningId = null;

    const backdrop = document.getElementById("assignModal");

    if (backdrop) {
        backdrop.classList.remove("open");
    }

};

const submitAssign = async () => {

    if (!assigningId) {
        return;
    }

    const select = document.getElementById("assignSelect");
    const value = select ? select.value.trim() : "";

    if (!value) {
        toast("Pick an analyst", "warn");
        return;
    }

    busy.add(assigningId);

    try {

        await apiPatch(`/incidents/${assigningId}/assign`, { assignedTo: value });

        toast(`Assigned to ${value}`, "success");

        closeModal();
        await load();
        await loadStats();

    } catch (error) {

        toast(error.message || "Assignment failed", "error");

    } finally {

        busy.delete(assigningId);

    }

};

const closeIncident = async (id) => {

    const resolution = prompt("Resolution summary (optional):", "Containment verified, no further action required.");

    // prompt() returns null on Cancel and "" on OK-with-empty. Only an
    // explicit cancel should abort.
    if (resolution === null) {
        return;
    }

    busy.add(id);

    try {

        await apiPatch(`/incidents/${id}/close`, { resolution });

        toast("Incident closed", "success");

        await load();
        await loadStats();

    } catch (error) {

        toast(error.message || "Could not close incident", "error");

    } finally {

        busy.delete(id);

    }

};

// ---------- Controls ----------

const initControls = () => {

    const search = document.getElementById("searchIncident");

    search.addEventListener("input", debounce(() => {
        state.search = search.value.trim();
        state.page = 1;
        load();
    }, 350));

    const bindSelect = (id, key) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.addEventListener("change", () => {
            state[key] = select.value;
            state.page = 1;
            load();
        });
    };

    bindSelect("statusFilter", "status");
    bindSelect("priorityFilter", "priority");

    const limit = document.getElementById("limitSelect");
    if (limit) {
        limit.addEventListener("change", () => {
            state.limit = parseInt(limit.value, 10);
            state.page = 1;
            load();
        });
    }

    document.getElementById("refreshBtn").addEventListener("click", () => {
        load();
        loadStats();
    });

    const confirmBtn = document.getElementById("assignConfirm");

    if (confirmBtn) {
        confirmBtn.addEventListener("click", submitAssign);
    }

    const cancelBtn = document.getElementById("assignCancel");

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeModal);
    }

    const backdrop = document.getElementById("assignModal");

    if (backdrop) {
        // Click the dimmed area to dismiss, but not the dialog itself.
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                closeModal();
            }
        });
    }

};

// ---------- Start ----------

const initIncidents = async () => {

    if (!initPage()) {
        return;
    }

    initControls();

    await loadAnalysts();
    await load();
    await loadStats();

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIncidents);
} else {
    initIncidents();
}
