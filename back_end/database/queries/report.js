const doQuery = require("../query");

// 1. פונקציות ה-Database
async function writeReport(reporterId, data) {
  const { reported_id, target_type, target_id, reason, description } = data;

  const sql = `INSERT INTO reports (reporter_id, reported_id, target_type, target_id, reason, description) VALUES (?, ?, ?, ?, ?, ?)`;

  return await doQuery(sql, [
    reporterId,
    reported_id,
    target_type,
    target_id !== undefined ? target_id : null,
    reason,
    description,
  ]);
}

async function getAllReports() {
  const sql = `
    SELECT 
        r.*,
        u1.first_name AS reporter_name,
        u1.email AS reporter_email,
        u2.first_name AS reported_name,
        u2.email AS reported_email
    FROM reports r
    INNER JOIN users u1 ON r.reporter_id = u1.id
    INNER JOIN users u2 ON r.reported_id = u2.id
    ORDER BY r.created_at ASC;
  `;
  return await doQuery(sql, []);
}

async function getAllPendingReports() {
  const sql = `
    SELECT 
        r.*,
        u1.first_name AS reporter_name,
        u1.email AS reporter_email,
        u2.first_name AS reported_name,
        u2.email AS reported_email
    FROM reports r
    INNER JOIN users u1 ON r.reporter_id = u1.id
    INNER JOIN users u2 ON r.reported_id = u2.id
    WHERE r.status="PENDING"
    ORDER BY r.created_at DESC;
  `;
  return await doQuery(sql, []);
}

async function updateStatusReport(newStatus, reportId) {
  const sql = `UPDATE reports SET status = ? WHERE id = ?`;
  return await doQuery(sql, [newStatus, reportId]);
}

async function resolveReport(dataToResolved) {
  const { reportId, targetType, targetId, offenderId, reason } = dataToResolved;
  // 1. עדכון סטטוס הדיווח ל-RESOLVED
  await doQuery(`UPDATE reports SET status = 'RESOLVED' WHERE id = ?`, [
    reportId,
  ]);

  // 2. ביצוע פעולה בהתאם לסוג היעד
  if (targetType === "COMMENT") {
    await doQuery(`UPDATE reviews SET is_deleted = 1 WHERE id = ?`, [targetId]);
  }

  // 3. הוספת אזהרה למשתמש הפוגע
  await doQuery(
    `INSERT INTO user_warnings (user_id, report_id, reason) VALUES (?, ?, ?)`,
    [offenderId, reportId, reason || "Violation of community guidelines"],
  );

  // 4. בדיקה אוטומטית: כמה אזהרות יש לו עכשיו?
  const [warnCountResult] = await doQuery(
    `SELECT COUNT(*) AS total_warnings FROM user_warnings WHERE user_id = ?`,
    [offenderId],
  );

  const totalWarnings = warnCountResult[0].total_warnings;

  // 5. אם הוא הגיע ל-5 אזהרות ומעלה - חוסמים אותו!
  if (totalWarnings >= 5) {
    await db.query(`UPDATE users SET is_active = 0 WHERE id = ?`, [offenderId]);
    return {
      message: `Report resolved. User reached ${totalWarnings} warnings and has been banned! 🚫`,
      totalWarnings,
    };
  }

  return {
    message: `Report resolved successfully. Warning issued (${totalWarnings}/5).`,
    totalWarnings,
  };
}
module.exports = {
  writeReport,
  getAllReports,
  updateStatusReport,
  getAllPendingReports,
  resolveReport,
};
