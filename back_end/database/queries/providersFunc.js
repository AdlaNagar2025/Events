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

async function changeStatusEvent(providerId,eventId, newStatus) {
  let sql = ` UPDATE event_providers SET status=? WHERE provider_id=? and event_id=? `;
  if ((await getRole(providerId)) === "Hall_Owner")
    sql = `UPDATE events SET status =? WHERE hall_id=? and event_id=? )`;
  const result = await doQuery(sql, [newStatus, providerId , eventId]);
  return {success:true}
}



module.exports = { getAllEvents, changeStatusEvent };
