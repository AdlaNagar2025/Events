const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const {
  handleUploadGallery,
  handleGetImages,
  handleDeleteImage,
  handleSetMainImage,
} = require("../controllers/imagesController");

const {
  handleFillCalendar,
  handleGetCalendar,
  handleUpdateCalendar,
} = require("../controllers/calendarController");

const { writeReport } = require("../database/queries/report");
const { getProviderRating } = require("../database/queries/helpingFunc");
const {
  isProvider,
  isConnected,
  isActive,
  isApproved,
} = require("../Middleware/auth");
const {
  createBusinessProfile,
  checkStatus,
} = require("../database/queries/businessAccount");

const {
  getProfile,
  updateBusinessStatus,
  getAllCommentsAndReviews,
} = require("../database/queries/commonFunc");
const {
  getAllEvents,
  changeStatusEvent,
  getAllEventsApproved,
  getAllPendingEvents,
  getAllEventsAccordingToStatus,
} = require("../database/queries/providersFunc");
const {
  getAllNotification,
  updateReadToNotification,
  createNotification,
} = require("../database/queries/notifications");

/**
 * הגנה גלובלית על כל נתיבי ה-Provider:
 * כל נתיב שיוגדר מתחת לשורות אלו יחויב לעבור את שלושת הבדיקות בסדר הזה.
 */
router.use(isConnected); // שלב 1: האם הוא בכלל מחובר?
router.use(isActive); // שלב 2: האם החשבון שלו פעיל?
router.use(isProvider); // שלב 3: האם הוא ספק (Chief/Hall_Owner)?
// router.use(isApproved);
/**
 *
 *
 *
 * @route   POST /provider/businessAccount
 * @desc    יצירת פרופיל עסקי (שף או אולם).
 * @access  Private (Provider only)
 */
router.post("/businessAccount", async (req, res) => {
  try {
    const result = await createBusinessProfile({
      businessData: req.body,
      user: req.session.user,
    });

    return res.status(result.statusCode || 200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server is temporarily unavailable. Please try again later.",
    });
  }
});

// --- IMAGES ---
router.post("/upload-gallery", handleUploadGallery);
router.get("/MyImages", handleGetImages);
router.delete("/deleteImage/:imagePath", handleDeleteImage);
router.post("/mainImage", handleSetMainImage);

// --- CALENDAR ---
router.post("/fillCalendar", handleFillCalendar);
router.get("/getMyCalendar", handleGetCalendar);
router.post("/updateCalendar", handleUpdateCalendar);

router.get("/Profile/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getProfile(id);

    if (!result) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});
router.get("/MyProfile", async (req, res) => {
  try {
    const providerId = req.session.user.id;
    const result = await getProfile(providerId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// router.get("/MyBusinessStatus", async (req, res) => {
//   try {
//     const { id, role } = req.session.user;
//     const status = await checkStatus(id, role);
//     const avgRating = await getProviderRating(id);
//     console.log(avgRating )
//     res.json({ success: true, status: status, avgRating: avgRating });
//   } catch (error) {
//     res.status(500).json({ success: false, message: "Error checking status" });
//   }
// });
router.get("/MyBusinessStatusAndRating", async (req, res) => {
  try {
    const { id, role } = req.session.user;
    console.log(req.session.user);
    const [status, ratingData] = await Promise.all([
      checkStatus(id, role),
      getProviderRating(id),
    ]);
    console.log("Rating Data:", ratingData); // ידפיס למשל: { averageRating: 5, reviewCount: 1 }
    res.json({
      success: true,
      status: status,
      avgRating: ratingData.averageRating, // הממוצע האמיתי (למשל: 5.0)
      reviewCount: ratingData.reviewCount, // כמות המדרגים (למשל: 1)
    });
  } catch (error) {
    console.error("Error in MyBusinessStatus:", error);
    res.status(500).json({ success: false, message: "Error checking status" });
  }
});

router.post("/approve-business", async (req, res) => {
  const { type, id, newStatus } = req.body;
  if (!type || !id || !newStatus) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }
  try {
    await updateBusinessStatus(type, id, newStatus);
    res.json({ success: true, message: `Status updated to ${newStatus}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

router.get("/myEventsData", async (req, res) => {
  const result = await getAllEvents(req.session.user.id);
  return res.json({ data: result });
});

// router.put("/changeEventStatus/:eventId", async (req, res) => {
//   const eventId = req.params.eventId;
//   const status = req.body.status;
//   const eventData = req.body.eventData;

//   try {
//     const result = await changeStatusEvent(
//       req.session.user.id,
//       eventId,
//       status,
//       eventData,
//     );

//     return res.json(result);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// });

router.put("/changeEventStatus/:eventId", async (req, res) => {
  const eventId = req.params.eventId;
  const { status, eventData, reason, cancelledBy } = req.body;

  try {
    const result = await changeStatusEvent(
      req.session.user.id,
      eventId,
      status,
      eventData,
      { reason, cancelledBy },
    );

    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/AllEventsApproved", async (req, res) => {
  try {
    const result = await getAllEventsApproved(req.session.user.id);
    return res.json({ data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});
// router.get("/AllEventsAccordingToStaus:/status", async (req, res) => {
//   try {
//     const status = req.params.status;
//     const result = await getAllEventsAccordingToStatus(
//       req.session.user.id,
//       status,
//     );
//     return res.json({ data: result });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// });
// ✨ תיקון: שינוי הסינטקס של הראוט לשימוש תקין בפרמטר דינמי (:status)
router.get("/AllEventsAccordingToStatus/:status", async (req, res) => {
  try {
    const status = req.params.status.toUpperCase();

    const result = await getAllEventsAccordingToStatus(
      req.session.user.id,
      status,
    );
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
router.get("/allCommentsAndReviews", async (req, res) => {
  try {
    const result = await getAllCommentsAndReviews(req.session.user.id);
    return res.json({ data: result });
  } catch (error) {
    console.log(error);
  }
});

router.post("/writeReport", async (req, res) => {
  try {
    const result = await writeReport(req.session.user.id, req.body);
    return res.json({
      success: true,
      msg: "Report submitted successfully",
      result,
    });
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
