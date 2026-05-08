const doQuery = require("../query");
const { getRole, getStatusEvent } = require("./helpingFunc");
/**
 * מבצעת חיפוש דינמי של ספקים (אולמות ושפים) לפי זמינות וקריטריונים.
 * הפונקציה בודקת ולידציה של תאריך (לא בעבר) וזמנים (התחלה לפני סוף),
 * ובונה שאילתת SQL מורכבת המשלבת את טבלאות המשתמשים, הזמינות, האולמות והשפים.
 * @param {Object} dataToSearch - אובייקט המכיל: date, startTime, endTime, city, price, capacity.
 * @returns {Promise<Array>} - מערך של ספקים שעומדים בכל תנאי החיפוש.
 */
async function getResultSearching(dataToSearch) {
  let finalValues = [];
  if (
    !dataToSearch.date ||
    !dataToSearch.capacity ||
    !dataToSearch.startTime ||
    !dataToSearch.endTime
  ) {
    throw new Error("Missing search data");
  }
  const today = new Date().toISOString().split("T")[0];
  if (dataToSearch.date < today) {
    console.log("Validation Error: Cannot search for past dates");
    return [];
  }

  if (dataToSearch.startTime && dataToSearch.endTime) {
    if (dataToSearch.startTime >= dataToSearch.endTime) {
      console.log("Validation Error: Start time is after end time");
      return [];
    }
  }

  const price = dataToSearch.price ? parseInt(dataToSearch.price) : null;
  const capacity = dataToSearch.capacity
    ? parseInt(dataToSearch.capacity)
    : null;

  // 1. זמינות (Availability)
  let availSql = `SELECT provider_id FROM availability WHERE available_date = ? AND is_available = 1`;
  finalValues.push(dataToSearch.date);

  if (dataToSearch.startTime) {
    availSql += " AND start_time <= ?";
    finalValues.push(dataToSearch.startTime);
  }
  if (dataToSearch.endTime) {
    availSql += " AND end_time >= ?";
    finalValues.push(dataToSearch.endTime);
  }

  // 2. תנאים לאולמות
  let hallCond = "";
  if (dataToSearch.city) {
    hallCond += " AND city = ?";
    finalValues.push(dataToSearch.city);
  }
  if (price) {
    hallCond += " AND price <= ?";
    finalValues.push(dataToSearch.price);
  }
  if (capacity) {
    hallCond += " AND capacity >= ?";
    finalValues.push(dataToSearch.capacity);
  }

  // 3. תנאים לשפים
  let chiefCond = "";
  if (dataToSearch.city) {
    chiefCond += " AND city = ?";
    finalValues.push(dataToSearch.city);
  }
  if (price) {
    chiefCond += " AND price_per_hour <= ?";
    finalValues.push(dataToSearch.price);
  }
  if (capacity) {
    chiefCond += " AND capacity >= ?";
    finalValues.push(dataToSearch.capacity);
  }

  // 4. השאילתה הסופית
  const finalSql = `
        SELECT *, role AS provider_type FROM users
        WHERE id IN (${availSql})
        AND (
            id IN (SELECT hall_id FROM halls WHERE 1=1 AND status="APPROVED"  ${hallCond})
            OR 
            id IN (SELECT chief_id FROM chiefs WHERE 1=1 AND status="APPROVED" ${chiefCond})
        )
    `;

  const result = await doQuery(finalSql, finalValues);
  console.log("The Result💯 ", result);
  return result;
}

async function getEventData(Data, customerId) {
  const { dataToEvent, hallId, selectedChiefsId } = Data;
  console.log(dataToEvent);
  const sql = `INSERT INTO events (user_id,hall_id,requested_date,start_time,end_time,notes,guest_number) VALUES
(?,?,?,?,?,?,?)`;
  let values = [
    customerId,
    hallId || null,
    dataToEvent.date,
    dataToEvent.startTime,
    dataToEvent.endTime,
    dataToEvent.notes || " ",
    dataToEvent.capacity,
  ];
  const result = await doQuery(sql, values);

  const sql1 = `INSERT INTO event_providers (event_id , provider_id ) VALUES
(?,?)`;
  if (selectedChiefsId && selectedChiefsId.length > 0) {
    for (const pId of selectedChiefsId) {
      await doQuery(sql1, [result.insertId, pId]); // תיקון ל-sql1
    }
  }

  return { success: true }; // תיקון איות
}

async function getAllEventsData(customerId) {
  const sql = `SELECT 
    e.event_id, 
    e.requested_date,
    e.start_time,
    e.end_time,
    e.guest_number,
    e.status AS hall_status,
    e.hall_id,
    h.hall_name,
    h.price AS hall_price,
    u.first_name AS chief_name,
    ep.provider_id AS chief_id,
    ep.status AS chief_status,
    c.price_per_hour
  FROM events e
  LEFT JOIN halls h ON e.hall_id = h.hall_id
  LEFT JOIN event_providers ep ON e.event_id = ep.event_id
  LEFT JOIN chiefs c ON ep.provider_id = c.chief_id
  LEFT JOIN users u ON c.chief_id = u.id
  WHERE e.user_id = ?`;
  const result = await doQuery(sql, [customerId]);
const fresult = []; // מערך חדש וריק

  for (const row of result) {
    const finalStatus = await getStatusEvent(row.event_id);
    row.finalStatus = finalStatus;
    fresult.push(row); // מוסיפים למערך רק אחרי שה-await הסתיים
  }

console.log(fresult)
  return fresult;
}


async function updateEventData(updatinData, customerId, eventId) {
  const sql=`SELECT events.event_id , events.hall_id,events.requested_date,events.start_time,events.end_time,events.guest_number , events.notes , events.status,event_providers.id,event_providers.provider_id,event_providers.status FROM events join  event_providers on event_providers.event_id=events.event_id WHERE user_id=? AND events.event_id=?`
const result=await doQuery(sql, [customerId,eventId])
let values=[]
if(result[requsted_date] != updatinData.requsted_date)
{
  console.log("Date Change")
  values.append( updatinData.requsted_date)
}
if(result[start_time]!= updatinData.start_time)
  {
    console.log("Date Change");
    values.append(updatinData.requsted_date);
  }
}
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
async function updateEventData(updatingData, customerId, eventId) {
  try {
    await doQuery("START TRANSACTION");
    // בדיקה ראשונית
    const currentEvent = await validateAndGetEvent(customerId, eventId)
    // עדכון פרטי אירוע ואיפוס אם צריך
    const isCritical = await handleEventBasicUpdate(
      updatingData,
      currentEvent,
      eventId,
    );
    // עדכון שפים
    await handleChiefsUpdate(updatingData.ChiefsIds, eventId);
    // עדכון אולם
    await handleHallUpdate(updatingData.hallId, currentEvent.hall_id, eventId);

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

  ["requested_date", "start_time", "end_time"].forEach((field) => {
    if (updatingData[field] && updatingData[field] !== currentEvent[field]) {
      fields.push(`${field} = ?`);
      values.push(updatingData[field]);
      isCritical = true;
    }
  });

  if (fields.length > 0) {
    fields.push("status = ?");
    values.push("PENDING");
    values.push(eventId);
    await doQuery(
      `UPDATE events SET ${fields.join(", ")} WHERE event_id = ?`,
      values,
    );
  }

  if (isCritical) {
    await doQuery(
      `UPDATE event_providers SET status = 'pending' WHERE event_id = ?`,
      [eventId],
    );
  }
  return isCritical;
}
async function handleChiefsUpdate(newChiefsIds, eventId) {
  if (!newChiefsIds || !Array.isArray(newChiefsIds)) return;

  const rows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );
  const existingIds = rows.map((r) => r.provider_id);

  // הוספה
  for (const id of newChiefsIds) {
    if (!existingIds.includes(id)) {
      await doQuery(
        `INSERT INTO event_providers (event_id, provider_id, status) VALUES (?, ?, 'pending')`,
        [eventId, id],
      );
    }
  }

  // מחיקה
  if (newChiefsIds.length > 0) {
    await doQuery(
      `DELETE FROM event_providers WHERE event_id = ? AND provider_id NOT IN (?)`,
      [eventId, newChiefsIds],
    );
  } else {
    await doQuery(`DELETE FROM event_providers WHERE event_id = ?`, [eventId]);
  }
}
async function handleHallUpdate(updatingHall, currentHall, eventId){
      if (updatingHall && updatingHall !== currentHall) {
        const sqlHall = `UPDATE events SET hall_id = ?, status = 'PENDING' WHERE event_id = ?`;
        await doQuery(sqlHall, [updatingData.hallId, eventId]);
      }
  
}

module.exports = {
  getResultSearching,
  getEventData,
  getAllEventsData,
  updateEventData
};
