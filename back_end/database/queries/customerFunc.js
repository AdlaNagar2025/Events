const doQuery = require("../query");
const { getRole, getStatusEvent, AvailToEvent } = require("./helpingFunc");
const { createNotification } = require("./notifications");
const { sendEmail } = require("./mail");
const {
  BOOKING_POLICY,
  hoursUntilEvent,
  hasCriticalFieldChanges,
  hasProviderRosterChanges,
  normalizeDate,
  normalizeTime,
} = require("./bookingPolicy");

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
    location,
    notesToHall,
    noteToChef,
  } = Data;

  let hallId = Data.hallId;
  let selectedChiefsId = Data.selectedChiefsId;

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

  const hoursUntilStart = hoursUntilEvent(
    dataToEvent.requested_date,
    dataToEvent.start_time,
  );
  if (
    Number.isNaN(hoursUntilStart) ||
    hoursUntilStart < BOOKING_POLICY.CREATE_MIN_HOURS
  ) {
    return {
      success: false,
      message: `Events must be booked at least ${BOOKING_POLICY.CREATE_MIN_HOURS} hours before the start time.`,
    };
  }

  const pruned = await pruneProvidersByCapacity(
    dataToEvent.guest_number,
    hasHall ? hallId : null,
    hasChiefs ? selectedChiefsId : [],
  );

  if (pruned.removed.length > 0) {
    const names = pruned.removed.map((p) => p.name).join(", ");
    return {
      success: false,
      message: `These providers cannot serve ${dataToEvent.guest_number} guests: ${names}. Please choose other providers.`,
    };
  }

  if (!pruned.hallId && pruned.chefIds.length === 0) {
    return {
      success: false,
      message: "Event must include at least a hall or one chef.",
    };
  }

  if (!pruned.hallId && pruned.chefIds.length > 0) {
    const loc = String(location || "").trim();
    if (!loc) {
      return {
        success: false,
        message: "Please select a location for the chefs.",
      };
    }
  }

  hallId = pruned.hallId;
  selectedChiefsId = pruned.chefIds;
  const hasHallAfterPrune = Boolean(hallId);
  const hasChiefsAfterPrune = selectedChiefsId.length > 0;

if (hasHallAfterPrune) {
  const hallOk = await AvailToEvent(
    null, // إنشاء جديد — ما في eventId نستثنيه
    dataToEvent.requested_date,
    hallId,
    dataToEvent.start_time,
    dataToEvent.end_time,
  );
  if (!hallOk) {
    return {
      success: false,
      message: "The selected hall is no longer available for this time.",
    };
  }
}
if (hasChiefsAfterPrune) {
  for (const chefId of selectedChiefsId) {
    const chefOk = await AvailToEvent(
      null,
      dataToEvent.requested_date,
      chefId,
      dataToEvent.start_time,
      dataToEvent.end_time,
    );
    if (!chefOk) {
      return {
        success: false,
        message: "One of the selected chefs is no longer available for this time.",
      };
    }
  }
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

    if (hasChiefsAfterPrune) {
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

// Edit policy:
// - date / time / guests → 48h
// - add / remove hall or chefs → 6h
// - notes-only → allowed until event starts
async function validateUpdateDeadline(currentEvent, updatingData, eventId) {
  const hoursLeft = hoursUntilEvent(
    currentEvent.requested_date,
    currentEvent.start_time,
  );

  if (Number.isNaN(hoursLeft)) {
    throw new Error("Invalid event date/time for update policy check.");
  }

  const critical = hasCriticalFieldChanges(currentEvent, updatingData);
  const providerChange = await hasProviderRosterChanges(
    doQuery,
    currentEvent,
    updatingData,
    eventId,
  );

  if (critical && hoursLeft < BOOKING_POLICY.CRITICAL_EDIT_HOURS) {
    throw new Error(
      `Date, time, and guest count cannot be changed less than ${BOOKING_POLICY.CRITICAL_EDIT_HOURS} hours before the event.`,
    );
  }

  if (providerChange && hoursLeft < BOOKING_POLICY.PROVIDER_CHANGE_HOURS) {
    throw new Error(
      `Providers cannot be added or removed less than ${BOOKING_POLICY.PROVIDER_CHANGE_HOURS} hours before the event.`,
    );
  }

  if (!critical && !providerChange && hoursLeft < 0) {
    throw new Error("Cannot update an event that has already started.");
  }

  const newDate = updatingData.dataToEvent?.requested_date;
  if (newDate && new Date(newDate) < new Date().setHours(0, 0, 0, 0)) {
    throw new Error("Cannot set event date to a past date.");
  }
}

async function pruneProvidersByCapacity(guestNumber, hallId, chefIds) {
  const guests = Number(guestNumber);
  const removed = [];
  let nextHallId =
    hallId === undefined || hallId === null || hallId === ""
      ? null
      : Number(hallId);
  let nextChefIds = Array.isArray(chefIds)
    ? chefIds.filter((id) => id !== null && id !== undefined).map(Number)
    : [];

  if (!Number.isFinite(guests) || guests <= 0) {
    return { hallId: nextHallId, chefIds: nextChefIds, removed };
  }

  if (nextHallId) {
    const rows = await doQuery(
      `SELECT capacity, hall_name FROM halls WHERE hall_id = ?`,
      [nextHallId],
    );
    if (rows[0] && Number(rows[0].capacity) < guests) {
      removed.push({
        id: nextHallId,
        name: rows[0].hall_name || "Hall",
        type: "hall",
        capacity: Number(rows[0].capacity),
      });
      nextHallId = null;
    }
  }

  if (nextChefIds.length > 0) {
    const placeholders = nextChefIds.map(() => "?").join(",");
    const rows = await doQuery(
      `
      SELECT c.chief_id, c.capacity, u.first_name
      FROM chiefs c
      JOIN users u ON u.id = c.chief_id
      WHERE c.chief_id IN (${placeholders})
      `,
      nextChefIds,
    );
    const byId = new Map(
      (Array.isArray(rows) ? rows : []).map((row) => [
        Number(row.chief_id),
        row,
      ]),
    );
    const kept = [];
    for (const id of nextChefIds) {
      const row = byId.get(Number(id));
      if (row && Number(row.capacity) >= guests) {
        kept.push(Number(id));
      } else {
        removed.push({
          id,
          name: row?.first_name || "Chef",
          type: "chef",
          capacity: row ? Number(row.capacity) : null,
        });
      }
    }
    nextChefIds = kept;
  }

  return { hallId: nextHallId, chefIds: nextChefIds, removed };
}

async function pruneProvidersByAvailability(
  eventId,
  dateValue,
  startValue,
  endValue,
  hallId,
  chefIds,
) {
  const dateStr = normalizeDate(dateValue);
  const startStr = normalizeTime(startValue);
  const endStr = normalizeTime(endValue);
  const removed = [];
  let nextHallId =
    hallId === undefined || hallId === null || hallId === ""
      ? null
      : Number(hallId);
  let nextChefIds = Array.isArray(chefIds)
    ? chefIds.filter((id) => id !== null && id !== undefined).map(Number)
    : [];

  if (!dateStr || !startStr || !endStr) {
    return { hallId: nextHallId, chefIds: nextChefIds, removed };
  }

  if (nextHallId) {
    const ok = await AvailToEvent(
      eventId,
      dateStr,
      nextHallId,
      startStr,
      endStr,
    );
    if (!ok) {
      const rows = await doQuery(
        `SELECT hall_name FROM halls WHERE hall_id = ?`,
        [nextHallId],
      );
      removed.push({
        id: nextHallId,
        name: rows[0]?.hall_name || "Hall",
        type: "hall",
        reason: "availability",
      });
      nextHallId = null;
    }
  }

  const keptChefs = [];
  for (const chefId of nextChefIds) {
    const ok = await AvailToEvent(
      eventId,
      dateStr,
      chefId,
      startStr,
      endStr,
    );
    if (ok) {
      keptChefs.push(chefId);
    } else {
      const rows = await doQuery(
        `SELECT first_name FROM users WHERE id = ?`,
        [chefId],
      );
      removed.push({
        id: chefId,
        name: rows[0]?.first_name || "Chef",
        type: "chef",
        reason: "availability",
      });
    }
  }

  return { hallId: nextHallId, chefIds: keptChefs, removed };
}

async function notifyAvailabilityRemovals(removed, eventDate, startTime, endTime) {
  const timeLabel = `${normalizeTime(startTime)}–${normalizeTime(endTime)}`;
  for (const provider of removed) {
    try {
      await createNotification({
        message: `You were removed from the event on ${eventDate} (${timeLabel}) because you are not available at the updated time.`,
        userId: provider.id,
      });

      const userRows = await doQuery(
        `SELECT email, first_name FROM users WHERE id = ?`,
        [provider.id],
      );
      const user = userRows[0];
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Removed from an event booking (availability)",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
              <h2>Hello ${user.first_name},</h2>
              <p>You were removed from the event on <strong>${eventDate}</strong> (${timeLabel}).</p>
              <p>You are not marked as available for this updated time slot.</p>
              <br/>
              <p>Best regards,<br/><strong>EventHub Team</strong></p>
            </div>
          `,
        });
      }
    } catch (notifErr) {
      console.error("Availability-removal notification failed:", notifErr);
    }
  }
}

async function notifyCapacityRemovals(removed, guestNumber, eventDate) {
  for (const provider of removed) {
    try {
      await createNotification({
        message: `You were removed from the event on ${eventDate} because your capacity (${provider.capacity ?? "N/A"}) is below the updated guest count (${guestNumber}).`,
        userId: provider.id,
      });

      const userRows = await doQuery(
        `SELECT email, first_name FROM users WHERE id = ?`,
        [provider.id],
      );
      const user = userRows[0];
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Removed from an event booking (capacity)",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
              <h2>Hello ${user.first_name},</h2>
              <p>You were removed from the event on <strong>${eventDate}</strong>.</p>
              <p>Your capacity (${provider.capacity ?? "N/A"}) is below the updated guest count (${guestNumber}).</p>
              <br/>
              <p>Best regards,<br/><strong>EventHub Team</strong></p>
            </div>
          `,
        });
      }
    } catch (notifErr) {
      console.error("Capacity-removal notification failed:", notifErr);
    }
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

    // 2. Edit policy (48h critical / 6h providers)
    await validateUpdateDeadline(currentEvent, updatingData, eventId);

    const guestNumber =
      updatingData.dataToEvent?.guest_number ?? currentEvent.guest_number;

    let nextHallId =
      updatingData.hallId !== undefined
        ? updatingData.hallId
        : currentEvent.hall_id;
    let nextChefIds = updatingData.selectedChiefsId;

    if (nextChefIds === undefined) {
      const currentChiefs = await doQuery(
        `SELECT provider_id FROM event_providers WHERE event_id = ?`,
        [eventId],
      );
      nextChefIds = currentChiefs.map((row) => row.provider_id);
    }

    const capacityPruned = await pruneProvidersByCapacity(
      guestNumber,
      nextHallId,
      nextChefIds,
    );

    if (!capacityPruned.hallId && capacityPruned.chefIds.length === 0) {
      throw new Error(
        "No selected providers can serve this guest count. Please choose suitable providers.",
      );
    }

    const nextDate =
      updatingData.dataToEvent?.requested_date ?? currentEvent.requested_date;
    const nextStart =
      updatingData.dataToEvent?.start_time ?? currentEvent.start_time;
    const nextEnd =
      updatingData.dataToEvent?.end_time ?? currentEvent.end_time;

    // Drop providers who are not free at the updated date/time
    const availPruned = await pruneProvidersByAvailability(
      eventId,
      nextDate,
      nextStart,
      nextEnd,
      capacityPruned.hallId,
      capacityPruned.chefIds,
    );

    if (!availPruned.hallId && availPruned.chefIds.length === 0) {
      throw new Error(
        "No selected providers are available for the updated date/time. Please choose other providers.",
      );
    }

    // No hall + chefs → location is required
    if (!availPruned.hallId && availPruned.chefIds.length > 0) {
      const loc = String(updatingData.location || "").trim();
      if (!loc) {
        throw new Error("Please select a location for the chefs.");
      }
    }

    updatingData.hallId = availPruned.hallId;
    updatingData.selectedChiefsId = availPruned.chefIds;
    const capacityRemovedIds = capacityPruned.removed.map((p) => Number(p.id));
    const availabilityRemovedIds = availPruned.removed.map((p) => Number(p.id));
    const autoRemovedIds = [
      ...capacityRemovedIds,
      ...availabilityRemovedIds,
    ];

    const prevHallId =
      currentEvent.hall_id == null || currentEvent.hall_id === ""
        ? null
        : Number(currentEvent.hall_id);
    const hallRemovedOrCleared =
      Boolean(prevHallId) && !availPruned.hallId;

    // Did chef event location change vs what was stored?
    let locationChanged = false;
    if (
      availPruned.chefIds.length > 0 &&
      updatingData.location !== undefined &&
      updatingData.location !== null
    ) {
      const placeholders = availPruned.chefIds.map(() => "?").join(",");
      const locRows = await doQuery(
        `SELECT provider_id, location FROM event_providers
         WHERE event_id = ? AND provider_id IN (${placeholders})`,
        [eventId, ...availPruned.chefIds],
      );
      const newLoc = String(updatingData.location || "").trim();
      locationChanged = (Array.isArray(locRows) ? locRows : []).some(
        (row) => String(row.location || "").trim() !== newLoc,
      );
    }

    const eventDateForNotif = normalizeDate(nextDate) || nextDate;

    // Auto-removals: notify with specific reason (handlers skip these IDs)
    if (capacityPruned.removed.length > 0) {
      await notifyCapacityRemovals(
        capacityPruned.removed,
        guestNumber,
        eventDateForNotif,
      );
    }
    if (availPruned.removed.length > 0) {
      await notifyAvailabilityRemovals(
        availPruned.removed,
        eventDateForNotif,
        nextStart,
        nextEnd,
      );
    }

    // 3. עדכון פרטי אירוע בסיסיים (מחזיר true אם התאריך/שעה/אורחים השתנו)
    const isCritical = await handleEventBasicUpdate(
      updatingData,
      currentEvent,
      eventId,
    );
    console.log("knhlhbdBHD", updatingData);

    const forceChefReapprove =
      isCritical || hallRemovedOrCleared || locationChanged;

    // 4. עדכון שפים
    await handleChiefsUpdate(
      updatingData.selectedChiefsId,
      eventId,
      currentEvent,
      isCritical,
      updatingData.noteToChef,
      updatingData.location,
      autoRemovedIds,
      forceChefReapprove,
    );

    // 5. עדכון אולם (כולל הסרה אם הקיבולת/זמינות לא מספיקה)
    await handleHallUpdate(
      updatingData.hallId,
      currentEvent.hall_id,
      eventId,
      currentEvent,
      autoRemovedIds,
    );

    // 6. Notify remaining providers when they must re-approve
    if (forceChefReapprove || isCritical) {
      const eventDate = eventDateForNotif;
      const removedIds = new Set(autoRemovedIds);

      let reapproveMessage =
        "The details for the event on " +
        eventDate +
        " have been updated. Please re-approve your availability.";
      if (hallRemovedOrCleared && !isCritical) {
        reapproveMessage = `The venue was removed from the event on ${eventDate}. Please re-approve for the new location.`;
      } else if (locationChanged && !isCritical) {
        reapproveMessage = `The event location for ${eventDate} was updated. Please re-approve your availability.`;
      }

      if (
        isCritical &&
        updatingData.hallId &&
        !removedIds.has(Number(updatingData.hallId))
      ) {
        await createNotification({
          message: reapproveMessage,
          userId: updatingData.hallId,
        });
      }

      const currentChiefs = await doQuery(
        `SELECT provider_id FROM event_providers WHERE event_id = ?`,
        [eventId],
      );

      for (const chef of currentChiefs) {
        if (removedIds.has(Number(chef.provider_id))) continue;
        await createNotification({
          message: reapproveMessage,
          userId: chef.provider_id,
        });

        try {
          const chefUser = await doQuery(
            `SELECT email, first_name FROM users WHERE id = ?`,
            [chef.provider_id],
          );
          if (chefUser[0]?.email) {
            await sendEmail({
              to: chefUser[0].email,
              subject: "Event update — please re-approve",
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                  <h2>Hello ${chefUser[0].first_name},</h2>
                  <p>${reapproveMessage}</p>
                  <p>Please log in to your dashboard to respond.</p>
                  <br/>
                  <p>Best regards,<br/><strong>EventHub Team</strong></p>
                </div>
              `,
            });
          }
        } catch (mailErr) {
          console.error("Re-approve email failed:", mailErr);
        }
      }
    }

    await doQuery("COMMIT");

    const allAutoRemoved = [
      ...capacityPruned.removed,
      ...availPruned.removed,
    ];
    const removedNames = allAutoRemoved.map((p) => p.name).join(", ");
    let message = "Event updated successfully.";
    if (allAutoRemoved.length > 0) {
      const capacityNames = capacityPruned.removed.map((p) => p.name);
      const availNames = availPruned.removed.map((p) => p.name);
      const parts = [];
      if (capacityNames.length) {
        parts.push(`removed (capacity): ${capacityNames.join(", ")}`);
      }
      if (availNames.length) {
        parts.push(`removed (not available): ${availNames.join(", ")}`);
      }
      message = `Event updated. ${parts.join("; ")}.`;
    }

    return {
      success: true,
      removedProviders: allAutoRemoved,
      message,
    };
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

/** Notify chefs/halls removed from an event (in-app + email) before DB delete/clear. */
async function notifyProvidersRemovedFromEvent(
  providerIds,
  currentEvent,
  skipNotifyIds = [],
) {
  const skip = new Set(
    (Array.isArray(skipNotifyIds) ? skipNotifyIds : []).map(Number),
  );
  const ids = [
    ...new Set(
      (Array.isArray(providerIds) ? providerIds : [])
        .filter((id) => id !== null && id !== undefined)
        .map(Number)
        .filter((id) => !skip.has(id)),
    ),
  ];

  if (ids.length === 0) return;

  const eventDate = currentEvent.requested_date;
  const placeholders = ids.map(() => "?").join(",");
  const users = await doQuery(
    `SELECT id, email, first_name FROM users WHERE id IN (${placeholders})`,
    ids,
  );

  for (const user of Array.isArray(users) ? users : []) {
    try {
      await createNotification({
        message: `You were removed from the event on ${eventDate} by the customer.`,
        userId: user.id,
      });

      if (user.email) {
        await sendEmail({
          to: user.email,
          subject: "Removed from an event booking",
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
              <h2>Hello ${user.first_name},</h2>
              <p>The customer has removed you from the event scheduled for <strong>${eventDate}</strong>.</p>
              <p>You no longer need to prepare for this booking.</p>
              <br/>
              <p>Best regards,<br/><strong>EventHub Team</strong></p>
            </div>
          `,
        });
      }
    } catch (err) {
      console.error("Failed to notify removed provider:", user.id, err);
    }
  }
}

async function handleChiefsUpdate(
  newChiefsIds,
  eventId,
  currentEvent,
  isCritical,
  noteToChef = {},
  location = null,
  skipNotifyIds = [],
  forcePending = false,
) {
  console.log("HANDLECHEFS", newChiefsIds, currentEvent);
  const validIds = Array.isArray(newChiefsIds)
    ? newChiefsIds.filter((id) => id !== null && id !== undefined)
    : [];

  // Current chefs on this event (before any delete)
  const currentChefRows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );
  const currentChefIds = (
    Array.isArray(currentChefRows) ? currentChefRows : []
  ).map((row) => Number(row.provider_id));
  const keepSet = new Set(validIds.map(Number));
  const removedChefIds = currentChefIds.filter((id) => !keepSet.has(id));

  // Notify removed chefs BEFORE deleting their rows
  if (removedChefIds.length > 0) {
    await notifyProvidersRemovedFromEvent(
      removedChefIds,
      currentEvent,
      skipNotifyIds,
    );
  }

  // 1. If new chef list is empty — delete all chefs from the event
  if (validIds.length === 0) {
    await doQuery(`DELETE FROM event_providers WHERE event_id = ?`, [eventId]);
    return;
  }

  // 2. Delete chefs that were removed from the event
  const placeholders = validIds.map(() => "?").join(",");
  const deleteSql = `DELETE FROM event_providers WHERE event_id = ? AND provider_id NOT IN (${placeholders})`;
  await doQuery(deleteSql, [eventId, ...validIds]);

  // 3. Chefs remaining after delete
  const rows = await doQuery(
    `SELECT provider_id FROM event_providers WHERE event_id = ?`,
    [eventId],
  );
  const existingIds = rows.map((r) => Number(r.provider_id));
  const shouldResetPending = Boolean(isCritical || forcePending);

  // 4. Add / update selected chefs
  for (const id of validIds) {
    const chefId = Number(id);
    const chefNote = noteToChef?.[id] || noteToChef?.[chefId] || "";

    if (!existingIds.includes(chefId)) {
      await doQuery(
        `INSERT INTO event_providers (event_id, provider_id, status, noteToChef, location) VALUES (?, ?, 'PENDING', ?, ?)`,
        [eventId, chefId, chefNote, location],
      );

      // Welcome mail only when this is a soft add (not part of a re-approve wave)
      if (!shouldResetPending) {
        await createNotification({
          message: `You have been assigned to a new event booking on ${currentEvent.requested_date}.`,
          userId: chefId,
        });

        const chefUser = await doQuery(
          `SELECT email, first_name FROM users WHERE id = ?`,
          [chefId],
        );
        if (chefUser.length > 0) {
          await sendEmail({
            to: chefUser[0].email,
            subject: "New Catering Request!",
            html: `<h2>Hello ${chefUser[0].first_name},</h2><p>You have been assigned to a new event on ${currentEvent.requested_date}!</p>`,
          });
        }
      }
    } else if (shouldResetPending) {
      await doQuery(
        `UPDATE event_providers SET noteToChef = ?, location = ?, status = 'PENDING' WHERE event_id = ? AND provider_id = ?`,
        [chefNote, location, eventId, chefId],
      );
    } else {
      await doQuery(
        `UPDATE event_providers SET noteToChef = ?, location = ? WHERE event_id = ? AND provider_id = ?`,
        [chefNote, location, eventId, chefId],
      );
    }
  }
}

async function handleHallUpdate(
  updatingHallId,
  currentHallId,
  eventId,
  currentEvent,
  skipNotifyIds = [],
) {
  const nextHallId =
    updatingHallId === undefined ||
    updatingHallId === null ||
    updatingHallId === ""
      ? null
      : Number(updatingHallId);
  const prevHallId =
    currentHallId === undefined ||
    currentHallId === null ||
    currentHallId === ""
      ? null
      : Number(currentHallId);

  // Removed hall (capacity too low, or customer cleared venue)
  if (!nextHallId && prevHallId) {
    await notifyProvidersRemovedFromEvent(
      [prevHallId],
      currentEvent,
      skipNotifyIds,
    );
    await doQuery(
      `UPDATE events SET hall_id = NULL, status = 'PENDING' WHERE event_id = ?`,
      [eventId],
    );
    return;
  }

  // Replaced / newly assigned hall
  if (nextHallId && nextHallId !== prevHallId) {
    // Old hall was replaced — notify them before losing the booking
    if (prevHallId) {
      await notifyProvidersRemovedFromEvent(
        [prevHallId],
        currentEvent,
        skipNotifyIds,
      );
    }

    const sqlHall = `UPDATE events SET hall_id = ?, status = 'PENDING' WHERE event_id = ?`;
    await doQuery(sqlHall, [nextHallId, eventId]);

    await createNotification({
      message: `You received a new booking request for ${currentEvent.requested_date}.`,
      userId: nextHallId,
    });

    const hallQuery = `
      SELECT u.email, u.first_name 
      FROM users u 
      JOIN halls h ON u.id = h.hall_id 
      WHERE h.hall_id = ?`;
    const hallUser = await doQuery(hallQuery, [nextHallId]);

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

  const hoursDifference = hoursUntilEvent(
    currentEvent.requested_date,
    currentEvent.start_time,
  );

  if (
    Number.isNaN(hoursDifference) ||
    hoursDifference < BOOKING_POLICY.CANCEL_HOURS
  ) {
    throw new Error(
      `Events cannot be cancelled less than ${BOOKING_POLICY.CANCEL_HOURS} hours before the scheduled time.`,
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

  const hoursDifference = hoursUntilEvent(
    currentEvent.requested_date,
    currentEvent.start_time,
  );

  if (
    Number.isNaN(hoursDifference) ||
    hoursDifference < BOOKING_POLICY.CANCEL_HOURS
  ) {
    throw new Error(
      `Cancelled events cannot be reinstated less than ${BOOKING_POLICY.CANCEL_HOURS} hours before the scheduled time.`,
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
}
