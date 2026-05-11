const doQuery = require("../query");
/**
 * פונקציה להגדרת חלונות זמינות ביומן עבור ספק.
 * מקבלת את פרטי הספק (מזהה ותפקיד) ואת נתוני הזמן (תאריך, שעת התחלה, שעת סיום וסטטוס זמינות).
 * הנתונים נשמרים בטבלת ה-availability לצורך הצגתם ללקוחות פוטנציאליים.
 */
// async function fillCalendar(provider, calendarData) {
//   const provider_id = provider.id;
//   const provider_type = provider.role;
//   const { available_date, start_time, end_time } = calendarData;
//   if (!available_date || !start_time || !end_time) {
//     return { success: false, message: "Missing required fields" };
//   }
//   if (start_time >= end_time) {
//     return { success: false, message: "End time must be after start time" };
//   }
//   const today = new Date().toISOString().split("T")[0];
//   if (available_date < today) {
//     return {
//       success: false,
//       message: "Cannot set availability for past dates",
//     };
//   }

//   try {
//     // 4. בונוס: בדיקה אם כבר קיים בדיוק אותו סלוט (מניעת כפילויות)
//     const checkSql = `SELECT * FROM availability
//                       WHERE provider_id = ? AND available_date = ?
//                       AND start_time >= ? AND end_time <= ?`;
//     const existing = await doQuery(checkSql, [
//       provider_id,
//       available_date,
//       start_time,
//       end_time,
//     ]);

//     if (existing.length > 0) {
//       const sql = `UPDATE availability
// SET start_time = ?,
//     end_time = ?
// WHERE provider_id = ?
//   AND available_date = ?;
//             `;
//            const  values=[start_time,end_time,provider_id,available_date]
//            await doQuery(sql,values);

//       return { success: false, message: "This time slot already exists" };
//     }
//     // 5. הכנסה ל-DB
//     const sql = `INSERT INTO availability
//                  (provider_id, provider_type, available_date, start_time, end_time)
//                  VALUES (?,?,?,?,?)`;
//     const values = [
//       provider_id,
//       provider_type,
//       available_date,
//       start_time,
//       end_time,
//     ];

//     await doQuery(sql, values);
//     return { success: true, message: "Calendar updated successfully!" };
//   } catch (error) {
//     console.error("Database Error:", error);
//     return { success: false, message: "Internal server error" };
//   }
// }

// async function fillCalendar(provider, calendarData) {
//   const provider_id = provider.id;
//   const provider_type = provider.role;
//   const { available_date, start_time, end_time } = calendarData;

//   // 1. בדיקות תקינות בסיסיות
//   if (!available_date || !start_time || !end_time) {
//     return { success: false, message: "Missing required fields" };
//   }
//   if (start_time >= end_time) {
//     return { success: false, message: "End time must be after start time" };
//   }

//   try {
//     /* 2. בדיקת חפיפה (Overlap Check):
//        אנחנו מחפשים אם קיים סלוט שבו:
//        - זמן ההתחלה החדש נופל בתוך סלוט קיים
//        - או זמן הסיום החדש נופל בתוך סלוט קיים
//        - או שהסלוט החדש "חוסם" סלוט קיים (מתחיל לפני ומסתיים אחרי)
//     */
//     const checkOverlapSql = `
//       SELECT * FROM availability
//       WHERE provider_id = ?
//       AND available_date = ?
//       AND (
//         (start_time <= ? AND end_time > ?) OR  -- התחלה חדשה בתוך טווח קיים
//         (start_time < ? AND end_time >= ?) OR  -- סיום חדש בתוך טווח קיים
//         (? <= start_time AND ? >= end_time)    -- הטווח החדש מכיל טווח קיים
//       )`;

//     const existing = await doQuery(checkOverlapSql, [
//       provider_id,
//       available_date,
//       start_time,
//       start_time,
//       end_time,
//       end_time,
//       start_time,
//       end_time,
//     ]);

//     if (existing.length > 0) {
//       const sql = `
//   UPDATE availability
//   SET start_time = ?, end_time = ?
//   WHERE provider_id = ? AND available_date = ? AND created_at=?
// `;

//       const params = [
//         start_time,
//         end_time,
//         provider_id,
//         available_date,
//         existing[0].created_at,
//       ];

//       // await doQuery(sql, params);`
//       return {
//         success: false,
//         message: "This time slot overlaps with an existing one!",
//       };
//     }

//     // 3. אם אין חפיפה - יוצרים חלון זמן חדש (INSERT)
//     // בצורה הזו יהיה אפשר לשמור גם 08:00-10:00 וגם 11:00-12:00
//     const insertSql = `
//       INSERT INTO availability
//       (provider_id, provider_type, available_date, start_time, end_time)
//       VALUES (?, ?, ?, ?, ?)`;

//     const values = [
//       provider_id,
//       provider_type,
//       available_date,
//       start_time,
//       end_time,
//     ];
//     await doQuery(insertSql, values);

//     return { success: true, message: "New availability slot added!" };
//   } catch (error) {
//     console.error("Database Error:", error);
//     return { success: false, message: "Internal server error" };
//   }
// }

// async function fillCalendar(provider, calendarData) {
//   const provider_id = provider.id;
//   const provider_type = provider.role;
//   const { available_date, start_time, end_time } = calendarData;

//   // 1. בדיקות תקינות
//   if (!available_date || !start_time || !end_time) {
//     return { success: false, message: "Missing required fields" };
//   }
//   if (start_time >= end_time) {
//     return { success: false, message: "End time must be after start time" };
//   }

//   try {
//     // 2. בדיקת חפיפה - האם הזמן החדש "מתנגש" במשהו קיים?
//     const checkOverlapSql = `
//           SELECT * FROM availability
//           WHERE provider_id = ?
//           AND available_date = ?
//           AND (
//             (start_time <= ? AND end_time > ?) OR  -- התחלה חדשה בתוך טווח קיים
//             (start_time < ? AND end_time >= ?) OR  -- סיום חדש בתוך טווח קיים
//             (? <= start_time AND ? >= end_time)    -- הטווח החדש מכיל טווח קיים
//           )`;

//     /* הערה חשובה: הלוגיקה של חפיפה במאגרי נתונים היא לרוב:
//        (StartA < EndB) AND (EndA > StartB)
//     */
//     const existing = await doQuery(checkOverlapSql, [
//       provider_id,
//       available_date,
//       start_time,
//       end_time,
//       start_time,
//       end_time, // זמן סיום חדש גדול מזמן התחלה קיים
//       start_time, // זמן התחלה חדש קטן מזמן סיום קיים
//       end_time,
//     ]);

//     if (existing.length > 0) {
//       // אם מצאנו חפיפה, אנחנו מעדכנים את השורה הראשונה שמצאנו שחופפת
//       const overlapId = existing[0].availability_id; // או existing[0].created_at אם אין ID

//       const updateSql = `
//     UPDATE availability
//     SET start_time = ?, end_time = ?
//     WHERE availability_id = ?`;

//       await doQuery(updateSql, [start_time, end_time, overlapId]);

//       return {
//         success: true,
//         message: "Updating Done!",
//       };
//     }

//     // 3. אם אין חפיפה - יוצרים שורה חדשה (INSERT)
//     // זה מאפשר שיהיה גם 08:00-10:00 וגם 11:00-12:00
//     const insertSql = `
//       INSERT INTO availability
//       (provider_id, provider_type, available_date, start_time, end_time)
//       VALUES (?, ?, ?, ?, ?)`;

//     const values = [
//       provider_id,
//       provider_type,
//       available_date,
//       start_time,
//       end_time,
//     ];
//     await doQuery(insertSql, values);

//     return { success: true, message: "חלון הזמן נוסף בהצלחה!" };
//   } catch (error) {
//     console.error("Database Error:", error);
//     return { success: false, message: "Internal server error" };
//   }
// }

// async function fillCalendar(provider, calendarData) {
//   const provider_id = provider.id;
//   const provider_type = provider.role;
//   const { available_date, start_time, end_time } = calendarData;

//   if (!available_date || !start_time || !end_time) {
//     return { success: false, message: "Missing required fields" };
//   }
//   if (start_time >= end_time) {
//     return { success: false, message: "End time must be after start time" };
//   }

//   try {
//     // 1. בדיקת חפיפה פשוטה ומדויקת
//     // מחפש כל סלוט שנוגע אפילו בדקה אחת בטווח החדש
//     const checkOverlapSql = `
//       SELECT * FROM availability
//       WHERE provider_id = ?
//       AND available_date = ?
//       AND start_time < ?  -- שעת התחלה קיימת לפני הסיום החדש
//       AND end_time > ?    -- שעת סיום קיימת אחרי ההתחלה החדשה
//     `;

//     const existingSlots = await doQuery(checkOverlapSql, [
//       provider_id,
//       available_date,
//       end_time,
//       start_time,
//     ]);

//     if (existingSlots.length > 0) {
//       /* אופציה א': עדכון השלוט הקיים (מה שאת רצית)
//          כאן אנחנו לוקחים את ה-ID של הראשון שמצאנו ומעדכנים אותו לזמן החדש.
//          זה ימנע את הכפילות שרואים בתמונה שלך (שורות 71-72).
//       */
//       const overlapId = existingSlots[0].availability_id;

//       const updateSql = `
//         UPDATE availability
//         SET start_time = ?, end_time = ?
//         WHERE availability_id = ?
//       `;

//       await doQuery(updateSql, [start_time, end_time, overlapId]);

//       return {
//         success: true,
//         message: "הזמן עודכן ואוחד בהצלחה! (מנענו כפילות)",
//       };
//     }

//     // 2. אם אין שום חפיפה - יוצרים שורה חדשה ונקייה
//     const insertSql = `
//       INSERT INTO availability
//       (provider_id, provider_type, available_date, start_time, end_time)
//       VALUES (?, ?, ?, ?, ?)
//     `;

//     await doQuery(insertSql, [
//       provider_id,
//       provider_type,
//       available_date,
//       start_time,
//       end_time,
//     ]);

//     return { success: true, message: "חלון זמן חדש נוסף בהצלחה!" };
//   } catch (error) {
//     console.error("Database Error:", error);
//     return { success: false, message: "Internal server error" };
//   }
// }

async function fillCalendar(provider, calendarData) {
  const provider_id = provider.id;
  const provider_type = provider.role;
  let { available_date, start_time, end_time } = calendarData;

  if (!available_date || !start_time || !end_time) {
    return { success: false, message: "Missing required fields" };
  }
  if (start_time >= end_time) {
    return { success: false, message: "End time must be after start time" };
  }

  try {
    // 1. מציאת כל הסלוטים שחופפים לזמן החדש
    const findOverlapSql = `
      SELECT * FROM availability 
      WHERE provider_id = ? 
      AND available_date = ? 
      AND start_time <= ? 
      AND end_time >= ?`;

    const overlaps = await doQuery(findOverlapSql, [
      provider_id,
      available_date,
      end_time,
      start_time,
    ]);

    if (overlaps.length > 0) {
      // 2. לוגיקת "איחור חכם" (Optional):
      // אם את רוצה שהזמן החדש יבלע את הישנים וייצור רצף אחד ארוך:
      const allStarts = overlaps.map((s) => s.start_time).concat(start_time);
      const allEnds = overlaps.map((s) => s.end_time).concat(end_time);

      // לוקחים את המוקדם ביותר והמאוחר ביותר
      start_time = allStarts.sort()[0];
      end_time = allEnds.sort().reverse()[0];

      // 3. מחיקת כל השורות החופפות כדי שלא יהיה כפל ביומן (כמו שקרה בתמונה)
      const deleteSql = `
        DELETE FROM availability 
        WHERE provider_id = ? 
        AND available_date = ? 
        AND start_time <= ? 
        AND end_time >= ?`;

      await doQuery(deleteSql, [
        provider_id,
        available_date,
        end_time,
        start_time,
      ]);
    }

    // 4. הכנסת השורה המאוחדת והנקייה
    const insertSql = `
      INSERT INTO availability 
      (provider_id, provider_type, available_date, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)`;

    await doQuery(insertSql, [
      provider_id,
      provider_type,
      available_date,
      start_time,
      end_time,
    ]);

    return {
      success: true,
      message:
        overlaps.length > 0
          ? "הזמנים אוחדו לחלון אחד נקי!"
          : "חלון זמן נוסף בהצלחה!",
    };
  } catch (error) {
    console.error("Database Error:", error);
    return { success: false, message: "Internal server error" };
  }
}
async function getCalandar(providerId) {
  const sql = `SELECT * FROM availability WHERE provider_id=?`;
  const result = await doQuery(sql, [providerId]);
  return result;
}

module.exports = { fillCalendar, getCalandar };
