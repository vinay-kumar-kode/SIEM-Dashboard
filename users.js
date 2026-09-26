// ======================================
// Sentinel SIEM - User Management
// users.js
// ======================================
//
// Admin-only screen. The backend enforces this too (requireRole("admin") on
// every mutating route), so hiding the nav is a convenience, not the control.
// The guard here exists to avoid showing an analyst a page whose every button
// would come back 403.

const state = {

    users: [],

    // null while creating, otherwise the _id being edited
    editingId: null
};

// ---------- Render ----------

const renderRows = () => {

    const body = document.getElementById("userTable");

    if (!body) {
        return;
    }

    if (!state.users.length) {
        body.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <strong>No accounts</strong>
                    Create the first analyst account to get started.
                </td>
            </tr>
        `;
        return;
    }

    const me = getUser() || {};

    body.innerHTML = state.users.map(user => {

        const isSelf = user._id === me.id;

        return `
        <tr class="row-fade">
            <td class="left">
                <strong>${escapeHtml(user.displayName)}</strong>
                ${isSelf ? `<span class="badge badge-analyst">you</span>` : ""}
            </td>
            <td>${escapeHtml(user.username)}</td>
            <td><span class="badge badge-${escapeHtml(user.role)}">${escapeHtml(user.role)}</span></td>
            <td>
                <span class="badge ${user.active ? "badge-resolved" : "badge-off"}">
                    ${user.active ? "Active" : "Disabled"}
                </span>
            </td>
            <td>${escapeHtml(user.lastLogin ? formatRelative(user.lastLogin) : "never")}</td>
            <td>${escapeHtml(formatDateTime(user.createdAt))}</td>
            <td class="actions">
                <button class="btn btn-sm btn-ghost" data-edit="${user._id}">Edit</button>
                <button class="btn btn-sm btn-danger" data-delete="${user._id}" ${isSelf ? "disabled title=\"You cannot delete your own account\"" : ""}>
                    Delete
                </button>
            </td>
        </tr>
    `;

    }).join("");

    body.querySelectorAll("[data-edit]").forEach(button => {
        button.addEventListener("click", () => openModal(button.dataset.edit));
    });

    body.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => removeUser(button.dataset.delete));
    });

};

const renderSummary = () => {

    const admins = state.users.filter(user => user.role === "admin" && user.active).length;
    const active = state.users.filter(user => user.active).length;

    setText("totalUsers", state.users.length);
    setText("activeUsers", active);
    setText("adminCount", admins);

};

// ---------- Load ----------

const load = async () => {

    try {

        const data = await apiGet("/users");

        state.users = data.data;

        renderRows();
        renderSummary();

    } catch (error) {

        console.error(error);
        toast(error.message || "Could not load users", "error");

    }

};

// ---------- Modal ----------

const openModal = (id) => {

    state.editingId = id || null;

    const user = id ? state.users.find(row => row._id === id) : null;

    setText("userModalTitle", user ? `Edit ${user.displayName}` : "New User");

    document.getElementById("userDisplayName").value = user ? user.displayName : "";
    document.getElementById("userName").value = user ? user.username : "";
    document.getElementById("userRole").value = user ? user.role : "analyst";
    document.getElementById("userPassword").value = "";
    document.getElementById("userActive").checked = user ? Boolean(user.active) : true;

    // The username is the unique key and the backend has no rename route, so
    // on edit it is shown but not editable.
    const nameInput = document.getElementById("userName");
    nameInput.disabled = Boolean(user);
    nameInput.title = user ? "Usernames cannot be changed" : "";

    const passwordField = document.getElementById("userPasswordField");

    if (passwordField) {
        // Blank means "leave the existing password alone" on edit, but is
        // required when creating, so the required flag flips.
        passwordField.hidden = false;
        document.getElementById("userPassword").required = !user;
        document.getElementById("userPasswordHint").textContent = user
            ? "Leave blank to keep the current password."
            : "At least 6 characters.";
    }

    const activeRow = document.getElementById("userActiveRow");

    if (activeRow) {
        activeRow.hidden = !user;
    }

    const backdrop = document.getElementById("userModal");

    if (backdrop) {
        backdrop.classList.add("open");
    }

    const first = document.getElementById("userDisplayName");
    if (first) {
        first.focus();
    }

};

const closeModal = () => {

    state.editingId = null;

    const backdrop = document.getElementById("userModal");

    if (backdrop) {
        backdrop.classList.remove("open");
    }

};

const submitUser = async () => {

    const displayName = document.getElementById("userDisplayName").value.trim();
    const username = document.getElementById("userName").value.trim();
    const role = document.getElementById("userRole").value;
    const password = document.getElementById("userPassword").value;
    const active = document.getElementById("userActive").checked;

    if (!displayName) {
        toast("Display name is required", "warn");
        return;
    }

    try {

        if (state.editingId) {

            // Send only what changed. An empty password field must be omitted
            // entirely, because the controller treats any present password as
            // a request to re-hash and replace it.
            const payload = { displayName, role, active };

            if (password) {
                payload.password = password;
            }

            await apiPut(`/users/${state.editingId}`, payload);

            toast("User updated", "success");

        } else {

            if (!username) {
                toast("Username is required", "warn");
                return;
            }

            if (!password || password.length < 6) {
                toast("Password must be at least 6 characters", "warn");
                return;
            }

            await apiPost("/users", { username, displayName, password, role });

            toast("User created", "success");

        }

        closeModal();
        await load();

    } catch (error) {

        toast(error.message || "Could not save the user", "error");

    }

};

const removeUser = async (id) => {

    const user = state.users.find(row => row._id === id);

    if (!user) {
        return;
    }

    if (!confirm(`Delete ${user.displayName} (${user.username})? This cannot be undone.`)) {
        return;
    }

    try {

        await apiDelete(`/users/${id}`);

        toast("User deleted", "success");

        await load();

    } catch (error) {

        toast(error.message || "Could not delete the user", "error");

    }

};

// ---------- Start ----------

const initUsers = async () => {

    if (!initPage()) {
        return;
    }

    if (!isAdmin()) {
        document.getElementById("userTable").innerHTML =
            `<tr><td colspan="7" class="empty-state">
                <strong>Administrators only</strong>
                Your account does not have permission to manage users.
            </td></tr>`;
        return;
    }

    document.getElementById("newUserBtn").addEventListener("click", () => openModal(null));
    document.getElementById("userCancel").addEventListener("click", closeModal);
    document.getElementById("userSave").addEventListener("click", submitUser);

    const backdrop = document.getElementById("userModal");

    if (backdrop) {
        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                closeModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && state.editingId !== null) {
            closeModal();
        }
    });

    await load();

};

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUsers);
} else {
    initUsers();
}
