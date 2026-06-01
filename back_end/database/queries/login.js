const doQuery = require("../query");
const bcrypt = require("bcrypt");
/**
 * form login post
 * check the user
 * @param {} UserLogIn
 * object { email, password}
 */
async function login(UserLogIn) {
  const { email, password } = UserLogIn;
  if (!email || !password) {
    return {
      success: false,
      message: "Please make sure all required fields are filled correctly.",
    };
  }
  const sql = `SELECT * FROM users WHERE email=?`;
  const result = await doQuery(sql, [email]);
  if (result.length === 0)
    return { success: false, message: "wrong email or password" };
  //we found the user according to email we want to check the password
  const isMatch = await bcrypt.compare(password, result[0].password);
  if (isMatch) {
    let user = result[0];
    if (user.is_active === 0) {
      return {
        success: false,
        message: "Your account is disabled. Please contact support.",
      };
    }
    delete user.password;

    if (user.role === "Hall_Owner" || user.role === "Chief") {
      // קובעים את השאילתה ואת שם הטבלה הדינמית לפי התפקיד
      const tableName = user.role === "Hall_Owner" ? "halls" : "chiefs";
      const idColumn = user.role === "Hall_Owner" ? "hall_id" : "chief_id";

      let sql1 = `SELECT * FROM ${tableName} WHERE ${idColumn}=?`;
      let resulta = await doQuery(sql1, [user.id]);

      // בדיקה ביטחונית - מה קורה אם המשתמש קיים אבל עדיין אין לו שורה בטבלת העסק?
      if (resulta.length > 0) {
        user.status = resulta[0].status;
      } else {
        user.status = "DRAFT"; // ברירת מחדל אם הוא רק נרשם ואין לו עסק עדיין
      }
    }

    return {
      success: true,
      message: `Welcome to EventHub, ${user.first_name}!`,
      user: user,
    };
  }
  return { success: false, message: "wrong email or password" };
}
module.exports = login;
