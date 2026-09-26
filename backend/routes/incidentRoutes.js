const express = require("express");

const router = express.Router();

const {

    getIncidents,
    getIncidentById,
    createIncident,
    assignIncident,
    closeIncident,
    deleteIncident,
    getIncidentStats

} = require("../controllers/incidentController");

// Status rollup. Declared before "/:id" so that the literal path is not
// swallowed by the parameterised route.
router.get("/stats", getIncidentStats);

// Get all incidents
router.get("/", getIncidents);

// Get a single incident
router.get("/:id", getIncidentById);

// Create a new incident
router.post("/", createIncident);

// Assign an analyst
router.patch("/:id/assign", assignIncident);

// Close an incident
router.patch("/:id/close", closeIncident);

// Delete an incident
router.delete("/:id", deleteIncident);

module.exports = router;
