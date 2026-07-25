// ייבוא כל הפונקציות מה-Queries
const {
  getResultSearching,
  getAllApprovedServicesQuery,
  getAllFavoritesQuery,
  addFavoriteQuery,
  removeFavoriteQuery,
  getAllFavoritesProvidersQuery,
} = require("../database/queries/customerFunc");

// 1. חיפוש ספקים דינמי
const handlesearchProviders = async (req, res) => {
  try {
    const result = await getResultSearching(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (error) {
    console.error("Route Error (handlesearchProviders):", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// 2. שליפת כל הספקים המאושרים
const handleGetAllApprovedServices = async (req, res) => {
  try {
    const providers = await getAllApprovedServicesQuery();
    return res.json({ success: true, data: providers });
  } catch (error) {
    console.error("Route Error (handleGetAllApprovedServices):", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// 3. מועדפים - שליפת IDs בלבד
const getAllFavoritesProvidersId = async (req, res) => {
  try {
    const providerIds = await getAllFavoritesQuery(req.session.user.id);
    return res.json({ success: true, data: providerIds });
  } catch (error) {
    console.error("Route Error (getAllFavoritesProvidersId):", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// 4. מועדפים - הוספת ספק
const addFavoriteProvider = async (req, res) => {
  try {
    const providerId = req.body.providerId;
    const result = await addFavoriteQuery(req.session.user.id, providerId);
    return res.json(result);
  } catch (error) {
    console.error("Route Error (addFavoriteProvider):", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// 5. מועדפים - הסרת ספק
const removeFavoriteProvider = async (req, res) => {
  try {
    const result = await removeFavoriteQuery(
      req.session.user.id,
      req.params.providerId,
    );
    return res.json(result);
  } catch (error) {
    console.error("Route Error (removeFavoriteProvider):", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// 6. מועדפים - שליפת פרטי ספקים מלאים
const getAllFavoritesProviders = async (req, res) => {
  try {
    const providers = await getAllFavoritesProvidersQuery(req.session.user.id);
    return res.json({ success: true, data: providers });
  } catch (error) {
    console.error("Route Error (getAllFavoritesProviders):", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// ייצוא מרוכז של כל הפונקציות
module.exports = {
  handlesearchProviders,
  handleGetAllApprovedServices,
  getAllFavoritesProvidersId,
  addFavoriteProvider,
  removeFavoriteProvider,
  getAllFavoritesProviders,
};
