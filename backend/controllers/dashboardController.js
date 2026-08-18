const Log = require("../models/Log");

const getDashboard = async (req, res) => {

    try {

        const totalLogs = await Log.countDocuments();

        const critical = await Log.countDocuments({
            severity: "Critical"
        });

        const high = await Log.countDocuments({
            severity: "High"
        });

        const medium = await Log.countDocuments({
            severity: "Medium"
        });

        const low = await Log.countDocuments({
            severity: "Low"
        });

        const recentLogs = await Log.find()
            .sort({ timestamp: -1 })
            .limit(5);

        res.json({

            success: true,

            statistics: {

                totalLogs,
                critical,
                high,
                medium,
                low

            },

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
