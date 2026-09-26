// ======================================
// Sentinel SIEM - Reports Module
// reports.js
// ======================================
//
// Replaces the hardcoded counters and static chart data. The summary and the
// severity doughnut come from GET /api/dashboard; the 7 day trend is derived
// client side from the same 24 hour timeline plus nothing else, so it is
// honest about its range rather than showing invented weekly numbers.

let severityChart = null;

let trendChart = null;

let report = null;

let refreshTimer = null;

const SEVERITY_COLOURS = {

    Critical: "#ef4444",

    High: "#fb923c",

    Medium: "#facc15",

    Low: "#22c55e"
};

// ---------- Charts ----------

const buildSeverityChart = (distribution) => {

    const canvas = document.getElementById("pieChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const config = {
        type: "doughnut",
        data: {
            labels: distribution.map(row => row.severity),
            datasets: [{
                data: distribution.map(row => row.count),
                backgroundColor: distribution.map(row => SEVERITY_COLOURS[row.severity] || "#64748b"),
                borderColor: "#111827",
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "60%",
            plugins: {
                legend: {
                    position: "bottom",
                    labels: { color: "#94a3b8", boxWidth: 12, padding: 14 }
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

// Hourly buckets, oldest first, labelled every third hour so the axis stays
// readable across 24 points.
const buildTrendChart = (timeline) => {

    const canvas = document.getElementById("weeklyChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const config = {
        type: "bar",
        data: {
            labels: timeline.map((bucket, index) => {
                if (index % 3 !== 0) {
                    return "";
                }
                return new Date(bucket.time).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false
                });
            }),
            datasets: [{
                label: "Events per hour",
                data: timeline.map(bucket => bucket.count),
                backgroundColor: "rgba(56,189,248,.55)",
                borderColor: "#38bdf8",
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#64748b" } },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(148,163,184,.12)" },
                    ticks: { color: "#64748b", precision: 0 }
                }
            }
        }
    };

    if (trendChart) {
        trendChart.data = config.data;
        trendChart.update();
        return;
    }

    trendChart = new Chart(canvas, config);

};

// ---------- Summary ----------

const renderSummary = (stats) => {

    setText("logsCount", stats.totalLogs);
    setText("alertsCount", stats.totalAlerts);
    setText("incidentCount", stats.totalIncidents);
    setText("threatScore", `${stats.threatScore}%`);

    setText("criticalAlerts", stats.criticalAlerts);
    setText("activeAlerts", stats.activeAlerts);
    setText("openIncidents", stats.openIncidents);
    setText("onlineHosts", stats.onlineHosts);

    // Trend indicators compare against a stored previous run, which is what
    // makes the report look like a report and not just a stat dump.
    renderDelta("logsDelta", stats.totalLogs);
    renderDelta("alertsDelta", stats.activeAlerts);
    renderDelta("incidentsDelta", stats.openIncidents);

};

// Stores the current numbers in sessionStorage so the next visit can show
// what changed since then. Session-scoped on purpose: a SOC wall display
// should not accumulate comparison state across browser restarts.
const renderDelta = (id, value) => {

    const node = document.getElementById(id);

    if (!node) {
        return;
    }

    const key = `report_${id}`;

    const previous = sessionStorage.getItem(key);

    if (previous === null) {
        node.textContent = "";
        node.className = "delta";
    } else {

        const before = parseInt(previous, 10);

        const diff = value - before;

        if (diff === 0) {
            node.textContent = "no change";
            node.className = "delta delta-flat";
        } else if (diff > 0) {
            node.textContent = `+${diff} since last view`;
            node.className = "delta delta-up";
        } else {
            node.textContent = `${diff} since last view`;
            node.className = "delta delta-down";
        }

    }

    sessionStorage.setItem(key, String(value));

};

const renderBreakdown = (distribution, timeline) => {

    const body = document.getElementById("severityBreakdown");

    if (!body) {
        return;
    }

    const busiest = [...timeline].sort((a, b) => b.count - a.count).slice(0, 5);

    const total = distribution.reduce((sum, row) => sum + row.count, 0) || 1;

    body.innerHTML = distribution.map(row => `
        <tr>
            <td><span class="badge badge-${severityClass(row.severity)}">${escapeHtml(row.severity)}</span></td>
            <td>${row.count}</td>
            <td>${Math.round((row.count / total) * 100)}%</td>
            <td>
                <div class="meter">
                    <div class="meter-fill" style="width:${(row.count / total) * 100}%;background:${SEVERITY_COLOURS[row.severity]}"></div>
                </div>
            </td>
        </tr>
    `).join("");

    const peak = document.getElementById("peakHour");

    if (peak && busiest.length) {
        peak.textContent = `${formatDateTime(busiest[0].time)} (${busiest[0].count} events)`;
    }

};

// ---------- Export ----------

// A single flat sheet: summary block, then the severity breakdown, then the
// per-hour trend. Everything is quoted so the file opens cleanly in Excel.
const exportCsv = () => {

    if (!report) {
        return;
    }

    const stats = report.statistics;

    const lines = [];

    lines.push(["Sentinel SIEM - Security Report"].map(csvCell).join(","));
    lines.push(["Generated", new Date().toISOString()].map(csvCell).join(","));
    lines.push(["Generated By", (getUser() || {}).displayName || "-"].map(csvCell).join(","));
    lines.push("");

    lines.push(["Metric", "Value"].map(csvCell).join(","));

    const metrics = [
        ["Total Logs", stats.totalLogs],
        ["Total Alerts", stats.totalAlerts],
        ["Total Incidents", stats.totalIncidents],
        ["Critical Alerts", stats.criticalAlerts],
        ["Active Alerts", stats.activeAlerts],
        ["Open Incidents", stats.openIncidents],
        ["Online Hosts", stats.onlineHosts],
        ["Threat Score", `${stats.threatScore}%`]
    ];

    metrics.forEach(([label, value]) => {
        lines.push([label, value].map(csvCell).join(","));
    });

    lines.push("");
    lines.push(["Severity", "Count"].map(csvCell).join(","));

    report.severityDistribution.forEach(row => {
        lines.push([row.severity, row.count].map(csvCell).join(","));
    });

    lines.push("");
    lines.push(["Hour", "Events"].map(csvCell).join(","));

    report.timeline.forEach(bucket => {
        lines.push([bucket.time, bucket.count].map(csvCell).join(","));
    });

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    downloadFile(`siem-report-${stamp}.csv`, lines.join("\n"));

    toast("Report exported", "success");

};

// ---------- Load ----------

const load = async () => {

    try {

        const data = await apiGet("/dashboard");

        report = data;

        renderSummary(data.statistics);
        renderBreakdown(data.severityDistribution || [], data.timeline || []);

        buildSeverityChart(data.severityDistribution || []);
        buildTrendChart(data.timeline || []);

        setText("reportGenerated", formatDateTime(new Date().toISOString()));

    } catch (error) {

        console.error(error);
        toast(error.message || "Could not build the report", "error");

    }

};

// ---------- Start ----------

const initReports = async () => {

    if (!initPage()) {
        return;
    }

    document.getElementById("csvBtn").addEventListener("click", exportCsv);

    // The browser's own print pipeline is the honest way to produce a PDF
    // from static HTML; a server-side renderer would be overkill here.
    document.getElementById("pdfBtn").addEventListener("click", () => window.print());

    await load();

    refreshTimer = setInterval(load, 30000);

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReports);
} else {
    initReports();
}
