const {
  updateBusinessStatus,
  getAllServicesAccordingToStatus,
} = require("../database/queries/adminService");

/**
 * @desc    Controller: מקבל בקשה לעדכון סטטוס עסק, מבצע ולידציה לנתונים ומחזיר תגובת HTTP מתאימה
 * @route   POST /api/admin/approve-business
 * @access  Private (Admin בלבד)
 * @param   {Object} req - אובייקט הבקשה (מכיל ב-body: type, id, newStatus, reason)
 * @param   {Object} res - אובייקט התגובה של Express
 */
const handleApproveBusiness = async (req, res) => {
  try {
    const { type, id, newStatus, reason } = req.body;

    if (!type || !id || !newStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: type, id, and newStatus are required.",
      });
    }

    await updateBusinessStatus(type, id, newStatus, reason);

    return res.status(200).json({
      success: true,
      message: `Business status successfully updated to ${newStatus}`,
    });
  } catch (error) {
    console.error("Error in handleApproveBusiness:", error);

    if (error.message === "INVALID_TABLE_NAME") {
      return res.status(400).json({
        success: false,
        message: "Invalid business type provided.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error while updating business status.",
    });
  }
};

/**
 * @desc    Controller: מקבל פרמטר סטטוס מה-URL ומחזיר את כל השירותים התואמים לסטטוס זה
 * @route   GET /api/admin/allServices/:status
 * @access  Private (Admin בלבד)
 * @param   {Object} req - אובייקט הבקשה (מכיל ב-params את ה-status)
 * @param   {Object} res - אובייקט התגובה של Express
 */
const handleGetServicesByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status parameter is required.",
      });
    }

    const services = await getAllServicesAccordingToStatus(status);

    return res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    console.error("Error in handleGetServicesByStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching services.",
    });
  }
};

module.exports = {
  handleApproveBusiness,
  handleGetServicesByStatus,
};
