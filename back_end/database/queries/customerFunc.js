const doQuery = require("../query");
const { getRole, getStatusEvent, AvailToEvent } = require("./helpingFunc");
const { createNotification } = require("./notifications");
const { sendEmail } = require("./mail");

function validateDataToSearch(dataToSearch) {
  const today = new Date().toISOString().split("T")[0];

  // אם הזין תאריך - נוודא שהוא לא בעבר
  if (dataToSearch.requested_date && dataToSearch.requested_date < today) {
    return { success: false, message: "Cannot search for past dates" };
  }

  // אם הזין שעות התחלה וסיום - נוודא שההתחלה לפני הסוף
  if (dataToSearch.start_time && dataToSearch.end_time) {
    if (dataToSearch.start_time >= dataToSearch.end_time) {
      return { success: false, message: "Start time must be before end time" };
    }
  }

  // אם הזין אורחים - נוודא שמספר חיובי
  if (dataToSearch.guest_number && Number(dataToSearch.guest_number) <= 0) {
    return { success: false, message: "Guest number must be positive" };
  }

  return { success: true };
}

async function getPotentialProviders(dataToSearch) {
  let whereClauses = [];
  let queryParams = [];

  // 1. סינון לפי תאריך זמינות ביומן (אם הזין)
  if (dataToSearch.requested_date) {
    whereClauses.push("a.available_date = ?");
    queryParams.push(dataToSearch.requested_date);
  }

  // 2. סינון לפי שעות (רק אם הזין את שתיהן)
  if (dataToSearch.start_time && dataToSearch.end_time) {
    whereClauses.push("a.start_time <= ? AND a.end_time >= ?");
    queryParams.push(dataToSearch.start_time, dataToSearch.end_time);
  }

  // 3. סינון לפי קיבולת אורחים
  if (dataToSearch.guest_number) {
    whereClauses.push("c.capacity >= ?");
    queryParams.push(Number(dataToSearch.guest_number));
  }

  // 4. סינון לפי עיר
  if (dataToSearch.city) {
    whereClauses.push("c.city = ?");
    queryParams.push(dataToSearch.city);
  }

  // 5. סינון לפי מחיר מקסימלי
  if (dataToSearch.price) {
    whereClauses.push("c.price <= ?");
    queryParams.push(Number(dataToSearch.price));
  }

  // בניית חלק ה-WHERE
  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const sql = `
    SELECT DISTINCT a.provider_id
    FROM availability a
    JOIN (
        SELECT capacity, chief_id AS id, city, price_per_hour AS price FROM chiefs
        UNION 
        SELECT capacity, hall_id AS id, city, price FROM halls
    ) AS c ON a.provider_id = c.id
    ${whereSql}
  `;

  const providers = await doQuery(sql, queryParams);
  return providers.map((p) => p.provider_id);
}

async function getResultSearching(dataToSearch) {
  console.log(dataToSearch);

  // 1. ולידציה
  const validation = validateDataToSearch(dataToSearch);
  if (!validation.success) {
    return { success: false, message: validation.message, data: [] };
  }

  try {
    // 2. שליפת ספקים פוטנציאליים לפי הסינונים
    const potentialIds = await getPotentialProviders(dataToSearch);

    if (potentialIds.length === 0) {
      return { success: true, data: [] };
    }

    let finalIds = potentialIds;

    // 3. בדיקת זמינות
    if (
      dataToSearch.requested_date &&
      dataToSearch.start_time &&
      dataToSearch.end_time
    ) {
      const availabilityChecks = await Promise.all(
        potentialIds.map(async (id) => {
          const isAvailable = await AvailToEvent(
            dataToSearch.event_id || null,
            dataToSearch.requested_date,
            id,
            dataToSearch.start_time,
            dataToSearch.end_time,
          );
          return isAvailable ? id : null;
        }),
      );
      finalIds = availabilityChecks.filter((id) => id !== null);
    }

    if (finalIds.length === 0) {
      return { success: true, data: [] };
    }

    // 4. שליפת פרטי הספקים עם השדות המלאים והאחידים!
    const placeholders = finalIds.map(() => "?").join(",");

    const sqlUsers = `
      SELECT 
          u.id, 
          u.first_name, 
          u.last_name,
          u.email, 
          u.phone,
          'Chief' AS provider_type, 
          c.status,
          u.first_name AS ServiceName,
          c.submitted_at,
          c.rejection_reason,
          c.price_per_hour AS price,
          COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE provider_id = u.id), 0.0) AS avgRating,
          (SELECT COUNT(rating) FROM reviews WHERE provider_id = u.id) AS totalReviews
      FROM users u
      INNER JOIN chiefs c ON u.id = c.chief_id
      WHERE u.id IN (${placeholders})

      UNION ALL

      SELECT 
          u.id, 
          u.first_name, 
          u.last_name,
          u.email, 
          u.phone,
          'Hall_Owner' AS provider_type, 
          h.status,
          h.hall_name AS ServiceName,
          h.submitted_at,
          h.rejection_reason,
          h.price AS price,
          COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE provider_id = u.id), 0.0) AS avgRating,
          (SELECT COUNT(rating) FROM reviews WHERE provider_id = u.id) AS totalReviews
      FROM users u
      INNER JOIN halls h ON u.id = h.hall_id
      WHERE u.id IN (${placeholders})
    `;

    // אנו מעבירים את המערך פעמיים כיוון שיש שני מזהים של placeholders ב-UNION ALL
    const finalResults = await doQuery(sqlUsers, [...finalIds, ...finalIds]);

    return { success: true, data: finalResults };
  } catch (error) {
    console.error("Search failed:", error);
    throw error;
  }
}

async function getAllEventsData(customerId) {
  const sql = `SELECT 
    e.event_id, 
    e.requested_date,
    e.start_time,
    e.end_time,
    e.guest_number,
    e.notesToHall,       
    e.rejection_reason  AS hall_reason ,
    e.status AS hall_status,
    e.hall_id,
    h.hall_name,
    h.price AS hall_price,
    u.first_name AS chief_name,
    ep.provider_id AS chief_id,
    ep.status AS chief_status,
    ep.noteToChef,     
    ep.rejection_reason  AS chiefs_reason ,
    ep.location AS chef_event_location,
    c.price_per_hour
  FROM events e
  LEFT JOIN halls h ON e.hall_id = h.hall_id
  LEFT JOIN event_providers ep ON e.event_id = ep.event_id
  LEFT JOIN chiefs c ON ep.provider_id = c.chief_id
  LEFT JOIN users u ON c.chief_id = u.id
  WHERE e.user_id = ?
  ORDER BY e.requested_date DESC, e.start_time ASC`;

  const rows = await doQuery(sql, [customerId]);

  const eventsMap = new Map();

  for (const row of rows) {
    // אם זו פעם ראשונה שאנחנו רואים את האירוע הזה, ניצור את האובייקט שלו
    if (!eventsMap.has(row.event_id)) {
      eventsMap.set(row.event_id, {
        event_id: row.event_id,
        requested_date: row.requested_date,
        start_time: row.start_time,
        end_time: row.end_time,
        guest_number: row.guest_number,
        notesToHall: row.notesToHall,
        hall_reason: row.hall_reason,
        hall_status: row.hall_status,
        hall_id: row.hall_id,
        hall_name: row.hall_name,
        hall_price: row.hall_price,
        chiefs: [], // מערך ייעודי שיכיל את כל השפים של האירוע
      });
    }

    const currentEvent = eventsMap.get(row.event_id);

    // 2. אם בשורה הנוכחית קיים שף, נוסיף אותו למערך ה-chiefs
    if (row.chief_id) {
      currentEvent.chiefs.push({
        chief_id: row.chief_id,
        chief_name: row.chief_name,
        chief_status: row.chief_status,
        chiefs_reason: row.chiefs_reason,
        noteToChef: row.noteToChef,
        chef_event_location: row.chef_event_location,
        price_per_hour: row.price_per_hour,
      });
    }
  }

  // 3. הפיכת ה-Map למערך אירועים ייחודיים
  const eventsList = Array.from(eventsMap.values());

  // 4. חישוב הסטטוס הסופי לכל אירוע ייחודי במקביל (Promise.all)
  const finalResults = await Promise.all(
    eventsList.map(async (event) => {
      const finalStatus = await getStatusEvent(event.event_id);
      return {
        ...event,
        finalStatus: finalStatus,
      };
    }),
  );

  return finalResults;
}




async function createEventData(Data, customerId) {
  const {
    dataToEvent,
    hallId,
    selectedChiefsId,
    location,
    notesToHall,
    noteToChef,
  } = Data;

  if (
    !dataToEvent ||
    !dataToEvent.requested_date ||
    !dataToEvent.start_time ||
    !dataToEvent.end_time ||
    !dataToEvent.guest_number
  ) {
    return {
      success: false,
      message: "Missing required event date, time, or guest count.",
    };
  }

  const hasHall = Boolean(hallId);
  const hasChiefs =
    Array.isArray(selectedChiefsId) && selectedChiefsId.length > 0;

  if (!hasHall && !hasChiefs) {
    return {
      success: false,
      message: "Event must include at least a hall or one chef.",
    };
  }

  try {
    await doQuery("START TRANSACTION");

    const sqlEvent = `
      INSERT INTO events (user_id, hall_id, requested_date, start_time, end_time, notesToHall, guest_number) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const result = await doQuery(sqlEvent, [
      customerId,
      hallId || null,
      dataToEvent.requested_date,
      dataToEvent.start_time,
      dataToEvent.end_time,
      notesToHall || "",
      dataToEvent.guest_number,
    ]);
    const newEventId = result.insertId;

    if (hasChiefs) {
      const sqlProvider = `INSERT INTO event_providers (event_id, provider_id, noteToChef, location) VALUES (?, ?, ?, ?)`;
      for (const chefId of selectedChiefsId) {
        await doQuery(sqlProvider, [
          newEventId,
          chefId,
          noteToChef?.[chefId] || "",
          location || null,
        ]);
      }
    }

    // שליחת מיילים והתראות
    const allProviderIds = [...(hallId ? [hallId] : []), ...selectedChiefsId];
    if (allProviderIds.length > 0) {
      const placeholders = allProviderIds.map(() => "?").join(",");
      const usersRows = await doQuery(
        `SELECT id, email, first_name FROM users WHERE id IN (${placeholders})`,
        allProviderIds,
      );
      const userMap = new Map(usersRows.map((u) => [u.id, u]));

      if (hallId && userMap.has(hallId)) {
        const hallUser = userMap.get(hallId);
        await createNotification({
          message: `You received a new booking request for ${dataToEvent.requested_date}.`,
          userId: hallId,
        });
        await sendEmail({
          to: hallUser.email,
          subject: "New Event Booking Request!",
          html: `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2>Hello ${hallUser.first_name},</h2>
                <p>You have received a new booking request for your venue!</p>
                <ul>
                  <li><strong>Date:</strong> ${dataToEvent.requested_date}</li>
                  <li><strong>Time:</strong> ${dataToEvent.start_time} - ${dataToEvent.end_time}</li>
                  <li><strong>Guests:</strong> ${dataToEvent.guest_number}</li>
                </ul>
                <p>Please log in to your dashboard to review and manage this request.</p>
                <br/>
                <p>Best regards,<br/><strong>Event Management Team</strong></p>
              </div>
            `,
        });
      }

      for (const chefId of selectedChiefsId) {
        if (userMap.has(chefId)) {
          const chefUser = userMap.get(chefId);
          await createNotification({
            message: `A customer requested your chef services for ${dataToEvent.requested_date}.`,
            userId: chefId,
          });
          await sendEmail({
            to: chefUser.email,
            subject: "New Catering Request!",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                  <h2>Hello ${chefUser.first_name},</h2>
                  <p>A customer has requested your chef services for an upcoming event!</p>
                  <ul>
                    <li><strong>Date:</strong> ${dataToEvent.requested_date}</li>
                    <li><strong>Time:</strong> ${dataToEvent.start_time} - ${dataToEvent.end_time}</li>
                    <li><strong>Guests:</strong> ${dataToEvent.guest_number}</li>
                  </ul>
                  <p>Please log in to your dashboard to accept or decline this request.</p>
                  <br/>
                  <p>Best regards,<br/><strong>Event Management Team</strong></p>
                </div>
              `,
          });
        }
      }
    }

    await doQuery("COMMIT");
    return { success: true, eventId: newEventId };
  } catch (error) {
    await doQuery("ROLLBACK");
    throw error;
  }
}

// פונקציית עזר לבדיקת חלון 48 השעות
async function validateUpdateDeadline(currentEvent, updatingData) {
  // 1. בדיקת זמנים של האירוע המקורי
  const origDateStr = new Date(currentEvent.requested_date)
    .toISOString()
    .split("T")[0];
  const eventDateTimeStr = `${origDateStr}T${currentEvent.start_time}`;
  const eventDate = new Date(eventDateTimeStr);
  const now = new Date();

  const hoursDifference = (eventDate - now) / (1000 * 60 * 60);

  if (hoursDifference < 48) {
    throw new Error(
      "Events cannot be updated less than 48 hours before the scheduled time.",
    );
  }

  // 2. בדיקה שהתאריך החדש (אם נשלח) אינו בעבר
  const newDate = updatingData.dataToEvent?.requested_date;
  if (newDate && new Date(newDate) < new Date().setHours(0, 0, 0, 0)) {
    throw new Error("Cannot set event date to a past date.");
  }
}

async function validateAndGetEvent(customerId, eventId) {
  const sql = `SELECT * FROM events WHERE user_id = ? AND event_id = ?`;
  const rows = await doQuery(sql, [customerId, eventId]);
  if (rows.length === 0) throw new Error("Unauthorized or Event not found");
  return rows[0];
}

async function updateEventData(updatingData, customerId, eventId) {
  try {
    console.log(updatingData);
    await doQuery("START TRANSACTION");

    // 1. בדיקת הרשאות ושליפת האירוע
    const currentEvent = await validateAndGetEvent(customerId, eventId);

    // 2. בדיקת מדיניות 48 שעות
    await validateUpdateDeadline(currentEvent, updatingData);
    // 3. עדכון פרטי אירוע בסיסיים (מחזיר true אם התאריך/שעה/אורחים השתנו)
    const isCritical = await handleEventBasicUpdate(
      updatingData,
      currentEvent,
      eventId,
    );
    console.log("knhlhbdBHD", updatingData);

    // 4. עדכון שפים
    await handleChiefsUpdate(
      updatingData.selectedChiefsId ,
      eventId,
      currentEvent,
      isCritical,
      updatingData.noteToChef,
      updatingData.location,
    );

    // 5. עדכון אולם
    await handleHallUpdate(
      updatingData.hallId,
      currentEvent.hall_id,
      eventId,
      currentEvent,
    );

    // 6. התראות לשינוי קריטי בזמנים (לכל הספקים הנוכחיים)
    if (isCritical) {
      const eventDate =
        updatingData.dataToEvent?.requested_date ||
        currentEvent.requested_date;

      // שליפת השפים הנוכחיים
      const currentChiefs = await doQuery(
        `SELECT provider_id FROM event_providers WHERE event_id = ?`,
        [eventId],
      );

      // התראה לאולם (אם קיים)
      if (currentEvent.hall_id) {
        await createNotification({
          message: `The details for the event on ${eventDate} have been updated. Please re-approve your availability.`,
          userId: currentEvent.hall_id,
        });
      }

      // התראה לשפים
      for (const chef of currentChiefs) {
        await createNotification({
          message: `The details for the event on ${eventDate} have been updated. Please re-approve your availability.`,
          userId: chef.provider_id,
        });
      }
    }

    await doQuery("COMMIT");
    return { success: true };
  } catch (error) {
    await doQuery("ROLLBACK");
    throw error;
  }
}

async function handleEventBasicUpdate(updatingData, currentEvent, eventId) {
  let fields = [];
  let values = [];
  let isCritical = false;

  // רשימת השדות שאנחנו בודקים אם השתנו
  const relevantFields = [
    "requested_date",
    "start_time",
    "end_time",
    "guest_number",
  ];
  const searchParams = updatingData.dataToEvent || {};

  relevantFields.forEach((field) => {
    const newValue = searchParams[field];
    const oldValue = currentEvent[field];

    if (newValue !== undefined && newValue !== null && newValue !== oldValue) {
      fields.push(`${field} = ?`);
      values.push(newValue);
      isCritical = true;
    }
  });

  // עדכון הערות לאולם במידה ונשלחו
  if (
    updatingData.notesToHall !== undefined &&
    updatingData.notesToHall !== currentEvent.notesToHall
  ) {
    fields.push("notesToHall = ?");
    values.push(updatingData.notesToHall);
  }

  if (isCritical) {
    fields.push("status = ?");
    values.push("PENDING");

    // איפוס סטטוס לכל הספקים של האירוע כי הפרטים השתנו
    await doQuery(
      `UPDATE event_providers SET status = 'PENDING' WHERE event_id = ?`,
      [eventId],
    );
  }
  if (fields.length > 0) {
    values.push(eventId); // ה-ID עבור ה-WHERE
    await doQuery(
      `UPDATE events SET ${fields.join(", ")} WHERE event_id = ?`,
      values,
    );
  }

  return isCritical;
}

async function handleChiefsUpdate(
  newChiefsIds,
  eventId,
  currentEvent,
  isCritical,
  noteToChef = {},
  location = null,
) {
  console.log("HANDLECHEFS", newChiefsIds, currentEvent);
  const validIds = Array.isArray(newChiefsIds)
    ? newChiefsIds.filter((id) => id !== null && id !== undefined)
    : [];

  // 1. אם רשימת השפים החדשה ריקה - מוחקים את כל השפים מהאירוע
  if (validIds.length === 0) {
    await doQuery(`DELETE FROM event_providers WHERE event_id = ?`, [eventId]);
    return;
  }

  // 2. 🧹 מחיקת שפים שהוסרו מהאירוע (מבוצע בבטחה בתחילת התהליך)
  const placeholders = validIds.map(() => "?").join(",");
  const deleteSql = `DELETE FROM event_providers WHERE event_id = ? AND provider_id NOT IN (${placeholders})`;
  await doQuery(deleteSql, [eventId, ...validIds]); // 👈 העברת הפרמטרים בסדר המדויק!

  // 3. שליפת השפים שנותרו במערכת לאחר המחיקה
  const rows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );
  const existingIds = rows.map((r) => r.provider_id);

  // 4. הוספה/עדכון של השפים שנבחרו
  for (const id of validIds) {
    const chefNote = noteToChef?.[id] || "";

    if (!existingIds.includes(id)) {
      // הכנסת שף חדש
      await doQuery(
        `INSERT INTO event_providers (event_id, provider_id, status, noteToChef, location) VALUES (?, ?, 'PENDING', ?, ?)`,
        [eventId, id, chefNote, location],
      );

      // שליחת התראה ומייל לשף החדש בלבד
      if (!isCritical) {
        await createNotification({
          message: `You have been assigned to a new event booking on ${currentEvent.requested_date}.`,
          userId: id,
        });

        const chefUser = await doQuery(
          `SELECT email, first_name FROM users WHERE id = ?`,
          [id],
        );
        if (chefUser.length > 0) {
          await sendEmail({
            to: chefUser[0].email,
            subject: "New Catering Request!",
            html: `<h2>Hello ${chefUser[0].first_name},</h2><p>You have been assigned to a new event on ${currentEvent.requested_date}!</p>`,
          });
        }
      }
    } else {
      // עדכון הערות ומיקום לשף קיים
      await doQuery(
        `UPDATE event_providers SET noteToChef = ?, location = ? WHERE event_id = ? AND provider_id = ?`,
        [chefNote, location, eventId, id],
      );
    }
  }
}

async function handleHallUpdate(
  updatingHallId,
  currentHallId,
  eventId,
  currentEvent,
) {
  // רק אם הוחלף אולם
  if (updatingHallId && updatingHallId !== currentHallId) {
    const sqlHall = `UPDATE events SET hall_id = ?, status = 'PENDING' WHERE event_id = ?`;
    await doQuery(sqlHall, [updatingHallId, eventId]);

    // שליחת התראה במערכת לאולם החדש
    await createNotification({
      message: `You received a new booking request for ${currentEvent.requested_date}.`,
      userId: updatingHallId,
    });

    // שליפת פרטי המשתמש של האולם החדש לשליחת מייל
    const hallQuery = `
      SELECT u.email, u.first_name 
      FROM users u 
      JOIN halls h ON u.id = h.hall_id 
      WHERE h.hall_id = ?`;
    const hallUser = await doQuery(hallQuery, [updatingHallId]);

    if (hallUser.length > 0) {
      await sendEmail({
        to: hallUser[0].email,
        subject: "New Event Booking Request!",
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2>Hello ${hallUser[0].first_name},</h2>
            <p>You have received a new booking request for your venue!</p>
            <ul>
              <li><strong>Date:</strong> ${currentEvent.requested_date}</li>
              <li><strong>Time:</strong> ${currentEvent.start_time} - ${currentEvent.end_time}</li>
              <li><strong>Guests:</strong> ${currentEvent.guest_number}</li>
            </ul>
            <p>Please log in to your dashboard to review and manage this request.</p>
            <br/>
            <p>Best regards,<br/><strong>Event Management Team</strong></p>
          </div>
        `,
      });
    }
  }
}


async function cancelEvent(eventId, customerId) {
  const currentEvent = await validateAndGetEvent(customerId, eventId);

  const origDateStr = new Date(currentEvent.requested_date)
    .toISOString()
    .split("T")[0];
  const eventDateTime = new Date(`${origDateStr}T${currentEvent.start_time}`);
  const hoursDifference = (eventDateTime - new Date()) / (1000 * 60 * 60);

  if (hoursDifference < 48) {
    throw new Error(
      "Events cannot be cancelled less than 48 hours before the scheduled time.",
    );
  }

  const providerRows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );

  await doQuery(`UPDATE events SET status = 'CANCELLED' WHERE event_id = ?`, [
    eventId,
  ]);
  await doQuery(
    `UPDATE event_providers SET status = 'CANCELLED' WHERE event_id = ?`,
    [eventId],
  );

  const eventDate = currentEvent.requested_date;
  const hallId = currentEvent.hall_id;

  try {
    if (hallId) {
      await createNotification({
        message: `The event scheduled for ${eventDate} has been CANCELLED by the customer.`,
        userId: hallId,
      });
    }

    for (const row of providerRows) {
      await createNotification({
        message: `The event scheduled for ${eventDate} has been CANCELLED by the customer.`,
        userId: row.provider_id,
      });
    }
  } catch (notifError) {
    console.error("Failed to send cancellation notifications:", notifError);
  }

  return { success: true };
}

async function disCancelEvent(eventId, customerId) {

  const currentEvent = await validateAndGetEvent(customerId, eventId);

  const origDateStr = new Date(currentEvent.requested_date)
    .toISOString()
    .split("T")[0];
  const eventDateTime = new Date(`${origDateStr}T${currentEvent.start_time}`);
  const hoursDifference = (eventDateTime - new Date()) / (1000 * 60 * 60);

  if (hoursDifference < 48) {
    throw new Error(
      "Cancelled events cannot be reinstated less than 48 hours before the scheduled time.",
    );
  }

  const providerRows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );

  await doQuery(`UPDATE events SET status = 'PENDING' WHERE event_id = ?`, [
    eventId,
  ]);
  await doQuery(
    `UPDATE event_providers SET status = 'PENDING' WHERE event_id = ?`,
    [eventId],
  );

  const eventDate = currentEvent.requested_date;
  const hallId = currentEvent.hall_id;

  try {
    if (hallId) {
      await createNotification({
        message: `The cancelled event for ${eventDate} has been reinstated and is pending your re-approval.`,
        userId: hallId,
      });
    }

    for (const row of providerRows) {
      await createNotification({
        message: `The cancelled event for ${eventDate} has been reinstated and is pending your re-approval.`,
        userId: row.provider_id,
      });
    }
  } catch (notifError) {
    console.error("Failed to send disCancel notifications:", notifError);
  }

  return { success: true };
}
async function ReviewProvider(ReviewData, userId) {
  const { eventId, providerId, rating, comment } = ReviewData;
  const sql = `
    INSERT INTO reviews (event_id, user_id, provider_id, rating, comment) 
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      rating = VALUES(rating),
      comment = VALUES(comment)
  `;

  await doQuery(sql, [eventId, userId, providerId, rating, comment]);

  // =================================================================
  // ✨ הוספת התראה לספק על ביקורת חדשה
  // =================================================================
  try {
    await createNotification({
      message: `A client left you a ${rating}-star review: "${comment.substring(0, 30)}..."`,
      userId: providerId,
    });
  } catch (notifError) {
    console.error("Failed to send review notification:", notifError);
  }
  // =================================================================

  return { success: true };
}

async function addFavoriteQuery(userId, providerId) {
  const sql = `INSERT IGNORE INTO favorites (user_id, provider_id) VALUES (?, ?)`;
  await doQuery(sql, [userId, providerId]);
  return { success: true };
}

async function removeFavoriteQuery(userId, providerId) {
  const sql = `DELETE FROM favorites WHERE user_id = ? AND provider_id = ?`;
  await doQuery(sql, [userId, providerId]);
  return { success: true };
}

async function getAllFavoritesQuery(userId) {
  const sql = `SELECT provider_id FROM favorites WHERE user_id = ?`;
  const result = await doQuery(sql, [userId]);
  return result.map((r) => r.provider_id);
}

async function getAllFavoritesProvidersQuery(userId) {
  const sql = `
    SELECT 
      u.id, 
      u.first_name, 
      u.last_name, 
      u.email, 
      u.role AS provider_type,
      COALESCE(h.status, c.status) AS status
    FROM favorites f
    JOIN users u ON f.provider_id = u.id
    LEFT JOIN halls h ON u.id = h.hall_id
    LEFT JOIN chiefs c ON u.id = c.chief_id
    WHERE f.user_id = ?`;
  return await doQuery(sql, [userId]);
}
async function ReviewAndComment(eventId, userId, providerId) {
  const sql = `SELECT * FROM reviews WHERE provider_id=? AND event_id=? AND user_id=?`;
  const result = await doQuery(sql, [providerId, eventId, userId]);
  return result;
}

async function getAllCommentsAndReviews(providerId) {
  const sql = `
    SELECT reviews.*, users.first_name, users.last_name 
    FROM reviews 
    JOIN users ON users.id = reviews.user_id 
    WHERE reviews.provider_id = ? AND reviews.is_deleted = 0
  `;
  const result = await doQuery(sql, [providerId]);
  return result;
}

module.exports = {
  getResultSearching,
  createEventData,
  getAllEventsData,
  updateEventData,
  cancelEvent,
  addFavoriteQuery,
  removeFavoriteQuery,
  getAllFavoritesQuery,
  getAllFavoritesProvidersQuery,
  ReviewProvider,
  disCancelEvent,
  ReviewAndComment,
};
