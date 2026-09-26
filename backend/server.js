// ======================================
// Sentinel SIEM Backend
// server.js
// ======================================

require("dotenv").config();

const path = require("path");

const express = require("express");
const cors = require("cors");

// Database Connection
const connectDB = require("./config/database");

// Auth middleware
const { requireAuth } = require("./middleware/auth");

// Routes
const authRoutes = require("./routes/authRoutes");
const logRoutes = require("./routes/logRoutes");
const alertRoutes = require("./routes/alertRoutes");
const incidentRoutes = require("./routes/incidentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const userRoutes = require("./routes/userRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

// ======================================
// Connect Database
// ======================================

connectDB();

// ======================================
// Middleware
// ======================================

app.use(cors());
app.use(express.json());

// ======================================
// Health Route
// ======================================

// Deliberately NOT "/". A GET / registered here would be matched before the
// static handler further down and shadow it, so the login page at / would be
// unreachable and the root would return this JSON instead of the UI.
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Sentinel SIEM Backend is Running"
    });
});

// ======================================
// API Routes
// ======================================

// Public: exchanging credentials for a token
app.use("/api/auth", authRoutes);

// Everything below requires a valid bearer token
app.use("/api/logs", requireAuth, logRoutes);
app.use("/api/alerts", requireAuth, alertRoutes);
app.use("/api/incidents", requireAuth, incidentRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);

// ======================================
// Static Frontend
// ======================================

// The frontend is plain HTML/CSS/JS with no build step, so it is served
// straight off disk. This makes the whole app available on a single origin
// at http://localhost:PORT and avoids any CORS dependency.
//
// The repo root also contains backend/, so requests into it are refused
// here. Without this, GET /backend/.env would hand out the database
// credentials and the whole source tree.
const FRONTEND_ROOT = path.join(__dirname, "..");

app.use("/backend", (req, res) => {
    res.status(404).json({
        success: false,
        message: "Not found"
    });
});

app.use(express.static(FRONTEND_ROOT, {
    extensions: ["html"],
    index: "index.html"
}));

// ======================================
// API 404
// ======================================

// Anything under /api that matched no router. Registered after the static
// handler so real files still resolve.
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});

// ======================================
// Error Handler
// ======================================

app.use((error, req, res, next) => {

    // Malformed JSON bodies arrive here from express.json()
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({
            success: false,
            message: "Malformed JSON in request body"
        });
    }

    console.error(error);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });

});

// ======================================
// Start Server
// ======================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

// ======================================
// Graceful Shutdown
// ======================================

const shutdown = (signal) => {

    console.log(`\n${signal} received, shutting down`);

    server.close(() => {
        process.exit(0);
    });

};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
