// ======================================
// Sentinel SIEM - Alert Controller
// controllers/alertController.js
// ======================================

const Alert = require("../models/Alert");

const { parsePaging, parseSort, paginated } = require("../utils/paginate");

// Severity order, used to build the severity summary
const SEVERITIES = ["Critical", "High", "Medium", "Low"];

// Get all alerts
const getAlerts = async (req, res) => {

    try {

        const { severity, status, search } = req.query;

        const query = {};

        if (severity) {
            query.severity = severity;
        }

        if (status) {
            query.status = status;
        }

        if (search) {

            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            query.$or = [
                { attackType: { $regex: safe, $options: "i" } },
                { description: { $regex: safe, $options: "i" } },
                { sourceIp: { $regex: safe, $options: "i" } }
            ];

        }

        const paging = parsePaging(req.query);

        const [alerts, total] = await Promise.all([
            Alert.find(query)
                .sort(parseSort(req.query.sort))
                .skip(paging.skip)
                .limit(paging.limit),
            Alert.countDocuments(query)
        ]);

        res.status(200).json(paginated(alerts, total, paging));

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Get a single alert
const getAlertById = async (req, res) => {

    try {

        const alert = await Alert.findById(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        res.status(200).json({
            success: true,
            data: alert
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Create a new alert
const createAlert = async (req, res) => {

    try {

        const alert = await Alert.create(req.body);

        res.status(201).json({
            success: true,
            message: "Alert created successfully",
            data: alert
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Acknowledge an alert
const acknowledgeAlert = async (req, res) => {

    try {

        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: "Acknowledged",
                    acknowledgedBy: req.body.analyst || "admin",
                    acknowledgedAt: new Date()
                }
            },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Alert acknowledged",
            data: alert
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Resolve an alert
const resolveAlert = async (req, res) => {

    try {

        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: "Resolved",
                    resolvedBy: req.body.analyst || "admin",
                    resolvedAt: new Date()
                }
            },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Alert resolved",
            data: alert
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Delete an alert
const deleteAlert = async (req, res) => {

    try {

        const alert = await Alert.findByIdAndDelete(req.params.id);

        if (!alert) {
            return res.status(404).json({
                success: false,
                message: "Alert not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Alert deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Severity and status rollup used by alerts.html cards
const getAlertStats = async (req, res) => {

    try {

        const [total, critical, open, acknowledged, resolved] = await Promise.all([

            Alert.countDocuments(),
            Alert.countDocuments({ severity: "Critical" }),
            Alert.countDocuments({ status: "Open" }),
            Alert.countDocuments({ status: "Acknowledged" }),
            Alert.countDocuments({ status: "Resolved" })

        ]);

        const grouped = await Alert.aggregate([
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

        res.status(200).json({
            success: true,
            statistics: {
                total,
                critical,
                open,
                acknowledged,
                resolved,
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
    getAlerts,
    getAlertById,
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    deleteAlert,
    getAlertStats
};
