const express = require("express");
const { isConnected, isCustomer, isActive } = require("../Middleware/auth");
const { getProfile, getMainFoto } = require("../database/queries/commonFunc");
const { getAllImages } = require("../database/queries/uploadImages");
const { getCalandar } = require("../database/queries/calendar");
const {
  getAllServicesAccordingToStatus,
} = require("../database/queries/adminFunc");
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
    console.error("Error fetching Calendar:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
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

module.exports = router;
