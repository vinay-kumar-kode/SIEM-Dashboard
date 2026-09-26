// ======================================
// Sentinel SIEM - Auth Middleware
// middleware/auth.js
// ======================================

const User = require("../models/User");

// Reads the bearer token and attaches the matching user to req.user.
// Responds 401 rather than throwing, so controllers stay simple.
const requireAuth = async (req, res, next) => {

    try {

        const header = req.headers.authorization || "";

        const token = header.startsWith("Bearer ")
            ? header.slice(7).trim()
            : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const user = await User.findOne({
            token,
            tokenExpires: { $gt: new Date() }
        }).select("-password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Session expired or invalid"
            });
        }

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Account is disabled"
            });
        }

        req.user = user;

        next();

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Restrict a route to a set of roles
const requireRole = (...roles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions"
            });
        }

        next();

    };

};

module.exports = {
    requireAuth,
    requireRole
};
