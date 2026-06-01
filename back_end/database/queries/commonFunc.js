const doQuery = require("../query");
const { getRole } = require("../queries/helpingFunc");
const { createNotification } = require("./notifications");

/**
 * שליפת פרופיל עסקי מלא לפי מזהה משתמש.
 * בודק קודם בטבלת שפים, ואם לא נמצא - בטבלת אולמות.
 * @param {number} id - מזהה המשתמש
 */

// async function getProfile(id) {
//   const role = await getRole(id);

//   let sql;
//   let result;

//   if (role === "Chief") {
//     sql = `SELECT chiefs.* , users.first_name , users.last_name FROM chiefs JOIN users ON chiefs.chief_id=users.id WHERE chief_id = ?`;
//     result = await doQuery(sql, [id]);
//     result[0].experience_years =
//       new Date().getFullYear() - result[0].start_year;
//   } 
//   else if (role === "Hall_Owner") {
//     sql = `SELECT * FROM halls WHERE hall_id = ?`;
//     result = await doQuery(sql, [id]);
//   }

//   return result && result.length > 0 ? result[0] : null;
// }
async function getProfile(id) {
  const role = await getRole(id);
  let sql;
  let result;

  if (role === "Chief") {
    sql = `SELECT chiefs.*, users.first_name, users.last_name, users.role 
           FROM users 
           LEFT JOIN chiefs ON chiefs.chief_id = users.id 
           WHERE users.id = ?`;
    result = await doQuery(sql, [id]);

    if (result && result.length > 0 && result[0].chief_id !== null) {
      result[0].experience_years =
        new Date().getFullYear() - result[0].start_year;
    }
  } else if (role === "Hall_Owner") {
    sql = `SELECT halls.*, users.first_name, users.last_name, users.role 
           FROM users 
           LEFT JOIN halls ON halls.hall_id = users.id 
           WHERE users.id = ?`;
    result = await doQuery(sql, [id]);
  }

  // מחזירים את התוצאה, ואם היא ריקה מחזירים אובייקט ריק מסומן
  if (result && result.length > 0) {
    // אם השדות של הפרופיל הראשי ריקים (LEFT JOIN החזיר NULL), זה אומר שזה משתמש חדש
    const isNewProfile =
      role === "Chief" ? !result[0].chief_id : !result[0].hall_id;

    if (isNewProfile) {
      return {
        isNew: true,
        role: result[0].role,
        first_name: result[0].first_name,
        last_name: result[0].last_name,
      };
    }

    return result[0];
  }

  return null;
}






async function getMainFoto(id) {
  const sql = `SELECT * FROM provider_images WHERE is_main=1 AND provider_id=?;`;
  const result = await doQuery(sql, [id]);

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
  let sql = "";
  if (type === "chiefs") {
    sql = `UPDATE chiefs SET status = ?  WHERE chief_id = ?`;
  } else {
    sql = `UPDATE halls SET status = ? WHERE hall_id = ?`;
  }
  await createNotification({
    message: `Admin was ${newStatus} the Profile`,
    userId: id,
  });
  return await doQuery(sql, [newStatus, id]);
}

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
module.exports = {
  updateBusinessStatus,
  getProfile,
  getMainFoto,
  getAllEventsApproved,
};
