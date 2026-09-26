// ======================================
// Sentinel SIEM - Settings Controller
// controllers/settingsController.js
// ======================================

const Settings = require("../models/Settings");

// Only one settings document exists, keyed "soc"
const SETTINGS_KEY = "soc";

const getSettings = async (req, res) => {

    try {

        let settings = await Settings.findOne({ key: SETTINGS_KEY });

        // Create it on first read so the document always exists
        if (!settings) {
            settings = await Settings.create({ key: SETTINGS_KEY });
        }

        res.status(200).json({
            success: true,
            data: settings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

const updateSettings = async (req, res) => {

    try {

        const allowed = [
            "organisationName",
            "refreshInterval",
            "logRetentionDays",
            "autoEscalateSeverity",
            "maskIpInReports"
        ];

        const update = {};

        allowed.forEach(field => {

            if (req.body[field] !== undefined) {
                update[field] = req.body[field];
            }

        });

        if (Object.keys(update).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid settings supplied"
            });
        }

        const settings = await Settings.findOneAndUpdate(
            { key: SETTINGS_KEY },
            { $set: update },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            success: true,
            message: "Settings updated",
            data: settings
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

module.exports = {
    getSettings,
    updateSettings
};
