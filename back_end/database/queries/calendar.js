const doQuery = require("../query");
/**
 * Saves or updates provider availability slots.
 * Validates operating hours, checks for overlaps, and merges overlapping slots.
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
 * Fetches all availability records for a specific provider.
 */
async function getCalandar(providerId) {
  const sql = `SELECT * FROM availability WHERE provider_id = ?`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

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
