async function handleEventBasicUpdate(updatingData, currentEvent, eventId) {
  let fields = [];
  let values = [];
  let isCritical = false;

  const relevantFields = [
    "requested_date",
    "start_time",
    "end_time",
    "guest_number",
  ];
  const searchParams = updatingData.searchParams || {};

  relevantFields.forEach((field) => {
    const newValue = searchParams[field];
    const oldValue = currentEvent[field];

    if (newValue !== undefined && newValue !== null && newValue !== oldValue) {
      fields.push(`${field} = ?`);
      values.push(newValue);
      isCritical = true;
    }
  });

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

    // 💡 איפוס סטטוס לכל הספקים יתרחש רק אם באמת היה שינוי קריטי בזמנים/תאריך!
    await doQuery(
      `UPDATE event_providers SET status = 'PENDING' WHERE event_id = ?`,
      [eventId],
    );
  }

  if (fields.length > 0) {
    values.push(eventId);
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
