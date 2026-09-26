const express = require("express");

const router = express.Router();

const {

    login,
    getProfile,
    logout

} = require("../controllers/authController");

const { requireAuth } = require("../middleware/auth");

// Log in and receive a session token
router.post("/login", login);

// Current user, requires a valid token
router.get("/me", requireAuth, getProfile);

// Invalidate the current token
router.post("/logout", requireAuth, logout);

module.exports = router;
