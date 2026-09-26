// ======================================
// Sentinel SIEM - Incident Controller
// controllers/incidentController.js
// ======================================

const Incident = require("../models/Incident");

const Counter = require("../models/Counter");

const { parsePaging, parseSort, paginated } = require("../utils/paginate");

// Lifecycle order, used to build the status summary
const STATUSES = ["Open", "In Progress", "Closed"];

// Allocates the next gapless "INC-1001" style identifier
const generateIncidentId = async () => {

    const value = await Counter.nextValue("incident", 1000);

    return `INC-${value}`;

};

// Get all incidents
const getIncidents = async (req, res) => {

    try {

        const { status, priority, search } = req.query;

        const query = {};

        if (status) {
            query.status = status;
        }

        if (priority) {
            query.priority = priority;
        }

        if (search) {

            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            query.$or = [
                { incidentId: { $regex: safe, $options: "i" } },
                { title: { $regex: safe, $options: "i" } },
                { assignedTo: { $regex: safe, $options: "i" } }
            ];

        }

        const paging = parsePaging(req.query);

        const [incidents, total] = await Promise.all([
            Incident.find(query)
                .sort(parseSort(req.query.sort))
                .skip(paging.skip)
                .limit(paging.limit),
            Incident.countDocuments(query)
        ]);

        res.status(200).json(paginated(incidents, total, paging));

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Get a single incident
const getIncidentById = async (req, res) => {

    try {

        const incident = await Incident.findById(req.params.id)
            .populate("alerts");

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.status(200).json({
            success: true,
            data: incident
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Create a new incident, allocating its incidentId
const createIncident = async (req, res) => {

    try {

        const body = { ...req.body };

        // Never let a caller dictate the identifier
        delete body.incidentId;

        body.incidentId = await generateIncidentId();

        const incident = await Incident.create(body);

        res.status(201).json({
            success: true,
            message: "Incident created successfully",
            data: incident
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Assign an analyst, which also moves the incident into "In Progress"
const assignIncident = async (req, res) => {

    try {

        const assignedTo = req.body.assignedTo;

        if (!assignedTo) {
            return res.status(400).json({
                success: false,
                message: "assignedTo is required"
            });
        }

        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    assignedTo,
                    assignedAt: new Date(),
                    status: "In Progress"
                }
            },
            { new: true }
        );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Incident assigned",
            data: incident
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Close an incident
const closeIncident = async (req, res) => {

    try {

        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: "Closed",
                    closedAt: new Date(),
                    resolution: req.body.resolution || ""
                }
            },
            { new: true }
        );

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Incident closed",
            data: incident
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Delete an incident
const deleteIncident = async (req, res) => {

    try {

        const incident = await Incident.findByIdAndDelete(req.params.id);

        if (!incident) {
            return res.status(404).json({
                success: false,
                message: "Incident not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Incident deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Status rollup used by incidents.html cards
const getIncidentStats = async (req, res) => {

    try {

        const [total, open, inProgress, closed, unassigned] = await Promise.all([

            Incident.countDocuments(),
            Incident.countDocuments({ status: "Open" }),
            Incident.countDocuments({ status: "In Progress" }),
            Incident.countDocuments({ status: "Closed" }),
            Incident.countDocuments({ assignedTo: "Unassigned" })

        ]);

        const grouped = await Incident.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Normalise so every status is present, even at zero
        const byStatus = STATUSES.reduce((acc, level) => {

            const match = grouped.find(g => g._id === level);

            acc[level] = match ? match.count : 0;

            return acc;

        }, {});

        res.status(200).json({
            success: true,
            statistics: {
                total,
                open,
                inProgress,
                closed,
                unassigned,
                byStatus
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
    getIncidents,
    getIncidentById,
    createIncident,
    assignIncident,
    closeIncident,
    deleteIncident,
    getIncidentStats
};
