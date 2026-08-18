const API_BASE = "http://localhost:5000/api";

// Update dashboard
async function loadDashboard() {
    const res = await fetch(`${API_BASE}/dashboard`);
    const data = await res.json();

    document.getElementById("totalLogs").textContent =
        data.statistics.totalLogs;

    document.getElementById("criticalAlerts").textContent =
        data.statistics.critical || data.statistics.criticalLogs;

    document.getElementById("activeAlerts").textContent =
        (data.statistics.high || data.statistics.highLogs) +
        (data.statistics.critical || data.statistics.criticalLogs);
}

// Load Logs
async function loadLogs() {
    const res = await fetch(`${API_BASE}/logs`);
    const result = await res.json();

    let html = "";

    result.data.forEach(log => {
        html += `
        <tr>
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.ipAddress}</td>
            <td>${log.eventType}</td>
        </tr>`;
    });

    document.getElementById("logTable").innerHTML = html;
}

refreshDashboard();

async function refreshDashboard(){
    await loadDashboard();
    await loadLogs();
}

setInterval(refreshDashboard,5000);

// Continue by keeping your existing clock,
// charts and UI code, replacing only hardcoded
// values with API responses.

