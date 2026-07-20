const doQuery = require("../query");
const bcrypt = require("bcrypt");
/**
 * Authenticates a user based on email and password.
 * Checks account activity and fetches provider status if applicable.
 *
 * @param {Object} UserLogIn - Object containing { email, password }
 * @returns {Promise<Object>} Object containing status success/fail and user data
 */
async function login(UserLogIn) {
  const { email, password } = UserLogIn;
  if (!email || !password) {
    return {
      success: false,
      statusCode: 400,
      message: "Please fill in all required fields (Email and Password).",
    };
  }
  const sql = `SELECT * FROM users WHERE email=?`;
  const result = await doQuery(sql, [email]);
  if (result.length === 0) {
    return {
      success: false,
      statusCode: 401,
      message: "Invalid email or password.",
    };
  }
  //we found the user according to email we want to check the password
  const isMatch = await bcrypt.compare(password, result[0].password);

  if (!isMatch) {
    return {
      success: false,
      statusCode: 401,
      message: "Invalid email or password.",
    };
  }
  const user = result[0];

  if (user.is_active === 0) {
    return {
      success: false,
      statusCode: 403,
      message: "Your account is disabled. Please contact support.",
    };
  }

  delete user.password;
  if (user.role === "Hall_Owner" || user.role === "Chief") {
    const tableName = user.role === "Hall_Owner" ? "halls" : "chiefs";
    const idColumn = user.role === "Hall_Owner" ? "hall_id" : "chief_id";

    const businessSql = `SELECT status FROM ${tableName} WHERE ${idColumn} = ?`;
    const businessResult = await doQuery(businessSql, [user.id]);

    if (businessResult.length > 0) {
      user.status = businessResult[0].status;
    } else {
      user.status = "DRAFT"; // Default status for new registered providers
    }
  }

  return {
    success: true,
    statusCode: 200,
    message: `Welcome back, ${user.first_name}!`,
    user: user,
  };
}

module.exports = login;
