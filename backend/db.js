const mysql = require("mysql2");

const db = mysql.createConnection({
  host:     process.env.MYSQLHOST     || "localhost",
  user:     process.env.MYSQLUSER     || "root",
  password: process.env.MYSQLPASSWORD || "Manisha@2006",
  database: process.env.MYSQLDATABASE || "eventdb",
  port:     process.env.MYSQLPORT     || 3306,
  ssl: process.env.MYSQL_SSL === "true" ? { rejectUnauthorized: false } : false
});

db.connect((err) => {
  if (err) console.log("DB Failed:", err.message);
  else     console.log("MySQL Connected!");
});

module.exports = db;