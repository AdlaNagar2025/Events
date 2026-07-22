const doQuery = require("../query");

async function getAllNotification(userId) {
  const sql = `SELECT notification_id , message , isRead FROM notifications WHERE user_id=? ORDER BY sent_at DESC`;
  return await doQuery(sql, [userId]);
}

async function updateReadToNotification(userId, notificationId) {
  const sql = `UPDATE notifications SET isRead = 1 WHERE notification_id = ? AND user_id = ?`;
  return await doQuery(sql, [notificationId, userId]);
}

/**
 * @desc    יוצרת התראה חדשה במסד הנתונים עבור משתמש ספציפי
 * @param   {Object} NotificationData - אובייקט המוביל את פרטי ההתראה
 * @param   {string} NotificationData.message - תוכן ההודעה שתישלח למשתמש
 * @param   {number|string} NotificationData.userId - המזהה (ID) של המשתמש שיקבל את ההתראה
 * @returns {Promise<Object>} תוצאת שאילתת ההכנסה ל-DB
 */
async function createNotification(NotificationData) {
  const { message, userId } = NotificationData;
  const sql = `INSERT INTO notifications (message , user_id ) VALUES (? ,? )`;
  return await doQuery(sql, [message, userId]);
}

module.exports = {
  getAllNotification,
  updateReadToNotification,
  createNotification,
};
