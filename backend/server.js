// ======================================
// Sentinel SIEM Backend
// server.js
// ======================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");

// Database Connection
const connectDB = require("./config/database");

// Routes
const logRoutes = require("./routes/logRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

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
// Home Route
// ======================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Sentinel SIEM Backend is Running"
    });
});

// ======================================
// API Routes
// ======================================
app.use("/api/logs", logRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ======================================
// Start Server
// ======================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
