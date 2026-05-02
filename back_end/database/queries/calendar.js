const doQuery = require("../query");
/**
 * פונקציה להגדרת חלונות זמינות ביומן עבור ספק.
 * מקבלת את פרטי הספק (מזהה ותפקיד) ואת נתוני הזמן (תאריך, שעת התחלה, שעת סיום וסטטוס זמינות).
 * הנתונים נשמרים בטבלת ה-availability לצורך הצגתם ללקוחות פוטנציאליים.
 */
async function fillCalendar(provider, calendarData) {
  const provider_id = provider.id;
  const provider_type = provider.role;
  const { available_date, start_time, end_time, is_available } = calendarData;
  if (
    !available_date ||
    !start_time ||
    !end_time ||
    is_available === undefined
  ) {
    
      return { success: false, message: "Missing required fields" };
  }
  if (start_time >= end_time) {
    return { success: false, message: "End time must be after start time" };
  }
  const today = new Date().toISOString().split('T')[0];
  if (available_date < today) {
    return { success: false, message: "Cannot set availability for past dates" };
  }

try {
    // 4. בונוס: בדיקה אם כבר קיים בדיוק אותו סלוט (מניעת כפילויות)
    const checkSql = `SELECT * FROM availability 
                      WHERE provider_id = ? AND available_date = ? 
                      AND start_time = ? AND end_time = ?`;
    const existing = await doQuery(checkSql, [provider_id, available_date, start_time, end_time]);
    
    if (existing.length > 0) {
      return { success: false, message: "This time slot already exists" };
    }

    // 5. הכנסה ל-DB
    const sql = `INSERT INTO availability 
                 (provider_id, provider_type, available_date, start_time, end_time, is_available) 
                 VALUES (?,?,?,?,?,?)`;
    const values = [provider_id, provider_type, available_date, start_time, end_time, is_available];
    
    await doQuery(sql, values);
    return { success: true, message: "Calendar updated successfully!" };

  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, message: "Internal server error" };
  }

}

async function getCalandar(providerId) {
  const sql = `SELECT * FROM availability WHERE provider_id=?`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

module.exports = {fillCalendar,getCalandar};
