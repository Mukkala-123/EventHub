const express = require("express");
const cors    = require("cors");
const db      = require("./db");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files statically at /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer config — saves to /uploads folder, 5MB max, images only
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

app.get("/", (req, res) => res.send("Backend Running Successfully"));

/* ============================= */
/* AUTH                          */
/* ============================= */

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email=? AND password=?", [email, password], (err, result) => {
    if (err) return res.status(500).send("Server Error");
    result.length > 0 ? res.json(result[0]) : res.status(401).send("Invalid Credentials");
  });
});

app.post("/api/register-user", (req, res) => {
  const { name, email, password, role } = req.body;
  db.query("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, password, role],
    (err) => err ? res.status(500).send("Error Registering User") : res.send("User Registered Successfully")
  );
});

/* ============================= */
/* USER MANAGEMENT               */
/* ============================= */

app.get("/api/users", (req, res) => {
  db.query("SELECT id, name, email, role, createdAt FROM users ORDER BY createdAt DESC",
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.put("/api/update-user/:id", (req, res) => {
  const { name, email, role, password } = req.body;
  const { id } = req.params;
  if (password) {
    db.query("UPDATE users SET name=?, email=?, role=?, password=? WHERE id=?",
      [name, email, role, password, id],
      (err) => err ? res.status(500).send(err) : res.send("User updated")
    );
  } else {
    db.query("UPDATE users SET name=?, email=?, role=? WHERE id=?",
      [name, email, role, id],
      (err) => err ? res.status(500).send(err) : res.send("User updated")
    );
  }
});

app.delete("/api/delete-user/:id", (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id],
    (err) => err ? res.status(500).send(err) : res.send("User deleted")
  );
});

/* ============================= */
/* EVENTS                        */
/* ============================= */

// CREATE EVENT — now accepts bannerImage + guestPhoto file uploads
app.post("/api/create-event",
  upload.fields([{ name: "bannerImage", maxCount: 1 }, { name: "guestPhoto", maxCount: 1 }]),
  (req, res) => {
    const { title, description, date, venue, facultyId, guestName, guestBio, expectedAttendees } = req.body;
    const bannerImage = req.files?.bannerImage?.[0]?.filename || null;
    const guestPhoto  = req.files?.guestPhoto?.[0]?.filename  || null;

    db.query("SELECT name FROM users WHERE id=?", [facultyId], (ferr, fr) => {
      const facultyName = fr && fr.length > 0 ? fr[0].name : "Faculty";

      db.query(
        `INSERT INTO events
           (title, description, date, venue, createdBy, status, bannerImage, guestName, guestBio, guestPhoto, expectedAttendees)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [title, description, date, venue, facultyId, bannerImage, guestName || null, guestBio || null, guestPhoto, expectedAttendees || null],
        (err) => {
          if (err) return res.status(500).send(err);

          // Notify admins — from faculty
          db.query("SELECT id FROM users WHERE role='admin'", (e2, admins) => {
            if (!e2 && admins) admins.forEach(a =>
              db.query(
                "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
                [a.id, `📋 New event "${title}" submitted for approval.`, facultyName, "faculty"]
              )
            );
          });

          // Notify faculty — from System
          db.query(
            "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
            [facultyId, `📤 Your event "${title}" is awaiting Admin approval.`, "System", "system"]
          );

          res.send("Event Submitted for Approval");
        }
      );
    });
  }
);

// UPDATE EVENT — only overwrites images if new files are uploaded
app.put("/api/update-event/:id",
  upload.fields([{ name: "bannerImage", maxCount: 1 }, { name: "guestPhoto", maxCount: 1 }]),
  (req, res) => {
    const { title, description, date, venue, guestName, guestBio, expectedAttendees } = req.body;
    const bannerImage = req.files?.bannerImage?.[0]?.filename || null;
    const guestPhoto  = req.files?.guestPhoto?.[0]?.filename  || null;

    let sql    = "UPDATE events SET title=?, description=?, date=?, venue=?, guestName=?, guestBio=?, expectedAttendees=?";
    let params = [title, description, date, venue, guestName || null, guestBio || null, expectedAttendees || null];

    if (bannerImage) { sql += ", bannerImage=?"; params.push(bannerImage); }
    if (guestPhoto)  { sql += ", guestPhoto=?";  params.push(guestPhoto); }

    sql += " WHERE id=?";
    params.push(req.params.id);

    db.query(sql, params, (err) => err ? res.status(500).send(err) : res.send("Event updated"));
  }
);

app.delete("/api/delete-event/:id", (req, res) => {
  db.query("DELETE FROM events WHERE id=?", [req.params.id],
    (err) => err ? res.status(500).send(err) : res.send("Event deleted")
  );
});

app.get("/api/faculty-events/:facultyId", (req, res) => {
  db.query(
    `SELECT events.*,
       (SELECT COUNT(*) FROM registrations WHERE registrations.eventId = events.id) AS registrationCount
     FROM events WHERE events.createdBy=? ORDER BY events.createdAt DESC`,
    [req.params.facultyId],
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.get("/api/event-registrations/:eventId", (req, res) => {
  db.query(
    `SELECT registrations.id, users.name AS studentName, users.email, registrations.registeredAt
     FROM registrations JOIN users ON registrations.studentId = users.id
     WHERE registrations.eventId=? ORDER BY registrations.registeredAt DESC`,
    [req.params.eventId],
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.get("/api/events", (req, res) => {
  db.query(
    `SELECT events.*, users.name AS facultyName,
       (SELECT COUNT(*) FROM registrations WHERE registrations.eventId = events.id) AS registrationCount
     FROM events JOIN users ON events.createdBy = users.id
     WHERE events.status='approved' ORDER BY events.date ASC`,
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.get("/api/pending-events", (req, res) => {
  db.query(
    `SELECT events.*, users.name AS facultyName
     FROM events JOIN users ON events.createdBy = users.id
     WHERE events.status='pending' ORDER BY events.createdAt DESC`,
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.get("/api/all-events", (req, res) => {
  db.query(
    `SELECT events.*, users.name AS facultyName,
       (SELECT COUNT(*) FROM registrations WHERE registrations.eventId = events.id) AS registrationCount
     FROM events JOIN users ON events.createdBy = users.id ORDER BY events.createdAt DESC`,
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.put("/api/approve-event/:id", (req, res) => {
  const eventId = req.params.id;
  db.query("UPDATE events SET status='approved' WHERE id=?", [eventId], (err) => {
    if (err) return res.status(500).send(err);

    db.query(
      `SELECT events.title, events.createdBy AS facultyId, users.name AS facultyName
       FROM events JOIN users ON events.createdBy = users.id WHERE events.id=?`,
      [eventId],
      (e2, result) => {
        if (result && result.length > 0) {
          const { facultyId, title, facultyName } = result[0];

          db.query("SELECT name FROM users WHERE role='admin' LIMIT 1", (ea, admins) => {
            const adminName = admins && admins.length > 0 ? admins[0].name : "Admin";

            // Notify faculty
            db.query(
              "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
              [facultyId, `✅ Your event "${title}" has been APPROVED. Students can now register!`, adminName, "admin"]
            );

            // Notify all students
            db.query("SELECT id FROM users WHERE role='student'", (e3, students) => {
              if (!e3 && students) students.forEach(s =>
                db.query(
                  "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
                  [s.id, `🎉 New event "${title}" by ${facultyName} is now open for registration!`, adminName, "admin"]
                )
              );
            });
          });
        }
        res.send("Event Approved Successfully");
      }
    );
  });
});

app.put("/api/reject-event/:id", (req, res) => {
  const eventId = req.params.id;
  db.query("UPDATE events SET status='rejected' WHERE id=?", [eventId], (err) => {
    if (err) return res.status(500).send(err);

    db.query("SELECT createdBy AS facultyId, title FROM events WHERE id=?", [eventId], (e2, result) => {
      if (result && result.length > 0) {
        const { facultyId, title } = result[0];
        db.query("SELECT name FROM users WHERE role='admin' LIMIT 1", (ea, admins) => {
          const adminName = admins && admins.length > 0 ? admins[0].name : "Admin";
          db.query(
            "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
            [facultyId, `❌ Your event "${title}" was REJECTED. Please review and resubmit.`, adminName, "admin"]
          );
        });
      }
      res.send("Event Rejected Successfully");
    });
  });
});

/* ============================= */
/* REGISTRATIONS                 */
/* ============================= */

app.post("/api/register-event", (req, res) => {
  const { eventId, studentId, phone, studentCode, studentRoll, school, program, year, department, section } = req.body;
  const rollValue = studentRoll || studentCode || null; // accept either field name
  db.query("SELECT * FROM registrations WHERE studentId=? AND eventId=?", [studentId, eventId], (err, result) => {
    if (result && result.length > 0) return res.status(400).send("Already Registered");

    db.query(
      `INSERT INTO registrations
         (studentId, eventId, phone, studentRoll, school, program, year, department, section)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, eventId, phone || null, rollValue, school || null, program || null, year || null, department || null, section || null],
      (err2) => {
        if (err2) return res.status(500).send(err2);

        db.query(
          `SELECT events.title, events.createdBy AS facultyId, users.name AS studentName
           FROM events JOIN users ON users.id=? WHERE events.id=?`,
          [studentId, eventId],
          (err3, details) => {
            if (!err3 && details && details.length > 0) {
              const { title, facultyId, studentName } = details[0];

              // Notify student — from System
              db.query(
                "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
                [studentId, `🎟️ You have successfully registered for "${title}".`, "System", "system"]
              );

              // Notify faculty — from student
              db.query(
                "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
                [facultyId, `👤 ${studentName} registered for your event "${title}".`, studentName, "student"]
              );
            }
          }
        );
        res.send("Event Registered Successfully");
      }
    );
  });
});

app.delete("/api/cancel-registration", (req, res) => {
  const { eventId, studentId } = req.body;
  db.query("DELETE FROM registrations WHERE studentId=? AND eventId=?", [studentId, eventId], (err) => {
    if (err) return res.status(500).send(err);

    db.query(
      `SELECT events.title, users.name AS studentName
       FROM events JOIN users ON users.id=? WHERE events.id=?`,
      [studentId, eventId],
      (e2, result) => {
        if (!e2 && result && result.length > 0) {
          db.query(
            "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
            [studentId, `🗑️ You cancelled your registration for "${result[0].title}".`, "System", "system"]
          );
        }
      }
    );
    res.send("Registration Cancelled");
  });
});

app.get("/api/my-events/:studentId", (req, res) => {
  db.query(
    `SELECT events.*, users.name AS facultyName
     FROM registrations
     JOIN events ON registrations.eventId = events.id
     JOIN users ON events.createdBy = users.id
     WHERE registrations.studentId=? ORDER BY events.date ASC`,
    [req.params.studentId],
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

/* ============================= */
/* PARTICIPANTS                  */
/* ============================= */

app.get("/api/all-participants", (req, res) => {
  db.query(
    `SELECT registrations.id, users.name AS studentName, users.email,
            events.title AS eventTitle, events.date, registrations.registeredAt
     FROM registrations
     JOIN users ON registrations.studentId = users.id
     JOIN events ON registrations.eventId = events.id
     ORDER BY registrations.registeredAt DESC`,
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

/* ============================= */
/* GLOBAL NOTIFICATION           */
/* ============================= */

app.post("/api/global-notification", (req, res) => {
  const { message, senderName, senderRole } = req.body;
  db.query("SELECT id FROM users", (err, users) => {
    if (err) return res.status(500).send(err);
    users.forEach(u =>
      db.query(
        "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
        [u.id, `📢 ${message}`, senderName || "Admin", senderRole || "admin"]
      )
    );
    res.send("Global notification sent");
  });
});

/* ============================= */
/* ANALYTICS                     */
/* ============================= */

app.get("/api/user-count", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM users", (err, r) => err ? res.status(500).send(err) : res.json(r[0]));
});
app.get("/api/event-count", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM events", (err, r) => err ? res.status(500).send(err) : res.json(r[0]));
});
app.get("/api/pending-count", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM events WHERE status='pending'", (err, r) => err ? res.status(500).send(err) : res.json(r[0]));
});
app.get("/api/registration-count", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM registrations", (err, r) => err ? res.status(500).send(err) : res.json(r[0]));
});
app.get("/api/event-registration-count", (req, res) => {
  db.query(
    `SELECT events.title, COUNT(registrations.id) AS total
     FROM events LEFT JOIN registrations ON events.id = registrations.eventId GROUP BY events.id`,
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

/* ============================= */
/* NOTIFICATIONS                 */
/* ⚠️ unread-count BEFORE /:userId */
/* ============================= */

app.get("/api/notifications/unread-count/:userId", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM notifications WHERE userId=? AND isRead=FALSE",
    [req.params.userId], (err, result) => err ? res.status(500).send(err) : res.json(result[0])
  );
});

app.get("/api/notifications/:userId", (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE userId=? ORDER BY createdAt DESC",
    [req.params.userId],
    (err, result) => err ? res.status(500).send(err) : res.json(result)
  );
});

app.put("/api/notifications/read/:userId", (req, res) => {
  db.query("UPDATE notifications SET isRead=TRUE WHERE userId=?",
    [req.params.userId], (err) => err ? res.status(500).send(err) : res.send("Notifications marked as read")
  );
});

/* ============================= */
/* FACULTY: SEND EVENT NOTIF     */
/* to all registered students    */
/* ============================= */

app.post("/api/faculty-event-notification", (req, res) => {
  const { eventId, message, facultyId } = req.body;

  db.query("SELECT name FROM users WHERE id=?", [facultyId], (ferr, fr) => {
    const facultyName = fr && fr.length > 0 ? fr[0].name : "Faculty";

    db.query(
      "SELECT studentId FROM registrations WHERE eventId=?",
      [eventId],
      (err, students) => {
        if (err) return res.status(500).send(err);
        if (!students || students.length === 0)
          return res.status(400).send("No students registered for this event.");

        students.forEach(s =>
          db.query(
            "INSERT INTO notifications (userId, message, senderName, senderRole) VALUES (?, ?, ?, ?)",
            [s.studentId, `📣 ${message}`, facultyName, "faculty"]
          )
        );

        res.send(`Notification sent to ${students.length} student(s).`);
      }
    );
  });
});

/* ============================= */
/* START SERVER                  */
/* ============================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));