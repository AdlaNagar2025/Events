const doQuery = require("../query");
/**
 * שמירת נתיבי התמונות שהועלו בבסיס הנתונים.
 * מזהה אוטומטית אם אין תמונה ראשית ומגדירה את הראשונה כ-is_main = 1.
 *
 * @param {number} providerId - מזהה הספק
 * @param {string} providerType - סוג הספק (Chief/Hall_Owner)
 * @param {Array} files - מערך קבצים מ-Multer
 * @returns {Promise<Object>} אובייקט תגובה אחיד
 */
async function uploadImagesToDB(providerId, provider_type, files) {
  if (!files || files.length === 0) {
    return {
      statusCode: 400,
      success: false,
      message: "No images provided.",
    };
  }

  try {
    // 1. בדיקה אם לספק כבר יש תמונה ראשית
    const checkSql = `SELECT COUNT(*) as count FROM provider_images WHERE provider_id = ? AND is_main = 1`;
    const checkResult = await doQuery(checkSql, [providerId]);
    const hasMain = checkResult[0].count > 0;

    // 2. בניית ערכי ההכנסה (הראשונה תהיה main רק אם לא הייתה קיימת תמונה ראשית)
    const values = files.map((file, index) => [
      providerId,
      provider_type,
      file.filename,
      !hasMain && index === 0 ? 1 : 0,
    ]);

    const sql = `INSERT INTO provider_images (provider_id, provider_type, image_path, is_main) VALUES ?`;
    await doQuery(sql, [values]);
    return {
      statusCode: 200,
      success: true,
      message: `${files.length} images uploaded and saved successfully! ✨`,
    };
  } catch (err) {
    console.error("DB Error (uploadImagesToDB):", err);
    return {
      statusCode: 500,
      success: false,
      message: "A database error occurred while saving image paths.",
    };
  }
}

/**
 * שליפת כל התמונות השייכות לספק מסוים.
 *
 * @param {number} providerId - מזהה הספק
 * @returns {Promise<Object>} אובייקט תגובה אחיד עם מערך התמונות
 */
async function getAllImages(providerId) {
  try {
    const sql = `SELECT * FROM provider_images WHERE provider_id = ? `;
    const result = await doQuery(sql, [providerId]);

    return {
      statusCode: 200,
      success: true,
      data: result,
    };
  } catch (err) {
    console.error("DB Error (getAllImages):", err);
    return {
      statusCode: 500,
      success: false,
      message: "Failed to fetch images from database.",
    };
  }
}

/**
 * מחיקת תמונה מה-DB תוך אימות שייכות לספק.
 * אם התמונה שנמחקה הייתה main, מגדיר תמונה חלופית כ-main.
 *
 * @param {number} providerId - מזהה הספק המבקש
 * @param {string} imagePath - נתיב/שם הקובץ למחיקה
 * @returns {Promise<Object>} אובייקט תגובה אחיד
 */
async function deleteImage(providerId, imagePath) {
  try {
    // 1. בדיקה שהתמונה אכן שייכת לספק שמתקשר עכשיו (אבטחה!)
    const checkSql = `SELECT is_main FROM provider_images WHERE provider_id = ? AND image_path = ?`;
    const checkResult = await doQuery(checkSql, [providerId, imagePath]);

    if (checkResult.length === 0) {
      return {
        statusCode: 404,
        success: false,
        message: "Image not found or access denied.",
      };
    }

    const wasMain = checkResult[0].is_main === 1;

    // 2. מחיקת התמונה
    const deleteSql = `DELETE FROM provider_images WHERE provider_id = ? AND image_path = ?`;
    await doQuery(deleteSql, [providerId, imagePath]);

    // 3. אם התמונה שנמחקה הייתה ראשית, נגדיר את אחת התמונות הנותרות כראשית
    if (wasMain) {
      const setNextMainSql = `
        UPDATE provider_images 
        SET is_main = 1 
        WHERE provider_id = ? 
        ORDER BY is_main DESC 
        LIMIT 1
      `;
      await doQuery(setNextMainSql, [providerId]);
    }

    return {
      statusCode: 200,
      success: true,
      message: "Image deleted successfully.",
    };
  } catch (err) {
    console.error("DB Error (deleteImage):", err);
    return {
      statusCode: 500,
      success: false,
      message: "Failed to delete image from database.",
    };
  }
}
/**
 * הגדרת תמונה ספציפית כתמונה הראשית של הספק (איפוס השאר ל-0).
 *
 * @param {number} providerId - מזהה הספק
 * @param {string} imagePath - נתיב התמונה החדשה שתהיה ראשית
 * @returns {Promise<Object>} אובייקט תגובה אחיד
 */
async function setMainImage(providerId, imagePath) {
  try {
    // 1. איפוס כל התמונות של הספק ל-0
    const sqlReset = `UPDATE provider_images SET is_main = 0 WHERE provider_id = ?`;
    await doQuery(sqlReset, [providerId]);

    // 2. הגדרת התמונה הנבחרת ל-1 (בתנאי שהיא שייכת לספק)
    const sqlSet = `UPDATE provider_images SET is_main = 1 WHERE provider_id = ? AND image_path = ?`;
    const result = await doQuery(sqlSet, [providerId, imagePath]);

    if (result.affectedRows === 0) {
      return {
        statusCode: 404,
        success: false,
        message: "Image not found for this provider.",
      };
    }

    return {
      statusCode: 200,
      success: true,
      message: "Main image updated successfully! ✨",
    };
  } catch (err) {
    console.error("DB Error (setMainImage):", err);
    return {
      statusCode: 500,
      success: false,
      message: "Failed to update main image.",
    };
  }
}

module.exports = {
  uploadImagesToDB,
  getAllImages,
  deleteImage,
  setMainImage,
};
