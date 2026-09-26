// ======================================
// Sentinel SIEM - Dashboard Controller
// controllers/dashboardController.js
// ======================================

const Log = require("../models/Log");

const Alert = require("../models/Alert");

const Incident = require("../models/Incident");

// Risk contribution of a single alert, by severity. The sum is divided by
// the event count and scaled, so the score reads as "risk per event" rather
// than growing without bound as history accumulates.
const RISK_WEIGHT = {
    Critical: 15,
    High: 8,
    Medium: 4,
    Low: 1
};

const SEVERITIES = ["Critical", "High", "Medium", "Low"];

// Whole-hour buckets across the last `hours` hours, oldest first
const buildHourlyBuckets = (hours) => {

    const now = new Date();
    const buckets = [];

    for (let i = hours - 1; i >= 0; i--) {

        const start = new Date(now);
        start.setMinutes(0, 0, 0);
        start.setHours(start.getHours() - i);

        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        buckets.push({ start, end, count: 0 });

    }

    return buckets;

};

const getDashboard = async (req, res) => {

    try {

        // ---------- Log statistics ----------

        const [totalLogs, critical, high, medium, low] = await Promise.all([

            Log.countDocuments(),
            Log.countDocuments({ severity: "Critical" }),
            Log.countDocuments({ severity: "High" }),
            Log.countDocuments({ severity: "Medium" }),
            Log.countDocuments({ severity: "Low" })

        ]);

        // ---------- Alert statistics ----------

        const [totalAlerts, criticalAlerts, openAlerts, acknowledgedAlerts] =
            await Promise.all([

                Alert.countDocuments(),
                Alert.countDocuments({ severity: "Critical" }),
                Alert.countDocuments({ status: "Open" }),
                Alert.countDocuments({ status: "Acknowledged" })

            ]);

        // Anything not yet resolved still needs analyst attention
        const activeAlerts = openAlerts + acknowledgedAlerts;

        // ---------- Incident statistics ----------

        const [totalIncidents, openIncidents] = await Promise.all([

            Incident.countDocuments(),
            Incident.countDocuments({ status: { $in: ["Open", "In Progress"] } })

        ]);

        // ---------- Distinct hosts seen in logs ----------

        const hostRows = await Log.aggregate([
            {
                $match: {
                    ipAddress: { $nin: [null, ""] }
                }
            },
            {
                $group: {
                    _id: "$ipAddress"
                }
            },
            {
                $count: "hosts"
            }
        ]);

        const onlineHosts = hostRows.length ? hostRows[0].hosts : 0;

        // ---------- Threat score ----------

        const alertSeverityRows = await Alert.aggregate([
            {
                $group: {
                    _id: "$severity",
                    count: { $sum: 1 }
                }
            }
        ]);

        const alertsBySeverity = alertSeverityRows.reduce((acc, row) => {

            acc[row._id] = row.count;

            return acc;

        }, {});

        const rawRisk = SEVERITIES.reduce((sum, level) => {

            return sum + (RISK_WEIGHT[level] || 0) * (alertsBySeverity[level] || 0);

        }, 0);

        const events = Math.max(1, totalLogs);

        const threatScore = Math.min(100, Math.round((rawRisk / events) * 20));

        // ---------- Severity distribution (for the doughnut) ----------

        const severityDistribution = SEVERITIES.map(level => {

            return {
                severity: level,
                count: {
                    Critical: critical,
                    High: high,
                    Medium: medium,
                    Low: low
                }[level]
            };

        });

        // ---------- 24 hour event timeline (for the line chart) ----------

        const buckets = buildHourlyBuckets(24);

        const timelineRows = await Log.aggregate([
            {
                $match: {
                    timestamp: { $gte: buckets[0].start }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%dT%H:00:00.000Z",
                            date: "$timestamp"
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const timeline = buckets.map(bucket => {

            const iso = bucket.start.toISOString();

            const match = timelineRows.find(row => row._id === iso);

            return {
                time: iso,
                count: match ? match.count : 0
            };

        });

        // ---------- Recent activity ----------

        const [recentLogs, recentAlerts] = await Promise.all([

            Log.find().sort({ timestamp: -1 }).limit(5),

            Alert.find().sort({ timestamp: -1 }).limit(5)

        ]);

        res.status(200).json({

            success: true,

            statistics: {

                // Original keys, unchanged
                totalLogs,
                critical,
                high,
                medium,
                low,

                // Added for the dashboard cards
                totalAlerts,
                criticalAlerts,
                activeAlerts,
                openAlerts,
                acknowledgedAlerts,
                totalIncidents,
                openIncidents,
                onlineHosts,
                threatScore

            },

            severityDistribution,

            timeline,

            recentAlerts,

            recentLogs

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

};

module.exports = {
    getDashboard
};
