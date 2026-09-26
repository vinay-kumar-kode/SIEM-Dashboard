// ======================================
// Sentinel SIEM - Settings Model
// models/Settings.js
// ======================================

const mongoose = require("mongoose");

// Single-document collection holding the SOC tuning knobs exposed by
// settings.html. Exactly one document should ever exist, keyed "soc".

const settingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: "soc",
            unique: true,
            immutable: true
        },

        // Organisation shown in the dashboard header
        organisationName: {
            type: String,
            default: "Sentinel SIEM"
        },

        // Auto-refresh interval for every polling page, in milliseconds
        refreshInterval: {
            type: Number,
            default: 10000,
            min: 2000,
            max: 300000
        },

        // Log retention in days; surfaced for display, not yet enforced
        logRetentionDays: {
            type: Number,
            default: 90,
            min: 1,
            max: 3650
        },

        // Severity at or above which an incident is auto-escalated
        autoEscalateSeverity: {
            type: String,
            enum: ["Low", "Medium", "High", "Critical"],
            default: "High"
        },

        // Show source IPs in exported reports
        maskIpInReports: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Settings", settingsSchema);
