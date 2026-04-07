const express = require("express");
const cors    = require("cors");
const db      = require("./db");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const app = express();

// ✅ FIXED CORS (ONLY ONE TIME)
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|webp|pdf/.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

// Root route
app.get("/", (req, res) => res.send("Backend Running Successfully"));

/* ============================= */
/* AUTH                          */
/* ============================= */

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE email=? AND password=?",
    [email, password],
    (err, result) => {
      if (err) return res.status(500).send("Server Error");
      result.length > 0
        ? res.json(result[0])
        : res.status(401).send("Invalid Credentials");
    }
  );
});

app.post("/api/register-user", (req, res) => {
  const { name, email, password, role } = req.body;
  db.query(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, password, role],
    (err) =>
      err
        ? res.status(500).send("Error Registering User")
        : res.send("User Registered Successfully")
  );
});

/* ============================= */
/* USERS                         */
/* ============================= */

app.get("/api/users", (req, res) => {
  db.query(
    "SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC",
    (err, result) =>
      err ? res.status(500).send(err) : res.json(result)
  );
});

/* ============================= */
/* EVENTS                        */
/* ============================= */

app.get("/api/events", (req, res) => {
  db.query(
    `SELECT events.*, users.name AS facultyName,
       (SELECT COUNT(*) FROM registrations WHERE registrations.eventId = events.id) AS registrationCount
     FROM events JOIN users ON events.createdBy = users.id
     WHERE events.status='approved' ORDER BY events.date ASC`,
    (err, result) =>
      err ? res.status(500).send(err) : res.json(result)
  );
});

app.get("/api/pending-events", (req, res) => {
  db.query(
    `SELECT events.*, users.name AS facultyName
     FROM events JOIN users ON events.createdBy = users.id
     WHERE events.status='pending' ORDER BY events.createdAt DESC`,
    (err, result) =>
      err ? res.status(500).send(err) : res.json(result)
  );
});

/* ============================= */
/* SERVER START                  */
/* ============================= */

// ✅ FIXED FOR RENDER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});