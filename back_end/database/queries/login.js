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
    delete user.password;
    return {
      success: true,
      message: `Welcome to EventHub, ${user.first_name}!`,
      user: user,
    };
  }
  return { success: false, message: "wrong email or password" };
}
module.exports = login;
