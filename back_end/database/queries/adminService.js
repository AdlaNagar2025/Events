const doQuery = require("../query");
const { createNotification } = require("./notifications");
const { sendEmail } = require("./emailService");

/**
 * @desc    שולפת את פרטי האדמין (ID ומייל)
 */
async function getAdminDetails() {
  const sql = `SELECT id, email FROM users WHERE role = 'Admin' LIMIT 1`;
  const result = await doQuery(sql);
  return result && result.length > 0 ? result[0] : null;
}

/**
 * @desc    שולפת את פרטי נותן השירות (ID, מייל ושם)
 */
async function getProviderDetails(type, id) {
  const idColumn = type === "chiefs" ? "chief_id" : "hall_id";
  const sql = `
    SELECT u.id, u.email, u.first_name 
    FROM users u
    INNER JOIN ${type} t ON u.id = t.${idColumn}
    WHERE u.id = ?
  `;
  const result = await doQuery(sql, [id]);
  return result && result.length > 0 ? result[0] : null;
}

/**
 * @desc    מעדכנת את סטטוס העסק (אישור / דחייה / ממתין), מעדכנת סיבת דחייה במידת הצורך ושולחת התראה אוטומטית לבעל העסק
 *   מעדכנת  סטטוס עסק, שולחת התראה במערכת ומייל מותאם לפי התרחיש
 * @param   {string} type - סוג העסק ('chiefs' או 'halls')
 * @param   {number|string} id - מזהה העסק/משתמש בטבלה המתאימה
 * @param   {string} newStatus - הסטטוס החדש ('PENDING', 'APPROVED', 'DENIED')
 * @param   {string|null} [reason=null] - סיבת הדחייה (רלוונטי רק אם הסטטוס הוא דחייה)
 * @returns {Promise<Object>} תוצאת השאילתה מול מסד הנתונים
 * @throws  {Error} זורקת שגיאה במידה וסוג הטבלה/העסק אינו חוקי
 */
async function updateBusinessStatus(type, id, newStatus, reason = null) {
  const normalizedType = type.toLowerCase().includes("chief")
    ? "chiefs"
    : type.toLowerCase().includes("hall")
      ? "halls"
      : null;

  if (!normalizedType) {
    throw new Error("INVALID_TABLE_NAME");
  }

  const idColumn = normalizedType === "chiefs" ? "chief_id" : "hall_id";
  const statusUpper = newStatus.toUpperCase();

  let sql = "";
  let queryParams = [];

  if (statusUpper === "PENDING") {
    sql = `UPDATE ${normalizedType} SET status = ? WHERE ${idColumn} = ?`;
    queryParams = [newStatus, id];
  } else if (statusUpper === "DENY" || statusUpper === "DENIED") {
    sql = `UPDATE ${normalizedType} SET status = ?, rejection_reason = ? WHERE ${idColumn} = ?`;
    queryParams = [newStatus, reason || "No reason provided", id];
  } else {
    // APPROVED
    sql = `UPDATE ${normalizedType} SET status = ?, rejection_reason = NULL WHERE ${idColumn} = ?`;
    queryParams = [newStatus, id];
  }

  const result = await doQuery(sql, queryParams);

  // 📧 🔔 טיפול בהתראות ומיילים
  const provider = await getProviderDetails(normalizedType, id);

  try {
    if (statusUpper === "PENDING") {
      // ----------------------------------------------------
      // תרחיש 1: בעל העסק שלח/עדכן טופס -> שולחים לאדמין!
      // ----------------------------------------------------
      const admin = await getAdminDetails();

      if (admin) {
        // התראה במערכת לאדמין
        await createNotification({
          message: `New business profile pending approval for: ${provider?.first_name || "Provider"}`,
          userId: admin.id,
        });

        // מייל לאדמין
        if (admin.email) {
          await sendEmail(
            admin.email,
            "New Business Approval Request - EventHub",
            `Hello Admin,\n\nA new business profile from "${provider?.first_name || "Provider"}" is pending your review.`,
          );
        }
      }
    } else {
      // ----------------------------------------------------
      // תרחיש 2: האדמין אישר או דחה -> שולחים לבעל העסק!
      // ----------------------------------------------------
      if (provider) {
        let notificationMessage = "";
        let emailSubject = "";
        let emailText = "";

        if (statusUpper === "APPROVE" || statusUpper === "APPROVED") {
          notificationMessage = "Your business profile has been approved! 🎉";
          emailSubject =
            "Congratulations! Your EventHub Business Profile is Approved";
          emailText = `Hello ${provider.first_name},\n\nWe are happy to inform you that your business profile on EventHub has been approved!\nYou now have full access to manage your business.`;
        } else {
          notificationMessage = `Your business profile was rejected. Reason: "${reason || "Please review details"}"`;
          emailSubject = "Update regarding your EventHub Business Profile";
          emailText = `Hello ${provider.first_name},\n\nYour business profile request was not approved.\nReason: ${reason || "No reason specified"}\n\nPlease update your profile details and submit again.`;
        }

        // התראה במערכת לבעל העסק
        await createNotification({
          message: notificationMessage,
          userId: provider.id,
        });

        // מייל לבעל העסק
        if (provider.email) {
          await sendEmail(provider.email, emailSubject, emailText);
        }
      }
    }
  } catch (emailError) {
    // עוטפים ב-try/catch כדי שאם המייל ייכשל (למשל כי הסיסמה של גוגל עוד לא מוגדרת), ה-DB עדיין יתעדכן בהצלחה!
    console.error(
      "Notification/Email process failed, but status was updated:",
      emailError,
    );
  }

  return result;
}

/**
 * @desc    שולפת את כל השירותים (שפים ובעלי אולמות) לפי סטטוס מסוים, כולל ממוצע דירוגים וכמות חוות דעת
 * @param   {string} status - הסטטוס המבוקש לסינון (כגון 'PENDING', 'APPROVED')
 * @returns {Promise<Array<Object>>} מערך נתונים מעובד של כל נותני השירות המתאימים
 */
async function getAllServicesAccordingToStatus(status) {
  const sql = `
    SELECT 
        u.id, 
        u.first_name, 
        u.email, 
        'Chief' AS provider_type, 
        c.status,
        u.first_name AS ServiceName,
        c.submitted_at,
        c.rejection_reason,
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
        h.hall_name AS ServiceName,
        h.submitted_at,
        h.rejection_reason,
        (SELECT AVG(rating) FROM reviews WHERE provider_id = u.id) AS avgRating,
        (SELECT COUNT(rating) FROM reviews WHERE provider_id = u.id) AS totalReviews
    FROM users u
    INNER JOIN halls h ON u.id = h.hall_id
    WHERE h.status = ?
    
    ORDER BY submitted_at ASC
  `;

  const result = await doQuery(sql, [status, status]);
  const rows = Array.isArray(result) ? result : [];

  return rows.map((provider) => ({
    ...provider,
    avgRating: provider.avgRating
      ? parseFloat(provider.avgRating).toFixed(1)
      : "0.0",
    totalReviews: provider.totalReviews || 0,
    submitted_at: provider.submitted_at
      ? new Date(provider.submitted_at).toLocaleDateString("en-US")
      : "Not submitted",
  }));
}

module.exports = {
  updateBusinessStatus,
  getAllServicesAccordingToStatus,
};
