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
  const result = await getEventData(req.body);
  return result;
});

module.exports = router;
