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
      message: "Please make sure all required fields are filled correctly.",
    };
  // Set default values for optional fields if they are missing
  last_name = NewUser.last_name || "";
  phone = NewUser.phone || "";
  role = NewUser.role || "Customer";

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
    //כדי SESSION לעשות UPDATE BY ID
    const id = result.insertId;
    let user = { ...NewUser };
    delete user.password;
    user.id = id;
    user.is_active = 1;
    return {
      success: true,
      message: `Welcome to EventHub, ${first_name}! Your account has been created successfully.`,
      user: user,
    };
  }
  // If the email is already in the database
  else {
    return {
      success: false,
      message:
        "It looks like this email is already registered. Try logging in instead!",
    };
  }
}

module.exports = register;
