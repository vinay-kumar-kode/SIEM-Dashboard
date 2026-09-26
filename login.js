// ======================================
// Sentinel SIEM - Login
// login.js
// ======================================

async function login() {

    const username = document.getElementById("username").value.trim();

    const password = document.getElementById("password").value;

    const message = document.getElementById("message");

    const button = document.querySelector(".login-box button");

    if (!username || !password) {
        message.textContent = "Username and password are required";
        return;
    }

    button.disabled = true;
    button.textContent = "Logging in...";
    message.textContent = "";

    try {

        // Plain fetch rather than apiFetch: a rejected login answers 401, and
        // apiFetch reads that as an expired session and redirects away from
        // the error the user needs to see.
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            message.textContent = data.message || "Login failed";
            return;
        }

        setSession(data.token, data.user);

        window.location.href = "dashboard.html";

    } catch (error) {

        message.textContent = "Unable to reach the server";

    } finally {

        button.disabled = false;
        button.textContent = "Login";

    }

}
