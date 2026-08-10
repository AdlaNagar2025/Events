const bcrypt = require("bcrypt");
const doQuery = require("../query");
/**
 * form register post
 * check the user
 * @param {} NewUser
 * object { first_name, last_name, email, phone, password, role }
 */
async function register(NewUser) {
  // Destructure user data from the request body
  let { first_name, last_name, email, phone, password, role } = NewUser;
  // Validation: Ensure required fields are provided
  if (!first_name || !email || !password)
    return {
      success: false,
      statusCode: 400,
      message:
        "Please fill in all required fields (Email and Password and FirstName) .",
    };
  // Set default values for optional fields if they are missing
  last_name = NewUser.last_name || "";
  phone = NewUser.phone || "";
  const ALLOWED_ROLES = ["Customer", "Chief", "Hall_Owner"];
role = NewUser.role || "Customer";

if (!ALLOWED_ROLES.includes(role)) {
  return {
    success: false,
    statusCode: 400,
    message: "Invalid role. Allowed: Customer, Chief, Hall_Owner.",
  };
}
  

  //  Check if a user with this email already exists
  const sql1 = `SELECT * FROM users WHERE email=?`;
  const result1 = await doQuery(sql1, [email]);

  if (result1.length == 0) {
    // Hash the password for security (10 salt rounds)
    const hashedPass = await bcrypt.hash(password, 10);
    let values = [first_name, last_name, email, phone, hashedPass, role];
    // Step 3: Insert the new user into the database
    const sql = `INSERT INTO users (first_name,last_name,email,phone,password,role) VALUES (?,?,?,?,?,?)`;
    const result = await doQuery(sql, values);
    const id = result.insertId;
    const user = {
      id: result.insertId,
      first_name,
      last_name,
      email,
      phone,
      role,
      is_active: 1,
    };
    return {
      success: true,
      statusCode: 201,
      message: `Welcome to EventHub, ${first_name}! Your account has been created successfully.`,
      user: user,
    };
  }
  // If the email is already in the database
  else {
    return {
      success: false,
      statusCode: 409,
      message:
        "It looks like this email is already registered. Try logging in instead!",
    };
  }
}

module.exports = register;
