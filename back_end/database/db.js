const mysql = require("mysql2/promise");

// ! the following  creates and uses one database connection for all queries. This single connection is established the first time getDbConnection is called and is then reused for subsequent database operations across your application

// ! with a single connection multiple queries will be executed sequentially

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "eventhub",
  dateStrings:true,
  multipleStatements: true
};

let connection;

async function getDbConnection() {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }

  return connection;
}

module.exports = getDbConnection;
