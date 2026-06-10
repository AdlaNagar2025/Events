const doQuery = require("../query");
const { getRole } = require("./helpingFunc");
const { createNotification } = require("./notifications");

// async function getAllEvents(providerId) {
//   // באולם - המיון קודם לפי הסטטוס (מה שממתין ראשון) ואז לפי תאריך ושעה
//   let sql = `
//     SELECT
//     events.*,
//     users.first_name,
//     reviews.rating,
//     reviews.comment
// FROM events
// JOIN users ON users.id = events.user_id
// LEFT JOIN reviews ON events.event_id = reviews.event_id
//     AND reviews.provider_id = ?
// WHERE events.hall_id = ?
// ORDER BY
//     (events.status = "PENDING") DESC,
//     events.requested_date ASC,
//     events.start_time ASC;`;

//   if ((await getRole(providerId)) === "Chief") {
//     // בשף - אותו דבר, משתמשים בסטטוס מטבלת הקישור
//     sql = `

//        SELECT events.event_id, events.requested_date, events.start_time, events.end_time,
//              events.guest_number, events.notes, event_providers.status, users.first_name , reviews.rating,
//     reviews.comment
//       FROM events
//       JOIN event_providers ON event_providers.event_id = events.event_id AND provider_id = ?
//       JOIN users ON users.id = events.user_id
//       LEFT JOIN reviews ON reviews.event_id=events.event_id
//        AND reviews.provider_id = ?
//       ORDER BY (event_providers.status = "PENDING") DESC, events.requested_date ASC, events.start_time ASC`;
//   }

//   const result = await doQuery(sql, [providerId, providerId]);
//   return result;
// }

async function getAllEvents(providerId) {
  let sql = "";
  let params = [];

  if ((await getRole(providerId)) === "Chief") {
    // --- שאילתה עבור שף (שימוש ב-noteToChef מטבלת הקישור) ---
    sql = `
      SELECT 
        events.event_id, 
        events.requested_date, 
        events.start_time, 
        events.end_time, 
        events.guest_number, 
        event_providers.noteToChef AS notes, -- כאן שינינו! נותנים כינוי 'notes' כדי שהפרונטנד לא יישבר
        event_providers.status, 
        event_providers.location,
        users.first_name, 
        reviews.rating, 
        reviews.comment
      FROM events 
      JOIN event_providers ON event_providers.event_id = events.event_id AND event_providers.provider_id = ? 
      JOIN users ON users.id = events.user_id 
      LEFT JOIN reviews ON reviews.event_id = events.event_id AND reviews.provider_id = ? 
      ORDER BY (event_providers.status = "PENDING") DESC, events.requested_date DESC, events.start_time ASC`;

    params = [providerId, providerId];
  } else {
    // --- שאילתה עבור אולם (שימוש ב-notesToHall במקום *) ---
    sql = `
      SELECT 
        events.event_id, 
        events.requested_date, 
        events.start_time, 
        events.end_time, 
        events.guest_number,
        events.notesToHall AS notes, -- כאן שינינו! נותנים כינוי 'notes'
        events.status, 
        users.first_name, 
        reviews.rating, 
        reviews.comment
      FROM events 
      JOIN users ON users.id = events.user_id 
      LEFT JOIN reviews ON events.event_id = reviews.event_id AND reviews.provider_id = ? 
      WHERE events.hall_id = ?
      ORDER BY (events.status = "PENDING") DESC, events.requested_date ASC, events.start_time ASC;`;

    params = [providerId, providerId];
  }

  const result = await doQuery(sql, params);
  return result;
}

async function getAllPendingEvents(providerId) {
  let sql = "";
  let params = [];

  if ((await getRole(providerId)) === "Chief") {
    // --- שאילתה עבור שף (שימוש ב-noteToChef מטבלת הקישור) ---
    sql = `
      SELECT 
        events.event_id, 
        events.requested_date, 
        events.start_time, 
        events.end_time, 
        events.guest_number, 
        event_providers.noteToChef AS notes, -- כאן שינינו! נותנים כינוי 'notes' כדי שהפרונטנד לא יישבר
        event_providers.status, 
        event_providers.location,
        users.first_name, 
        reviews.rating, 
        reviews.comment
      FROM events 
      JOIN event_providers ON event_providers.event_id = events.event_id AND event_providers.provider_id = ? 
      JOIN users ON users.id = events.user_id 
      LEFT JOIN reviews ON reviews.event_id = events.event_id AND reviews.provider_id = ? 
      WHERE TIMESTAMP(events.requested_date, events.start_time) >= NOW()
      AND event_providers.status = "PENDING"  ORDER BY events.requested_date ASC, events.start_time ASC`;

    params = [providerId, providerId];
  } else {
    // --- שאילתה עבור אולם (שימוש ב-notesToHall במקום *) ---
    sql = `
      SELECT 
        events.event_id, 
        events.requested_date, 
        events.start_time, 
        events.end_time, 
        events.guest_number,
        events.notesToHall AS notes, -- כאן שינינו! נותנים כינוי 'notes'
        events.status, 
        users.first_name, 
        reviews.rating, 
        reviews.comment
      FROM events 
      JOIN users ON users.id = events.user_id 
      LEFT JOIN reviews ON events.event_id = reviews.event_id AND reviews.provider_id = ? 
      WHERE events.hall_id = ?  TIMESTAMP(events.requested_date, events.start_time) >= NOW()
      AND events.status = "PENDING"  ORDER BY events.requested_date ASC, events.start_time ASC`;

    params = [providerId, providerId];
  }

  const result = await doQuery(sql, params);
  return result;
}

// async function getAllEventsAccordingToStatus(
//   providerId,
//   statusFilter = "PENDING",
// ) {
//   let sql = "";
//   let params = [];

//   if ((await getRole(providerId)) === "Chief") {
//     sql = `
//       SELECT
//         events.event_id,
//         events.requested_date,
//         events.start_time,
//         events.end_time,
//         events.guest_number,
//         event_providers.noteToChef AS notes,
//         event_providers.status,
//         event_providers.location,
//         users.first_name,
//         reviews.rating,
//         reviews.comment
//       FROM events
//       JOIN event_providers ON event_providers.event_id = events.event_id AND event_providers.provider_id = ?
//       JOIN users ON users.id = events.user_id
//       LEFT JOIN reviews ON reviews.event_id = events.event_id AND reviews.provider_id = ?
//       WHERE TIMESTAMP(events.requested_date, events.start_time) >= NOW()
//       AND event_providers.status = ?
//       ORDER BY events.requested_date ASC, events.start_time ASC`;

//     params = [providerId, providerId, statusFilter];
//   } else {
//     sql = `
//       SELECT
//         events.event_id,
//         events.requested_date,
//         events.start_time,
//         events.end_time,
//         events.guest_number,
//         events.notesToHall AS notes,
//         events.status,
//         users.first_name,
//         reviews.rating,
//         reviews.comment
//       FROM events
//       JOIN users ON users.id = events.user_id
//       LEFT JOIN reviews ON events.event_id = reviews.event_id AND reviews.provider_id = ?
//       WHERE events.hall_id = ?
//       AND TIMESTAMP(events.requested_date, events.start_time) >= NOW()
//       AND events.status = ?
//       ORDER BY events.requested_date ASC, events.start_time ASC`;

//     params = [providerId, providerId, statusFilter];
//   }

//   const result = await doQuery(sql, params);
//   return result;
// }

// async function changeStatusEvent(providerId, eventId, newStatus, eventData) {
//   console.log(eventData);
//   let providersName = "";
//   const role = await getRole(providerId);
//   let checkSql = "";
//   let checkParams = [];

//   // 1. הגדרת שאילתת הבדיקה לפי תפקיד
//   if (role === "Chief") {
//     checkSql = `
//       SELECT * FROM events e
//       JOIN event_providers ep ON e.event_id = ep.event_id
//       WHERE e.requested_date = ?
//         AND ep.provider_id = ?
//         AND ep.status = 'APPROVED'
//         AND e.event_id != ?        -- חשוב: אל תמצא את האירוע הנוכחי שאתה מנסה לאשר
//         AND e.start_time < ?       -- eventData.end_time
//         AND e.end_time > ?         -- eventData.start_time
//     `;
//     checkParams = [
//       eventData.requested_date,
//       providerId,
//       eventId,
//       eventData.end_time, // סוף האירוע החדש
//       eventData.start_time, // תחילת האירוע החדש
//     ];

//     const eventChief = await doQuery(
//       `SELECT first_name  FROM users WHERE id=  ?`,
//       [providerId],
//     );
//     providersName = eventChief[0]?.first_name;
//   } else {
//     // לוגיקה לבעל אולם
//     checkSql = `
//       SELECT * FROM events
//       WHERE requested_date = ?
//         AND hall_id = ?
//         AND status = 'APPROVED'
//         AND event_id != ?
//         AND start_time < ?
//         AND end_time > ?`;
//     checkParams = [
//       eventData.requested_date,
//       providerId,
//       eventId,
//       eventData.end_time,
//       eventData.start_time,
//     ];

//     const eventhall = await doQuery(
//       `SELECT hall_name  FROM halls WHERE hall_id=  ?`,
//       [providerId],
//     );
//     providersName = eventhall[0]?.hall_name;
//   }

//   // 2. בדיקה האם קיים אירוע חופף
//   const overlaps = await doQuery(checkSql, checkParams);
//   console.log("Overlapping events found:", overlaps.length);

//   if (overlaps.length === 0 || newStatus === "REJECTED") {
//     // 3. עדכון הסטטוס
//     let updateSql = "";
//     if (role === "Chief") {
//       updateSql = `UPDATE event_providers SET status=? WHERE provider_id=? AND event_id=?`;
//     } else {
//       updateSql = `UPDATE events SET status=? WHERE hall_id=? AND event_id=?`;
//     }

//     // 1. עדכון הסטטוס באותו אופן
//     await doQuery(updateSql, [newStatus, providerId, eventId]);

//     // 2. שליפת ה-user_id האמיתי של הלקוח מהאירוע הזה
//     const eventOwner = await doQuery(
//       `SELECT user_id FROM events WHERE event_id = ?`,
//       [eventId],
//     );
//     const customerId = eventOwner[0]?.user_id;

//     async function changeStatusEvent(
//       providerId,
//       eventId,
//       newStatus,
//       eventData,
//     ) {
//       console.log(eventData);
//       let providersName = "";
//       const role = await getRole(providerId);
//       let checkSql = "";
//       let checkParams = [];

//       // 1. הגדרת שאילתת הבדיקה לפי תפקיד
//       if (role === "Chief") {
//         checkSql = `
//       SELECT * FROM events e
//       JOIN event_providers ep ON e.event_id = ep.event_id
//       WHERE e.requested_date = ?
//         AND ep.provider_id = ?
//         AND ep.status = 'APPROVED'
//         AND e.event_id != ?        -- חשוב: אל תמצא את האירוע הנוכחי שאתה מנסה לאשר
//         AND e.start_time < ?       -- eventData.end_time
//         AND e.end_time > ?         -- eventData.start_time
//     `;
//         checkParams = [
//           eventData.requested_date,
//           providerId,
//           eventId,
//           eventData.end_time, // סוף האירוע החדש
//           eventData.start_time, // תחילת האירוע החדש
//         ];

//         const eventChief = await doQuery(
//           `SELECT first_name  FROM users WHERE id=  ?`,
//           [providerId],
//         );
//         providersName = eventChief[0]?.first_name;
//       } else {
//         // לוגיקה לבעל אולם
//         checkSql = `
//       SELECT * FROM events
//       WHERE requested_date = ?
//         AND hall_id = ?
//         AND status = 'APPROVED'
//         AND event_id != ?
//         AND start_time < ?
//         AND end_time > ?`;
//         checkParams = [
//           eventData.requested_date,
//           providerId,
//           eventId,
//           eventData.end_time,
//           eventData.start_time,
//         ];

//         const eventhall = await doQuery(
//           `SELECT hall_name  FROM halls WHERE hall_id=  ?`,
//           [providerId],
//         );
//         providersName = eventhall[0]?.hall_name;
//       }

//       // 2. בדיקה האם קיים אירוע חופף
//       const overlaps = await doQuery(checkSql, checkParams);
//       console.log("Overlapping events found:", overlaps.length);

//       if (overlaps.length === 0 || newStatus === "REJECTED") {
//         // 3. עדכון הסטטוס
//         let updateSql = "";
//         if (role === "Chief") {
//           updateSql = `UPDATE event_providers SET status=? WHERE provider_id=? AND event_id=?`;
//         } else {
//           updateSql = `UPDATE events SET status=? WHERE hall_id=? AND event_id=?`;
//         }

//         // 1. עדכון הסטטוס באותו אופן
//         await doQuery(updateSql, [newStatus, providerId, eventId]);

//         // 2. שליפת ה-user_id האמיתי של הלקוח מהאירוע הזה
//         const eventOwner = await doQuery(
//           `SELECT user_id FROM events WHERE event_id = ?`,
//           [eventId],
//         );
//         const customerId = eventOwner[0]?.user_id;

//         // 3. יצירת ההתראה עם ה-ID האמיתי
//         await createNotification({
//           message: `Event was ${newStatus} by ${providersName}`,
//           userId: customerId,
//         });
//         return { success: true };
//       }

//       return {
//         success: false,
//         message: "Provider is already booked for this time range.",
//       };
//     }

//     // 3. יצירת ההתראה עם ה-ID האמיתי
//     await createNotification({
//       message: `Event was ${newStatus} by ${providersName}`,
//       userId: customerId,
//     });
//     return { success: true };
//   }

//   return {
//     success: false,
//     message: "Provider is already booked for this time range.",
//   };
// }

// async function changeStatusEvent(providerId, eventId, newStatus, eventData) {
//   console.log(eventData);
//   let providersName = "";
//   const role = await getRole(providerId);
//   let checkSql = "";
//   let checkParams = []; // 1. הגדרת שאילתת הבדיקה לפי תפקיד

//   if (role === "Chief") {
//     checkSql = `
//       SELECT * FROM events e
//       JOIN event_providers ep ON e.event_id = ep.event_id
//       WHERE e.requested_date = ?
//         AND ep.provider_id = ?
//         AND ep.status = 'APPROVED'
//         AND e.event_id != ?        -- חשוב: אל תמצא את האירוע הנוכחי שאתה מנסה לאשר
//         AND e.start_time < ?       -- eventData.end_time
//         AND e.end_time > ?         -- eventData.start_time
//     `;
//     checkParams = [
//       eventData.requested_date,
//       providerId,
//       eventId,
//       eventData.end_time, // סוף האירוע החדש
//       eventData.start_time, // תחילת האירוע החדש
//     ];

//     const eventChief = await doQuery(
//       `SELECT first_name  FROM users WHERE id=  ?`,
//       [providerId],
//     );
//     providersName = eventChief[0]?.first_name;
//   } else {
//     // לוגיקה לבעל אולם
//     checkSql = `
//       SELECT * FROM events
//       WHERE requested_date = ?
//         AND hall_id = ?
//         AND status = 'APPROVED'
//         AND event_id != ?
//         AND start_time < ?
//         AND end_time > ?`;
//     checkParams = [
//       eventData.requested_date,
//       providerId,
//       eventId,
//       eventData.end_time,
//       eventData.start_time,
//     ];

//     const eventhall = await doQuery(
//       `SELECT hall_name  FROM halls WHERE hall_id=  ?`,
//       [providerId],
//     );
//     providersName = eventhall[0]?.hall_name;
//   } // 2. בדיקה האם קיים אירוע חופף

//   const overlaps = await doQuery(checkSql, checkParams);
//   console.log("Overlapping events found:", overlaps.length);

//   if (overlaps.length === 0 || newStatus === "REJECTED") {
//     // 3. עדכון הסטטוס
//     let updateSql = "";
//     if (role === "Chief") {
//       updateSql = `UPDATE event_providers SET status=? WHERE provider_id=? AND event_id=?`;
//     } else {
//       updateSql = `UPDATE events SET status=? WHERE hall_id=? AND event_id=?`;
//     } // 1. עדכון הסטטוס באותו אופן

//     await doQuery(updateSql, [newStatus, providerId, eventId]); // 2. שליפת ה-user_id האמיתי של הלקוח מהאירוע הזה

//     const eventOwner = await doQuery(
//       `SELECT user_id FROM events WHERE event_id = ?`,
//       [eventId],
//     );
//     const customerId = eventOwner[0]?.user_id; // 3. יצירת ההתראה עם ה-ID האמיתי

//     await createNotification({
//       message: `Event was ${newStatus} by ${providersName}`,
//       userId: customerId,
//     });
//     return { success: true };
//   }

//   return {
//     success: false,
//     message: "Provider is already booked for this time range.",
//   };
// }

// async function changeStatusEvent(providerId, eventId, newStatus, eventData) {
//   console.log(eventData);
//   let providersName = "";
//   const role = await getRole(providerId);
//   let checkSql = "";
//   let checkParams = [];

//   // 1. הגדרת שאילתת הבדיקה לפי תפקיד
//   if (role === "Chief") {
//     checkSql = `
//       SELECT * FROM events e
//       JOIN event_providers ep ON e.event_id = ep.event_id
//       WHERE e.requested_date = ?
//         AND ep.provider_id = ?
//         AND ep.status = 'APPROVED'
//         AND e.event_id != ?        -- חשוב: אל תמצא את האירוע הנוכחי שאתה מנסה לאשר
//         AND e.start_time < ?       -- eventData.end_time
//         AND e.end_time > ?         -- eventData.start_time
//     `;
//     checkParams = [
//       eventData.requested_date,
//       providerId,
//       eventId,
//       eventData.end_time, // סוף האירוע החדש
//       eventData.start_time, // תחילת האירוע החדש
//     ];

//     const eventChief = await doQuery(
//       `SELECT first_name FROM users WHERE id = ?`,
//       [providerId],
//     );
//     providersName = eventChief[0]?.first_name || "The Chef";
//   } else {
//     // לוגיקה לבעל אולם
//     checkSql = `
//       SELECT * FROM events
//       WHERE requested_date = ?
//         AND hall_id = ?
//         AND status = 'APPROVED'
//         AND event_id != ?
//         AND start_time < ?
//         AND end_time > ?`;
//     checkParams = [
//       eventData.requested_date,
//       providerId,
//       eventId,
//       eventData.end_time,
//       eventData.start_time,
//     ];

//     const eventhall = await doQuery(
//       `SELECT hall_name FROM halls WHERE hall_id = ?`,
//       [providerId],
//     );
//     providersName = eventhall[0]?.hall_name || "The Venue";
//   }

//   // 2. בדיקה האם קיים אירוע חופף
//   const overlaps = await doQuery(checkSql, checkParams);
//   console.log("Overlapping events found:", overlaps.length);

//   // מאשרים את השינוי רק אם אין חפיפה, או אם הספק מבצע דחייה (REJECTED)
//   if (overlaps.length === 0 || newStatus.toUpperCase() === "REJECTED") {
//     // 3. עדכון הסטטוס בטבלה המתאימה
//     let updateSql = "";
//     if (role === "Chief") {
//       updateSql = `UPDATE event_providers SET status = ? WHERE provider_id = ? AND event_id = ?`;
//     } else {
//       updateSql = `UPDATE events SET status = ? WHERE hall_id = ? AND event_id = ?`;
//     }

//     await doQuery(updateSql, [newStatus, providerId, eventId]);

//     // 4. שליפת ה-user_id האמיתי של הלקוח מהאירוע הזה
//     const eventOwner = await doQuery(
//       `SELECT user_id FROM events WHERE event_id = ?`,
//       [eventId],
//     );
//     const customerId = eventOwner[0]?.user_id;

//     if (!customerId) {
//       console.error("Could not find customer ID for event:", eventId);
//       return {
//         success: true,
//         message: "Status updated, but notification could not be sent.",
//       };
//     }

//     // 5. בניית הודעת התראה מותאמת אישית וברורה לפי הסטטוס החדש
//     let notificationMessage = "";
//     const cleanDate = eventData.requested_date
//       ? eventData.requested_date.split("T")[0]
//       : "the requested date";

//     switch (newStatus.toUpperCase()) {
//       case "APPROVED":
//         notificationMessage = `Great news! Your booking for ${cleanDate} has been APPROVED by ${providersName}.`;
//         break;
//       case "REJECTED":
//         notificationMessage = `Notice: ${providersName} has DECLINED the request for ${cleanDate}. You can explore alternative options in the system.`;
//         break;
//       default:
//         notificationMessage = `The status of your event on ${cleanDate} was updated to ${newStatus} by ${providersName}.`;
//     }

//     // 6. יצירת ההתראה ללקוח
//     await createNotification({
//       message: notificationMessage,
//       userId: customerId,
//     });

//     return { success: true };
//   }

//   // אם נמצאה חפיפה והספק ניסה לאשר (APPROVE)
//   return {
//     success: false,
//     message: "Provider is already booked for this time range.",
//   };
// }

async function getAllEventsAccordingToStatus(
  providerId,
  statusFilter = "PENDING",
) {
  let sql = "";
  let params = [];

  if ((await getRole(providerId)) === "Chief") {
    sql = `
      SELECT 
        events.event_id, 
        events.requested_date, 
        events.start_time, 
        events.end_time, 
        events.guest_number, 
        event_providers.noteToChef AS notes, 
        event_providers.status, 
        event_providers.location,
        users.first_name, 
        reviews.rating, 
        reviews.comment
      FROM events 
      JOIN event_providers ON event_providers.event_id = events.event_id AND event_providers.provider_id = ? 
      JOIN users ON users.id = events.user_id 
      LEFT JOIN reviews ON reviews.event_id = events.event_id AND reviews.provider_id = ? 
      WHERE event_providers.status = ? 
      -- ✨ התיקון הלוגי: בדיקת זמן מתבצעת רק עבור בקשות ממתינות
      AND (? != 'PENDING' OR TIMESTAMP(events.requested_date, events.start_time) >= NOW())
      ORDER BY events.requested_date DESC, events.start_time DESC`; // מיון מהחדש לישן כדי שהיסטוריה תוצג בנוח

    params = [providerId, providerId, statusFilter, statusFilter];
  } else {
    sql = `
      SELECT 
        events.event_id, 
        events.requested_date, 
        events.start_time, 
        events.end_time, 
        events.guest_number,
        events.notesToHall AS notes, 
        events.status, 
        users.first_name, 
        reviews.rating, 
        reviews.comment
      FROM events 
      JOIN users ON users.id = events.user_id 
      LEFT JOIN reviews ON events.event_id = reviews.event_id AND reviews.provider_id = ? 
      WHERE events.hall_id = ? 
      AND events.status = ?  
      -- ✨ התיקון הלוגי: בדיקת זמן מתבצעת רק עבור בקשות ממתינות
      AND (? != 'PENDING' OR TIMESTAMP(events.requested_date, events.start_time) >= NOW())
      ORDER BY events.requested_date DESC, events.start_time DESC`;

    params = [providerId, providerId, statusFilter, statusFilter];
  }

  const result = await doQuery(sql, params);
  return result;
}

async function changeStatusEvent(providerId, eventId, newStatus, eventData) {
  console.log(eventData);
  let providersName = "";
  const role = await getRole(providerId);
  let checkSql = "";
  let checkParams = [];

  // 1. הגדרת שאילתת הבדיקה לפי תפקיד
  if (role === "Chief") {
    checkSql = `
      SELECT * FROM events e
      JOIN event_providers ep ON e.event_id = ep.event_id
      WHERE e.requested_date = ?
        AND ep.provider_id = ?
        AND ep.status = 'APPROVED'
        AND e.event_id != ?        -- חשוב: אל תמצא את האירוע הנוכחי שאתה מנסה לאשר
        AND e.start_time < ?       -- eventData.end_time
        AND e.end_time > ?         -- eventData.start_time
    `;
    checkParams = [
      eventData.requested_date,
      providerId,
      eventId,
      eventData.end_time, // סוף האירוע החדש
      eventData.start_time, // תחילת האירוע החדש
    ];

    const eventChief = await doQuery(
      `SELECT first_name FROM users WHERE id = ?`,
      [providerId],
    );
    providersName = eventChief[0]?.first_name || "The Chef";
  } else {
    // לוגיקה לבעל אולם
    checkSql = `
      SELECT * FROM events 
      WHERE requested_date = ? 
        AND hall_id = ? 
        AND status = 'APPROVED' 
        AND event_id != ?
        AND start_time < ? 
        AND end_time > ?`;
    checkParams = [
      eventData.requested_date,
      providerId,
      eventId,
      eventData.end_time,
      eventData.start_time,
    ];

    const eventhall = await doQuery(
      `SELECT hall_name FROM halls WHERE hall_id = ?`,
      [providerId],
    );
    providersName = eventhall[0]?.hall_name || "The Venue";
  }

  // 2. בדיקה האם קיים אירוע חופף
  const overlaps = await doQuery(checkSql, checkParams);
  console.log("Overlapping events found:", overlaps.length);

  // מאשרים את השינוי רק אם אין חפיפה, או אם הספק מבצע דחייה (REJECTED)
  if (overlaps.length === 0 || newStatus.toUpperCase() === "REJECTED") {
    // 3. עדכון הסטטוס בטבלה המתאימה
    let updateSql = "";
    if (role === "Chief") {
      updateSql = `UPDATE event_providers SET status = ? WHERE provider_id = ? AND event_id = ?`;
    } else {
      updateSql = `UPDATE events SET status = ? WHERE hall_id = ? AND event_id = ?`;
    }

    await doQuery(updateSql, [newStatus, providerId, eventId]);

    // 4. שליפת ה-user_id האמיתי של הלקוח מהאירוע הזה
    const eventOwner = await doQuery(
      `SELECT user_id FROM events WHERE event_id = ?`,
      [eventId],
    );
    const customerId = eventOwner[0]?.user_id;

    if (!customerId) {
      console.error("Could not find customer ID for event:", eventId);
      return {
        success: true,
        message: "Status updated, but notification could not be sent.",
      };
    }

    // 5. בניית הודעת התראה מותאמת אישית וברורה לפי הסטטוס החדש
    let notificationMessage = "";
    const cleanDate = eventData.requested_date
      ? eventData.requested_date.split("T")[0]
      : "the requested date";

    switch (newStatus.toUpperCase()) {
      case "APPROVED":
        notificationMessage = `Great news! Your booking for ${cleanDate} has been APPROVED by ${providersName}.`;
        break;
      case "REJECTED":
        notificationMessage = `Notice: ${providersName} has DECLINED the request for ${cleanDate}. You can explore alternative options in the system.`;
        break;
      default:
        notificationMessage = `The status of your event on ${cleanDate} was updated to ${newStatus} by ${providersName}.`;
    }

    // 6. יצירת ההתראה ללקוח באופן מוגן ומאובטח
    // =================================================================
    try {
      await createNotification({
        message: notificationMessage,
        userId: customerId,
      });
    } catch (notifError) {
      // תופסים את השגיאה של ההתראה כדי שהעדכון הראשי ב-DB לא ייכשל
      console.error(
        "Failed to deliver status update notification:",
        notifError,
      );
    }
    // =================================================================

    return { success: true };
  }

  // אם נמצאה חפיפה והספק ניסה לאשר (APPROVE)
  return {
    success: false,
    message: "Provider is already booked for this time range.",
  };
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
  getAllEvents,
  changeStatusEvent,
  getAllEventsApproved,
  getAllPendingEvents,
  getAllEventsAccordingToStatus,
};
