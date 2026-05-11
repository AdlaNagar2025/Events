const doQuery = require("../query");
const { getRole } = require("./helpingFunc");

async function getAllEvents(providerId) {
  let sql = `SELECT * FROM events WHERE hall_id=?`;
  if ((await getRole(providerId)) === "Chief")
    sql = `SELECT events.event_id,events.requested_date,events.start_time,events.end_time,events.guest_number,events.notes,event_providers.status FROM events JOIN event_providers ON event_providers.event_id=events.event_id  and provider_id=? ORDER BY events.requested_date DESC;
`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

async function changeStatusEvent(providerId, eventId, newStatus) {
  let sql = ` UPDATE event_providers SET status=? WHERE provider_id=? and event_id=? `;
  if ((await getRole(providerId)) === "Hall_Owner")
    sql = `UPDATE events SET status =? WHERE hall_id=? and event_id=? )`;
  const result = await doQuery(sql, [newStatus, providerId, eventId]);
  if (newStatus === "APPROVED") {
    const sql = `SELECT 
    events.requested_date,
    events.start_time AS event_start,
    events.end_time AS event_end, 
    events.user_id, 
    event_providers.provider_id, 
    event_providers.status, 
    availability.available_date,
    availability.start_time AS avail_start,
    availability.end_time AS avail_end 
FROM chiefs 
JOIN availability ON availability.provider_id = chiefs.chief_id 
JOIN event_providers ON chiefs.chief_id = event_providers.provider_id 
JOIN events ON event_providers.event_id = events.event_id 
WHERE event_providers.provider_id = ? AND available_date=? AND  events.requested_date=? AND event_providers.status="APPROVED";`;
  }
  return { success: true };
}

//CHIEFS
async function getAllEventsApproved(providerId) {
  const sql = `SELECT requested_date, start_time, end_time 
      FROM events 
    WHERE
       event_id IN (
          SELECT event_id FROM event_providers 
          WHERE provider_id = ? AND status = 'APPROVED'
      ) 
      ORDER BY start_time ASC`;
  const result = await doQuery(sql, [providerId]);
  console.log(result);
  return result;
}

module.exports = { getAllEvents, changeStatusEvent, getAllEventsApproved };
