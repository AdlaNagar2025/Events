const doQuery = require("../query");
/**
 * @function fillCalendar
 * @description שמירת חלונות זמן חדשים של ספק ביומן.
 * הפונקציה בודקת חפיפות מול חלונות קיימים ומבצעת "מיזוג חכם" (Smart Merge)
 * כדי למנוע כפילויות של שורות לאותו ספק באותו היום.
 *
 * @param {Object} provider - אובייקט הספק המכיל id ו-role
 * @param {Object} calendarData - נתוני חלון הזמן (available_date, start_time, end_time)
 * @returns {Object} אובייקט הצלחה/כישלון עם statusCode והודעה מתאימה
 */

async function fillCalendar(provider, calendarData) {
  const provider_id = provider.id;
  const provider_type = provider.role;
  let { available_date, start_time, end_time } = calendarData;

  // 1. Validation: Check for missing fields
  if (!available_date || !start_time || !end_time) {
    return {
      statusCode: 400,
      success: false,
      message: "Missing required fields.",
    };
  }

  // 2. Validation: Ensure logical timeline (End after Start)
  if (start_time >= end_time) {
    return {
      statusCode: 400,
      success: false,
      message: "End time must be after start time.",
    };
  }

  // 3. Validation: Enforce operating hours (08:00 - 24:00)
  if (start_time < "08:00" || end_time > "24:00") {
    return {
      statusCode: 400,
      success: false,
      message: "Working hours must be between 08:00 and 24:00.",
    };
  }

  // 4. Validation: Check if the date is in the past
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  if (available_date < todayStr) {
    return {
      statusCode: 400,
      success: false,
      message: "You cannot select a date in the past!",
    };
  }

  try {
    // מציאת כל הסלוטים שחופפים לזמן החדש
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
      // Smart Merge: איחוד כל טווחי השעות החופפים לטווח אחד רציף
      const allStarts = overlaps.map((s) => s.start_time).concat(start_time);
      const allEnds = overlaps.map((s) => s.end_time).concat(end_time);

      start_time = allStarts.sort()[0];
      end_time = allEnds.sort().reverse()[0];

      // ניקוי הסלוטים הישנים שחפפו
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

    // הכנסת הסלוט המאוחד/החדש
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
      statusCode: 200,
      success: true,
      message:
        overlaps.length > 0
          ? "Slots merged successfully!"
          : "Availability added successfully!",
    };
  } catch (error) {
    console.error("Database Error (fillCalendar):", error);
    return {
      statusCode: 500,
      success: false,
      message: "Internal server error.",
    };
  }
}



/**
 * حفظ نفس ساعات التوفر على نطاق تواريخ (من–إلى).
 * كل يوم يستدعي fillCalendar — نفس الـ Smart Merge بدون تغيير منطق اليوم الواحد.
 */
async function fillCalendarRange(provider, calendarData) {
  const { available_date, available_date_end, start_time, end_time } =
    calendarData;

  if (!available_date || !start_time || !end_time) {
    return {
      statusCode: 400,
      success: false,
      message: "Missing required fields.",
    };
  }

  const endDate = available_date_end || available_date;

  if (endDate < available_date) {
    return {
      statusCode: 400,
      success: false,
      message: "End date must be on or after start date.",
    };
  }

  // حد أقصى عشان ما نعلّق السيرفر (مثلاً ~4 شهور)
  const MAX_DAYS = 120;
  const start = new Date(`${available_date}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffDays =
    Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays > MAX_DAYS) {
    return {
      statusCode: 400,
      success: false,
      message: `Date range is too long. Max ${MAX_DAYS} days.`,
    };
  }

  let successCount = 0;
  let skippedPast = 0;
  let lastError = null;

  const cursor = new Date(start);
  while (cursor <= end) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    const dayStr = `${yyyy}-${mm}-${dd}`;

    const result = await fillCalendar(provider, {
      available_date: dayStr,
      start_time,
      end_time,
    });

    if (result.success) {
      successCount += 1;
    } else if (
      result.message &&
      result.message.includes("past")
    ) {
      skippedPast += 1;
    } else {
      lastError = result;
      // إذا يوم فشل لسبب ثاني — نقدر نكمل أو نوقف؛ هون منكمل
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  if (successCount === 0 && lastError) {
    return lastError;
  }

  if (successCount === 0) {
    return {
      statusCode: 400,
      success: false,
      message: "No availability was saved (all dates may be in the past).",
    };
  }

  return {
    statusCode: 200,
    success: true,
    message: `Availability saved for ${successCount} day(s).${
      skippedPast ? ` Skipped ${skippedPast} past day(s).` : ""
    }`,
    successCount,
    skippedPast,
  };
}

/**
 * @function getCalandar
 * @description שליפת כל חלונות הזמן הפנויים שספק הגדיר ביומן שלו.
 *
 * @param {number|string} providerId - מזהה הייחודי של הספק
 * @returns {Object} אובייקט תגובה אחיד עם statusCode ומערך הזמינויות
 */
async function getCalandar(providerId) {
  try {
    const sql = `SELECT * FROM availability WHERE provider_id = ? ORDER BY available_date ASC, start_time ASC`;
    const result = await doQuery(sql, [providerId]);

    return {
      statusCode: 200,
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Database Error (getCalandar):", error);
    return {
      statusCode: 500,
      success: false,
      message: "Failed to fetch calendar data.",
      data: [],
    };
  }
}

/**
 * @function updateCalendar
 * @description עדכון/מחיקת מקטע זמינות של ספק (כולל פיצול זמנים חכם).
 *
 * @param {Object} provider - אובייקט הספק המכיל id ו-role
 * @param {Object} calendarData - חלון הזמן שרוצים להסיר (available_date, start_time, end_time)
 * @returns {Object} אובייקט הצלחה/כישלון עם statusCode
 */

async function updateCalendar(provider, calendarData) {
  const provider_id = provider.id;
  const provider_type = provider.role;
  let { available_date, start_time, end_time } = calendarData;

  // 1. Validation: Check for missing fields
  if (!available_date || !start_time || !end_time) {
    return {
      statusCode: 400,
      success: false,
      message: "Missing required fields.",
    };
  }

  // 2. Validation: Ensure logical timeline
  if (start_time >= end_time) {
    return {
      statusCode: 400,
      success: false,
      message: "End time must be after start time.",
    };
  }

  // 3. Validation: Enforce operating hours
  if (start_time < "08:00" || end_time > "24:00") {
    return {
      statusCode: 400,
      success: false,
      message: "Working hours must be between 08:00 and 24:00.",
    };
  }

  // 4. Validation: Past date check
  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  if (available_date < todayStr) {
    return {
      statusCode: 400,
      success: false,
      message: "You cannot select a date in the past!",
    };
  }

  try {
    // בדיקה האם קיים אירוע מאושר שמתנגש עם טווח השעות שהספק מנסה למחוק
    const checkEventSql = `
      SELECT * FROM events
      LEFT JOIN event_providers ON events.event_id = event_providers.event_id
      WHERE requested_date = ?
        AND start_time < ?
        AND end_time > ?
        AND (
          (hall_id = ? AND events.status = 'APPROVED')
          OR
          (event_providers.provider_id = ? AND event_providers.status = 'APPROVED')
        )
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
        statusCode: 409,
        success: false,
        message:
          "Cannot delete or alter slot: An approved event already exists during this time!",
      };
    }

    // חישוב הבלוקים שנשארים פנויים לאחר הקיצוץ
    const newBlocks = await updateTimeAvail(
      available_date,
      provider_id,
      start_time,
      end_time,
    );

    // מחיקת כל הזמינות של אותו היום כדי להכניס את הבלוקים המעודכנים
    const deleteSql = `
      DELETE FROM availability
      WHERE provider_id = ?
        AND available_date = ?`;

    await doQuery(deleteSql, [provider_id, available_date]);

    // הכנסת הבלוקים החדשים שנותרו (כולל provider_type)
    for (const block of newBlocks) {
      const insertSql = `
        INSERT INTO availability (provider_id, provider_type, available_date, start_time, end_time)
        VALUES (?, ?, ?, ?, ?)`;
      await doQuery(insertSql, [
        provider_id,
        provider_type,
        available_date,
        block.start_time,
        block.end_time,
      ]);
    }

    return {
      statusCode: 200,
      success: true,
      message: "Availability updated successfully! ",
    };
  } catch (error) {
    console.error("Database Error (updateCalendar):", error);
    return {
      statusCode: 500,
      success: false,
      message: "Internal server error.",
    };
  }
}

/**
 * @function updateTimeAvail
 * @description פונקציית עזר לחישוב פיצול הבלוקים שנשארים פנויים.
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

    return finalFreeTimes;
  } catch (error) {
    console.error("Error in updateTimeAvail:", error);
    return [];
  }
}

module.exports = {fillCalendarRange , fillCalendar, getCalandar, updateCalendar };

