const doQuery = require("../query");
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

async function getEventData(eventData) {
  let values = [
    eventData.user_id,
    eventData.chief_id,
    eventData.hall_id,
    eventData.requested_date,
    eventData.start_time,
    eventData.end_time,
    eventData.notes,
  ];
  const sql = `INSERT INTO events (user_id,chief_id,hall_id,requested_date,start_time,end_time,notes) VALUES
(?,?,?,?,?,?,?)`;

  return doQuery(sql, values);
}

module.exports = { getResultSearching, getEventData };
