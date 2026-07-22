const doQuery = require("../query");

// פונקציית עזר פנימית לזיהוי תפקיד
async function getRole(id) {
  const sql = `SELECT role FROM users WHERE id = ?`;
  const result = await doQuery(sql, [id]);
  return result?.[0]?.role || null;
}

// שליפת מידע מלא ומאוחד על ספק
async function getFullProviderData(providerId) {
  const role = await getRole(providerId);
  if (!role) return null;

  const isChief = role === "Chief";
  const tableName = isChief ? "chiefs" : "halls";
  const idColumn = isChief ? "chief_id" : "hall_id";
  const priceColumn = isChief ? "price_per_hour" : "price";

  const sql = `
    SELECT 
      u.id AS provider_id,
      u.first_name,
      u.last_name,
      u.email,
      u.phone,
      u.role,
      b.*,
      b.${priceColumn} AS display_price,
      i.image_path AS main_image,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS avgRating,
      COUNT(r.rating) AS totalReviews
    FROM users u
    LEFT JOIN ${tableName} b ON b.${idColumn} = u.id
    LEFT JOIN provider_images i ON i.provider_id = u.id AND i.is_main = 1
    LEFT JOIN reviews r ON r.provider_id = u.id
    WHERE u.id = ?
    GROUP BY u.id, b.${idColumn}, i.image_path
  `;

  const result = await doQuery(sql, [providerId]);

  if (result && result.length > 0) {
    const provider = result[0];

    // שם תצוגה אחיד
    provider.displayName = isChief
      ? `${provider.first_name} ${provider.last_name}`.trim()
      : provider.hall_name || `${provider.first_name} ${provider.last_name}`;

    if (isChief && provider.start_year) {
      provider.experience_years =
        new Date().getFullYear() - provider.start_year;
    }

    return provider;
  }

  return null;
}

module.exports = {
  getFullProviderData,
};
