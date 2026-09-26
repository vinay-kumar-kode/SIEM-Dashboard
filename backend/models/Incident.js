// ======================================
// Sentinel SIEM - Incident Model
// models/Incident.js
// ======================================

const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
    {
        // Human readable identifier, e.g. "INC-1001"
        incidentId: {
            type: String,
            unique: true,
            required: true
        },

        // Detection time
        timestamp: {
            type: Date,
            default: Date.now
        },

        // Triage urgency
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            required: true
        },

        // Incident lifecycle state
        status: {
            type: String,
            enum: ["Open", "In Progress", "Closed"],
            default: "Open"
        },

        // Short summary, e.g. "SQL Injection Attack"
        title: {
            type: String,
            required: true
        },

        // Long form narrative / timeline
        description: {
            type: String,
            default: ""
        },

        // Analyst responsible for the investigation
        assignedTo: {
            type: String,
            default: "Unassigned"
        },

        assignedAt: {
            type: Date,
            default: null
        },

        closedAt: {
            type: Date,
            default: null
        },

        // Closure summary
        resolution: {
            type: String,
            default: ""
        },

        // Alerts that were escalated into this incident
        alerts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Alert"
            }
        ]
    },
    {
        timestamps: true
    }
);

// Backs the ?status= and ?priority= list filters
incidentSchema.index({ status: 1, priority: 1, timestamp: -1 });

module.exports = mongoose.model("Incident", incidentSchema);
