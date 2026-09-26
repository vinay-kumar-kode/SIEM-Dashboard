// ======================================
// Sentinel SIEM - Alerts Module
// alerts.js
// ======================================
//
// Rows come from GET /api/alerts. The acknowledge and resolve buttons call
// the real PATCH endpoints, so an analyst's decision survives a reload and is
// visible to everyone else looking at the same collection.

const state = {

    page: 1,

    limit: 25,

    severity: "ALL",

    status: "ALL",

    search: "",

    rows: []
};

// Guards against a double click firing two PATCHes for the same alert.
const busy = new Set();

// ---------- Render ----------

const statusClass = (value) => {

    // "In Progress" would become "in progress" with a naive lowercase, which
    // matches no badge rule.
    return String(value || "").toLowerCase().replace(/\s+/g, "-");

};

const renderRows = (rows) => {

    const body = document.getElementById("alertTable");

    if (!body) {
        return;
    }

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <strong>No matching alerts</strong>
                    Try a different severity or clear the search box.
                </td>
            </tr>
        `;
        return;
    }

    const me = getUser();

    body.innerHTML = rows.map(alert => {

        const locked = busy.has(alert._id);

        // Acknowledging or resolving is only meaningful from Open or
        // Acknowledged, so the buttons disappear once an alert is Resolved.
        const actionable = alert.status !== "Resolved";

        return `
        <tr class="row-fade">
            <td>${escapeHtml(formatDateTime(alert.timestamp))}</td>
            <td><span class="badge badge-${severityClass(alert.severity)}">${escapeHtml(alert.severity)}</span></td>
            <td>${escapeHtml(alert.sourceIp)}</td>
            <td title="${escapeHtml(alert.description || "")}">${escapeHtml(alert.attackType)}</td>
            <td><span class="badge badge-${statusClass(alert.status)}">${escapeHtml(alert.status)}</span></td>
            <td class="actions">
                ${actionable ? `
                    <button class="btn btn-sm btn-warn" data-ack="${alert._id}" ${locked ? "disabled" : ""}>
                        ${alert.status === "Acknowledged" ? "Ack'd" : "Acknowledge"}
                    </button>
                    <button class="btn btn-sm btn-ok" data-resolve="${alert._id}" ${locked ? "disabled" : ""}>
                        Resolve
                    </button>
                ` : `<span class="muted">-</span>`}
            </td>
        </tr>
    `;

    }).join("");

    // Delegated rather than inline onclick: the ids are Mongo ObjectIds and
    // inlining them into a handler string would be avoidable injection.
    body.querySelectorAll("[data-ack]").forEach(button => {
        button.addEventListener("click", () => act(button.dataset.ack, "acknowledge"));
    });

    body.querySelectorAll("[data-resolve]").forEach(button => {
        button.addEventListener("click", () => act(button.dataset.resolve, "resolve"));
    });

};

const renderSummary = (stats) => {

    setText("totalAlerts", stats.total);
    setText("criticalCount", stats.critical);
    setText("openCount", stats.open);
    setText("acknowledgedCount", stats.acknowledged);
    setText("resolvedCount", stats.resolved);

};

// ---------- Load ----------

const load = async () => {

    try {

        const query = buildQuery({
            page: state.page,
            limit: state.limit,
            severity: state.severity,
            status: state.status,
            search: state.search
        });

        const data = await apiGet(`/alerts${query}`);

        if (data.page > data.pages) {
            state.page = data.pages;
            return load();
        }

        state.rows = data.data;

        renderRows(data.data);

        renderPagination("alertPagination", data, page => {
            state.page = page;
            load();
        });

    } catch (error) {

        console.error(error);
        toast(error.message || "Could not load alerts", "error");

    }

};

const loadStats = async () => {

    try {

        const data = await apiGet("/alerts/stats");

        renderSummary(data.statistics);

    } catch (error) {

        console.error(error);

    }

};

// ---------- Actions ----------

const act = async (id, action) => {

    if (busy.has(id)) {
        return;
    }

    busy.add(id);

    const user = getUser();

    try {

        // The controller stamps the analyst name from the request body; the
        // session copy is the honest answer for who is clicking.
        await apiPatch(`/alerts/${id}/${action}`, { analyst: (user && user.displayName) || "unknown" });

        toast(action === "acknowledge" ? "Alert acknowledged" : "Alert resolved", "success");

        await load();
        await loadStats();

    } catch (error) {

        toast(error.message || "Action failed", "error");

    } finally {

        busy.delete(id);

    }

};

const escalate = async (id) => {

    try {

        await apiPost("/incidents", { priority: "High", title: "Escalated from alert", alerts: [id] });

        toast("Incident created from alert", "success");

    } catch (error) {

        toast(error.message || "Could not create incident", "error");

    }

};

// ---------- Controls ----------

const initControls = () => {

    const search = document.getElementById("searchAlert");

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

    bindSelect("priorityFilter", "severity");
    bindSelect("statusFilter", "status");

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

};

// ---------- Start ----------

const initAlerts = async () => {

    if (!initPage()) {
        return;
    }

    initControls();

    await load();
    await loadStats();

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAlerts);
} else {
    initAlerts();
}
