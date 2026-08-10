const express = require("express");
const router = express.Router();
const register = require("../database/queries/register");
const login = require("../database/queries/login");
const updateProfile = require("../database/queries/update");
const { isConnected, isActive } = require("../Middleware/auth");
const doQuery = require("../database/query");

/**
 * @route   POST /user/login
 * @desc    Authenticate user & establish session
 * @access  Public
 */
router.post("/login", async (req, res) => {
  try {
    const result = await login(req.body);
    if (!result.success) {
      return res.status(result.statusCode || 400).json(result);
    }
    req.session.user = result.user;
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in /login route:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error during login.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /user/register
 * @desc    Authenticate user
 * @access  Public
 */
router.post("/register", async (req, res) => {
  try {
    const result = await register(req.body);
    if (result.success && result.user) {
      req.session.user = result.user;
    }
    return res
      .status(result.statusCode || (result.success ? 201 : 400))
      .json(result);
  } catch (error) {
    console.error("Error in /Register route:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error during register.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   PUT /user/updateProfile
 * @desc    Update user profile
 * @access  User logged_in
 */
router.put("/updateProfile", isConnected, isActive, async (req, res) => {
  try {
    const result = await updateProfile(req.body, req.session.user);
    if (result.success) {
      req.session.user = result.updatedUser;
    }
    const statusCode = result.success ? 200 : result.statusCode || 400;
    return res.status(statusCode).json(result);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
      devError:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * @route   GET /user/logout
 * @desc    Logout user and clear session
 * @access  User logged_in
 */
router.get("/logout", (req, res) => {
  if (!req.session || !req.session.user) {
    return res
      .status(200)
      .json({ success: true, message: "Already logged out" });
  }
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout Error:", err);
      return res.status(500).json({ success: false, message: "Logout failed" });
    }

    res.clearCookie("connect.sid", { path: "/" });
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  });
});
router.get("/checkSession", async (req, res) => {
  try {
    if (!req.session || !req.session.user) {
      return res.status(200).json({ success: false, user: null });
    }

    const user = req.session.user;

    if (user.role === "Hall_Owner" || user.role === "Chief") {
      const tableName = user.role === "Hall_Owner" ? "halls" : "chiefs";
      const idColumn = user.role === "Hall_Owner" ? "hall_id" : "chief_id";

      const businessSql = `SELECT status FROM ${tableName} WHERE ${idColumn} = ?`;
      const businessResult = await doQuery(businessSql, [user.id]);

      user.status =
        businessResult.length > 0 ? businessResult[0].status : "DRAFT";

      req.session.user = user;
    }

    return res.status(200).json({ success: true, user: req.session.user });
  } catch (error) {
    console.error("Error in /checkSession:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error during checkSession.",
    });
  }
});
module.exports = router;
