// ======================================
// Sentinel SIEM - User Model
// models/User.js
// ======================================

const mongoose = require("mongoose");

const crypto = require("crypto");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        displayName: {
            type: String,
            required: true,
            trim: true
        },

        // scrypt digest as "salt:hash", never the plaintext
        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["admin", "analyst"],
            default: "analyst"
        },

        active: {
            type: Boolean,
            default: true
        },

        // Opaque session token issued at login, checked by middleware/auth.js
        token: {
            type: String,
            default: null
        },

        tokenExpires: {
            type: Date,
            default: null
        },

        lastLogin: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// How long an issued session token stays valid. Long enough to cover a
// shift without leaving a token usable on a machine left unattended.
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8;

// Hashes a plaintext password into the "salt:hash" form stored above.
// Uses node's built-in scrypt, so there is no native build step.
userSchema.statics.hashPassword = function (plaintext) {

    const salt = crypto.randomBytes(16).toString("hex");

    const hash = crypto
        .scryptSync(plaintext, salt, 64)
        .toString("hex");

    return `${salt}:${hash}`;

};

userSchema.methods.verifyPassword = function (candidate) {

    const [salt, storedHash] = (this.password || "").split(":");

    if (!salt || !storedHash) {
        return false;
    }

    const stored = Buffer.from(storedHash, "hex");

    const given = crypto
        .scryptSync(candidate, salt, 64);

    if (stored.length !== given.length) {
        return false;
    }

    return crypto.timingSafeEqual(stored, given);

};

// Issues an opaque session token and stamps its expiry onto the document.
// The caller persists both with user.save(); middleware/auth.js matches on
// the token and requires tokenExpires to still be in the future, so setting
// only one of the two would produce a token that never validates.
userSchema.methods.createToken = function () {

    const token = crypto.randomBytes(32).toString("hex");

    this.token = token;
    this.tokenExpires = new Date(Date.now() + TOKEN_TTL_MS);

    return token;

};

module.exports = mongoose.model("User", userSchema);
