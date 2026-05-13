const doQuery = require("../query");
const { getRole } = require("./helpingFunc");

async function getAllEvents(providerId) {
  let sql = `SELECT * FROM events WHERE hall_id=? ORDER BY events.requested_date , events.start_time ASC`;
  if ((await getRole(providerId)) === "Chief")
    sql = `SELECT events.event_id,events.requested_date,events.start_time,events.end_time,events.guest_number,events.notes,event_providers.status FROM events JOIN event_providers ON event_providers.event_id=events.event_id  and provider_id=? ORDER BY events.requested_date , events.start_time ASC;
`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

async function changeStatusEvent(providerId, eventId, newStatus, eventData) {
  const role = await getRole(providerId);
  let checkSql = "";
  let checkParams = [];

  // 1. הגדרת שאילתת הבדיקה לפי תפקיד
  if (role === "Chief") {
    checkSql = `
      SELECT * FROM events e
      JOIN event_providers ep ON e.event_id = ep.event_id
      WHERE e.requested_date = ?
        AND ep.provider_id = ?
        AND ep.status = 'APPROVED'
        AND e.event_id != ?        -- חשוב: אל תמצא את האירוע הנוכחי שאתה מנסה לאשר
        AND e.start_time < ?       -- eventData.end_time
        AND e.end_time > ?         -- eventData.start_time
    `;
    checkParams = [
      eventData.requested_date,
      providerId,
      eventId,
      eventData.end_time, // סוף האירוע החדש
      eventData.start_time, // תחילת האירוע החדש
    ];
  } else {
    // לוגיקה לבעל אולם
    checkSql = `
      SELECT * FROM events 
      WHERE requested_date = ? 
        AND hall_id = ? 
        AND status = 'APPROVED' 
        AND event_id != ?
        AND start_time < ? 
        AND end_time > ?`;
    checkParams = [
      eventData.requested_date,
      providerId,
      eventId,
      eventData.end_time,
      eventData.start_time,
    ];
  }

  // 2. בדיקה האם קיים אירוע חופף
  const overlaps = await doQuery(checkSql, checkParams);
  console.log("Overlapping events found:", overlaps.length);

  if (overlaps.length === 0 || newStatus === "REJECTED") {
    // 3. עדכון הסטטוס
    let updateSql = "";
    if (role === "Chief") {
      updateSql = `UPDATE event_providers SET status=? WHERE provider_id=? AND event_id=?`;
    } else {
      updateSql = `UPDATE events SET status=? WHERE hall_id=? AND event_id=?`;
    }

    await doQuery(updateSql, [newStatus, providerId, eventId]);
    return { success: true };
  }

  return {
    success: false,
    message: "Provider is already booked for this time range.",
  };
}

//CHIEFS
async function getAllEventsApproved(providerId) {
  const role = await getRole(providerId);
  let sql = `SELECT requested_date, start_time, end_time 
      FROM events 
    WHERE
       event_id IN (
          SELECT event_id FROM event_providers 
          WHERE provider_id = ? AND status = 'APPROVED'
      ) 
      ORDER BY requested_date , start_time ASC`;

  if (role === "Hall_Owner")
    sql = `SELECT requested_date, start_time, end_time 
      FROM events 
          WHERE hall_id = ? AND status = 'APPROVED'
      ORDER BY requested_date, start_time ASC`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

module.exports = { getAllEvents, changeStatusEvent, getAllEventsApproved };
