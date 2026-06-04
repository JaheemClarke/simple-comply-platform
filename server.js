
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const { db, run, init } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false
}));

// SSL-ready middleware. In production, run behind Nginx, Render, Railway, Vercel, or another HTTPS proxy.
app.use((req, res, next) => {
  if (process.env.ENFORCE_HTTPS === "true") {
    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
});

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
  });
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin" && req.user.role !== "officer") {
    return res.status(403).json({ error: "Admin or officer access required" });
  }
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"
    ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PDF, JPG, PNG, DOC, and DOCX files are allowed."));
    }
    cb(null, true);
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "Simple Comply API", sslReady: true });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, business_name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Name, email, and password are required." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });

    const exists = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (exists) return res.status(409).json({ error: "Email already registered." });

    const hash = await bcrypt.hash(password, 12);
    const result = await run(
      "INSERT INTO users (name, business_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
      [name, business_name || "", email.toLowerCase(), phone || "", hash, "client"]
    );
    const user = await get("SELECT id, name, business_name, email, phone, role FROM users WHERE id = ?", [result.lastID]);
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    res.status(500).json({ error: "Registration failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await get("SELECT * FROM users WHERE email = ?", [String(email || "").toLowerCase()]);
    if (!user) return res.status(401).json({ error: "Invalid login." });
    const ok = await bcrypt.compare(password || "", user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid login." });

    const safeUser = { id: user.id, name: user.name, business_name: user.business_name, email: user.email, phone: user.phone, role: user.role };
    res.json({ token: signToken(safeUser), user: safeUser });
  } catch {
    res.status(500).json({ error: "Login failed." });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await get("SELECT id, name, business_name, email, phone, role FROM users WHERE id = ?", [req.user.id]);
  res.json({ user });
});

app.get("/api/services", async (req, res) => {
  const services = await all("SELECT * FROM services ORDER BY id ASC");
  res.json({ services });
});

app.post("/api/contact", async (req, res) => {
  const { name, business_name, phone, email, service, message } = req.body;
  if (!name || !phone) return res.status(400).json({ error: "Name and phone are required." });
  await run(
    "INSERT INTO contact_requests (name, business_name, phone, email, service, message) VALUES (?, ?, ?, ?, ?, ?)",
    [name, business_name || "", phone, email || "", service || "", message || ""]
  );
  res.status(201).json({ message: "Request received. Simple Comply will contact you." });
});

app.get("/api/admin/contact-requests", auth, adminOnly, async (req, res) => {
  const requests = await all("SELECT * FROM contact_requests ORDER BY created_at DESC");
  res.json({ requests });
});

app.post("/api/applications", auth, async (req, res) => {
  const { service_id, notes } = req.body;
  if (!service_id) return res.status(400).json({ error: "service_id is required." });
  const result = await run(
    "INSERT INTO applications (user_id, service_id, notes) VALUES (?, ?, ?)",
    [req.user.id, service_id, notes || ""]
  );
  const application = await get("SELECT * FROM applications WHERE id = ?", [result.lastID]);
  res.status(201).json({ application });
});

app.get("/api/applications", auth, async (req, res) => {
  let apps;
  if (req.user.role === "admin" || req.user.role === "officer") {
    apps = await all(`
      SELECT applications.*, users.name AS client_name, users.business_name, services.name AS service_name
      FROM applications
      JOIN users ON users.id = applications.user_id
      JOIN services ON services.id = applications.service_id
      ORDER BY applications.created_at DESC
    `);
  } else {
    apps = await all(`
      SELECT applications.*, services.name AS service_name
      FROM applications
      JOIN services ON services.id = applications.service_id
      WHERE applications.user_id = ?
      ORDER BY applications.created_at DESC
    `, [req.user.id]);
  }
  res.json({ applications: apps });
});

app.patch("/api/admin/applications/:id", auth, adminOnly, async (req, res) => {
  const { status, assigned_to, notes } = req.body;
  await run(
    "UPDATE applications SET status = COALESCE(?, status), assigned_to = COALESCE(?, assigned_to), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [status || null, assigned_to || null, notes || null, req.params.id]
  ).catch(async () => {
    const existing = await get("SELECT * FROM applications WHERE id = ?", [req.params.id]);
    await run(
      "UPDATE applications SET status = ?, assigned_to = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status || existing.status, assigned_to || existing.assigned_to, notes || existing.notes, req.params.id]
    );
  });
  const updated = await get("SELECT * FROM applications WHERE id = ?", [req.params.id]);
  res.json({ application: updated });
});

app.post("/api/documents", auth, upload.single("document"), async (req, res) => {
  try {
    const application_id = req.body.application_id || null;
    if (!req.file) return res.status(400).json({ error: "Document file is required." });
    const result = await run(
      `INSERT INTO documents (user_id, application_id, original_name, stored_name, mime_type, size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, application_id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size]
    );
    const document = await get("SELECT * FROM documents WHERE id = ?", [result.lastID]);
    res.status(201).json({ document });
  } catch (err) {
    res.status(400).json({ error: err.message || "Upload failed." });
  }
});

app.get("/api/documents", auth, async (req, res) => {
  let docs;
  if (req.user.role === "admin" || req.user.role === "officer") {
    docs = await all(`
      SELECT documents.*, users.name AS client_name, users.business_name
      FROM documents
      JOIN users ON users.id = documents.user_id
      ORDER BY documents.uploaded_at DESC
    `);
  } else {
    docs = await all("SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC", [req.user.id]);
  }
  res.json({ documents: docs });
});

app.get("/api/documents/:id/download", auth, async (req, res) => {
  const doc = await get("SELECT * FROM documents WHERE id = ?", [req.params.id]);
  if (!doc) return res.status(404).json({ error: "Document not found." });
  if (req.user.role === "client" && doc.user_id !== req.user.id) {
    return res.status(403).json({ error: "Access denied." });
  }
  res.download(path.join(UPLOAD_DIR, doc.stored_name), doc.original_name);
});

app.patch("/api/admin/documents/:id", auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  await run("UPDATE documents SET status = ? WHERE id = ?", [status || "Pending Review", req.params.id]);
  const doc = await get("SELECT * FROM documents WHERE id = ?", [req.params.id]);
  res.json({ document: doc });
});

app.get("/api/admin/stats", auth, adminOnly, async (req, res) => {
  const totalClients = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'client'");
  const activeCases = await get("SELECT COUNT(*) AS count FROM applications WHERE status NOT IN ('Completed','Closed')");
  const documents = await get("SELECT COUNT(*) AS count FROM documents WHERE status = 'Pending Review'");
  const completed = await get("SELECT COUNT(*) AS count FROM applications WHERE status IN ('Completed','Closed')");
  res.json({
    totalClients: totalClients.count,
    activeCases: activeCases.count,
    pendingDocuments: documents.count,
    completedCases: completed.count
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

init().then(() => {
  app.listen(PORT, () => console.log(`Simple Comply running on http://localhost:${PORT}`));
});
