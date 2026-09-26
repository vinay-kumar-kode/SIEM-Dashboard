// ======================================
// Sentinel SIEM - User Controller
// controllers/userController.js
// ======================================

const User = require("../models/User");

// Get all users
const getUsers = async (req, res) => {

    try {

        // password and token are never selected
        const users = await User.find().select("-password -token").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Create a new user
const createUser = async (req, res) => {

    try {

        const { username, displayName, password, role } = req.body;

        if (!username || !displayName || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, display name and password are required"
            });
        }

        const normalised = String(username).trim().toLowerCase();

        const existing = await User.findOne({ username: normalised });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Username already exists"
            });
        }

        const user = await User.create({
            username: normalised,
            displayName,
            role,
            password: User.hashPassword(password)
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                active: user.active
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Update a user. Only the supplied fields are changed; password is
// re-hashed when present.
const updateUser = async (req, res) => {

    try {

        const { displayName, password, role, active } = req.body;

        const update = {};

        if (displayName !== undefined) {
            update.displayName = displayName;
        }

        if (role !== undefined) {
            update.role = role;
        }

        if (active !== undefined) {
            update.active = active;
        }

        if (password) {
            update.password = User.hashPassword(password);
        }

        if (Object.keys(update).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields to update"
            });
        }

        // Lockout guard: the API for managing users and settings is admin
        // only, so removing the last admin (including by demoting yourself)
        // would leave the deployment with nobody able to undo it. The same
        // reasoning covers deactivating the final admin.
        const losesAdmin = update.role !== undefined
            && update.role !== "admin"
            || update.active === false;

        if (losesAdmin) {

            const target = await User.findById(req.params.id);

            if (target && target.role === "admin" && target.active) {

                const remaining = await User.countDocuments({
                    role: "admin",
                    active: true,
                    _id: { $ne: target._id }
                });

                if (remaining === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "At least one active administrator must remain"
                    });
                }

            }

        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true }
        ).select("-password -token");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

// Delete a user
const deleteUser = async (req, res) => {

    try {

        // Guard against removing the last usable admin account
        if (req.user && req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account"
            });
        }

        // A different admin can still be the last one standing.
        const target = await User.findById(req.params.id);

        if (target && target.role === "admin" && target.active) {

            const remaining = await User.countDocuments({
                role: "admin",
                active: true,
                _id: { $ne: target._id }
            });

            if (remaining === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one active administrator must remain"
                });
            }

        }

        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }

};

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};
