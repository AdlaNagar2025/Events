const doQuery = require("../query");

async function getRole(id) {
  const sql = `SELECT role FROM users WHERE id=?`;
  const role = await doQuery(sql, [id]);
  return role[0]?.role;
}

// STATUS enum('PENDING', 'REJECTED', 'APPROVED', 'CANCELLED'...
async function getStatusEvent(eventId) {
  const hall = await doQuery(
    `SELECT hall_id FROM events WHERE event_id = ?`,
    [eventId],
  );

  let rows;
  if (!hall[0] || hall[0].hall_id == null) {
    rows = await doQuery(
      `SELECT status FROM event_providers WHERE event_id = ?`,
      [eventId],
    );
  } else {
    rows = await doQuery(
      `SELECT status FROM events WHERE event_id = ?
       UNION ALL
       SELECT status FROM event_providers WHERE event_id = ?`,
      [eventId, eventId],
    );
  }

  const statusList = rows.map((row) => row.status.toUpperCase());

  if (statusList.includes("REJECTED")) return "REJECTED";
  if (statusList.includes("PENDING")) return "PENDING";
  if (statusList.includes("CANCELLED")) return "CANCELLED";

  return statusList.length > 0 ? "APPROVED" : "PENDING";
}
async function AvailToEvent(eventId, date, providerId, event_start, event_end) {
  const availTimes = await getTimeAvail(eventId, date, providerId);

  // פונקציית עזר פנימית לנרמול זמן ל-HH:mm
  const normalize = (timeStr) => timeStr.substring(0, 5);

  const start = normalize(event_start);
  const end = normalize(event_end);

  for (const a of availTimes) {
    const availStart = normalize(a.start_time);
    const availEnd = normalize(a.end_time);

    if (start >= availStart && end <= availEnd) {
      return true;
    }
  }
  return false;
}

async function getTimeAvail(eventId, date, providerId) {
  try {
    const availSql = `
            SELECT start_time, end_time FROM availability 
            WHERE available_date = ? AND provider_id = ? 
            ORDER BY start_time ASC`;
    const availabilityBlocks = await doQuery(availSql, [date, providerId]);

    let eventSql = `
    SELECT start_time, end_time FROM events 
    WHERE requested_date = ? 
      AND hall_id = ? 
      AND status = 'APPROVED'
      AND (? IS NULL OR event_id <> ?)
    ORDER BY start_time ASC`;

    if ((await getRole(providerId)) === "Chief") {
      eventSql = `
        SELECT start_time, end_time FROM events 
        WHERE requested_date = ? 
          AND event_id IN (
            SELECT event_id FROM event_providers 
            WHERE provider_id = ? AND status = 'APPROVED'
          )
          AND (? IS NULL OR event_id <> ?)
        ORDER BY start_time ASC`;
    }
    const bookedEvents = await doQuery(eventSql, [
      date,
      providerId,
      eventId, // للـ (? IS NULL
      eventId, // للـ event_id <> ?)
    ]);


    const finalFreeTimes = [];

    availabilityBlocks.forEach((block) => {
      let currentTime = block.start_time;
      const blockEnd = block.end_time;

      const relevantEvents = bookedEvents.filter(
        (event) => event.start_time < blockEnd && event.end_time > currentTime,
      );

      relevantEvents.forEach((event) => {
        if (event.start_time > currentTime) {
          finalFreeTimes.push({
            start_time: currentTime,
            end_time: event.start_time,
          });
        }
        if (event.end_time > currentTime) {
          currentTime = event.end_time;
        }
      });

      if (currentTime < blockEnd) {
        finalFreeTimes.push({ start_time: currentTime, end_time: blockEnd });
      }
    });
    console.log("_________________________________________________")
    console.log(providerId);
    console.log(availabilityBlocks);
    console.log(bookedEvents);
    console.log(finalFreeTimes);

    return finalFreeTimes;
  } catch (error) {
    console.error("Error in getTimeAvail:", error);
    return [];
  }
}

async function getProviderRating(providerId) {
  const sql = `
    SELECT 
      ROUND(AVG(rating), 1) AS averageRating, 
      COUNT(rating) AS reviewCount 
    FROM reviews 
    WHERE provider_id = ?
  `;
  const result = await doQuery(sql, [providerId]);
  if (result && result.length > 0 && result[0].averageRating !== null) {
    return {
      averageRating: parseFloat(result[0].averageRating),
      reviewCount: result[0].reviewCount,
    };
  }
  return { averageRating: 0, reviewCount: 0 };
}

module.exports = {
  getRole,
  getStatusEvent,
  AvailToEvent,
  getProviderRating,
};
