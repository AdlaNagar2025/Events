const doQuery = require("../query");

async function getRole(id) {
  const sql = `SELECT role FROM users WHERE id=?`;
  const role = await doQuery(sql, [id]);
  return role[0]?.role;
}

// STATUS enum('PENDING', 'REJECTED', 'APPROVED', 'CANCELED'...
async function getStatusEvent(eventId) {
  const allStatusesSql = `
    SELECT status FROM events WHERE event_id = ?
    UNION ALL
    SELECT status FROM event_providers WHERE event_id = ?`;

  // 2. שליחת ה-eventId פעמיים (עבור שני סימני השאלה)
  const rows = await doQuery(allStatusesSql, [eventId, eventId]);

  // 3. הפיכת מערך האובייקטים למערך של טקסט פשוט (Strings)
  // rows נראה ככה: [{status: 'PENDING'}, {status: 'APPROVED'}]
  const statusList = rows.map((row) => row.status.toUpperCase());

  // 4. הבדיקה על ה-statusList הפשוט
  if (statusList.includes("REJECTED")) return "REJECTED";
  if (statusList.includes("PENDING")) return "PENDING";

  return statusList.length > 0 ? "APPROVED" : "PENDING";
}
module.exports = { getRole, getStatusEvent };
