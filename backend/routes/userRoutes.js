const express = require("express");

const router = express.Router();

const {

    getUsers,
    createUser,
    updateUser,
    deleteUser

} = require("../controllers/userController");

const { requireAuth, requireRole } = require("../middleware/auth");

// Reading the user list requires any authenticated user
router.get("/", requireAuth, getUsers);

// Creating, editing and deleting accounts is admin only
router.post("/", requireAuth, requireRole("admin"), createUser);

router.put("/:id", requireAuth, requireRole("admin"), updateUser);

router.delete("/:id", requireAuth, requireRole("admin"), deleteUser);

module.exports = router;
