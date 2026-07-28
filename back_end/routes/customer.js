const express = require("express");

const { isConnected, isCustomer, isActive } = require("../Middleware/auth");

const { handleGetImages } = require("../controllers/imagesController");

const { handleGetCalendar } = require("../controllers/calendarController");

const {
  handleGetProviderDetails,
} = require("../controllers/providerController");

const customerController = require("../controllers/customerController");

const { handleGetServicesByStatus } = require("../controllers/adminController");

const {
  writeReport,
  getAllReports,
  updateStatusReport,
} = require("../database/queries/report");

const {
  getMainFoto,
  getAllEventsApproved,
  getAllCommentsAndReviews,
} = require("../database/queries/commonFunc");

const {
  getAllNotification,
  updateReadToNotification,
  createNotification,
} = require("../database/queries/notifications");

const {
  getResultSearching,
  createEventData,
  getAllEventsData,
  updateEventData,
  cancelEvent,
  ReviewProvider,
  disCancelEvent,
  ReviewAndComment,
} = require("../database/queries/customerFunc");

const router = express.Router();
/**
 * הגנה גלובלית על כל נתיבי משתמש.
 * הסדר חשוב: קודם מחובר -> אחר כך בודקים שהוא פעיל -> בסוף בודקים שהוא משתמש.
 */
router.use(isConnected);
router.use(isActive);
router.use(isCustomer);

router.get("/provider-details/:id", handleGetProviderDetails);

router.get("/ProviderCalendar/:id", handleGetCalendar);
router.get("/ProviderImages/:id", handleGetImages);

router.get("/AllServices/:status", handleGetServicesByStatus);
router.post("/Searching", customerController.handlesearchProviders);

// ❤️ מועדפים (Favorites)
router.get(
  "/AllFavoritesProvidersId",
  customerController.getAllFavoritesProvidersId,
);
router.get(
  "/AllFavoritesProviders",
  customerController.getAllFavoritesProviders,
);
router.post("/addFavoriteProvider", customerController.addFavoriteProvider);

router.delete(
  "/removeFavoriteProvider/:providerId",
  customerController.removeFavoriteProvider,
);

router.get("/MainFoto/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getMainFoto(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching Main Foto:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/createEvent", async (req, res) => {
  try {
    console.log(req.body);
    const result = await createEventData(req.body, req.session.user.id);
    return res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/myEventsData", async (req, res) => {
  try {
    const result = await getAllEventsData(req.session.user.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error in /myEventsData:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/updateEventData/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const result = await updateEventData(
      req.body,
      req.session.user.id,
      eventId,
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/cancelEvent/:id", async (req, res) => {
  try {
    console.log(req.session.user);
    const eventId = req.params.id;
    const result = await cancelEvent(eventId);
    return res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.put("/disCancelEvent/:id", async (req, res) => {
  try {
    console.log(req.session.user);
    const eventId = req.params.id;
    const result = await disCancelEvent(eventId);
    return res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/ReviewProvider", async (req, res) => {
  try {
    console.log(req.body);
    const result = await ReviewProvider(req.body, req.session.user.id);
    return res.json(result);
  } catch (error) {
    console.error("Error adding review:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to add review" });
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

router.post("/EventComments/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const providerId = req.body.providerId;

    if (!providerId) {
      return res.status(400).json({ error: "providerId is required in body" });
    }
    const result = await ReviewAndComment(eventId, userId, providerId);
    return res.json(result);
  } catch (error) {
    console.error("Backend error fetching comments:", error);
    return res.status(500).json({ error: "Internal server error" });
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
