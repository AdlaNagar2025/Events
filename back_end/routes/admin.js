/**
 * ראוטר לניהול מערכת (Admin Router)
 * מכיל את כל נתיבי ה-API שחשופים רק למנהלי מערכת.
 */
const {
  writeReport,
  getAllReports,
  updateStatusReport,
  getAllPendingReports,
  resolveReport,
} = require("../database/queries/report");
const register = require("../database/queries/register");
const express = require("express");
const { isConnected, isAdmin, isActive } = require("../Middleware/auth");
const {
  getAllUsers,
  getUsersByRole,
  getAllChiefsProfile,
  getAllHallsOwnerProfile,
  getAllServices,
  deactivateUser,
  getAllServicesAccordingToStatus,
  getAllUserStats,
} = require("../database/queries/adminFunc");
const {
  getProfile,
  updateBusinessStatus,
  getAllEventsApproved,
  getAllCommentsAndReviews,
} = require("../database/queries/commonFunc");
const { getAllImages } = require("../database/queries/uploadImages");
const { getCalandar } = require("../database/queries/calendar");

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

/**
 * שליפת כל הפרופילים העסקיים של השפים
 */
router.get("/allChiefsProfile", async (req, res) => {
  try {
    const profiles = await getAllChiefsProfile();
    res.json({ success: true, data: profiles });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch chief profiles" });
  }
});

/**
 * שליפת כל הפרופילים העסקיים של האולמות
 */
router.get("/allHallsOwnerProfile", async (req, res) => {
  try {
    const profiles = await getAllHallsOwnerProfile();
    res.json({ success: true, data: profiles });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch hall profiles" });
  }
});

/**
 * שליפת כל העסקים שממתינים לאישור
 */
router.get("/pending-businesses", async (req, res) => {
  try {
    const chiefs = await getPendingChiefs();
    const halls = await getPendingHalls();
    res.json({
      success: true,
      data: { chiefs, halls },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch pending requests" });
  }
});

router.get("/allServices", async (req, res) => {
  try {
    const result = await getAllServices();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch services " });
  }
});

router.get("/allServices/:status", async (req, res) => {
  try {
    const status = req.params.status;
    const result = await getAllServicesAccordingToStatus(status);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch pending services " });
  }
});

/**
 *  אישור עסק
 * כאן האדמין מקבל החלטה על עסק שממתין. הוא שולח 'approved' או 'deny'.
 */
// router.post("/approve-business", async (req, res) => {
//   console.log(req.body);
//   const { type, id, newStatus } = req.body;
//   if (!type || !id || !newStatus) {
//     return res
//       .status(400)
//       .json({ success: false, message: "Missing required fields" });
//   }
//   try {
//     await updateBusinessStatus(type, id, newStatus);
//     res.json({ success: true, message: `Status updated to ${newStatus}` });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Update failed" });
//   }
// });

router.post("/approve-business", async (req, res) => {
  console.log(req.body);
  const { type, id, newStatus, reason } = req.body;

  if (!type || !id || !newStatus) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    await updateBusinessStatus(type, id, newStatus, reason);
    res.json({ success: true, message: `Status updated to ${newStatus}` });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

router.get("/Profile/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getProfile(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/ProviderImages/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getAllImages(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/ProviderCalendar/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getCalandar(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching images:", error);
    res.status(500).json({ success: false, message: "Server error" });
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

    // ✨ תיקון: לוקחים את האיבר הראשון במערך שחוזר מה-DB
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

router.get("/allReports", async (req, res) => {
  try {
    const result = await getAllReports();
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

// router.put("/updateReport", async (req, res) => {
//   try {
//     const { newStatus, reportId } = req.body;

//     if (!newStatus || !reportId) {
//       return res.status(400).json({ success: false, msg: "Missing fields" });
//     }

//     await updateStatusReport(newStatus, reportId);
//     return res.json({
//       success: true,
//       msg: `Report status updated to ${newStatus}`,
//     });
//   } catch (error) {
//     console.error("DEBUG ERROR:", error);
//     return res.status(500).json({
//       success: false,
//       msg: "Server Error",
//       devError: error.message,
//     });
//   }
// });

router.get("/allPendingReports", async (req, res) => {
  try {
    const result = await getAllPendingReports();
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
      await db.query(`UPDATE reports SET status = 'DISMISSED' WHERE id = ?`, [
        reportId,
      ]);
      return res.json({
        success: true,
        message: "Report was dismissed successfully.",
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
