const {
  fillCalendar,
  getCalandar,
  updateCalendar,
} = require("../database/queries/calendar");

const handleFillCalendar = async (req, res) => {
  try {
    const result = await fillCalendar(req.session.user, req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Calendar Controller Error (fillCalendar):", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const handleGetCalendar = async (req, res) => {
  try {
    // אם הגיע ID ב-URL (כמו ב-Admin/Customer) נקח אותו, אחרת נקח מהסשן (כמו ב-Provider)
    const providerId = req.params.id || req.session?.user?.id;

    if (!providerId) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: "Provider ID is missing.",
      });
    }

    const result = await getCalandar(providerId);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Calendar Controller Error:", error);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      message: "Database error while fetching calendar.",
    });
  }
};

const handleUpdateCalendar = async (req, res) => {
  try {
    const result = await updateCalendar(req.session.user, req.body);
    return res.status(result.statusCode).json(result);
  } catch (error) {
    console.error("Calendar Controller Error (updateCalendar):", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

module.exports = {
  handleFillCalendar,
  handleGetCalendar,
  handleUpdateCalendar,
};
