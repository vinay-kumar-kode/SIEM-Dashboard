const express = require("express");

const router = express.Router();

const {

    getAlerts,
    getAlertById,
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    getAlertStats

} = require("../controllers/alertController");

// Severity and status rollup. Declared before "/:id" so that the literal
// path is not swallowed by the parameterised route.
router.get("/stats", getAlertStats);

// Get all alerts
router.get("/", getAlerts);

// Get a single alert
router.get("/:id", getAlertById);

// Create a new alert
router.post("/", createAlert);

// Acknowledge an alert
router.patch("/:id/acknowledge", acknowledgeAlert);

// Resolve an alert
router.patch("/:id/resolve", resolveAlert);

// Delete an alert
router.delete("/:id", deleteAlert);

module.exports = router;
