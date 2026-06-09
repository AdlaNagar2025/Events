const doQuery = require("../query");
const { getRole, getStatusEvent, AvailToEvent } = require("./helpingFunc");
const { createNotification } = require("./notifications");

/**
 * מבצעת חיפוש דינמי של ספקים (אולמות ושפים) לפי זמינות וקריטריונים.
 * הפונקציה בודקת ולידציה של תאריך (לא בעבר) וזמנים (התחלה לפני סוף),
 * ובונה שאילתת SQL מורכבת המשלבת את טבלאות המשתמשים, הזמינות, האולמות והשפים.
 * @param {Object} dataToSearch - אובייקט המכיל: date, startTime, endTime, city, price, capacity.
 * @returns {Promise<Array>} - מערך של ספקים שעומדים בכל תנאי החיפוש.
 */
function validateDataToSearch(dataToSearch) {
  if (
    !dataToSearch.requested_date ||
    !dataToSearch.guest_number ||
    !dataToSearch.start_time ||
    !dataToSearch.end_time
  )
    return { success: false, message: "Missing search data" };

  const today = new Date().toISOString().split("T")[0];
  if (dataToSearch.requested_date < today)
    return {
      success: false,
      message: "Validation Error: Cannot search for past dates",
    };

  if (dataToSearch.start_time >= dataToSearch.end_time)
    return {
      success: false,
      message: "Validation Error: Start time is after end time",
    };

  if (dataToSearch.guest_number <= 0)
    return {
      success: false,
      message: "Validation Error: Guest Number Can not be negative",
    };

  return {
    success: true,
    message: "All Validation",
  };
}

async function getPotentialProviders(dataToSearch) {
  const cityFilter = dataToSearch.city ? "AND c.city = ?" : "";
  const priceFilter = dataToSearch.price ? "AND c.price <= ?" : "";
  const sql = `
        SELECT DISTINCT a.provider_id
        FROM availability a
        JOIN (
            SELECT capacity, chief_id  AS id , city , price_per_hour AS price FROM chiefs
            UNION 
            SELECT capacity, hall_id AS id , city , price FROM halls
        ) AS c ON a.provider_id = c.id
        WHERE a.available_date = ?
          AND a.start_time <= ?
          AND a.end_time >= ?
          AND c.capacity >= ?
          ${cityFilter}
          ${priceFilter}`;

  const queryParams = [
    dataToSearch.requested_date,
    dataToSearch.start_time,
    dataToSearch.end_time,
    dataToSearch.guest_number,
  ];

  if (dataToSearch.city) queryParams.push(dataToSearch.city);
  if (dataToSearch.price) queryParams.push(dataToSearch.price);
  const providers = await doQuery(sql, queryParams);
  return providers.map((p) => p.provider_id);
}

async function getResultSearching(dataToSearch) {
  const validation = validateDataToSearch(dataToSearch);
  if (!validation.success) {
    console.error(validation.message);
    return [];
  }

  try {
    const potentialIds = await getPotentialProviders(dataToSearch);

    if (potentialIds.length === 0) return [];

    // 3. בדיקת זמינות מדויקת (AvailToEvent) במקביל לכולם
    const availabilityChecks = await Promise.all(
      potentialIds.map(async (id) => {
        const isAvailable = await AvailToEvent(
          dataToSearch.event_id,
          dataToSearch.requested_date,
          id,
          dataToSearch.start_time,
          dataToSearch.end_time,
        );
        console.log(isAvailable);
        return isAvailable ? id : null;
      }),
    );

    // סינון ה-nulls (אלו שלא היו זמינים באמת)
    const finalIds = availabilityChecks.filter((id) => id !== null);

    if (finalIds.length === 0) return [];

    // 4. שליפת המידע המלא מה-Users עבור ה-IDs שנשארו
    // שימוש ב- ? עבור כל ID כדי למנוע SQL Injection
    const placeholders = finalIds.map(() => "?").join(",");
    const sqlUsers = `SELECT *, role AS provider_type FROM users WHERE id IN (${placeholders})`;
    const finalResults = await doQuery(sqlUsers, finalIds);

    return finalResults;
  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
}

// async function getEventData(Data, customerId) {
//   const {
//     dataToEvent,
//     hallId,
//     selectedChiefsId,
//     location,
//     notesToHall,
//     noteToChef,
//   } = Data;

//   // 2. עדכון שאילתת ה-events: החלפת notes ב-notesToHall
//   const sql = `INSERT INTO events (user_id, hall_id, requested_date, start_time, end_time, notesToHall, guest_number)
//                VALUES (?, ?, ?, ?, ?, ?, ?)`;

//   let values = [
//     customerId,
//     hallId || null,
//     dataToEvent.requested_date,
//     dataToEvent.start_time,
//     dataToEvent.end_time,
//     notesToHall || "",
//     dataToEvent.guest_number,
//   ];

//   const result = await doQuery(sql, values);
//   const newEventId = result.insertId;

//   const sql1 = `INSERT INTO event_providers (event_id, provider_id, noteToChef, location)
//                 VALUES (?, ?, ?, ?)`;

//   if (selectedChiefsId && selectedChiefsId.length > 0) {
//     for (const pId of selectedChiefsId) {
//       // שליפת ההערה הספציפית שנכתבה לשף הנוכחי בלולאה מתוך אובייקט ה-noteToChef
//       const specificChefNote =
//         noteToChef && noteToChef[pId] ? noteToChef[pId] : "";

//       await doQuery(sql1, [
//         newEventId,
//         pId,
//         specificChefNote, // ההערה הייחודית של השף הזה
//         location || null, // המיקום הפיזי (נשמר רק אם אין אולם)
//       ]);
//     }
//   }

//   return { success: true };
// }
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
    e.status AS hall_status,
    e.hall_id,
    h.hall_name,
    h.price AS hall_price,
    u.first_name AS chief_name,
    ep.provider_id AS chief_id,
    ep.status AS chief_status,
    ep.noteToChef,            -- שליפת ההערה הספציפית של השף הזה
    ep.location AS chef_event_location, -- שליפת מיקום האירוע עבור השף
    c.price_per_hour
  FROM events e
  LEFT JOIN halls h ON e.hall_id = h.hall_id
  LEFT JOIN event_providers ep ON e.event_id = ep.event_id
  LEFT JOIN chiefs c ON ep.provider_id = c.chief_id
  LEFT JOIN users u ON c.chief_id = u.id
  WHERE e.user_id = ?
  ORDER BY e.requested_date ASC, e.start_time ASC`;

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

// async function updateEventData(updatinData, customerId, eventId) {
//   const sql=`SELECT events.event_id , events.hall_id,events.requested_date,events.start_time,events.end_time,events.guest_number , events.notes , events.status,event_providers.id,event_providers.provider_id,event_providers.status FROM events join  event_providers on event_providers.event_id=events.event_id WHERE user_id=? AND events.event_id=?`
// const result=await doQuery(sql, [customerId,eventId])
// let values=[]
// if(result[requsted_date] != updatinData.requsted_date)
// {
//   console.log("Date Change")
//   values.append( updatinData.requsted_date)
// }
// if(result[start_time]!= updatinData.start_time)
//   {
//     console.log("Date Change");
//     values.append(updatinData.requsted_date);
//   }
// }
/**
 * עדכון נתוני אירוע קיים:
 * 1. בודק הרשאות משתמש מול האירוע.
 * 2. מעדכן פרטי אירוע (תאריך, שעות, אולם) ומאפס סטטוס ל-PENDING במידת הצורך.
 * 3. מסנכרן רשימת ספקים (שפים): מוסיף חדשים ומוחק את אלו שהוסרו.
 * 4. במידה ובוצע שינוי קריטי בזמן/תאריך, כלל הספקים הקשורים מועברים לסטטוס PENDING לאישור מחדש.
 */

// async function updateEventData(updatingData, customerId, eventId) {
//   try {
//     // 1. התחלת טרנזקציה - מכאן ועד ה-COMMIT הכל נחשב ליחידה אחת
//     await doQuery("START TRANSACTION");

//     // 2. שליפת המצב הקיים ובדיקת הרשאות
//     const sql = `SELECT * FROM events WHERE user_id = ? AND event_id = ?`;
//     const rows = await doQuery(sql, [customerId, eventId]);

//     if (rows.length === 0) {
//       // אם אין אירוע, אנחנו זורקים שגיאה שתעביר אותנו ל-catch ותעשה ROLLBACK
//       throw new Error("Event not found or unauthorized");
//     }

//     const currentEvent = rows[0];
//     let fieldsToUpdate = [];
//     let values = [];
//     let isCriticalChange = false;

//     // 3. בדיקת שינויים בזמנים (תאריך, התחלה, סוף)
//     const timeFields = ["requested_date", "start_time", "end_time"];
//     timeFields.forEach((field) => {
//       if (updatingData[field] && updatingData[field] !== currentEvent[field]) {
//         fieldsToUpdate.push(`${field} = ?`);
//         values.push(updatingData[field]);
//         isCriticalChange = true;
//       }
//     });

//     // 4. עדכון טבלת events (אם היה שינוי)
//     if (fieldsToUpdate.length > 0) {
//       fieldsToUpdate.push("status = ?");
//       values.push("PENDING");
//       values.push(eventId);
//       const updateSql = `UPDATE events SET ${fieldsToUpdate.join(", ")} WHERE event_id = ?`;
//       await doQuery(updateSql, values);
//     }

//     // 5. איפוס ספקים במידה ובוצע שינוי קריטי
//     if (isCriticalChange) {
//       const resetSql = `UPDATE event_providers SET status = 'pending' WHERE event_id = ?`;
//       await doQuery(resetSql, [eventId]);
//     }

//     // 6. ניהול שפים (הוספה/מחיקה)
//     if (updatingData.ChiefsIds && Array.isArray(updatingData.ChiefsIds)) {
//       const sqlChiefs = `SELECT provider_id FROM event_providers WHERE event_id = ?`;
//       const resChiefs = await doQuery(sqlChiefs, [eventId]);
//       const existingIds = resChiefs.map((row) => row.provider_id);

//       // הוספת חדשים
//       for (const newChiefId of updatingData.ChiefsIds) {
//         if (!existingIds.includes(newChiefId)) {
//           const insertSql = `INSERT INTO event_providers (event_id, provider_id, status) VALUES (?, ?, 'pending')`;
//           await doQuery(insertSql, [eventId, newChiefId]);
//         }
//       }

//       // מחיקת מוסרים
//       if (updatingData.ChiefsIds.length > 0) {
//         const deleteSql = `DELETE FROM event_providers WHERE event_id = ? AND provider_id NOT IN (?)`;
//         await doQuery(deleteSql, [eventId, updatingData.ChiefsIds]);
//       } else {
//         const deleteAllSql = `DELETE FROM event_providers WHERE event_id = ?`;
//         await doQuery(deleteAllSql, [eventId]);
//       }
//     }

//     // 7. עדכון אולם (אם השתנה)
//     if (updatingData.hallId && updatingData.hallId !== currentEvent.hall_id) {
//       const sqlHall = `UPDATE events SET hall_id = ?, status = 'PENDING' WHERE event_id = ?`;
//       await doQuery(sqlHall, [updatingData.hallId, eventId]);
//     }

//     // 8. סיום מוצלח - שומרים את כל השינויים בבת אחת
//     await doQuery("COMMIT");
//     console.log("Transaction committed successfully!");
//     return { success: true };
//   } catch (error) {
//     // אם משהו השתבש - מבטלים את כל מה שנעשה בטרנזקציה הזו
//     await doQuery("ROLLBACK");
//     console.error("Transaction failed, rolled back.", error.message);
//     throw error; // זורקים את השגיאה הלאה למי שקרא לפונקציה
//   }
// }

// async function updateEventData(updatingData, customerId, eventId) {
//   try {
//     console.log(updatingData);
//     console.log(updatingData.searchParams);
//     console.log(updatingData.searchParams.start_time);
//     console.log(updatingData.hallId);
//     console.log(updatingData.ChiefsIds);
//     await doQuery("START TRANSACTION");
//     // בדיקה ראשונית
//     const currentEvent = await validateAndGetEvent(customerId, eventId);
//     // עדכון פרטי אירוע ואיפוס אם צריך
//     const isCritical = await handleEventBasicUpdate(
//       updatingData,
//       currentEvent,
//       eventId,
//     );
//     // עדכון שפים
//     await handleChiefsUpdate(updatingData.ChiefsIds, eventId);
//     // עדכון אולם
//     await handleHallUpdate(updatingData.hallId, currentEvent.hall_id, eventId);

//     await doQuery("COMMIT");
//     return { success: true };
//   } catch (error) {
//     await doQuery("ROLLBACK");
//     throw error;
//   }
// }

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
// async function handleEventBasicUpdate(updatingData, currentEvent, eventId) {
//   let fields = [];
//   let values = [];
//   let isCritical = false;

//   ["requested_date", "start_time", "end_time"].forEach((field) => {
//     if ((`${updatingData.searchParams.${field}}`) &&(`${updatingData.searchParams.${field}}`) !== currentEvent[field]) {
//       fields.push(`${field} = ?`);
//       values.push(updatingData.searchParams.${field});
//       isCritical = true;
//     }
//   });

//   if (fields.length > 0) {
//     fields.push("status = ?");
//     values.push("PENDING");
//     values.push(eventId);
//     await doQuery(
//       `UPDATE events SET ${fields.join(", ")} WHERE event_id = ?`,
//       values,
//     );
//   }

//   if (isCritical) {
//     await doQuery(
//       `UPDATE event_providers SET status = 'pending' WHERE event_id = ?`,
//       [eventId],
//     );
//   }
//   return isCritical;
// }

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
// async function handleChiefsUpdate(newChiefsIds, eventId) {
//   if (!newChiefsIds || !Array.isArray(newChiefsIds)) return;

//   const rows = await doQuery(
//     `SELECT provider_id FROM event_providers WHERE event_id = ?`,
//     [eventId],
//   );
//   const existingIds = rows.map((r) => r.provider_id);

//   // הוספה
//   for (const id of newChiefsIds) {
//     if (!existingIds.includes(id)) {
//       await doQuery(
//         `INSERT INTO event_providers (event_id, provider_id, status) VALUES (?, ?, 'pending')`,
//         [eventId, id],
//       );
//     }
//   }

//   // מחיקה
//   if (newChiefsIds.length > 0) {
//     const placeholders = newChiefsIds.map(() => "?").join(",");
//     await doQuery(
//       `DELETE FROM event_providers WHERE event_id = ? AND provider_id NOT IN (${placeholders})`,
//       [eventId, ...newChiefsIds],
//     );
//   } else {
//     await doQuery(`DELETE FROM event_providers WHERE event_id = ?`, [eventId]);
//   }
// }
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

// async function cancelEvent(eventId) {
//   const sql = `UPDATE events SET status = 'CANCELLED' WHERE event_id = ?`;
//   await doQuery(sql, [eventId]);

//   const sqlProviders = `UPDATE event_providers SET status = 'CANCELLED' WHERE event_id = ?`;
//   await doQuery(sqlProviders, [eventId]);

//   return { success: true };
// }

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

// async function disCancelEvent(eventId) {
//   const sql = `UPDATE events SET status = 'PENDING' WHERE event_id = ?`;
//   await doQuery(sql, [eventId]);

//   const sqlProviders = `UPDATE event_providers SET status = 'PENDING' WHERE event_id = ?`;
//   await doQuery(sqlProviders, [eventId]);

//   return { success: true };
// }

//FAVORITE

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

async function addFavorite(userId, providerId) {
  const sql = `INSERT IGNORE INTO favorites (user_id, provider_id) VALUES (?, ?)`;
  await doQuery(sql, [userId, providerId]);
  return { success: true };
}

async function removeFavorite(userId, providerId) {
  const sql = `DELETE FROM favorites WHERE user_id = ? AND provider_id = ?`;
  await doQuery(sql, [userId, providerId]);
  return { success: true };
}

async function getAllFavorites(userId) {
  const sql = `SELECT provider_id FROM favorites WHERE user_id = ?`;
  const result = await doQuery(sql, [userId]);
  return result.map((r) => r.provider_id);
}
async function getAllFavoritesProviders(userId) {
  const sql = `SELECT 
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
  const result = await doQuery(sql, [userId]);
  return result;
}

// async function ReviewProvider(ReviewData, userId) {
//   const { eventId, providerId, rating, comment } = ReviewData;
//   const sql = `
//     INSERT INTO reviews (event_id, user_id, provider_id, rating, comment)
//     VALUES (?, ?, ?, ?, ?)
//     ON DUPLICATE KEY UPDATE
//       rating = VALUES(rating),
//       comment = VALUES(comment)
//   `;

//   await doQuery(sql, [eventId, userId, providerId, rating, comment]);

//   return { success: true };
// }

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

async function ReviewAndComment(eventId, userId, providerId) {
  const sql = `SELECT * FROM reviews WHERE provider_id=? AND event_id=? AND user_id=?`;
  const result = await doQuery(sql, [providerId, eventId, userId]);
  return result;
}

module.exports = {
  getResultSearching,
  getEventData,
  getAllEventsData,
  updateEventData,
  cancelEvent,
  addFavorite,
  removeFavorite,
  getAllFavorites,
  getAllFavoritesProviders,
  ReviewProvider,
  disCancelEvent,
  ReviewAndComment,
};

// // 2. קביעת הודעה מתאימה לפי הסטטוס החדש
// let notificationMessage = "";
// switch (newStatus.toUpperCase()) {
//   case "APPROVE":
//   case "APPROVED":
//     notificationMessage =
//       "Your business profile has been approved! You now have full access to EventHub.";
//     break;
//   case "DENY":
//   case "DENIED":
//     notificationMessage =
//       "Your business profile was rejected. Please review and update your details in Profile Settings.";
//     break;
//   case "PENDING":
//     notificationMessage =
//       "Your profile changes have been submitted and are currently pending review.";
//     break;
//   default:
//     notificationMessage = `Your business profile status has been updated to ${newStatus}.`;
// }

// // 3. יוצרים את ההתראה רק אחרי שהעדכון ב-DB הצליח
// await createNotification({
//   message: notificationMessage,
//   userId: id,
// });
