const doQuery = require("../query");
const { getRole } = require("../queries/helpingFunc");

/**
 * שליפת פרופיל עסקי מלא לפי מזהה משתמש.
 * בודק קודם בטבלת שפים, ואם לא נמצא - בטבלת אולמות.
 * @param {number} id - מזהה המשתמש
 */

async function getProfile(id) {
  const role = await getRole(id);

  console.log("The role is: " + role);

  let sql;
  let result;

  if (role === "Chief") {
    sql = `SELECT * FROM chiefs WHERE chief_id = ?`;
    result = await doQuery(sql, [id]);
  } else if (role === "Hall_Owner") {
    sql = `SELECT * FROM halls WHERE hall_id = ?`;
    result = await doQuery(sql, [id]);
  }

  return result && result.length > 0 ? result[0] : null;
}
async function getMainFoto(id) {
  const sql = `SELECT * FROM provider_images WHERE is_main=1 AND provider_id=?;`;
  const result = doQuery(sql, [id]);

  return result;
}

/**
 * עדכון סטטוס האישור של עסק ספציפי.
 * @param {string} type - סוג העסק ('chiefs' או 'halls')
 * @param {number} id - מזהה המשתמש (User ID)
 * @param {string} newStatus - הסטטוס החדש לעדכון
 */
async function updateBusinessStatus(type, id, newStatus) {
  const allowedTypes = ["chiefs", "halls"];
  if (!allowedTypes.includes(type)) {
    throw new Error("Invalid table name");
  }
  if (type === "chiefs") {
    const sql = `UPDATE chiefs SET status = ?  WHERE chief_id = ?`;
    return await doQuery(sql, [newStatus, id]);
  } else {
    const sql = `UPDATE halls SET status = ? WHERE hall_id = ?`;
    return await doQuery(sql, [newStatus, id]);
  }
}

module.exports = { updateBusinessStatus, getProfile, getMainFoto };
