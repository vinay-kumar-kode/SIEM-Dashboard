// ======================================
// Sentinel SIEM - Alert Model
// models/Alert.js
// ======================================

const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema(
    {
        // Detection time
        timestamp: {
            type: Date,
            default: Date.now
        },

        // Threat severity, mirrors Log.severity
        severity: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            required: true
        },

        // Analyst workflow state
        status: {
            type: String,
            enum: ["Open", "Acknowledged", "Resolved"],
            default: "Open"
        },

        // Offending host
        sourceIp: {
            type: String,
            required: true
        },

        // Name of the detected attack, e.g. "SQL Injection"
        attackType: {
            type: String,
            required: true
        },

        // Human readable detail
        description: {
            type: String,
            default: ""
        },

        // Optional link back to the log that raised this alert
        log: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Log",
            default: null
        },

        // Analyst handling
        acknowledgedBy: {
            type: String,
            default: null
        },

        acknowledgedAt: {
            type: Date,
            default: null
        },

        resolvedBy: {
            type: String,
            default: null
        },

        resolvedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Backs the ?severity= and ?status= list filters
alertSchema.index({ severity: 1, status: 1, timestamp: -1 });

// Backs the ?search= regex on attackType / description
alertSchema.index({ attackType: "text", description: "text" });

module.exports = mongoose.model("Alert", alertSchema);
