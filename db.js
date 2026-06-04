
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
require("dotenv").config();

const dbPath = process.env.DATABASE_PATH || "./data/simplecomply.sqlite";
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    business_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    base_price REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    application_id INTEGER,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending Review',
    uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(application_id) REFERENCES applications(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS contact_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    business_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    service TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  await run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const services = [
    ["Business Registration", "Business name registration, company support, document preparation, and follow-up."],
    ["GRA Compliance", "TIN, PAYE, VAT, tax documentation, and compliance certificate support."],
    ["NIS Compliance", "Employer registration, contribution guidance, forms, and clearance support."],
    ["HSE Advisory", "Workplace inspections, risk assessments, safety documents, and compliance reviews."],
    ["Accounting Support", "Bookkeeping, payroll support, and financial record organization."],
    ["Document Preparation", "Review, organize, and prepare submission documents."]
  ];

  for (const s of services) {
    await run(`INSERT OR IGNORE INTO services (id, name, description) VALUES ((SELECT id FROM services WHERE name = ?), ?, ?)`, [s[0], s[0], s[1]]).catch(async () => {
      await run(`INSERT OR IGNORE INTO services (name, description) VALUES (?, ?)`, s);
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@simplecomply.gy";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeThisAdminPassword123!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  await run(
    `INSERT OR IGNORE INTO users (name, business_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ["Simple Comply Admin", "Simple Comply", adminEmail, "+5927160349", adminHash, "admin"]
  );

  console.log("Database initialized.");
}

if (require.main === module) {
  init().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { db, run, init };
