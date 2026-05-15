/**
 * קובץ שאילתות עבור פאנל הניהול (Admin)
 * כאן מרוכזות כל הפעולות שרק אדמין מורשה לבצע על מסד הנתונים.
 */
const doQuery = require("../query");

/**
 * שליפת רשימת כל המשתמשים במערכת.
 * מחזיר: מזהה, שם פרטי, שם משפחה, אימייל ותפקיד.
 */
async function getAllUsers() {
  const sql = `SELECT id, first_name, last_name, email, role , is_active FROM users`;
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
 * שליפת כל רשימת הפרופילים מטבלת השפים (Chiefs).
 */
async function getAllChiefsProfile() {
  const sql = `SELECT * FROM chiefs`;
  return await doQuery(sql, []);
}
/**
 * שליפת כל רשימת הפרופילים מטבלת בעלי האולמות (Halls).
 */
async function getAllHallsOwnerProfile() {
  const sql = `SELECT * FROM halls`;
  return await doQuery(sql, []);
}
/**
 * שליפת רשימה מאוחדת של כל נותני השירות (שפים ואולמות) כולל הסטטוס העסקי שלהם.
 * משתמש ב-UNION ALL לביצועים אופטימליים.
 */
async function getAllServices() {
  const sql = `
SELECT users.id,users.first_name, users.email, 'Chief' AS provider_type  , chiefs.status
FROM users
INNER JOIN chiefs ON users.id = chiefs.chief_id
UNION ALL
SELECT users.id,users.first_name,  users.email, 'Hall_Owner' AS provider_type , halls.status
FROM users
INNER JOIN halls ON users.id = halls.hall_id;`;
  return await doQuery(sql, []);
}
/**
 * שליפת נותני שירות מסוננים לפי סטטוס אישור (למשל: 'pending', 'approved', 'denied').
 * @param {string} status - הסטטוס המבוקש
 */

async function getAllServicesAccordingToStatus(status) {
  const sql = `
    SELECT 
        u.id, 
        u.first_name, 
        u.email, 
        'Chief' AS provider_type, 
        c.status,
        (SELECT AVG(rating) FROM reviews WHERE provider_id = u.id) AS avgRating,
        (SELECT COUNT(rating) FROM reviews WHERE provider_id = u.id) AS totalReviews
    FROM users u
    INNER JOIN chiefs c ON u.id = c.chief_id
    WHERE c.status = ?

    UNION ALL

    SELECT 
        u.id, 
        u.first_name, 
        u.email, 
        'Hall_Owner' AS provider_type, 
        h.status,
        (SELECT AVG(rating) FROM reviews WHERE provider_id = u.id) AS avgRating,
        (SELECT COUNT(rating) FROM reviews WHERE provider_id = u.id) AS totalReviews
    FROM users u
    INNER JOIN halls h ON u.id = h.hall_id
    WHERE h.status = ?;
  `;

  const result = await doQuery(sql, [status, status]);

  // טיפול קטן ב-JavaScript כדי לעגל מספרים או להפוך NULL ל-0
  return result.map((provider) => ({
    ...provider,
    avgRating: provider.avgRating
      ? parseFloat(provider.avgRating).toFixed(1)
      : 0,
    totalReviews: provider.totalReviews || 0,
  }));
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

module.exports = {
  getAllUsers,
  getUsersByRole,
  getAllChiefsProfile,
  getAllHallsOwnerProfile,
  getAllServices,
  deactivateUser,
  getAllServicesAccordingToStatus,
};
