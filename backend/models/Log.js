const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
{
    timestamp: {
        type: Date,
        default: Date.now
    },

    source: {
        type: String,
        required: true
    },

    eventType: {
        type: String,
        required: true
    },

    severity: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        required: true
    },

    message: {
        type: String,
        required: true
    },

    ipAddress: {
        type: String
    },

    status: {
        type: String,
        default: "New"
    }
});

module.exports = mongoose.model("Log", logSchema);
