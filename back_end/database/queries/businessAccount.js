const doQuery = require("../query");
const { getRole } = require("./helpingFunc");

async function createBusinessProfile({ businessData, user }) {
  const userId = user.id;
  let sql = "";
  let values = [];
  let roleType = "";

  if (user.role === "Chief") {
    roleType = "Chief";
    let {
      specialty,
      city,
      street,
      house_number,
      lat,
      lng,
      price_per_hour,
      start_year,
      description,
      capacity,
      phone,
    } = businessData;

    if (!specialty || !city || price_per_hour <= 0 || capacity <= 0) {
      return {
        success: false,
        message: "Please fill in all required fields for your Cheif profile.",
      };
    }

    if (start_year > new Date().getFullYear()) {
      return { success: false, message: "Start year cannot be in the future." };
    }

    sql = `
      INSERT INTO chiefs (chief_id, phone, specialty, city, street, house_number, lat, lng, price_per_hour, start_year, description, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        phone = VALUES(phone), specialty = VALUES(specialty), city = VALUES(city), 
        street = VALUES(street), house_number = VALUES(house_number), lat = VALUES(lat), 
        lng = VALUES(lng), price_per_hour = VALUES(price_per_hour), start_year = VALUES(start_year), 
        description = VALUES(description), capacity = VALUES(capacity);
    `;
    values = [
      userId,
      phone,
      specialty,
      city,
      street,
      house_number,
      lat,
      lng,
      price_per_hour,
      start_year,
      description,
      capacity,
    ];
  } else if (user.role === "Hall_Owner") {
    roleType = "Hall";
    let {
      hall_name,
      city,
      street,
      house_number,
      lat,
      lng,
      capacity,
      price,
      phone,
      email,
      description,
    } = businessData;

    if (!hall_name || !city || price <= 0 || capacity <= 0) {
      return {
        success: false,
        message: "Please fill in all required fields for your Hall profile.",
      };
    }

    sql = `
      INSERT INTO halls (hall_id, hall_name, city, street, house_number, lat, lng, capacity, price, phone, email, description) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        hall_name = VALUES(hall_name), city = VALUES(city), street = VALUES(street), 
        house_number = VALUES(house_number), lat = VALUES(lat), lng = VALUES(lng), 
        capacity = VALUES(capacity), price = VALUES(price), phone = VALUES(phone), 
        email = VALUES(email), description = VALUES(description);
    `;
    values = [
      userId,
      hall_name,
      city,
      street,
      house_number,
      lat,
      lng,
      capacity,
      price,
      phone,
      email,
      description,
    ];
  } else {
    return { success: false, message: "Invalid user role." };
  }

  // 2. הרצת השאילתה וטיפול בתוצאה
  try {
    const result = await doQuery(sql, values);

    // ב-MySQL, affectedRows = 1 זה INSERT חדש, affectedRows = 2 זה UPDATE
    const isUpdate = result.affectedRows > 0;

    return {
      success: true,
      message: isUpdate
        ? `Your ${roleType} profile has been updated! 🔄`
        : `Welcome! Your ${roleType} profile was created successfully. 🎉`,
    };
  } catch (err) {
    console.error(`DB Error (${roleType}):`, err);

    if (err.code === "ER_DUP_ENTRY") {
      return {
        success: false,
        message: "The email or phone number is already registered.",
      };
    }

    return {
      success: false,
      message: "A database error occurred. Please try again later.",
    };
  }
}

async function checkStatus(providerId, role) {
  const tableName = role === "Chief" ? "chiefs" : "halls";
  const idColumn = role === "Chief" ? "chief_id" : "hall_id";
  const sql = `SELECT status FROM ${tableName} WHERE ${idColumn} = ?`;
  const result = await doQuery(sql, [providerId]);
  return result[0]?.status || "NOT_STARTED";
}

// async function getProviderCardData(providerId) {
//   const role= await getRole(providerId);
//   const tableName = role === "Chief" ? "chiefs" : "halls";
//   const idColumn = role === "Chief" ? "chief_id" : "hall_id";
//   const priceColumn = role === "Chief" ? "price_per_hour" : "price";
//   const sql = `
//     SELECT b.*, b.${priceColumn} AS display_price, i.image_path AS main_image
//     FROM ${tableName} b
//     LEFT JOIN provider_images i ON b.${idColumn} = i.provider_id AND i.is_main = 1
//     WHERE b.${idColumn} = ?`;

//   const result = await doQuery(sql, [providerId]);
//   console.log("ServiceCard of Provider", result);
//   return result && result.length > 0 ? result[0] : null;
// }


// backend function


async function getProviderCardData(providerId) {
  const role = await getRole(providerId);
  const tableName = role === "Chief" ? "chiefs" : "halls";
  const idColumn = role === "Chief" ? "chief_id" : "hall_id";
  const priceColumn = role === "Chief" ? "price_per_hour" : "price";

  const sql = `
    SELECT 
        b.*, 
        b.${priceColumn} AS display_price, 
        i.image_path AS main_image,
        (SELECT AVG(rating) FROM reviews WHERE provider_id = b.${idColumn}) AS avgRating,
        (SELECT COUNT(rating) FROM reviews WHERE provider_id = b.${idColumn}) AS totalReviews
    FROM ${tableName} b
    LEFT JOIN provider_images i ON b.${idColumn} = i.provider_id AND i.is_main = 1
    WHERE b.${idColumn} = ?`;

  const result = await doQuery(sql, [providerId]);
  
  if (result && result.length > 0) {
    const data = result[0];
    return {
      ...data,
      avgRating: data.avgRating ? parseFloat(data.avgRating).toFixed(1) : 0,
      totalReviews: data.totalReviews || 0
    };
  }
  return null;
}
module.exports = {
  createBusinessProfile,
  checkStatus,
  getProviderCardData,
};
