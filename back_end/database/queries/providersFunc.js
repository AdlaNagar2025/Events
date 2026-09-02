const doQuery = require("../query");
const { getRole } = require("./helpingFunc");
const { createNotification } = require("./notifications");

async function getAllEvents(providerId) {
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
      ORDER BY events.requested_date DESC, events.start_time ASC`;

    params = [providerId, providerId];
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
      ORDER BY events.requested_date DESC, events.start_time ASC;`;

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
/**
 * @function changeStatusEvent
 * @description מעדכן סטטוס של אירוע, בודק זמינות, חפיפות זמנים ושולח התראה ללקוח.
 */

async function changeStatusEvent(
  providerId,
  eventId,
  newStatus,
  eventData,
  options = {},
) {
  const { reason = null } = options;
  const role = await getRole(providerId);
  let providersName = "";
  const statusUpper = String(newStatus || "").toUpperCase();
  const trimmedReason = reason != null ? String(reason).trim() : "";

  // Read this provider's current status only
  let statusRows;
  if (role === "Chief") {
    statusRows = await doQuery(
      `SELECT status FROM event_providers WHERE event_id = ? AND provider_id = ?`,
      [eventId, providerId],
    );
  } else {
    statusRows = await doQuery(
      `SELECT status FROM events WHERE event_id = ? AND hall_id = ?`,
      [eventId, providerId],
    );
  }

  if (!statusRows.length) {
    return { success: false, message: "Event not found for this provider." };
  }

  const currentStatus = String(statusRows[0].status || "").toUpperCase();

  // Policy: PENDING → Approve/Reject | APPROVED → Cancel only
  if (statusUpper === "APPROVED" && currentStatus !== "PENDING") {
    return {
      success: false,
      message: "Only PENDING requests can be approved.",
    };
  }
  if (statusUpper === "REJECTED" && currentStatus !== "PENDING") {
    return {
      success: false,
      message: "Only PENDING requests can be rejected.",
    };
  }
  if (statusUpper === "CANCELLED" && currentStatus !== "APPROVED") {
    return {
      success: false,
      message: "Only APPROVED bookings can be cancelled.",
    };
  }

  // Reason required for reject / cancel
  if (
    (statusUpper === "REJECTED" || statusUpper === "CANCELLED") &&
    !trimmedReason
  ) {
    return {
      success: false,
      message: "A reason is required.",
    };
  }

  // 48h rule for provider cancel only
  if (statusUpper === "CANCELLED") {
    const dateStr = eventData?.requested_date
      ? String(eventData.requested_date).split("T")[0]
      : null;
    const timeStr = eventData?.start_time
      ? String(eventData.start_time).slice(0, 8)
      : null;

    if (!dateStr || !timeStr) {
      return {
        success: false,
        message: "Missing event date/time for cancel policy check.",
      };
    }

    const eventDateTime = new Date(`${dateStr}T${timeStr}`);
    const hoursDifference =
      (eventDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (Number.isNaN(hoursDifference) || hoursDifference < 48) {
      return {
        success: false,
        message:
          "Cannot cancel less than 48 hours before the event.",
      };
    }
  }

  let finalCancelledBy = null;
  if (statusUpper === "CANCELLED") {
    finalCancelledBy = "PROVIDER";
  }

  // === 1. Availability + overlaps when APPROVED ===
  if (statusUpper === "APPROVED") {
    const availabilitySql = `
      SELECT * FROM availability 
      WHERE provider_id = ? AND available_date = ? AND start_time <= ? AND end_time >= ?`;
    const isAvailable = await doQuery(availabilitySql, [
      providerId,
      eventData.requested_date,
      eventData.start_time,
      eventData.end_time,
    ]);

    if (isAvailable.length === 0) {
      return {
        success: false,
        message:
          "Cannot approve event: This time range is not marked as available.",
      };
    }

    let checkSql =
      role === "Chief"
        ? `SELECT * FROM events e JOIN event_providers ep ON e.event_id = ep.event_id WHERE e.requested_date = ? AND ep.provider_id = ? AND ep.status = 'APPROVED' AND e.event_id != ? AND e.start_time < ? AND e.end_time > ?`
        : `SELECT * FROM events WHERE requested_date = ? AND hall_id = ? AND status = 'APPROVED' AND event_id != ? AND start_time < ? AND end_time > ?`;

    const overlaps = await doQuery(checkSql, [
      eventData.requested_date,
      providerId,
      eventId,
      eventData.end_time,
      eventData.start_time,
    ]);
    if (overlaps.length > 0) {
      return {
        success: false,
        message:
          "Cannot approve event: You have an overlapping approved event.",
      };
    }
  }

  // === 2. Provider display name ===
  if (role === "Chief") {
    const eventChief = await doQuery(
      `SELECT first_name FROM users WHERE id = ?`,
      [providerId],
    );
    providersName = eventChief[0]?.first_name || "The Chef";
  } else {
    const eventhall = await doQuery(
      `SELECT hall_name FROM halls WHERE hall_id = ?`,
      [providerId],
    );
    providersName = eventhall[0]?.hall_name || "The Venue";
  }

  // === 3. Update only this provider's row ===
  let updateSql = "";
  if (role === "Chief") {
    updateSql = `
      UPDATE event_providers 
      SET status = ?, rejection_reason = ?, cancelled_by = ? 
      WHERE provider_id = ? AND event_id = ?`;
  } else {
    updateSql = `
      UPDATE events 
      SET status = ?, rejection_reason = ?, cancelled_by = ? 
      WHERE hall_id = ? AND event_id = ?`;
  }
  await doQuery(updateSql, [
    statusUpper,
    statusUpper === "APPROVED" ? null : trimmedReason || null,
    finalCancelledBy,
    providerId,
    eventId,
  ]);

  // === 3.1 Auto-reject overlapping PENDING after approve ===
  if (statusUpper === "APPROVED") {
    const pendingEvents = await getAllPendingEventsAccording(
      providerId,
      eventId,
      eventData.requested_date,
      eventData.start_time,
      eventData.end_time,
    );

    const autoRejectReason =
      "Auto-declined: Venue/Chef approved another event during this time slot.";

    for (const pendingEv of pendingEvents) {
      let rejectSql = "";
      if (role === "Chief") {
        rejectSql = `
          UPDATE event_providers 
          SET status = 'REJECTED', rejection_reason = ?, cancelled_by = 'SYSTEM' 
          WHERE provider_id = ? AND event_id = ?`;
      } else {
        rejectSql = `
          UPDATE events 
          SET status = 'REJECTED', rejection_reason = ?, cancelled_by = 'SYSTEM' 
          WHERE hall_id = ? AND event_id = ?`;
      }

      await doQuery(rejectSql, [
        autoRejectReason,
        providerId,
        pendingEv.event_id,
      ]);

      try {
        const ownerQuery = await doQuery(
          `SELECT user_id FROM events WHERE event_id = ?`,
          [pendingEv.event_id],
        );
        const rejectedCustomerId = ownerQuery[0]?.user_id;

        if (rejectedCustomerId) {
          const cleanDate = eventData.requested_date
            ? String(eventData.requested_date).split("T")[0]
            : "the requested date";

          await createNotification({
            message: `Notice: ${providersName} has DECLINED your request for ${cleanDate}. Reason: "${autoRejectReason}".`,
            userId: rejectedCustomerId,
          });
        }
      } catch (notifErr) {
        console.error("Failed to notify auto-rejected customer:", notifErr);
      }
    }
  }

  // === 4. Notify the booking customer ===
  const eventOwner = await doQuery(
    `SELECT user_id FROM events WHERE event_id = ?`,
    [eventId],
  );
  const customerId = eventOwner[0]?.user_id;

  if (customerId) {
    let notificationMessage = "";
    const cleanDate = eventData.requested_date
      ? String(eventData.requested_date).split("T")[0]
      : "the requested date";

    if (statusUpper === "APPROVED") {
      notificationMessage = `Great news! Your booking for ${cleanDate} has been APPROVED by ${providersName}.`;
    } else if (statusUpper === "REJECTED") {
      notificationMessage = `Notice: ${providersName} has DECLINED your request for ${cleanDate}. Reason: "${trimmedReason}".`;
    } else if (statusUpper === "CANCELLED") {
      notificationMessage = `Important Notice: ${providersName} had to CANCEL the event on ${cleanDate}. Reason: "${trimmedReason}".`;
    } else {
      notificationMessage = `The status of your event on ${cleanDate} was updated to ${statusUpper} by ${providersName}.`;
    }

    try {
      await createNotification({
        message: notificationMessage,
        userId: customerId,
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  }

  return {
    success: true,
    message: `Event status successfully updated to ${statusUpper}.`,
  };
}

// === פונקציית עזר לשליפת אירועים חופפים ב-PENDING ===
async function getAllPendingEventsAccording(
  providerId,
  currentEventId,
  requested_date,
  start_time,
  end_time,
) {
  const isChef = (await getRole(providerId)) === "Chief";
  let sql = "";

  if (isChef) {
    sql = `
      SELECT e.event_id 
      FROM events e
      JOIN event_providers ep ON ep.event_id = e.event_id 
      WHERE e.requested_date = ? 
        AND ep.provider_id = ? 
        AND ep.status = 'PENDING' 
        AND e.event_id != ? 
        AND e.start_time < ? 
        AND e.end_time > ?`;
  } else {
    sql = `
      SELECT event_id 
      FROM events 
      WHERE requested_date = ? 
        AND hall_id = ? 
        AND status = 'PENDING' 
        AND event_id != ? 
        AND start_time < ? 
        AND end_time > ?`;
  }

  const params = [
    requested_date,
    providerId,
    currentEventId,
    end_time,
    start_time,
  ];
  const result = await doQuery(sql, params);
  return result;
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
