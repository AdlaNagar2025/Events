const { handleGetImages } = require("../controllers/imagesController");
const { handleGetCalendar } = require("../controllers/calendarController");
const {
  handleGetProviderDetails,
} = require("../controllers/providerController");

const {
  handleApproveBusiness,
  handleGetServicesByStatus,
} = require("../controllers/adminController");

const {
  writeReport,
  getAllReportsAccordingToStatus,
  dismissReport,
  resolveReport,
} = require("../database/queries/report");
const register = require("../database/queries/register");
const express = require("express");
const { isConnected, isAdmin, isActive } = require("../Middleware/auth");
const {
  getAllUsers,
  getUsersByRole,
  deactivateUser,
  getAllUserStats,
  getSummaryStats
} = require("../database/queries/adminFunc");
const {
  updateBusinessStatus,
  getAllEventsApproved,
  getAllCommentsAndReviews,
} = require("../database/queries/commonFunc");

const {
  getAllNotification,
  updateReadToNotification,
  createNotification,
} = require("../database/queries/notifications");


const router = express.Router();

/**
 * הגנה גלובלית על כל נתיבי האדמין.
 * הסדר חשוב: קודם מחובר -> אחר כך בודקים שהוא פעיל -> בסוף בודקים שהוא אדמין.
 */
router.use(isConnected);
router.use(isActive);
router.use(isAdmin);

//PROVIDERSDATA
router.get("/provider-details/:id", handleGetProviderDetails);
router.get("/ProviderCalendar/:id", handleGetCalendar);
router.get("/ProviderImages/:id", handleGetImages);

router.post("/approve-business", handleApproveBusiness);
router.get("/allServices/:status/:limit", handleGetServicesByStatus);
router.get("/allServices/:status", handleGetServicesByStatus);
/**
 * שליפת כל המשתמשים במערכת
 */
router.get("/allUsers", async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Admin Error (allUsers):", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});


router.get("/summaryStats", async (req, res) => {
  try {
    const stats = await getSummaryStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error("Admin Error (summaryStats):", error);
    res.status(500).json({ success: false, message: "Failed to fetch summary stats" });
  }
});

/**
 * 2. שליפת משתמשים לפי תפקיד
 * קטע קוד זה משתמש בפרמטר גמיש (role) כדי לשלוף נתונים.
 */
router.get("/role/:role", async (req, res) => {
  try {
    const role = req.params.role;
    const users = await getUsersByRole(role);
    res.json({ success: true, data: users });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching users by role" });
  }
});

/**
 * 3. השבתת משתמש (Soft Delete)
 * נתיב חדש המאפשר לאדמין לכבות/להדליק חשבון משתמש
 */
router.put("/deactivate", async (req, res) => {
  const { userId, status } = req.body;
  try {
    await deactivateUser(status, userId);
    res.json({ success: true, message: "User status updated successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user activity status",
    });
  }
});








router.get("/ProviderEvents/:id", async (req, res) => {
  try {
    const providerId = req.params.id;
    const result = await getAllEventsApproved(providerId);
    return res.json({ data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/MyNotifications", async (req, res) => {
  try {
    const result = await getAllNotification(req.session.user.id);
    return res.json({ data: result });
  } catch (error) {
    console.log(error);
  }
});

router.put("/updateNotification/:id", async (req, res) => {
  try {
    const notificationId = req.params.id;
    const result = await updateReadToNotification(
      req.session.user.id,
      notificationId,
    );
    return res.json({ data: result });
  } catch (error) {
    console.log(error);
  }
});

router.get("/allCommentsAndReviews/:providerId", async (req, res) => {
  try {
    const { providerId } = req.params;
    const result = await getAllCommentsAndReviews(providerId);
    return res.json({ data: result });
  } catch (error) {
    console.log(error);
  }
});

router.get("/userStats", async (req, res) => {
  try {
    const result = await getAllUserStats();

    const stats = result[0] || {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      newRegistrations: 0,
    };

    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.post("/addUser", async (req, res) => {
  try {
    const result = await register(req.body);
    return res.json(result);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      msg: "Server Error",
      devError: error.message,
    });
  }
});

router.get("/allReports/:status/:limit", async (req, res) => {
  try {
    const { status=null , limit=null } = req.params;
    const result = await getAllReportsAccordingToStatus(status,limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
      devError: error.message,
    });
  }
});
router.get("/allReports", async (req, res) => {
  try {
    const { status=null , limit=null } = req.params;
    const result = await getAllReportsAccordingToStatus(status,limit);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
      devError: error.message,
    });
  }
});



// POST /admin/resolveReport
router.post("/resolveReport", async (req, res) => {
  try {
    const { reportId, newStatus } = req.body;

    // א) מקרה של דחיית התלונה - רק מעדכנים סטטוס ל-DISMISSED
    if (newStatus === "DISMISSED") {
      const result = await dismissReport(reportId);
      return res.json({
        success: true,
        message: result.message,
      });
    }

    // ב) מקרה של Resolve - מפעילים את הלוגיקה המורכבת
    const result = await resolveReport(req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      msg: "Server Error",
      devError: error.message,
    });
  }
});

module.exports = router;
