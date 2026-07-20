const express = require("express");
const router = express.Router();
const register = require("../database/queries/register");
const login = require("../database/queries/login");
const updateProfile = require("../database/queries/update");
const { isConnected, isActive } = require("../Middleware/auth");

//user/register
router.post("/register", async (req, res) => {
  console.log("Body received:", req.body);
  try {
    const result = await register(req.body);
    req.session.user = result.user;
    console.log(req.session);
    return res.json(result);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      msg: "Server Error",
      devError: error.message,
    });
  }
});

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

router.put("/updateProfile", isConnected, isActive, async (req, res) => {
  try {
    const result = await updateProfile(req.body, req.session.user);
    if (result.success) {
      req.session.user = result.updatedUser;
    }
    return res.json(result);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      msg: "Server Error",
      devError: error.message,
    });
  }
});
//user/logout
router.get("/logout", (req, res) => {
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) return res.json({ success: false, message: "Logout failed" });
      res.clearCookie("connect.sid");
      return res.json({ success: true, message: "Logged out successfully" });
    });
  } else {
    return res.json({ success: true, message: "Already logged out" });
  }
});

router.get("/checkSession", (req, res) => {
  return res.json({ success: true, user: req.session.user });
});

module.exports = router;
