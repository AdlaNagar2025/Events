const {
  fillCalendar,
  fillCalendarRange,
  getCalandar,
  updateCalendar,
  updateCalendarRange,
} = require("../database/queries/calendar");

const handleFillCalendar = async (req, res) => {
  try {
    const { available_date, available_date_end } = req.body;

    // إذا في تاريخ نهاية مختلف → نطاق أيام؛ وإلا يوم واحد زي الأول
    const useRange =
      available_date_end &&
      available_date &&
      available_date_end !== available_date;

    const result = useRange
      ? await fillCalendarRange(req.session.user, req.body)
      : await fillCalendar(req.session.user, req.body);

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
    const { available_date, available_date_end } = req.body;

    const useRange =
      available_date_end &&
      available_date &&
      available_date_end !== available_date;

    const result = useRange
      ? await updateCalendarRange(req.session.user, req.body)
      : await updateCalendar(req.session.user, req.body);

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
