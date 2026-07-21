const path = require("path");
const fs = require("fs");
const upload = require("../Middleware/upload");
const {
  uploadImagesToDB,
  getAllImages,
  deleteImage,
  setMainImage,
} = require("../database/queries/uploadImages");

// 1. העלאת גלריה
const handleUploadGallery = (req, res) => {
  upload.array("images", 5)(req, res, async (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          statusCode: 400,
          success: false,
          message: "One or more files are too large (Max 2MB per image).",
        });
      }
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: err.message || "Upload error.",
      });
    }

    try {
      const providerId = req.session.user.id;
      const providerType = req.session.user.role;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          statusCode: 400,
          success: false,
          message: "No files selected.",
        });
      }

      const result = await uploadImagesToDB(providerId, providerType, files);
      return res.status(result.statusCode).json(result);
    } catch (error) {
      console.error("Critical Upload Error:", error);
      return res.status(500).json({
        statusCode: 500,
        success: false,
        message: "Failed to process images after upload.",
      });
    }
  });
};

const handleGetImages = async (req, res) => {
  try {
    const providerId = req.params.id || req.session?.user?.id;

    if (!providerId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Provider ID is missing.",
      });
    }

    const result = await getAllImages(providerId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Images Controller Error:", error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Server error while fetching images.",
    });
  }
};
// 3. מחיקת תמונה
const handleDeleteImage = async (req, res) => {
  const { imagePath } = req.params;
  const providerId = req.session.user.id;

  if (!imagePath) {
    return res.status(400).json({
      statusCode: 400,
      success: false,
      message: "No image path provided.",
    });
  }

  try {
    const result = await deleteImage(providerId, imagePath);

    // מחיקה פיזית מהדיסק במידה וה-DB עודכן
    if (result.success) {
      const fullPath = path.join(__dirname, "../uploads", imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Error in delete process:", error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Server error during image deletion.",
    });
  }
};

// 4. הגדרת תמונה ראשית
const handleSetMainImage = async (req, res) => {
  try {
    const { imagePath } = req.body;
    const providerId = req.session.user.id;

    if (!imagePath) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Missing image path.",
      });
    }

    const result = await setMainImage(providerId, imagePath);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Main Image Update Error:", error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Failed to update main image.",
    });
  }
};

module.exports = {
  handleUploadGallery,
  handleGetImages,
  handleDeleteImage,
  handleSetMainImage,
};
