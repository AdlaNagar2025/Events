const doQuery = require("../query");
const { createNotification } = require("./notifications");

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

async function getAllReportsAccordingToStatus(status = null, limit = null) {
  let sql = `
    SELECT 
        r.*,
        u1.first_name AS reporter_name,
        u1.email AS reporter_email,
        u2.first_name AS reported_name,
        u2.email AS reported_email
    FROM reports r
    INNER JOIN users u1 ON r.reporter_id = u1.id
    INNER JOIN users u2 ON r.reported_id = u2.id
    WHERE 1=1
  `;

  const params = [];

  if (status != null) {
    sql += ` AND r.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY FIELD(r.status, 'PENDING', 'RESOLVED', 'DISMISSED'), r.created_at ASC `;

  if (limit != null) {
    sql += ` LIMIT ?`;
    params.push(Number(limit));
  }

  return await doQuery(sql, params);
}

async function updateStatusReport(newStatus, reportId) {
  const sql = `UPDATE reports SET status = ? WHERE id = ?`;
  return await doQuery(sql, [newStatus, reportId]);
}

async function getReportParties(reportId) {
  const rows = await doQuery(
    `SELECT reporter_id, reported_id FROM reports WHERE id = ?`,
    [reportId],
  );
  return rows[0] || null;
}

async function dismissReport(reportId) {
  const parties = await getReportParties(reportId);
  await updateStatusReport("DISMISSED", reportId);

  if (parties?.reporter_id) {
    await createNotification({
      userId: parties.reporter_id,
      message:
        "Your report was reviewed and dismissed. No action was taken.",
    });
  }

  return { message: "Report was dismissed successfully." };
}

async function resolveReport(dataToResolved) {
  const { reportId, targetType, targetId, offenderId, reason } = dataToResolved;
  const parties = await getReportParties(reportId);

  await doQuery(`UPDATE reports SET status = 'RESOLVED' WHERE id = ?`, [
    reportId,
  ]);

  if (targetType === "COMMENT") {
    await doQuery(`UPDATE reviews SET is_deleted = 1 WHERE review_id = ?`, [
      targetId,
    ]);
  }

  await doQuery(
    `INSERT INTO user_warnings (user_id, report_id, reason) VALUES (?, ?, ?)`,
    [offenderId, reportId, reason || "Violation of community guidelines"],
  );

  const warnRows = await doQuery(
    `SELECT COUNT(*) AS total_warnings FROM user_warnings WHERE user_id = ?`,
    [offenderId],
  );
  const totalWarnings = warnRows[0].total_warnings;

  if (totalWarnings >= 5) {
    await doQuery(`UPDATE users SET is_active = 0 WHERE id = ?`, [offenderId]);

    await createNotification({
      userId: offenderId,
      message: `Your account has been suspended after reaching ${totalWarnings} warnings for community guidelines violations.`,
    });

    if (parties?.reporter_id) {
      await createNotification({
        userId: parties.reporter_id,
        message: "Your report was reviewed and action was taken by the admin.",
      });
    }

    return {
      message: `Report resolved. User reached ${totalWarnings} warnings and has been banned! 🚫`,
      totalWarnings,
    };
  }

  const offenderMessage =
    targetType === "COMMENT"
      ? `A reported comment was removed and you received a warning (${totalWarnings}/5).`
      : `You received a warning for violating community guidelines (${totalWarnings}/5).`;

  await createNotification({
    userId: offenderId,
    message: offenderMessage,
  });

  if (parties?.reporter_id) {
    await createNotification({
      userId: parties.reporter_id,
      message: "Your report was reviewed and action was taken by the admin.",
    });
  }

  return {
    message: `Report resolved successfully. Warning issued (${totalWarnings}/5).`,
    totalWarnings,
  };
}

module.exports = {
  writeReport,
  getAllReportsAccordingToStatus,
  updateStatusReport,
  dismissReport,
  resolveReport,
};
