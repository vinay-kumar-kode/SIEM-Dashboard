// ======================================
// Sentinel SIEM - Log Controller
// controllers/logController.js
// ======================================

const Log = require("../models/Log");

const { parsePaging, parseSort, paginated } = require("../utils/paginate");

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

// Escapes user input so it is matched literally rather than interpreted
// as a regular expression
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

        // Surface enum and required-field failures as a client error
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Get all logs
const getLogs = async (req, res) => {

    try {

        const { severity, source, status, search } = req.query;

        let query = {};

        // Filter by severity
        if (severity) {
            query.severity = severity;
        }

        // Filter by source
        if (source) {
            query.source = source;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Search in message or event type
        if (search) {

            const safe = escapeRegex(search);

            query.$or = [
                { message: { $regex: safe, $options: "i" } },
                { eventType: { $regex: safe, $options: "i" } },
                { ipAddress: { $regex: safe, $options: "i" } }
            ];

        }

        // One page at a time. countDocuments runs against the same filter so
        // the caller learns how many pages exist without a second request.
        const paging = parsePaging(req.query);

        const [logs, total] = await Promise.all([
            Log.find(query)
                .sort(parseSort(req.query.sort))
                .skip(paging.skip)
                .limit(paging.limit),
            Log.countDocuments(query)
        ]);

        res.status(200).json(paginated(logs, total, paging));

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Get a single log
const getLogById = async (req, res) => {

    try {

        const log = await Log.findById(req.params.id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Log not found"
            });
        }

        res.status(200).json({
            success: true,
            data: log
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Delete a log
const deleteLog = async (req, res) => {

    try {

        const log = await Log.findByIdAndDelete(req.params.id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Log not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Log deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Severity rollup used by logs.html
const getLogStats = async (req, res) => {

    try {

        const grouped = await Log.aggregate([
            {
                $group: {
                    _id: "$severity",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Normalise so every severity is present, even at zero
        const bySeverity = SEVERITIES.reduce((acc, level) => {

            const match = grouped.find(g => g._id === level);

            acc[level] = match ? match.count : 0;

            return acc;

        }, {});

        const total = Object.values(bySeverity).reduce((a, b) => a + b, 0);

        res.status(200).json({
            success: true,
            statistics: {
                total,
                bySeverity
            }
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
    getLogs,
    getLogById,
    deleteLog,
    getLogStats
};
