const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const { isProvider, isConnected, isActive } = require("../Middleware/auth");
const {
  createBusinessProfile,
  checkStatus,
} = require("../database/queries/businessAccount");
const upload = require("../Middleware/upload");
const {
  uploadImagesToDB,
  getAllImages,
  deleteImage,
  setMainImage,
} = require("../database/queries/uploadImages");
const { fillCalendar, getCalandar } = require("../database/queries/calendar");
const {
  getProfile,
  updateBusinessStatus,
} = require("../database/queries/commonFunc");

/**
 * הגנה גלובלית על כל נתיבי ה-Provider:
 * כל נתיב שיוגדר מתחת לשורות אלו יחויב לעבור את שלושת הבדיקות בסדר הזה.
 */
router.use(isConnected); // שלב 1: האם הוא בכלל מחובר?
router.use(isActive); // שלב 2: האם החשבון שלו פעיל?
router.use(isProvider); // שלב 3: האם הוא ספק (Chief/Hall_Owner)?
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

    return res.json(result);
  } catch (error) {
    console.error("DEBUG ERROR:", error);
    return res.status(500).json({
      success: false,
      msg: "Server Error during profile creation",
      devError: error.message,
    });
  }
});
/**
 * @route   POST /provider/upload-gallery
 * @desc    העלאת עד 5 תמונות לגלריה ושמירת הנתיבים שלהן ב-DB.
 * @access  Private (Provider only)
 */

router.post("/upload-gallery", (req, res) => {
  // 1. קריאה ידנית לפונקציית ההעלאה כדי שנוכל לתפוס שגיאות (כמו Size Limit)
  upload.array("images", 5)(req, res, async (err) => {
    // בדיקה אם קרתה שגיאה של Multer (למשל: קובץ גדול מדי או יותר מ-5 תמונות)
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({
            success: false,
            message: "One or more files are too large (Max 2MB per image).",
          });
      }
      return res
        .status(400)
        .json({ success: false, message: `Upload error: ${err.message}` });
    }
    // בדיקה אם קרתה שגיאה אחרת (למשל: סוג קובץ לא תקין מה-fileFilter)
    else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // 2. אם הגענו לכאן - הקבצים עלו לשרת בהצלחה! עכשיו נשמור אותם ב-DB
    try {
      const providerId = req.session.user.id;
      const provider_type = req.session.user.role;
      const files = req.files;

      if (!files || files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No files selected." });
      }

      // שמירה ב-Database
      const dbResult = await uploadImagesToDB(providerId, provider_type, files);

      if (dbResult.success) {
        return res.json({
          success: true,
          message: "Gallery uploaded and saved successfully! ✨",
          count: files.length,
        });
      } else {
        return res.status(500).json(dbResult);
      }
    } catch (error) {
      console.error("Critical Upload Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process images after upload.",
      });
    }
  });
});

/**
 * @route   POST /provider/fillCalendar
 * @desc    הגדרת זמינות (תאריכים ושעות) ביומן של הספק.
 * @access  Private (Provider only)
 */
router.post("/fillCalendar", async (req, res) => {
  try {
    const result = await fillCalendar(req.session.user, req.body);
    return res.json(result);
  } catch (error) {
    console.error("Calendar Error:", error);
    return res.status(500).json({
      success: false,
      msg: "Server Error while updating calendar",
      devError: error.message,
    });
  }
});

router.get("/Profile/:id", async (req, res) => {
  const id = req.params.id;
  const result = await getProfile(id);
  return res.json({ success: true, data: result });
});
// routes/provider.js

router.get("/getMyCalendar", async (req, res) => {
  try {
    const providerId = req.session.user.id;
    const results = await getCalandar(providerId);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Database error" });
  }
});
router.get("/MyProfile", async (req, res) => {
  try {
    const providerId = req.session.user.id;
    console.log(providerId);
    const result = await getProfile(providerId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/MyImages", async (req, res) => {
  try {
    const providerId = req.session.user.id;
    const result = await getAllImages(providerId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/deleteImage/:imagePath", async (req, res) => {
  const imagePath = req.params.imagePath;

  if (!imagePath) {
    return res
      .status(400)
      .json({ success: false, message: "No image path provided" });
  }

  try {
    const dbResult = await deleteImage(imagePath);

    if (dbResult.affectedRows > 0) {
      const fullPath = path.join(__dirname, "../uploads", imagePath);

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath); // מוחק פיזית מהכונן
        console.log(`File ${imagePath} deleted from server disk.`);
      }

      return res.json({
        success: true,
        message: "Image deleted from DB and disk",
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Image not found in database" });
    }
  } catch (error) {
    console.error("Error in delete process:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during deletion" });
  }
});
router.post("/mainImage", async (req, res) => {
  try {
    const { imagePath } = req.body; 
    const providerId = req.session.user.id;

    await setMainImage(providerId, imagePath);
    res.json({ success: true, message: "Main image updated!" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update main image" });
  }
});

router.get("/MyBusinessStatus", async (req, res) => {
  try {
    const { id, role } = req.session.user;
    const status = await checkStatus(id, role);
    res.json({ success: true, status: status });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error checking status" });
  }
});

router.post("/approve-business", async (req, res) => {
  console.log(req.body);
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
module.exports = router;
