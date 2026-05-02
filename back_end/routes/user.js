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

//user/login
router.post("/login", async (req, res) => {
  try {
    const result = await login(req.body);
    if (!result.success) {
      return res.json(result);
    }
    if (result.user.is_active === 0) {
      return res.status(403).json({
        success: false,
        message: "Your account is disabled. Please contact the administrator.",
      });
    }
    req.session.user = result.user;
    return res.json(result);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      msg: "Server Error",
      devError: error.message,
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
