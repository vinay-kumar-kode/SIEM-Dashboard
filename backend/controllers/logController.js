const Log = require("../models/Log");

// Create a new log
const createLog = async (req, res) => {
    try {
        const log = await Log.create(req.body);

        res.status(201).json({
            success: true,
            message: "Log created successfully",
            data: log
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all logs
const getLogs = async (req, res) => {
    try {
        const { severity, source, search } = req.query;

        let query = {};

        // Filter by severity
        if (severity) {
            query.severity = severity;
        }

        // Filter by source
        if (source) {
            query.source = source;
        }

        // Search in message or event type
        if (search) {
            query.$or = [
                { message: { $regex: search, $options: "i" } },
                { eventType: { $regex: search, $options: "i" } }
            ];
        }

        const logs = await Log.find(query).sort({ timestamp: -1 });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
module.exports = {
    createLog,
    getLogs
};
