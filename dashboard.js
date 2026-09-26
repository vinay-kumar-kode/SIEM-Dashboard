// ======================================
// Sentinel SIEM - Dashboard
// dashboard.js
// ======================================
//
// Everything on this page comes from GET /api/dashboard, which already
// returns the card totals, the severity rollup, the 24 hour timeline and the
// two most-recent-activity lists in a single round trip.
//
// Chart.js is loaded from the CDN by dashboard.html. If it fails to load
// (offline) the canvases simply stay blank rather than throwing.

let timelineChart = null;

let severityChart = null;

// The dashboard is the one page that keeps polling, because it is the page
// an operator leaves open on a wall display. Overridden by the SOC setting.
let refreshTimer = null;

let refreshMs = 10000;

// ---------- Charts ----------

const SEVERITY_COLOURS = {

    Critical: "#f85149",

    High: "#ffa657",

    Medium: "#e3b341",

    Low: "#79c0ff"

};

const buildTimelineChart = (timeline) => {

    const canvas = document.getElementById("timelineChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const config = {
        type: "line",
        data: {
            labels: timeline.map(bucket =>
                new Date(bucket.time).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                })
            ),
            datasets: [{
                label: "Events",
                data: timeline.map(bucket => bucket.count),
                borderColor: "#00d8ff",
                backgroundColor: "rgba(0,216,255,.14)",
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { color: "rgba(240,246,252,.06)" },
                    ticks: { color: "#8b949e", maxTicksLimit: 12 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(240,246,252,.06)" },
                    ticks: { color: "#8b949e", precision: 0 }
                }
            }
        }
    };

    if (timelineChart) {
        timelineChart.data = config.data;
        timelineChart.update();
        return;
    }

    timelineChart = new Chart(canvas, config);

};

const buildSeverityChart = (distribution) => {

    const canvas = document.getElementById("severityChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const config = {
        type: "doughnut",
        data: {
            labels: distribution.map(row => row.severity),
            datasets: [{
                data: distribution.map(row => row.count),
                backgroundColor: distribution.map(row => SEVERITY_COLOURS[row.severity] || "#8b949e"),
                borderColor: "#161b22",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#c9d1d9", boxWidth: 12, padding: 14 }
                }
            }
        }
    };

    if (severityChart) {
        severityChart.data = config.data;
        severityChart.update();
        return;
    }

    severityChart = new Chart(canvas, config);

};

// ---------- Recent activity ----------

const renderRecentAlerts = (alerts) => {

    const body = document.getElementById("alertTable");

    if (!body) {
        return;
    }

    if (!alerts.length) {
        body.innerHTML = `<tr><td colspan="4" class="empty-state">No alerts recorded yet</td></tr>`;
        return;
    }

    body.innerHTML = alerts.map(alert => `
        <tr class="row-fade">
            <td>${escapeHtml(formatRelative(alert.timestamp))}</td>
            <td><span class="badge badge-${severityClass(alert.severity)}">${escapeHtml(alert.severity)}</span></td>
            <td>${escapeHtml(alert.attackType)}</td>
            <td><span class="badge badge-${escapeHtml(String(alert.status).toLowerCase())}">${escapeHtml(alert.status)}</span></td>
        </tr>
    `).join("");

};

const renderRecentLogs = (logs) => {

    const body = document.getElementById("logTable");

    if (!body) {
        return;
    }

    if (!logs.length) {
        body.innerHTML = `        <tr><td colspan="4" class="empty-state">No logs recorded yet</td></tr>`;
        return;
    }

    body.innerHTML = logs.map(log => `
        <tr class="row-fade">
            <td>${escapeHtml(formatRelative(log.timestamp))}</td>
            <td>${escapeHtml(log.ipAddress || "-")}</td>
            <td>${escapeHtml(log.eventType)}</td>
            <td><span class="badge badge-${severityClass(log.severity)}">${escapeHtml(log.severity)}</span></td>
        </tr>
    `).join("");

};

// ---------- Cards ----------

const renderCards = (stats) => {

    setText("totalLogs", stats.totalLogs);
    setText("activeAlerts", stats.activeAlerts);
    setText("criticalAlerts", stats.criticalAlerts);
    setText("openIncidents", stats.openIncidents);
    setText("onlineHosts", stats.onlineHosts);
    setText("threatScore", `${stats.threatScore}%`);

    // The header chip counts what still needs a human
    const badge = document.querySelector(".notification .count");

    if (badge) {
        badge.textContent = stats.activeAlerts;
        badge.style.display = stats.activeAlerts ? "" : "none";
    }

};

// ---------- Load ----------

const refreshDashboard = async () => {

    try {

        const data = await apiGet("/dashboard");

        renderCards(data.statistics);
        renderRecentAlerts(data.recentAlerts || []);
        renderRecentLogs(data.recentLogs || []);

        buildTimelineChart(data.timeline || []);
        buildSeverityChart(data.severityDistribution || []);

    } catch (error) {

        // apiFetch already redirects on a 401, so reaching here means the
        // server is unreachable. Retrying on the next tick is the right
        // response: a wall display should recover on its own.
        console.error(error);

    }

};

// Re-reads the SOC refresh interval. Falls back to 10s if the settings read
// fails, since a missing setting should not stop the dashboard updating.
const applyRefreshInterval = async () => {

    try {

        const data = await apiGet("/settings");

        const ms = Number(data.data && data.data.refreshInterval);

        if (Number.isFinite(ms) && ms >= 2000) {
            refreshMs = ms;
        }

    } catch (error) {

        console.error(error);

    }

};

const scheduleRefresh = () => {

    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(refreshDashboard, refreshMs);

};

// ---------- Global search ----------

// The header search hands the term to the logs page rather than filtering
// the dashboard, which only ever shows the five most recent rows.
const initGlobalSearch = () => {

    const input = document.getElementById("globalSearch");

    if (!input) {
        return;
    }

    input.addEventListener("keydown", event => {

        if (event.key !== "Enter") {
            return;
        }

        const term = input.value.trim();

        if (!term) {
            return;
        }

        window.location.href = `logs.html${buildQuery({ search: term })}`;

    });

};

// ---------- Start ----------

const initDashboard = async () => {

    if (!initPage()) {
        return;
    }

    initGlobalSearch();

    await applyRefreshInterval();

    await refreshDashboard();

    scheduleRefresh();

    // The current page is marked in the sidebar by the shared markup, so
    // nothing to do here.

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
} else {
    initDashboard();
}
