const express = require("express");

const { handleGetImages } = require("../controllers/imagesController");

const { handleGetCalendar } = require("../controllers/calendarController");

const {
  writeReport,
  getAllReports,
  updateStatusReport,
} = require("../database/queries/report");
const { isConnected, isCustomer, isActive } = require("../Middleware/auth");
const {
  getProfile,
  getMainFoto,
  getAllEventsApproved,
  getAllCommentsAndReviews,
} = require("../database/queries/commonFunc");
const { getAllImages } = require("../database/queries/uploadImages");
const { getCalandar } = require("../database/queries/calendar");
const {
  getAllServicesAccordingToStatus,
} = require("../database/queries/adminFunc");
const {
  getAllNotification,
  updateReadToNotification,
  createNotification,
} = require("../database/queries/notifications");
const {
  getResultSearching,
  getEventData,
  getAllEventsData,
  updateEventData,
  cancelEvent,
  addFavorite,
  removeFavorite,
  getAllFavorites,
  getAllFavoritesProviders,
  ReviewProvider,
  disCancelEvent,
  ReviewAndComment,
} = require("../database/queries/customerFunc");
const { getProviderCardData } = require("../database/queries/businessAccount");
const router = express.Router();
/**
 * הגנה גלובלית על כל נתיבי משתמש.
 * הסדר חשוב: קודם מחובר -> אחר כך בודקים שהוא פעיל -> בסוף בודקים שהוא משתמש.
 */
router.use(isConnected);
router.use(isActive);
router.use(isCustomer);

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
//PROVIDERSDATA
router.get("/ProviderCalendar/:id", handleGetCalendar);
router.get("/ProviderImages/:id", handleGetImages);

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

router.get("/AllServices", async (req, res) => {
  const result = await getAllServicesAccordingToStatus("APPROVED");
  console.log("I am in BACKEND " + result);
  return res.json({ success: true, data: result });
});

router.post("/Searching", async (req, res) => {
  try {
    const result = await getResultSearching(req.body);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Route Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

router.get("/CardData/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await getProviderCardData(id);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching Main Foto:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/eventData", async (req, res) => {
  try {
    console.log(req.body);
    const result = await getEventData(req.body, req.session.user.id);
    return res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/myEventsData", async (req, res) => {
  const result = await getAllEventsData(req.session.user.id);
  return res.json({ sucess: true, data: result });
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

// --- Routes ---

router.get("/AllFavoritesProvidersId", async (req, res) => {
  const providerIds = await getAllFavorites(req.session.user.id);
  return res.json({ success: true, data: providerIds });
});

router.post("/addFavoriteProvider", async (req, res) => {
  const providerId = req.body.providerId;
  const result = await addFavorite(req.session.user.id, req.body.providerId);
  return res.json(result);
});

router.delete("/removeFavoriteProvider/:providerId", async (req, res) => {
  const result = await removeFavorite(
    req.session.user.id,
    req.params.providerId,
  );
  return res.json(result);
});

router.get("/AllFavoritesProviders", async (req, res) => {
  const providers = await getAllFavoritesProviders(req.session.user.id);
  return res.json({ success: true, data: providers });
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
