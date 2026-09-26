// ======================================
// Sentinel SIEM - Settings
// settings.js
// ======================================
//
// Reads and writes the single SOC settings document. Writes are admin-only
// server side; this page simply never renders the form for an analyst.

const state = {

    loaded: null
};

// ---------- Load ----------

const fillForm = (settings) => {

    document.getElementById("orgName").value = settings.organisationName || "";
    document.getElementById("refreshInterval").value = settings.refreshInterval;
    document.getElementById("logRetention").value = settings.logRetentionDays;
    document.getElementById("escalateSeverity").value = settings.autoEscalateSeverity;
    document.getElementById("maskIp").checked = Boolean(settings.maskIpInReports);

    setText("settingsUpdated", formatDateTime(settings.updatedAt));

};

const load = async () => {

    try {

        const data = await apiGet("/settings");

        state.loaded = data.data;

        fillForm(data.data);

    } catch (error) {

        console.error(error);
        toast(error.message || "Could not load settings", "error");

    }

};

// ---------- Save ----------

// The schema clamps refreshInterval to 2000..300000 and logRetentionDays to
// 1..3650. Checking here means the analyst gets a clear message instead of a
// generic Mongoose validation error.
const validate = () => {

    const refresh = parseInt(document.getElementById("refreshInterval").value, 10);
    const retention = parseInt(document.getElementById("logRetention").value, 10);

    if (!Number.isFinite(refresh) || refresh < 2000 || refresh > 300000) {
        toast("Refresh interval must be between 2000 and 300000 ms", "warn");
        return null;
    }

    if (!Number.isFinite(retention) || retention < 1 || retention > 3650) {
        toast("Log retention must be between 1 and 3650 days", "warn");
        return null;
    }

    return {
        organisationName: document.getElementById("orgName").value.trim() || "Sentinel SIEM",
        refreshInterval: refresh,
        logRetentionDays: retention,
        autoEscalateSeverity: document.getElementById("escalateSeverity").value,
        maskIpInReports: document.getElementById("maskIp").checked
    };

};

const save = async () => {

    const payload = validate();

    if (!payload) {
        return;
    }

    const button = document.getElementById("saveBtn");

    button.disabled = true;
    button.textContent = "Saving...";

    try {

        const data = await apiPut("/settings", payload);

        state.loaded = data.data;

        fillForm(data.data);

        toast("Settings saved", "success");

    } catch (error) {

        toast(error.message || "Could not save settings", "error");

    } finally {

        button.disabled = false;
        button.textContent = "Save Changes";

    }

};

// ---------- Start ----------

const initSettings = async () => {

    if (!initPage()) {
        return;
    }

    if (!isAdmin()) {
        document.getElementById("settingsForm").innerHTML = `
            <div class="empty-state">
                <strong>Administrators only</strong>
                Your account cannot change SOC settings.
            </div>
        `;
        return;
    }

    document.getElementById("saveBtn").addEventListener("click", save);
    document.getElementById("resetBtn").addEventListener("click", () => {
        if (state.loaded) {
            fillForm(state.loaded);
            toast("Reverted to saved values", "info");
        }
    });

    // Enter anywhere in the form submits, rather than doing nothing.
    document.getElementById("settingsForm").addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            save();
        }
    });

    await load();

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettings);
} else {
    initSettings();
}
