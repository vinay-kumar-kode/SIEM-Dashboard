const express = require("express");
const router = express.Router();

const {
    createLog,
    getLogs
} = require("../controllers/logController");

// Create a new log
router.post("/", createLog);

// Get all logs
router.get("/", getLogs);

module.exports = router;
