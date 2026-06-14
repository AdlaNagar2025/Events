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
    ORDER BY r.created_at DESC;
  `;
  return await doQuery(sql, []);
}

async function updateStatusReport(newStatus, reportId) {
  const sql = `UPDATE reports SET status = ? WHERE id = ?`;
  return await doQuery(sql, [newStatus, reportId]);
}

module.exports = { writeReport, getAllReports, updateStatusReport };



