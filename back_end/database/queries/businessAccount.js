const doQuery = require("../query");
const { getRole } = require("./helpingFunc");

async function createBusinessProfile({ businessData, user }) {
  const userId = user.id;
  const userEmail = user.email;

  let sql = "";
  let values = [];
  let roleType = "";

  const currentYear = new Date().getFullYear();

  if (user.role === "Chief") {
    roleType = "Chief";
    const {
      specialty,
      city,
      region,
      price_per_hour,
      start_year,
      description,
      capacity,
      phone,
    } = businessData;

    const parsedPrice = Number(price_per_hour);
    const parsedCapacity = Number(capacity);
    const parsedStartYear = Number(start_year);

    if (
      !specialty?.trim() ||
      !city?.trim() ||
      !region?.trim() ||
      !description?.trim()
    ) {
      return {
        statusCode: 400,
        success: false,
        message: "Please fill in all text fields for your Chief profile.",
      };
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return {
        statusCode: 400,
        success: false,
        message: "Hourly price must be a valid number greater than 0.",
      };
    }

    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return {
        statusCode: 400,
        success: false,
        message: "Capacity must be a valid number greater than 0.",
      };
    }

    if (
      isNaN(parsedStartYear) ||
      parsedStartYear < 1950 ||
      parsedStartYear > currentYear
    ) {
      return {
        statusCode: 400,
        success: false,
        message: `Start year must be a valid year between 1950 and ${currentYear}.`,
      };
    }

    // 2. שאילתת SQL
    sql = `
      INSERT INTO chiefs (chief_id, email, phone, specialty, city, region, price_per_hour, start_year, description, capacity, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
        phone = VALUES(phone),
        specialty = VALUES(specialty),
        city = VALUES(city),
        region = VALUES(region),
        price_per_hour = VALUES(price_per_hour),
        start_year = VALUES(start_year),
        description = VALUES(description),
        capacity = VALUES(capacity),
        status = IF(status = 'APPROVED', 'APPROVED', 'PENDING'),
        submitted_at = CURRENT_TIMESTAMP;
    `;

    values = [
      userId,
      userEmail,
      phone || user.phone || null,
      specialty.trim(),
      city.trim(),
      region.trim(),
      parsedPrice,
      parsedStartYear,
      description.trim(),
      parsedCapacity,
    ];
  } else if (user.role === "Hall_Owner") {
    roleType = "Hall";
    const {
      hall_name,
      city,
      region,
      capacity,
      price,
      phone,
      email,
      description,
    } = businessData;

    // 1. הפיכה למספרים ובדיקת תקינות חסינה
    const parsedPrice = Number(price);
    const parsedCapacity = Number(capacity);

    if (
      !hall_name?.trim() ||
      !city?.trim() ||
      !region?.trim() ||
      !description?.trim()
    ) {
      return {
        statusCode: 400,
        success: false,
        message: "Please fill in all text fields for your Hall profile.",
      };
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return {
        statusCode: 400,
        success: false,
        message: "Hall price must be a valid number greater than 0.",
      };
    }

    if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
      return {
        statusCode: 400,
        success: false,
        message: "Capacity must be a valid number greater than 0.",
      };
    }

    // 2. שאילתת SQL
    sql = `
      INSERT INTO halls (hall_id, hall_name, city, region, capacity, price, phone, email, description, status, submitted_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        hall_name = VALUES(hall_name),
        city = VALUES(city),
        region = VALUES(region),
        capacity = VALUES(capacity),
        price = VALUES(price),
        phone = VALUES(phone),
        email = VALUES(email),
        description = VALUES(description),
        status = IF(status = 'APPROVED', 'APPROVED', 'PENDING'),
        submitted_at = CURRENT_TIMESTAMP;
    `;

    values = [
      userId,
      hall_name.trim(),
      city.trim(),
      region.trim(),
      parsedCapacity,
      parsedPrice,
      phone || user.phone || null,
      email || userEmail,
      description.trim(),
    ];
  } else {
    return { statusCode: 400, success: false, message: "Invalid user role." };
  }

  try {
    const result = await doQuery(sql, values);
    const isUpdate = result.affectedRows === 2;

    return {
      statusCode: 200,
      success: true,
      message: isUpdate
        ? `Your ${roleType} profile has been updated and sent to admin for approval! 🔄`
        : `Your ${roleType} profile has been created and sent to admin for approval! 🎉`,
    };
  } catch (err) {
    console.error(`DB Error (${roleType}):`, err);

    if (err.code === "ER_DUP_ENTRY") {
      return {
        statusCode: 409, // Conflict
        success: false,
        message: "The email or phone number is already registered.",
      };
    }

    return {
      statusCode: 500, // Internal Server Error
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
  return result[0]?.status || "DRAFT";
}

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
      totalReviews: data.totalReviews || 0,
    };
  }
  return null;
}
module.exports = {
  createBusinessProfile,
  checkStatus,
  getProviderCardData,
};
