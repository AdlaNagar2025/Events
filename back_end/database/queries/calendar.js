const doQuery = require("../query");
/**
 * @function fillCalendar
 * @description שמירת חלונות זמן חדשים של ספק ביומן.
 * הפונקציה בודקת חפיפות מול חלונות קיימים ומבצעת "מיזוג חכם" (Smart Merge)
 * כדי למנוע כפילויות של שורות לאותו ספק באותו היום.
 * * @param {Object} provider - אובייקט הספק המכיל id ו-role
 * @param {Object} calendarData - נתוני חלון הזמן (available_date, start_time, end_time)
 * @returns {Object} אובייקט הצלחה/כישלון עם הודעה מתאימה
 */
async function fillCalendar(provider, calendarData) {
  const provider_id = provider.id;
  const provider_type = provider.role;
  let { available_date, start_time, end_time } = calendarData;

  // 1. Validation: Check for missing fields
  if (!available_date || !start_time || !end_time) {
    return { success: false, message: "Missing required fields" };
  }

  // 2. Validation: Ensure logical timeline (End after Start)
  if (start_time >= end_time) {
    return { success: false, message: "End time must be after start time" };
  }

  // 3. Validation: Enforce operating hours (08:00 - 24:00)
  if (start_time < "08:00" || end_time > "24:00") {
    return {
      success: false,
      message: "Working hours must be between 08:00 and 24:00.",
    };
  }

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  if (available_date < todayStr) {
    return { success: false, message: "You cannot select a date in the past!" };
  }

  try {
    // 1. מציאת כל הסלוטים שחופפים לזמן החדש
    const findOverlapSql = `
      SELECT * FROM availability 
      WHERE provider_id = ? 
      AND available_date = ? 
      AND start_time < ? 
      AND end_time > ?`;

    const overlaps = await doQuery(findOverlapSql, [
      provider_id,
      available_date,
      end_time,
      start_time,
    ]);

    if (overlaps.length > 0) {
      // Smart Merge: Combine all overlapping slots into one continuous range
      const allStarts = overlaps.map((s) => s.start_time).concat(start_time);
      const allEnds = overlaps.map((s) => s.end_time).concat(end_time);

      start_time = allStarts.sort()[0];
      end_time = allEnds.sort().reverse()[0];

      // Clean up: Remove old overlapping rows to prevent duplicates
      const deleteSql = `
        DELETE FROM availability 
        WHERE provider_id = ? 
        AND available_date = ? 
        AND start_time < ? 
        AND end_time > ?`;

      await doQuery(deleteSql, [
        provider_id,
        available_date,
        end_time,
        start_time,
      ]);
    }

    // Insert the finalized, clean availability slot
    const insertSql = `
      INSERT INTO availability 
      (provider_id, provider_type, available_date, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)`;

    await doQuery(insertSql, [
      provider_id,
      provider_type,
      available_date,
      start_time,
      end_time,
    ]);

    return {
      success: true,
      message:
        overlaps.length > 0
          ? "Slots merged successfully!"
          : "Availability added successfully!",
    };
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, message: "Internal server error" };
  }
}
/**
 * @function getCalandar
 * @description שליפת כל חלונות הזמן הפנויים שספק הגדיר ביומן שלו.
 * * @param {number|string} providerId - מזהה הייחודי של הספק
 * @returns {Array} מערך של אובייקטי זמינות מבסיס הנתונים
 */
async function getCalandar(providerId) {
  const sql = `SELECT * FROM availability WHERE provider_id = ?`;
  const result = await doQuery(sql, [providerId]);
  return result;
}
/**
 * @function updateCalendar
 * @description עדכון/מחיקת מקטע זמינות של ספק (כולל פיצול זמנים חכם).
 * הפונקציה בודקת מול טבלאות האירועים (events ו-event_providers) האם קיים אירוע
 * מאושר (APPROVED) בטווח השעות שהספק מבקש למחוק. אם נמצא אירוע חופף, הפעולה נחסמת
 * מיידית כדי למנוע מצב שספק "מעלים" שעות של אירוע קיים שהלקוח כבר שילם והזמין.
 * * @param {Object} provider - אובייקט הספק המכיל id ו-role
 * @param {Object} calendarData - חלון הזמן שרוצים להסיר (available_date, start_time, end_time)
 * @returns {Object} אובייקט הצלחה או הודעת שגיאה מפורטת במידה ויש אירוע חופף
 */
async function updateCalendar(provider, calendarData) {
  const provider_id = provider.id;
  const provider_type = provider.role;
  let { available_date, start_time, end_time } = calendarData;

  // 1. Validation: Check for missing fields
  if (!available_date || !start_time || !end_time) {
    return { success: false, message: "Missing required fields" };
  }

  // 2. Validation: Ensure logical timeline (End after Start)
  if (start_time >= end_time) {
    return { success: false, message: "End time must be after start time" };
  }

  // 3. Validation: Enforce operating hours (08:00 - 24:00)
  if (start_time < "08:00" || end_time > "24:00") {
    return {
      success: false,
      message: "Working hours must be between 08:00 and 24:00.",
    };
  }

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  if (available_date < todayStr) {
    return { success: false, message: "You cannot select a date in the past!" };
  }

  try {
    const checkEventSql = `
      SELECT * FROM events 
      LEFT JOIN event_providers ON events.event_id = event_providers.event_id 
      WHERE requested_date = ? 
        AND start_time < ? 
        AND end_time > ? 
        AND (hall_id = ?  AND events.status = 'APPROVED'  OR event_providers.provider_id = ? AND event_providers.status = 'APPROVED' )
    `;

    const approvedEvents = await doQuery(checkEventSql, [
      available_date,
      end_time,
      start_time,
      provider_id,
      provider_id,
    ]);

    if (approvedEvents.length > 0) {
      return {
        success: false,
        message:
          "Cannot delete or alter slot: An approved event already exists during this time!",
      };
    }
    const newBlocks = await updateTimeAvail(
      available_date,
      provider_id,
      start_time,
      end_time,
    );

    // Clean up: Remove old overlapping rows to prevent duplicates
    const deleteSql = `
        DELETE FROM availability 
        WHERE provider_id = ? 
        AND available_date = ? 
       `;

    await doQuery(deleteSql, [provider_id, available_date]);

    for (const block of newBlocks) {
      const insertSql = `
        INSERT INTO availability (provider_id, available_date, start_time, end_time) 
        VALUES (?, ?, ?, ?)`;
      await doQuery(insertSql, [
        provider_id,
        available_date,
        block.start_time,
        block.end_time,
      ]);
    }

    return {
      success: true,
      message: "Availability updated successfully! 🗑️",
    };
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, message: "Internal server error" };
  }
}
/**
 * @function updateTimeAvail
 * @description פונקציית עזר מתמטית/לוגית שמחשבת אילו חלונות זמן נשארים פנויים
 * לאחר שמורידים (מנקים) מקטע זמן ספציפי מתוך יום עבודה קיים.
 * * תפקיד עיקרי: פיצול סלוטים (לדוגמה: אם היום פנוי מ-08:00 עד 16:00, ומקצצים את 10:00-12:00,
 * הפונקציה תפצל ותחזיר שני סלוטים חדשים: 08:00-10:00 וכן 12:00-16:00).
 * * ⚠️ חוק ארכיטקטורה: הפונקציה הזו מחזירה **תמיד מערך** (Array), כדי לא לשבור
 * את לולאות ה-for-of שמריצות את שאילתות ה-Insert בפונקציה הקוראת לה.
 * * @param {string} date - התאריך המבוקש (YYYY-MM-DD)
 * @param {number|string} providerId - מזהה הספק
 * @param {string} removeStart - שעת תחילת המקטע למחיקה (HH:MM)
 * @param {string} removeEnd - שעת סיום המקטע למחיקה (HH:MM)
 * @returns {Array<Object>} מערך של אובייקטים עם הבלוקים שנשארו פנויים [{start_time, end_time}]
 */
async function updateTimeAvail(date, providerId, removeStart, removeEnd) {
  try {
    const availSql = `
        SELECT start_time, end_time FROM availability 
        WHERE available_date = ? AND provider_id = ? 
        ORDER BY start_time ASC`;
    const availabilityBlocks = await doQuery(availSql, [date, providerId]);
    const finalFreeTimes = [];

    availabilityBlocks.forEach((block) => {
      if (block.end_time <= removeStart || block.start_time >= removeEnd) {
        finalFreeTimes.push(block);
      } else {
        if (block.start_time < removeStart) {
          finalFreeTimes.push({
            start_time: block.start_time,
            end_time: removeStart,
          });
        }
        if (block.end_time > removeEnd) {
          finalFreeTimes.push({
            start_time: removeEnd,
            end_time: block.end_time,
          });
        }
      }
    });

    return finalFreeTimes; // תמיד מחזירה מערך!
  } catch (error) {
    console.error("Error in updateTimeAvail:", error);
    return [];
  }
}

module.exports = { fillCalendar, getCalandar, updateCalendar };
