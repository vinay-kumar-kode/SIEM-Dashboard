// ======================================
// Sentinel SIEM - Shared Frontend Runtime
// api.js
// ======================================
//
// Loaded by every page that talks to the backend. Exposes globals; the
// pages are classic scripts, not ES modules.
//
// Three groups live here:
//   session   - token storage, the auth guard, logout
//   transport - apiFetch plus the small helpers that build query strings
//   ui        - escaping, formatting, toasts, pagination, the page clock
//
// Nothing in here touches a specific page, so a page script can call any of
// it without knowing which other pages exist.

// ======================================
// Session
// ======================================

// The backend serves this frontend off its own disk (see backend/server.js),
// so a relative base keeps the app on one origin and leaves CORS out of the
// picture.
const API_BASE = "/api";

const TOKEN_KEY = "sentinel_token";

const USER_KEY = "sentinel_user";

const getToken = () => localStorage.getItem(TOKEN_KEY);

const getUser = () => {

    const raw = localStorage.getItem(USER_KEY);

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }

};

const isAdmin = () => {

    const user = getUser();

    return Boolean(user && user.role === "admin");

};

const setSession = (token, user) => {

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

};

const clearSession = () => {

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

};

// Sends the visitor back to the login page. `replace` avoids leaving the
// protected page in history, so Back does not land on a dead page.
const goToLogin = () => {

    clearSession();

    window.location.replace("index.html");

};

// Every protected page calls this before it renders anything. Without it a
// token-less visitor gets a page of "undefined" cells followed by a redirect
// once the first request 401s, which looks broken.
const requireSession = () => {

    if (!getToken()) {
        goToLogin();
        return false;
    }

    return true;

};

// Invalidates the token server side, then clears it here. The local clear
// happens regardless of the response so a failed request cannot strand the
// browser in a half-signed-in state.
const logout = async () => {

    try {

        await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` }
        });

    } catch (error) {

        console.error(error);

    } finally {

        goToLogin();

    }

};

// ======================================
// Transport
// ======================================

// fetch() with the bearer token attached. Every route except /api/auth/login
// sits behind requireAuth, so this is the only way to reach them.
//
// A 401 means the token is gone: expired, invalidated by logout, or never
// established. Drop it and return to the login page, otherwise the page sits
// there rendering "undefined" because the caller got an error body instead of
// data.
const apiFetch = async (path, options = {}) => {

    const token = getToken();

    const headers = Object.assign({}, options.headers);

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (options.body) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${path}`, Object.assign({}, options, { headers }));

    if (res.status === 401) {
        goToLogin();
        throw new Error("Session expired");
    }

    return res;

};

// apiFetch plus JSON decode plus envelope checking, which is what every
// caller actually wants. Throws on a failed envelope so the caller's catch
// block handles transport, HTTP and application errors the same way.
const apiGet = async (path) => {

    const res = await apiFetch(path);

    const body = await res.json();

    if (!res.ok || !body.success) {
        throw new Error(body.message || `Request failed (${res.status})`);
    }

    return body;

};

const apiSend = async (path, method, payload) => {

    const res = await apiFetch(path, {
        method,
        body: payload ? JSON.stringify(payload) : undefined
    });

    const body = await res.json();

    if (!res.ok || !body.success) {
        throw new Error(body.message || `Request failed (${res.status})`);
    }

    return body;

};

const apiPost = (path, payload) => apiSend(path, "POST", payload);

const apiPut = (path, payload) => apiSend(path, "PUT", payload);

const apiPatch = (path, payload) => apiSend(path, "PATCH", payload);

const apiDelete = (path) => apiSend(path, "DELETE");

// Serialises a params object into a query string, dropping empty values so
// callers can pass a filter straight from a form without tidying it first.
const buildQuery = (params) => {

    const search = new URLSearchParams();

    Object.keys(params || {}).forEach(key => {

        const value = params[key];

        if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
            search.append(key, value);
        }

    });

    const query = search.toString();

    return query ? `?${query}` : "";

};

// ======================================
// UI helpers
// ======================================

// Every table is built by assigning to innerHTML, and the values come from
// the database. Without escaping, a log message containing markup would
// execute in the page. All interpolated values go through here.
const escapeHtml = (value) => {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

};

const formatDateTime = (value) => {

    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

};

// "4m ago" style stamps for the recent-activity tables, where the exact
// second does not matter but recency does.
const formatRelative = (value) => {

    if (!value) {
        return "-";
    }

    const then = new Date(value).getTime();

    if (Number.isNaN(then)) {
        return "-";
    }

    const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

    if (seconds < 60) {
        return `${seconds}s ago`;
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    return `${Math.floor(hours / 24)}d ago`;

};

// The backend stores title case ("Critical"); the stylesheets were written
// against lower case class names, so this is the one place that bridges the
// two. Returns "" for anything unexpected rather than a stray class.
const severityClass = (value) => {

    const known = ["critical", "high", "medium", "low"];

    const key = String(value || "").toLowerCase();

    return known.includes(key) ? key : "";

};

const setText = (id, value) => {

    const node = document.getElementById(id);

    if (node) {
        node.textContent = value;
    }

};

// ---------- Toast ----------

// Appends the toast host on first use so pages do not each need the markup.
const toastHost = () => {

    let host = document.getElementById("toastHost");

    if (!host) {
        host = document.createElement("div");
        host.id = "toastHost";
        host.className = "toast-host";
        document.body.appendChild(host);
    }

    return host;

};

const toast = (message, kind = "info") => {

    const node = document.createElement("div");

    node.className = `toast toast-${kind}`;
    node.textContent = message;

    toastHost().appendChild(node);

    setTimeout(() => {

        node.classList.add("toast-out");
        setTimeout(() => node.remove(), 300);

    }, 3200);

};

// ---------- Pagination ----------

// Renders numbered page buttons plus prev/next under a table. `meta` is the
// envelope from the list endpoints ({ page, pages, total, limit }).
const renderPagination = (containerId, meta, onGoTo) => {

    const host = document.getElementById(containerId);

    if (!host) {
        return;
    }

    const page = meta.page || 1;
    const pages = meta.pages || 1;
    const total = meta.total || 0;
    const limit = meta.limit || 0;

    if (pages <= 1) {
        host.innerHTML = `<span class="page-info">Showing ${total} record${total === 1 ? "" : "s"}</span>`;
        return;
    }

    // Window the visible page numbers around the current page, otherwise a
    // 28 page table renders 28 buttons.
    const windowSize = 2;

    let first = Math.max(1, page - windowSize);
    let last = Math.min(pages, page + windowSize);

    const numbers = [];

    for (let i = first; i <= last; i++) {
        numbers.push(
            `<button class="page-btn${i === page ? " page-current" : ""}" data-page="${i}">${i}</button>`
        );
    }

    const from = (page - 1) * limit + 1;
    const to = Math.min(total, page * limit);

    host.innerHTML = `
        <span class="page-info">${from}-${to} of ${total}</span>
        <button class="page-btn" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>Prev</button>
        ${numbers.join("")}
        <button class="page-btn" data-page="${page + 1}" ${page === pages ? "disabled" : ""}>Next</button>
    `;

    host.querySelectorAll(".page-btn").forEach(button => {

        button.addEventListener("click", () => {

            const target = parseInt(button.dataset.page, 10);

            if (target >= 1 && target <= pages && target !== page) {
                onGoTo(target);
            }

        });

    });

};

// ---------- Misc ----------

// Search boxes fire on every keystroke; without this a five character search
// fires five requests, four of which are already stale.
const debounce = (fn, ms = 300) => {

    let timer = null;

    return (...args) => {

        clearTimeout(timer);

        timer = setTimeout(() => fn(...args), ms);

    };

};

// Drives the #clock element that every page header carries.
const startClock = (id = "clock") => {

    const node = document.getElementById(id);

    if (!node) {
        return;
    }

    const tick = () => {

        node.textContent = new Date().toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        });

    };

    tick();

    setInterval(tick, 1000);

};

// Fills the header profile chip from the stored session, and hides any
// element marked data-admin-only from analysts.
const applyChrome = () => {

    const user = getUser();

    if (user) {

        document.querySelectorAll("[data-profile-name]").forEach(node => {
            node.textContent = user.displayName || user.username;
        });

        document.querySelectorAll("[data-profile-role]").forEach(node => {
            node.textContent = user.role;
        });

    }

    if (!isAdmin()) {
        document.querySelectorAll("[data-admin-only]").forEach(node => {
            node.remove();
        });
    }

};

// Triggers a client-side file download from text content.
const downloadFile = (filename, content, type = "text/csv") => {

    const blob = new Blob([content], { type });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

};

// Quotes a CSV cell, doubling any embedded quote. Without this a message
// containing a comma silently shifts every following column.
const csvCell = (value) => {

    const text = value === undefined || value === null ? "" : String(value);

    return `"${text.replace(/"/g, '""')}"`;

};

// Standard bootstrap for a protected page: bail out without a token, then
// start the clock and decorate the shared chrome.
const initPage = () => {

    if (!requireSession()) {
        return false;
    }

    startClock();
    applyChrome();

    return true;

};
