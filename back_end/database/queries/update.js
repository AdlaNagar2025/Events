const doQuery = require("../query");
/**
 * update user details
 * @param {} updatedData
 * @param {} user (logged-in user)
 */
async function updateProfile(updatedData, user) {
  if (!user || !user.id) {
    return { success: false, message: "User not authenticated or missing ID" };
  }
  let { first_name, last_name, email, phone } = updatedData;
  first_name = first_name || user.first_name;
  last_name = last_name || user.last_name;
  email = email || user.email;
  phone = phone || user.phone;
  const id = user.id;
  const sql1 = `SELECT * FROM users WHERE email=? AND id != ?`;
  const result1 = await doQuery(sql1, [email, id]);

  if (result1.length > 0) {
    return {
      success: false,
      message: "This email is already taken by another user",
    };
  }

  const sql = `
    UPDATE users
    SET first_name=?,
    last_name=?,
        email=?,
        phone=?
    WHERE id=?
  `;
  const values = [first_name, last_name, email, phone, id];
  const result = await doQuery(sql, values);
  if (result)
    return {
      success: true,
      message: "Updated Done",
      updatedUser: { ...user, first_name, last_name, email, phone },
    };
}
module.exports = updateProfile;
