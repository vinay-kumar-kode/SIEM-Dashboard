// ======================================
// Sentinel SIEM - Auth Controller
// controllers/authController.js
// ======================================

const User = require("../models/User");

// Log in and receive an opaque session token
const login = async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        // username is lowercased by the schema, so normalise the lookup
        const user = await User.findOne({
            username: String(username).trim().toLowerCase()
        });

        // Same message and roughly the same work for both failure modes,
        // so the response does not reveal whether the account exists
        if (!user || !user.verifyPassword(password)) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Account is disabled"
            });
        }

        const token = user.createToken();

        user.lastLogin = new Date();

        await user.save();

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Return the currently authenticated user
const getProfile = async (req, res) => {

    try {

        res.status(200).json({
            success: true,
            user: {
                id: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName,
                role: req.user.role,
                lastLogin: req.user.lastLogin
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Invalidate the current session token
const logout = async (req, res) => {

    try {

        req.user.token = null;
        req.user.tokenExpires = null;

        await req.user.save();

        res.status(200).json({
            success: true,
            message: "Logged out"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

module.exports = {
    login,
    getProfile,
    logout
};
