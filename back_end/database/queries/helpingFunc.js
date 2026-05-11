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

// async function getTimeAvail(date, providerId) {
// const sql = `SELECT start_time, end_time FROM availability WHERE available_date=? AND provider_id=?`;
// const availability = await doQuery(sql, [date, providerId]);

// const sql1 = `
//   SELECT start_time, end_time
//   FROM events
//   WHERE requested_date = ?
//   AND event_id IN (
//       SELECT event_id FROM event_providers
//       WHERE provider_id = ? AND status = 'APPROVED'
//   )`;
// const bookedEvents = await doQuery(sql1, [date, providerId]);

// let currentTime = availability[0].start_time;
// let EndTime = availability[0].end_time;
// const availTimes = [];
// bookedEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));
// // 2. לולאה על האירועים התפוסים
// bookedEvents.forEach((book) => {
//   // אם יש רווח בין הזמן הנוכחי לתחילת האירוע - זה חלון פנוי!
//   if (book.start_time > currentTime) {
//     availTimes.push({
//       start_time: currentTime,
//       end_time: book.start_time,
//     });
//   }
//   // מעדכנים את currentTime לסוף האירוע הנוכחי
//   // משתמשים ב-Math.max למקרה שיש אירוע שמתחיל בתוך אירוע אחר
//   if (book.end_time > currentTime) {
//     currentTime = book.end_time;
//   }
// });

// // 3. התיקון הקריטי: הבדיקה של סוף היום צריכה להיות מחוץ ללולאה!
// if (currentTime < EndTime) {
//   availTimes.push({
//     start_time: currentTime,
//     end_time: EndTime,
//   });
// }

// }

async function getTimeAvail(date, providerId) {
  try {
    // 1. שליפת כל חלונות הזמינות של הספק לאותו יום (ממוין מהבוקר לערב)
    const availSql = `
      SELECT start_time, end_time 
      FROM availability 
      WHERE available_date = ? AND provider_id = ? 
      ORDER BY start_time ASC`;
    const availabilityBlocks = await doQuery(availSql, [date, providerId]);

    // 2. שליפת כל האירועים המאושרים באותו יום (ממוין מהבוקר לערב)
    const eventSql = `
      SELECT start_time, end_time 
      FROM events 
      WHERE requested_date = ? 
      AND event_id IN (
          SELECT event_id FROM event_providers 
          WHERE provider_id = ? AND status = 'APPROVED'
      ) 
      ORDER BY start_time ASC`;
    const bookedEvents = await doQuery(eventSql, [date, providerId]);

    const finalFreeTimes = [];

    // 3. מעבר על כל "משמרת" (Block) בנפרד
    availabilityBlocks.forEach((block) => {
      let currentTime = block.start_time;
      const blockEnd = block.end_time;

      // מסננים רק את האירועים שנופלים בתוך המשמרת הנוכחית
      const relevantEvents = bookedEvents.filter(
        (event) => event.start_time < blockEnd && event.end_time > currentTime,
      );

      relevantEvents.forEach((event) => {
        // אם יש זמן פנוי בין תחילת המשמרת (או סוף האירוע הקודם) לבין תחילת האירוע הנוכחי
        if (event.start_time > currentTime) {
          finalFreeTimes.push({
            start_time: currentTime,
            end_time: event.start_time,
          });
        }

        // מעדכנים את הזמן הנוכחי לסוף האירוע הנוכחי (כדי "לדלג" על הזמן התפוס)
        // משתמשים ב-Math.max כדי להתמודד עם אירועים שחופפים אחד לשני
        if (event.end_time > currentTime) {
          currentTime = event.end_time;
        }
      });

      // 4. בדיקה אם נשאר זמן פנוי מסוף האירוע האחרון ועד סוף המשמרת
      if (currentTime < blockEnd) {
        finalFreeTimes.push({
          start_time: currentTime,
          end_time: blockEnd,
        });
      }
    });

    return finalFreeTimes;
  } catch (error) {
    console.error("Error calculating available time:", error);
    return [];
  }
}

module.exports = { getRole, getStatusEvent };
