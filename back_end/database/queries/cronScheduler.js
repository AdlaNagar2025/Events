const node_cron = require("node-cron");
const { sendEmail } = require("./mail");
const doQuery = require("../query");
const { getStatusEvent } = require("./helpingFunc");

/**
 * EventHub daily emails (runs at 08:00):
 *
 * 1) APPROVED reminder — event is tomorrow AND final status is APPROVED
 * 2) PENDING warning — event is tomorrow AND final status is still PENDING
 */

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).split("T")[0];
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "N/A";
  return String(value).slice(0, 5);
}

function getPlaceLabel(details) {
  if (details.hall_name) {
    return { label: "Venue", value: details.hall_name };
  }
  if (details.event_location) {
    return { label: "Location", value: details.event_location };
  }
  return { label: "Location", value: "Location not specified" };
}

function buildApprovedEmail(details) {
  const date = formatDate(details.requested_date);
  const start = formatTime(details.start_time);
  const end = formatTime(details.end_time);
  const guests = details.guest_number ?? "N/A";
  const place = getPlaceLabel(details);
  const customer = details.customer_name || "Customer";

  const subject = `Reminder: Approved event tomorrow (${date})`;
  const text = [
    "Hello,",
    "",
    "This is a reminder from EventHub: you have an approved event scheduled for tomorrow.",
    "",
    "Event details:",
    `- Date: ${date}`,
    `- Time: ${start} - ${end}`,
    `- Guests: ${guests}`,
    `- ${place.label}: ${place.value}`,
    `- Customer: ${customer}`,
    "",
    "Please make sure everything is ready for the event.",
    "",
    "Best regards,",
    "EventHub Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #2c2a26; line-height: 1.5;">
      <h2 style="color: #c9a227; margin-bottom: 8px;">Event reminder</h2>
      <p>This is a reminder from EventHub: you have an <strong>approved</strong> event scheduled for tomorrow.</p>
      <h3 style="margin: 16px 0 8px;">Event details</h3>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${start} - ${end}</li>
        <li><strong>Guests:</strong> ${guests}</li>
        <li><strong>${place.label}:</strong> ${place.value}</li>
        <li><strong>Customer:</strong> ${customer}</li>
      </ul>
      <p>Please make sure everything is ready for the event.</p>
      <p style="margin-top: 20px;">Best regards,<br/>EventHub Team</p>
    </div>
  `;

  return { subject, text, html };
}

function buildPendingEmail(details) {
  const date = formatDate(details.requested_date);
  const start = formatTime(details.start_time);
  const end = formatTime(details.end_time);
  const guests = details.guest_number ?? "N/A";
  const place = getPlaceLabel(details);
  const customer = details.customer_name || "Customer";

  const subject = `Warning: Event tomorrow is still pending (${date})`;
  const text = [
    "Hello,",
    "",
    "This is a warning from EventHub: you have an event tomorrow that is still pending approval.",
    "Please review and respond as soon as possible.",
    "",
    "Event details:",
    `- Date: ${date}`,
    `- Time: ${start} - ${end}`,
    `- Guests: ${guests}`,
    `- ${place.label}: ${place.value}`,
    `- Customer: ${customer}`,
    `- Current status: PENDING`,
    "",
    "Best regards,",
    "EventHub Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #2c2a26; line-height: 1.5;">
      <h2 style="color: #c2410c; margin-bottom: 8px;">Pending approval warning</h2>
      <p>This is a warning from EventHub: you have an event tomorrow that is still <strong>pending approval</strong>.</p>
      <p>Please review and respond as soon as possible.</p>
      <h3 style="margin: 16px 0 8px;">Event details</h3>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${start} - ${end}</li>
        <li><strong>Guests:</strong> ${guests}</li>
        <li><strong>${place.label}:</strong> ${place.value}</li>
        <li><strong>Customer:</strong> ${customer}</li>
        <li><strong>Current status:</strong> PENDING</li>
      </ul>
      <p style="margin-top: 20px;">Best regards,<br/>EventHub Team</p>
    </div>
  `;

  return { subject, text, html };
}

async function getTomorrowEvents() {
  const rows = await doQuery(
    `
    SELECT
      e.event_id,
      e.requested_date,
      e.start_time,
      e.end_time,
      e.guest_number,
      h.hall_name,
      CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
      (
        SELECT ep.location
        FROM event_providers ep
        WHERE ep.event_id = e.event_id
          AND ep.location IS NOT NULL
          AND TRIM(ep.location) <> ''
        ORDER BY ep.provider_id
        LIMIT 1
      ) AS event_location
    FROM events e
    JOIN users u ON u.id = e.user_id
    LEFT JOIN halls h ON h.hall_id = e.hall_id
    WHERE DATEDIFF(e.requested_date, CURDATE()) = 1
    `,
    [],
  );
  return Array.isArray(rows) ? rows : [];
}

async function getEmailsForApprovedEvent(eventId) {
  const rows = await doQuery(
    `
    SELECT u.email AS email
    FROM events e
    JOIN users u ON u.id = e.user_id
    WHERE e.event_id = ? AND u.email IS NOT NULL

    UNION

    SELECT h.email AS email
    FROM events e
    JOIN halls h ON h.hall_id = e.hall_id
    WHERE e.event_id = ? AND h.email IS NOT NULL

    UNION

    SELECT c.email AS email
    FROM event_providers ep
    JOIN chiefs c ON c.chief_id = ep.provider_id
    WHERE ep.event_id = ? AND c.email IS NOT NULL
    `,
    [eventId, eventId, eventId],
  );
  return [...new Set((Array.isArray(rows) ? rows : []).map((r) => r.email).filter(Boolean))];
}

async function getEmailsForPendingWarning(eventId) {
  const rows = await doQuery(
    `
    SELECT u.email AS email
    FROM events e
    JOIN users u ON u.id = e.user_id
    WHERE e.event_id = ? AND u.email IS NOT NULL

    UNION

    SELECT h.email AS email
    FROM events e
    JOIN halls h ON h.hall_id = e.hall_id
    WHERE e.event_id = ? AND e.status = 'PENDING' AND h.email IS NOT NULL

    UNION

    SELECT c.email AS email
    FROM event_providers ep
    JOIN chiefs c ON c.chief_id = ep.provider_id
    WHERE ep.event_id = ? AND ep.status = 'PENDING' AND c.email IS NOT NULL
    `,
    [eventId, eventId, eventId],
  );
  return [...new Set((Array.isArray(rows) ? rows : []).map((r) => r.email).filter(Boolean))];
}

async function sendEventEmails() {
  const events = await getTomorrowEvents();

  for (const details of events) {
    const finalStatus = await getStatusEvent(details.event_id);

    if (finalStatus === "APPROVED") {
      const emails = await getEmailsForApprovedEvent(details.event_id);
      const content = buildApprovedEmail(details);
      for (const to of emails) {
        await sendEmail({ to, ...content });
      }
    }

    if (finalStatus === "PENDING") {
      const emails = await getEmailsForPendingWarning(details.event_id);
      const content = buildPendingEmail(details);
      for (const to of emails) {
        await sendEmail({ to, ...content });
      }
    }
  }
}

node_cron.schedule("0 8 * * *", async () => {
  try {
    await sendEventEmails();
  } catch (error) {
    console.error("Error running Cron:", error);
  }
});
