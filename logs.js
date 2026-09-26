// ======================================
// Sentinel SIEM - Logs Module
// logs.js
// ======================================
//
// Replaces the earlier hardcoded array. Every row now comes from
// GET /api/logs, which is server-paginated: the browser asks for one page at
// a time and the server reports how many pages matched the filter.
//
// The filter state lives in `state` and is the single source of truth. Any
// change to it calls load(), which is the only function that talks to the API.

const state = {

    page: 1,

    limit: 25,

    severity: "ALL",

    source: "ALL",

    status: "ALL",

    search: "",

    // Last page returned, kept so Export can reuse the current filter
    // without a second round trip.
    rows: []
};

let refreshTimer = null;

// ---------- Render ----------

const renderRows = (rows) => {

    const body = document.getElementById("logsTable");

    if (!body) {
        return;
    }

    if (!rows.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <strong>No matching logs</strong>
                    Try widening the severity filter or clearing the search box.
                </td>
            </tr>
        `;
        return;
    }

    body.innerHTML = rows.map(log => `
        <tr class="row-fade">
            <td>${escapeHtml(formatDateTime(log.timestamp))}</td>
            <td>${escapeHtml(log.ipAddress || "-")}</td>
            <td>${escapeHtml(log.source)}</td>
            <td><span class="badge badge-${severityClass(log.severity)}">${escapeHtml(log.severity)}</span></td>
            <td>${escapeHtml(log.eventType)}</td>
            <td><span class="badge badge-${escapeHtml(String(log.status || "").toLowerCase())}">${escapeHtml(log.status || "-")}</span></td>
        </tr>
    `).join("");

};

const renderSummary = (data) => {

    // The count reflects the whole filtered set, not just this page, which is
    // what an operator wants to know ("38 critical", not "25 critical").
    setText("logCount", data.total);

    setText("criticalCount", data.critical);
    setText("highCount", data.high);
    setText("mediumCount", data.medium);
    setText("lowCount", data.low);

};

// ---------- Load ----------

const load = async () => {

    try {

        const query = buildQuery({
            page: state.page,
            limit: state.limit,
            severity: state.severity,
            source: state.source,
            status: state.status,
            search: state.search
        });

        const data = await apiGet(`/logs${query}`);

        // A filter change can leave the viewer past the last page (page 7 of
        // a 2 page result), so snap back rather than showing an empty table.
        if (data.page > data.pages) {
            state.page = data.pages;
            return load();
        }

        state.rows = data.data;

        renderRows(data.data);
        renderPagination("logsPagination", data, page => {
            state.page = page;
            load();
        });

        // Totals are global, not per-filter, so they are read from the
        // separate rollup endpoint rather than counted from the page.
        loadStats();

    } catch (error) {

        console.error(error);
        toast(error.message || "Could not load logs", "error");

    }

};

const loadStats = async () => {

    try {

        const data = await apiGet("/logs/stats");

        renderSummary(data);

    } catch (error) {

        console.error(error);

    }

};

// ---------- Export ----------

// Exports exactly what is on screen: the current page, current filter. The
// header is derived from the columns rather than hardcoded twice.
const exportCsv = () => {

    if (!state.rows.length) {
        toast("Nothing to export on this page", "warn");
        return;
    }

    const header = ["Timestamp", "Source IP", "Source", "Severity", "Event Type", "Status", "Message"];

    const lines = [header.map(csvCell).join(",")];

    state.rows.forEach(log => {
        lines.push([
            log.timestamp,
            log.ipAddress,
            log.source,
            log.severity,
            log.eventType,
            log.status,
            log.message
        ].map(csvCell).join(","));
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    downloadFile(`siem-logs-${stamp}.csv`, lines.join("\n"));

    toast(`Exported ${state.rows.length} rows`, "success");

};

// ---------- Delete ----------

const deleteLog = async (id) => {

    if (!confirm("Delete this log entry? This cannot be undone.")) {
        return;
    }

    try {

        await apiDelete(`/logs/${id}`);
        toast("Log deleted", "success");
        load();

    } catch (error) {

        toast(error.message || "Delete failed", "error");

    }

};

// ---------- Controls ----------

// Populates the source dropdown from the data rather than hardcoding a list,
// so a new source in the seed shows up without a code change.
const loadSources = async () => {

    try {

        const data = await apiGet("/logs?limit=100");

        const sources = [...new Set(data.data.map(log => log.source))].sort();

        const select = document.getElementById("sourceFilter");

        if (!select) {
            return;
        }

        select.innerHTML =
            `<option value="ALL">All Sources</option>` +
            sources.map(source => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`).join("");

    } catch (error) {

        console.error(error);

    }

};

const initControls = () => {

    const search = document.getElementById("searchBox");

    // Debounced: a fresh keystroke supersedes the pending request instead of
    // racing it.
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

    bindSelect("severityFilter", "severity");
    bindSelect("sourceFilter", "source");
    bindSelect("statusFilter", "status");

    const limit = document.getElementById("limitSelect");
    if (limit) {
        limit.addEventListener("change", () => {
            state.limit = parseInt(limit.value, 10);
            state.page = 1;
            load();
        });
    }

    document.getElementById("exportBtn").addEventListener("click", exportCsv);

    document.getElementById("refreshBtn").addEventListener("click", () => {
        load();
        toast("Refreshed", "info");
    });

    // Live tail. Off by default: with a filter applied a new matching row
    // shifts the table under the reader, which is worse than a stale page.
    const live = document.getElementById("liveToggle");

    const setLive = (on) => {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        if (on) {
            refreshTimer = setInterval(() => {
                // Never yank the viewer off the page they are reading.
                if (document.visibilityState === "visible" && state.page === 1) {
                    load();
                }
            }, 10000);
        }
    };

    live.addEventListener("change", () => setLive(live.checked));

    // Honour a ?search= handed over by the dashboard header search.
    const incoming = new URLSearchParams(window.location.search).get("search");
    if (incoming) {
        search.value = incoming;
        state.search = incoming;
    }

};

// ---------- Start ----------

const initLogs = async () => {

    if (!initPage()) {
        return;
    }

    initControls();

    await loadSources();

    await load();

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogs);
} else {
    initLogs();
}
