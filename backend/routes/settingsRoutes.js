const express = require("express");

const router = express.Router();

const {

    getSettings,
    updateSettings

} = require("../controllers/settingsController");

const { requireAuth, requireRole } = require("../middleware/auth");

// Any authenticated user may read the settings
router.get("/", requireAuth, getSettings);

// Changing them is admin only
router.put("/", requireAuth, requireRole("admin"), updateSettings);

module.exports = router;
