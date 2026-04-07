-- =====================================================
-- EventHub — Complete Fresh Setup
-- Anurag University Event Management System
-- Run this once to create everything from scratch
-- =====================================================

DROP DATABASE IF EXISTS eventdb;
CREATE DATABASE eventdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE eventdb; 

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id        INT PRIMARY KEY AUTO_INCREMENT,
  name      VARCHAR(100)  NOT NULL,
  email     VARCHAR(150)  UNIQUE NOT NULL,
  password  VARCHAR(255)  NOT NULL,
  role      ENUM('admin','faculty','student') NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- EVENTS TABLE  (includes banner + guest + attendees)
-- =====================================================
CREATE TABLE events (
  id                INT          PRIMARY KEY AUTO_INCREMENT,
  title             VARCHAR(200) NOT NULL,
  description       TEXT,
  date              DATE,
  venue             VARCHAR(200),
  bannerImage       VARCHAR(255) DEFAULT NULL,
  guestName         VARCHAR(150) DEFAULT NULL,
  guestBio          TEXT         DEFAULT NULL,
  guestPhoto        VARCHAR(255) DEFAULT NULL,
  expectedAttendees INT          DEFAULT NULL,
  createdBy         INT          NOT NULL,
  status            ENUM('pending','approved','rejected') DEFAULT 'pending',
  createdAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_event_status  ON events(status);
CREATE INDEX idx_event_creator ON events(createdBy);

-- =====================================================
-- REGISTRATIONS TABLE  (includes all academic fields)
-- =====================================================
CREATE TABLE registrations (
  id           INT         PRIMARY KEY AUTO_INCREMENT,
  studentId    INT         NOT NULL,
  eventId      INT         NOT NULL,
  registeredAt TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  phone        VARCHAR(15) DEFAULT NULL,
  studentRoll  VARCHAR(50) DEFAULT NULL,
  school       VARCHAR(100) DEFAULT NULL,
  program      VARCHAR(100) DEFAULT NULL,
  year         VARCHAR(20)  DEFAULT NULL,
  department   VARCHAR(100) DEFAULT NULL,
  section      VARCHAR(10)  DEFAULT NULL,

  FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (eventId)   REFERENCES events(id) ON DELETE CASCADE ON UPDATE CASCADE,

  UNIQUE KEY unique_registration (studentId, eventId)
);

CREATE INDEX idx_reg_student ON registrations(studentId);
CREATE INDEX idx_reg_event   ON registrations(eventId);

-- =====================================================
-- NOTIFICATIONS TABLE  (includes senderName + senderRole)
-- =====================================================
CREATE TABLE notifications (
  id         INT     PRIMARY KEY AUTO_INCREMENT,
  userId     INT     NOT NULL,
  message    TEXT    NOT NULL,
  senderName VARCHAR(100) DEFAULT 'System',
  senderRole ENUM('admin','faculty','student','system') DEFAULT 'system',
  isRead     BOOLEAN DEFAULT FALSE,
  createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_notification_user ON notifications(userId);

-- =====================================================
-- SAMPLE USERS  (au.edu.in emails)
-- =====================================================
INSERT INTO users (name, email, password, role) VALUES
  ('Admin',     'admin@au.edu.in',    'Admin@123',   'admin'),
  ('Faculty1',  'faculty@au.edu.in',  'Faculty@123', 'faculty'),
  ('Student1',  'student@au.edu.in',  'Student@123', 'student');

-- =====================================================
-- SAMPLE EVENTS
-- =====================================================
INSERT INTO events (title, description, date, venue, createdBy, status, expectedAttendees) VALUES
  ('AI & Machine Learning Workshop',
   'An immersive workshop exploring the foundations of Artificial Intelligence, ML algorithms, and real-world applications led by industry experts.',
   '2025-06-15', 'Auditorium Block A', 2, 'pending', 120),

  ('National Hackathon 2025',
   '24-hour coding competition where students solve real-world problems. Prizes worth ₹1,00,000. Open to all branches.',
   '2025-07-10', 'Lab Complex 1', 2, 'pending', 200),

  ('Robotics & IoT Expo',
   'Showcase your robotics and IoT projects to industry judges. Best projects win internship opportunities.',
   '2025-07-20', 'Exhibition Hall A', 2, 'approved', 300),

  ('Cultural Fest — Anuragam',
   'Annual cultural festival featuring dance, music, drama, and art competitions across 20+ categories.',
   '2025-08-05', 'Open Air Theatre', 2, 'approved', 1000),



-- =====================================================
-- SAMPLE REGISTRATION
-- =====================================================
INSERT INTO registrations (studentId, eventId, phone, studentRoll, school, program, year, department, section)
VALUES (3, 3, '9876543210', 'AU2021CS001', 'School of Engineering', 'B.Tech', '3rd Year', 'CSE', 'A');

-- =====================================================
-- SAMPLE NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (userId, message, senderName, senderRole) VALUES
  (2, '📋 New event "AI & Machine Learning Workshop" submitted for approval.', 'System', 'system'),
  (3, '🎉 New event "Robotics & IoT Expo" by Faculty1 is now open for registration!', 'Admin', 'admin'),
  (3, '🎉 New event "Cultural Fest — Anuragam" is now open for registration!', 'Admin', 'admin'),
  (3, '🎟️ You have successfully registered for "Robotics & IoT Expo".', 'System', 'system');

-- =====================================================
-- VERIFY  (optional — uncomment to check)
-- =====================================================
-- DESCRIBE users;
-- DESCRIBE events;
-- DESCRIBE registrations;
-- DESCRIBE notifications;
-- SELECT * FROM users;
-- SELECT * FROM events;
-- SELECT * FROM registrations;
-- SELECT * FROM notifications;

-- =====================================================
-- USEFUL ADMIN QUERIES
-- =====================================================

-- Total Users by role
-- SELECT role, COUNT(*) AS total FROM users GROUP BY role;

-- Pending Events
-- SELECT id, title, date, venue FROM events WHERE status='pending';

-- Approved Events with registration count
-- SELECT e.title, COUNT(r.id) AS registrations
-- FROM events e LEFT JOIN registrations r ON e.id = r.eventId
-- WHERE e.status='approved' GROUP BY e.id;

-- All notifications (latest first)
-- SELECT * FROM notifications ORDER BY createdAt DESC;