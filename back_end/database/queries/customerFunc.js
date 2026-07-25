const doQuery = require("../query");
const { getRole, getStatusEvent, AvailToEvent } = require("./helpingFunc");
const { createNotification } = require("./notifications");

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

// async function getResultSearching(dataToSearch) {
//   console.log(dataToSearch);
//   // 1. ולידציה של הנתונים שהוזנו
//   const validation = validateDataToSearch(dataToSearch);
//   if (!validation.success) {
//     return { success: false, message: validation.message, data: [] };
//   }

//   try {
//     // 2. שליפת ספקים פוטנציאליים לפי השדות שהוזנו
//     const potentialIds = await getPotentialProviders(dataToSearch);

//     if (potentialIds.length === 0) {
//       return { success: true, data: [] };
//     }

//     let finalIds = potentialIds;

//     // 3. בדיקת חפיפת אירועים ב-AvailToEvent תתבצע רק אם הלקוח מילא תאריך + שעת התחלה + שעת סיום!
//     if (
//       dataToSearch.requested_date &&
//       dataToSearch.start_time &&
//       dataToSearch.end_time
//     ) {
//       const availabilityChecks = await Promise.all(
//         potentialIds.map(async (id) => {
//           const isAvailable = await AvailToEvent(
//             dataToSearch.event_id || null,
//             dataToSearch.requested_date,
//             id,
//             dataToSearch.start_time,
//             dataToSearch.end_time,
//           );
//           return isAvailable ? id : null;
//         }),
//       );
//       finalIds = availabilityChecks.filter((id) => id !== null);
//     }

//     if (finalIds.length === 0) {
//       return { success: true, data: [] };
//     }

//     // 4. שליפת פרטי המשתמשים
//     const placeholders = finalIds.map(() => "?").join(",");
//     const sqlUsers = `SELECT *, role AS provider_type FROM users WHERE id IN (${placeholders})`;
//     const finalResults = await doQuery(sqlUsers, finalIds);

//     return { success: true, data: finalResults };
//   } catch (error) {
//     console.error("Search failed:", error);
//     throw error;
//   }
// }

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
async function getEventData(Data, customerId) {
  const {
    dataToEvent,
    hallId,
    selectedChiefsId,
    location,
    notesToHall,
    noteToChef,
  } = Data;

  const sql = `INSERT INTO events (user_id, hall_id, requested_date, start_time, end_time, notesToHall, guest_number) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

  let values = [
    customerId,
    hallId || null,
    dataToEvent.requested_date,
    dataToEvent.start_time,
    dataToEvent.end_time,
    notesToHall || "",
    dataToEvent.guest_number,
  ];

  const result = await doQuery(sql, values);
  const newEventId = result.insertId;

  const sql1 = `INSERT INTO event_providers (event_id, provider_id, noteToChef, location) 
                VALUES (?, ?, ?, ?)`;

  if (selectedChiefsId && selectedChiefsId.length > 0) {
    for (const pId of selectedChiefsId) {
      const specificChefNote =
        noteToChef && noteToChef[pId] ? noteToChef[pId] : "";

      await doQuery(sql1, [
        newEventId,
        pId,
        specificChefNote,
        location || null,
      ]);
    }
  }

  // =================================================================
  // ✨ הוספת התראות (Notifications) עבור יצירת אירוע חדש
  // =================================================================
  try {
    // 1. שליחת התראה לבעל האולם (אם נבחר אולם)
    if (hallId) {
      await createNotification({
        message: `You have received a new booking request for an event on ${dataToEvent.requested_date}. Please review and respond.`,
        userId: hallId,
      });
    }

    // 2. שליחת התראה לכל אחד מהשפים שנבחרו
    if (selectedChiefsId && selectedChiefsId.length > 0) {
      for (const pId of selectedChiefsId) {
        await createNotification({
          message: `A customer has requested your chef services for an event on ${dataToEvent.requested_date}.`,
          userId: pId,
        });
      }
    }
  } catch (notifError) {
    // תופסים שגיאה של התראות כדי שהיא לא תכשיל את יצירת האירוע עצמו
    console.error("Failed to send creation notifications:", notifError);
  }
  // =================================================================

  return { success: true };
}

async function getAllEventsData(customerId) {
  const sql = `SELECT 
    e.event_id, 
    e.requested_date,
    e.start_time,
    e.end_time,
    e.guest_number,
    e.notesToHall,            -- שליפת ההערות של האולם
    e.rejection_reason  AS hall_reason ,
    e.status AS hall_status,
    e.hall_id,
    h.hall_name,
    h.price AS hall_price,
    u.first_name AS chief_name,
    ep.provider_id AS chief_id,
    ep.status AS chief_status,
    ep.noteToChef,            -- שליפת ההערה הספציפית של השף הזה
    ep.rejection_reason  AS chiefs_reason ,
    ep.location AS chef_event_location, -- שליפת מיקום האירוע עבור השף
    c.price_per_hour
  FROM events e
  LEFT JOIN halls h ON e.hall_id = h.hall_id
  LEFT JOIN event_providers ep ON e.event_id = ep.event_id
  LEFT JOIN chiefs c ON ep.provider_id = c.chief_id
  LEFT JOIN users u ON c.chief_id = u.id
  WHERE e.user_id = ?
  ORDER BY e.requested_date DESC, e.start_time ASC`;

  const result = await doQuery(sql, [customerId]);
  const fresult = [];

  for (const row of result) {
    const finalStatus = await getStatusEvent(row.event_id);
    row.finalStatus = finalStatus;
    fresult.push(row);
  }

  console.log(fresult);
  return fresult;
}

async function updateEventData(updatingData, customerId, eventId) {
  try {
    console.log(updatingData);
    await doQuery("START TRANSACTION");

    // בדיקה ראשונית
    const currentEvent = await validateAndGetEvent(customerId, eventId);

    // עדכון פרטי אירוע ואיפוס אם צריך (מחזיר true אם התאריך/שעה השתנו)
    const isCritical = await handleEventBasicUpdate(
      updatingData,
      currentEvent,
      eventId,
    );

    // עדכון שפים
    await handleChiefsUpdate(updatingData.ChiefsIds, eventId);

    // עדכון אולם
    await handleHallUpdate(updatingData.hallId, currentEvent.hall_id, eventId);

    // =================================================================
    // ✨ הוספת התראות עבור עדכון אירוע (לפני ה-COMMIT)
    // =================================================================
    try {
      const eventDate =
        updatingData.searchParams?.requested_date ||
        currentEvent.requested_date;

      // 1. אם היה שינוי קריטי בזמנים - מודיעים לכל הספקים הנוכחיים שהם צריכים לאשר מחדש
      if (isCritical) {
        // שליפת השפים הנוכחיים של האירוע
        const currentChiefs = await doQuery(
          `SELECT provider_id FROM event_providers WHERE event_id = ?`,
          [eventId],
        );

        // התראה לאולם
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
      // 2. אם לא היה שינוי קריטי בזמנים, אבל הוחלף אולם - נודיע לאולם החדש
      else if (
        updatingData.hallId &&
        updatingData.hallId !== currentEvent.hall_id
      ) {
        await createNotification({
          message: `You have been booked for a new event on ${eventDate}.`,
          userId: updatingData.hallId,
        });
      }
    } catch (notifError) {
      console.error("Failed to send update notifications:", notifError);
    }
    // =================================================================

    await doQuery("COMMIT");
    return { success: true };
  } catch (error) {
    await doQuery("ROLLBACK");
    throw error;
  }
}

async function validateAndGetEvent(customerId, eventId) {
  const sql = `SELECT * FROM events WHERE user_id = ? AND event_id = ?`;
  const rows = await doQuery(sql, [customerId, eventId]);
  if (rows.length === 0) throw new Error("Unauthorized or Event not found");
  return rows[0];
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

  relevantFields.forEach((field) => {
    const newValue = updatingData.searchParams[field]; // גישה נכונה למפתח דינמי
    const oldValue = currentEvent[field];

    if (newValue && newValue !== oldValue) {
      fields.push(`${field} = ?`);
      values.push(newValue);
      isCritical = true; // אם השתנה תאריך/שעה, צריך לאפס סטטוסים לספקים
    }
  });

  if (fields.length > 0) {
    fields.push("status = ?");
    values.push("PENDING");

    values.push(eventId); // ה-ID עבור ה-WHERE

    await doQuery(
      `UPDATE events SET ${fields.join(", ")} WHERE event_id = ?`,
      values,
    );
  }

  if (isCritical) {
    // איפוס סטטוס לכל הספקים של האירוע כי הפרטים השתנו
    await doQuery(
      `UPDATE event_providers SET status = 'pending' WHERE event_id = ?`,
      [eventId],
    );
  }
  return isCritical;
}

async function handleChiefsUpdate(newChiefsIds, eventId) {
  // 1. סינון ראשוני - וודא שזה מערך ושיש בו רק ערכים שהם לא null/undefined
  const validIds = Array.isArray(newChiefsIds)
    ? newChiefsIds.filter((id) => id !== null && id !== undefined)
    : [];

  // 2. אם המערך ריק לגמרי (או שלא נשלחו שפים) - מחיקת כל השפים הקיימים לאירוע
  if (validIds.length === 0) {
    await doQuery(`DELETE FROM event_providers WHERE event_id = ?`, [eventId]);
    return;
  }

  // 3. בדיקת המצב הקיים ב-DB
  const rows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );
  const existingIds = rows.map((r) => r.provider_id);

  // 4. הוספת שפים חדשים
  for (const id of validIds) {
    if (!existingIds.includes(id)) {
      await doQuery(
        `INSERT INTO event_providers (event_id, provider_id, status) VALUES (?, ?, 'pending')`,
        [eventId, id],
      );
    }
  }

  // 5. מחיקת שפים שהוסרו
  const placeholders = validIds.map(() => "?").join(",");
  await doQuery(
    `DELETE FROM event_providers WHERE event_id = ? AND provider_id NOT IN (${placeholders})`,
    [eventId, ...validIds],
  );
}

async function handleHallUpdate(updatingHallId, currentHallId, eventId) {
  if (updatingHallId !== currentHallId) {
    const sqlHall = `UPDATE events SET hall_id = ?, status = 'PENDING' WHERE event_id = ?`;
    await doQuery(sqlHall, [updatingHallId, eventId]);
  }
}

async function cancelEvent(eventId) {
  // 1. שליפת פרטי האירוע והספקים שלו לצורך יצירת ההתראות
  const eventRows = await doQuery(
    `SELECT hall_id, requested_date FROM events WHERE event_id = ?`,
    [eventId],
  );
  const providerRows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );

  // 2. ביצוע עדכון הסטטוסים ב-DB
  const sql = `UPDATE events SET status = 'CANCELLED' WHERE event_id = ?`;
  await doQuery(sql, [eventId]);

  const sqlProviders = `UPDATE event_providers SET status = 'CANCELLED' WHERE event_id = ?`;
  await doQuery(sqlProviders, [eventId]);

  // 3. שליחת ההתראות (רק אם מצאנו את האירוע)
  if (eventRows.length > 0) {
    const eventDate = eventRows[0].requested_date;
    const hallId = eventRows[0].hall_id;

    try {
      // התראה לאולם
      if (hallId) {
        await createNotification({
          message: `The event scheduled for ${eventDate} has been CANCELLED by the customer.`,
          userId: hallId,
        });
      }

      // התראה לשפים
      for (const row of providerRows) {
        await createNotification({
          message: `The event scheduled for ${eventDate} has been CANCELLED by the customer.`,
          userId: row.provider_id,
        });
      }
    } catch (notifError) {
      console.error("Failed to send cancellation notifications:", notifError);
    }
  }

  return { success: true };
}

async function disCancelEvent(eventId) {
  // 1. שליפת פרטי האירוע והספקים לצורך יצירת ההתראות
  const eventRows = await doQuery(
    `SELECT hall_id, requested_date FROM events WHERE event_id = ?`,
    [eventId],
  );
  const providerRows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );

  // 2. עדכון הסטטוסים בחזרה ל-PENDING
  const sql = `UPDATE events SET status = 'PENDING' WHERE event_id = ?`;
  await doQuery(sql, [eventId]);

  const sqlProviders = `UPDATE event_providers SET status = 'PENDING' WHERE event_id = ?`;
  await doQuery(sqlProviders, [eventId]);

  // 3. שליחת ההתראות
  if (eventRows.length > 0) {
    const eventDate = eventRows[0].requested_date;
    const hallId = eventRows[0].hall_id;

    try {
      // התראה לאולם
      if (hallId) {
        await createNotification({
          message: `The cancelled event for ${eventDate} has been reinstated and is pending your re-approval.`,
          userId: hallId,
        });
      }

      // התראה לשפים
      for (const row of providerRows) {
        await createNotification({
          message: `The cancelled event for ${eventDate} has been reinstated and is pending your re-approval.`,
          userId: row.provider_id,
        });
      }
    } catch (notifError) {
      console.error("Failed to send disCancel notifications:", notifError);
    }
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
  getEventData,
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
