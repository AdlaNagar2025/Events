const doQuery = require("../query");
const { getRole } = require("./helpingFunc");

async function getAllEvents(providerId) {
  let sql = `SELECT * FROM events WHERE hall_id=?`;
  if ((await getRole(providerId)) === "Chief")
    sql = `SELECT * FROM events WHERE event_id in (SELECT event_id FROM event_providers where provider_id=? )
`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

async function changeStatusEvent(providerId, newStatus) {
  let sql = ` UPDATE event_providers SET status=? WHERE provider_id=? `;
  if ((await getRole(providerId)) === "Hall_Owner")
    sql = `UPDATE events SET status =? WHERE hall_id=? )`;
  const result = await doQuert(sql, [newStatus, providerId]);
}



module.exports = { getAllEvents };
