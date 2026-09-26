const express = require("express");

const router = express.Router();

const {

    getLogs,
    getLogById,
    createLog,
    deleteLog,
    getLogStats

} = require("../controllers/logController");

// Severity rollup. Declared before "/:id" so that the literal path is not
// swallowed by the parameterised route.
router.get("/stats", getLogStats);

// Get all logs
router.get("/", getLogs);

// Get a single log
router.get("/:id", getLogById);

// Create a new log
router.post("/", createLog);

// Delete a log
router.delete("/:id", deleteLog);

module.exports = router;
