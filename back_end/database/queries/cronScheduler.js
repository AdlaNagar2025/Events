const node_cron = require("node-cron"); // שם המשתנה שונה ל-node_cron
const { sendEmail } = require("./mail");
const doQuery = require("../query");
const { getStatusEvent } = require("./helpingFunc");

async function fetchEvents() {
  const sql = `
    SELECT u.email AS email, e.event_id
    FROM users u
    JOIN events e ON u.id = e.user_id
    WHERE DATEDIFF(e.requested_date, CURDATE()) = 1 AND u.email IS NOT NULL

    UNION

    SELECT h.email AS email , e.event_id
    FROM events e
    JOIN halls h ON h.hall_id = e.hall_id
    WHERE DATEDIFF(e.requested_date, CURDATE()) = 1 AND h.email IS NOT NULL

    UNION

    SELECT c.email AS email , e.event_id
    FROM events e
    JOIN event_providers ep ON e.event_id = ep.event_id 
    JOIN chiefs c ON c.chief_id = ep.provider_id
    WHERE DATEDIFF(e.requested_date, CURDATE()) = 1 AND c.email IS NOT NULL;
  `;

  const result = await doQuery(sql, []);
  const filterEventsMail = [];
  const filterEventsid = [];

  for (const event of result) {
    if (!filterEventsid.includes(event.event_id)) {
      if ((await getStatusEvent(event.event_id)) === "APPROVED") {
        filterEventsid.push(event.event_id);

        if (!filterEventsMail.includes(event.email)) {
          filterEventsMail.push(event.email);
        }
      }
    } else {
      if (!filterEventsMail.includes(event.email)) {
        filterEventsMail.push(event.email);
      }
    }
  }
  return filterEventsMail;
}

// תיקון: הפיכת הפונקציה ל-async ושינוי התזמון ל-08:00 בבוקר (0 8 * * *)
node_cron.schedule("0 8 * * *", async () => {
  try {
    const EventsMail = await fetchEvents();

    for (const mail of EventsMail) {
      await sendEmail(
        {to: mail, 
        subject: "Reminder: You have an event tomorrow!",
        text: "Hi, this is an automatic reminder from the events system about tomorrow's event."
  
        }
      );
    }
  } catch (error) {
    console.error("Error running Cron:", error);
  }
});
