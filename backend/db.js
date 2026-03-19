const mysql = require("mysql2");

const db = mysql.createConnection({
  host:     process.env.MYSQLHOST     || "localhost",
  user:     process.env.MYSQLUSER     || "root",
  password: process.env.MYSQLPASSWORD || "Manisha@2006",
  database: process.env.MYSQLDATABASE || "eventdb",
  port:     process.env.MYSQLPORT     || 3306
});

db.connect((err) => {
  if (err) console.log("DB Connection Failed:", err);
  else     console.log("MySQL Connected!");
});

module.exports = db;