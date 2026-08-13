/**
 * קובץ שאילתות עבור פאנל הניהול (Admin)
 * כאן מרוכזות כל הפעולות שרק אדמין מורשה לבצע על מסד הנתונים.
 */
const { getStatusEvent } = require("./helpingFunc");
const doQuery = require("../query");
/**
 * שליפת רשימת כל המשתמשים במערכת.
 * מחזיר: מזהה, שם פרטי, שם משפחה, אימייל ותפקיד.
 */
async function getAllUsers() {
  const sql = `SELECT id, first_name, last_name, email, role , is_active , created_at FROM users ORDER BY created_at DESC`;
  return await doQuery(sql, []);
}

/**
 * סינון ושליפת משתמשים לפי תפקיד ספציפי (למשל: 'customer', 'Chief', 'Admin').
 * @param {string} role - התפקיד לסינון
 */
async function getUsersByRole(role) {
  const sql = `SELECT id, first_name, last_name, email, role , is_active FROM users WHERE role = ?`;
  return await doQuery(sql, [role]);
}



/**
 * השבתה או הפעלה של משתמש במערכת (Soft Delete).
 * משנה את שדה is_active בטבלת users.
 * @param {number} status - סטטוס פעיל (1) או לא פעיל (0)
 * @param {number} userId - מזהה המשתמש
 */
async function deactivateUser(status, userId) {
  const sql = `UPDATE users SET is_active = ? WHERE id = ?`;
  return await doQuery(sql, [status, userId]);
}

async function getAllUserStats() {
  const sql = `SELECT 
    COUNT(*) AS totalUsers,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) AS activeUsers,
    COUNT(CASE WHEN is_active = 0 THEN 1 END) AS inactiveUsers,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL 7 DAY THEN 1 END) AS newRegistrations
FROM users;`;
  return await doQuery(sql, []);
}




async function getSummaryStats() {
  let approvedEvents=0;
  let rejectedEvents=0;
  let pendingEvents=0;
  let cancelledEvents=0;
  const sql=`SELECT event_id 
FROM events 
WHERE MONTH(events.requested_date) = MONTH(CURDATE()) 
  AND YEAR(events.requested_date) = YEAR(CURDATE());`
  const eventsId= await doQuery(sql, []);
  const allEvents=eventsId.length;
  for (const row of eventsId) {
    const finalStatus = await getStatusEvent(row.event_id);
    if(finalStatus==="APPROVED"){
      approvedEvents++;
    }
    if(finalStatus==="REJECTED"){
      rejectedEvents++;
    }
    if(finalStatus==="PENDING"){
      pendingEvents++;
    }
    if(finalStatus==="CANCELLED"){
      cancelledEvents++;
    }
  }
  return {
    approvedEvents,
    rejectedEvents,
    pendingEvents,
    cancelledEvents,
    allEvents,
  };


}

module.exports = {
  getAllUsers,
  getUsersByRole,
  deactivateUser,
  getAllUserStats,
  getSummaryStats,
};
