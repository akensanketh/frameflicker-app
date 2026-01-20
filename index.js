const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const Database = require("better-sqlite3");

// ============ DATABASE SETUP ============
const dbPath = path.join(__dirname, "frameflicker.sqlite");
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    hours TEXT,
    deliverables TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    event_type TEXT,
    event_date TEXT,
    event_time TEXT,
    location TEXT,
    status TEXT DEFAULT 'New',
    price REAL NOT NULL,
    deposit_percent REAL NOT NULL,
    deposit_amount REAL NOT NULL,
    balance_amount REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    drive_link TEXT,
    internal_path TEXT,
    revision_limit INTEGER DEFAULT 2,
    revisions_used INTEGER DEFAULT 0,
    crew_assigned TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    reference TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT
  );
`);

console.log("Database ready!");

// ============ EXPRESS APP ============
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ============ DEPOSIT CALCULATION ============
// Your rule: <= 15000 LKR = 50% deposit, > 15000 LKR = 25% deposit
function calcDeposit(price) {
  const percent = price <= 15000 ? 0.5 : 0.25;
  const depositAmount = Math.round(price * percent);
  const balanceAmount = price - depositAmount;
  return { percent, depositAmount, balanceAmount };
}

// ============ API ROUTES ============

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "FrameFlicker Studios API is running!",
    location: "Sri Lanka",
    currency: "LKR"
  });
});

// ============ CLIENTS ============
app.get("/api/clients", (req, res) => {
  const clients = db.prepare("SELECT * FROM clients ORDER BY id DESC").all();
  res.json(clients);
});

app.get("/api/clients/:id", (req, res) => {
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json(client);
});

app.post("/api/clients", (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const stmt = db.prepare("INSERT INTO clients (name, phone, email, address) VALUES (?, ?, ?, ?)");
  const result = stmt.run(name, phone || "", email || "", address || "");
  res.json({ id: result.lastInsertRowid, name, phone, email, address, message: "Client added!" });
});

app.put("/api/clients/:id", (req, res) => {
  const { name, phone, email, address } = req.body;
  db.prepare("UPDATE clients SET name=?, phone=?, email=?, address=? WHERE id=?")
    .run(name, phone || "", email || "", address || "", req.params.id);
  res.json({ success: true, message: "Client updated!" });
});

app.delete("/api/clients/:id", (req, res) => {
  db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Client deleted!" });
});

// ============ PACKAGES ============
app.get("/api/packages", (req, res) => {
  const packages = db.prepare("SELECT * FROM packages ORDER BY price ASC").all();
  res.json(packages);
});

app.get("/api/packages/:id", (req, res) => {
  const pkg = db.prepare("SELECT * FROM packages WHERE id = ?").get(req.params.id);
  if (!pkg) return res.status(404).json({ error: "Package not found" });
  res.json(pkg);
});

app.post("/api/packages", (req, res) => {
  const { name, category, price, hours, deliverables, description } = req.body;
  if (!name || price == null) return res.status(400).json({ error: "Name and price required" });

  const stmt = db.prepare("INSERT INTO packages (name, category, price, hours, deliverables, description) VALUES (?, ?, ?, ?, ?, ?)");
  const result = stmt.run(name, category || "", Number(price), hours || "", deliverables || "", description || "");
  
  const { percent, depositAmount, balanceAmount } = calcDeposit(Number(price));
  
  res.json({ 
    id: result.lastInsertRowid, 
    name, 
    category, 
    price: Number(price),
    depositPercent: percent * 100 + "%",
    depositAmount,
    message: "Package added!" 
  });
});

app.put("/api/packages/:id", (req, res) => {
  const { name, category, price, hours, deliverables, description } = req.body;
  db.prepare("UPDATE packages SET name=?, category=?, price=?, hours=?, deliverables=?, description=? WHERE id=?")
    .run(name, category || "", Number(price), hours || "", deliverables || "", description || "", req.params.id);
  res.json({ success: true, message: "Package updated!" });
});

app.delete("/api/packages/:id", (req, res) => {
  db.prepare("DELETE FROM packages WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Package deleted!" });
});

// ============ PROJECTS / BOOKINGS ============
app.get("/api/projects", (req, res) => {
  const projects = db.prepare(`
    SELECT 
      p.*,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      pk.name as package_name,
      pk.category as package_category
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN packages pk ON pk.id = p.package_id
    ORDER BY p.event_date DESC, p.id DESC
  `).all();
  res.json(projects);
});

app.get("/api/projects/:id", (req, res) => {
  const project = db.prepare(`
    SELECT 
      p.*,
      c.name as client_name,
      c.phone as client_phone,
      c.email as client_email,
      pk.name as package_name
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN packages pk ON pk.id = p.package_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
});

app.post("/api/projects", (req, res) => {
  const { 
    clientId, packageId, eventType, eventDate, eventTime, 
    location, price, driveLink, internalPath, crewAssigned, notes 
  } = req.body;

  if (!clientId || !packageId) {
    return res.status(400).json({ error: "Client and Package are required" });
  }

  // Get package price if not provided
  let finalPrice = price;
  if (finalPrice == null) {
    const pkg = db.prepare("SELECT price FROM packages WHERE id = ?").get(packageId);
    if (pkg) finalPrice = pkg.price;
    else return res.status(400).json({ error: "Package not found" });
  }
  finalPrice = Number(finalPrice);

  const { percent, depositAmount, balanceAmount } = calcDeposit(finalPrice);

  const stmt = db.prepare(`
    INSERT INTO projects 
    (client_id, package_id, event_type, event_date, event_time, location, status, 
     price, deposit_percent, deposit_amount, balance_amount, 
     drive_link, internal_path, crew_assigned, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    clientId, packageId, eventType || "", eventDate || "", eventTime || "", location || "",
    finalPrice, percent, depositAmount, balanceAmount,
    driveLink || "", internalPath || "", crewAssigned || "", notes || ""
  );

  res.json({
    id: result.lastInsertRowid,
    price: finalPrice,
    depositPercent: percent * 100 + "%",
    depositAmount,
    balanceAmount,
    message: "Project/Booking created!"
  });
});

app.patch("/api/projects/:id/status", (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    "New", "Confirmed", "Deposit Paid", "Scheduled", 
    "Shooting", "Editing", "Review", "Delivered", "Completed", "Cancelled"
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status", validStatuses });
  }
  db.prepare("UPDATE projects SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ success: true, status, message: "Status updated!" });
});

app.put("/api/projects/:id", (req, res) => {
  const { 
    eventType, eventDate, eventTime, location, 
    driveLink, internalPath, crewAssigned, notes 
  } = req.body;
  
  db.prepare(`
    UPDATE projects SET 
    event_type=?, event_date=?, event_time=?, location=?, 
    drive_link=?, internal_path=?, crew_assigned=?, notes=? 
    WHERE id=?
  `).run(
    eventType || "", eventDate || "", eventTime || "", location || "",
    driveLink || "", internalPath || "", crewAssigned || "", notes || "",
    req.params.id
  );
  res.json({ success: true, message: "Project updated!" });
});

app.delete("/api/projects/:id", (req, res) => {
  db.prepare("DELETE FROM payments WHERE project_id = ?").run(req.params.id);
  db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Project deleted!" });
});

// ============ PAYMENTS ============
app.get("/api/payments", (req, res) => {
  const payments = db.prepare(`
    SELECT pay.*, p.id as project_id, c.name as client_name
    FROM payments pay
    LEFT JOIN projects p ON p.id = pay.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    ORDER BY pay.created_at DESC
  `).all();
  res.json(payments);
});

app.get("/api/payments/project/:projectId", (req, res) => {
  const payments = db.prepare("SELECT * FROM payments WHERE project_id = ? ORDER BY id DESC").all(req.params.projectId);
  const total = db.prepare("SELECT SUM(amount) as total FROM payments WHERE project_id = ?").get(req.params.projectId);
  res.json({ payments, totalPaid: total.total || 0 });
});

app.post("/api/payments", (req, res) => {
  const { projectId, amount, method, reference, note } = req.body;
  if (!projectId || amount == null || !method) {
    return res.status(400).json({ error: "projectId, amount, method required" });
  }

  const validMethods = ["Cash", "Bank Transfer", "Card", "Other"];
  if (!validMethods.includes(method)) {
    return res.status(400).json({ error: "Invalid method", validMethods });
  }

  const stmt = db.prepare("INSERT INTO payments (project_id, amount, method, reference, note) VALUES (?, ?, ?, ?, ?)");
  const result = stmt.run(projectId, Number(amount), method, reference || "", note || "");

  // Update amount_paid in project
  db.prepare("UPDATE projects SET amount_paid = amount_paid + ? WHERE id = ?").run(Number(amount), projectId);

  res.json({ 
    id: result.lastInsertRowid, 
    amount: Number(amount), 
    method, 
    message: "Payment recorded!" 
  });
});

app.delete("/api/payments/:id", (req, res) => {
  const payment = db.prepare("SELECT * FROM payments WHERE id = ?").get(req.params.id);
  if (payment) {
    db.prepare("UPDATE projects SET amount_paid = amount_paid - ? WHERE id = ?").run(payment.amount, payment.project_id);
    db.prepare("DELETE FROM payments WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true, message: "Payment deleted!" });
});

// ============ REVISIONS (Video: 2 included) ============
app.post("/api/projects/:id/revision", (req, res) => {
  const project = db.prepare("SELECT revision_limit, revisions_used FROM projects WHERE id = ?").get(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });

  const newCount = project.revisions_used + 1;
  db.prepare("UPDATE projects SET revisions_used = ? WHERE id = ?").run(newCount, req.params.id);

  const isExtra = newCount > project.revision_limit;
  res.json({
    revisionsUsed: newCount,
    revisionLimit: project.revision_limit,
    extraRevision: isExtra,
    message: isExtra ? "⚠️ Extra revision! Consider charging extra." : "Revision recorded."
  });
});

app.post("/api/projects/:id/reset-revisions", (req, res) => {
  db.prepare("UPDATE projects SET revisions_used = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Revisions reset to 0" });
});

// ============ TEAM ============
app.get("/api/team", (req, res) => {
  const team = db.prepare("SELECT * FROM team ORDER BY name ASC").all();
  res.json(team);
});

app.post("/api/team", (req, res) => {
  const { name, role, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const stmt = db.prepare("INSERT INTO team (name, role, phone, email) VALUES (?, ?, ?, ?)");
  const result = stmt.run(name, role || "", phone || "", email || "");
  res.json({ id: result.lastInsertRowid, name, role, message: "Team member added!" });
});

app.delete("/api/team/:id", (req, res) => {
  db.prepare("DELETE FROM team WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Team member deleted!" });
});

// ============ DASHBOARD STATS ============
app.get("/api/dashboard", (req, res) => {
  const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients").get().count;
  const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects").get().count;
  const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM payments").get().total || 0;
  const pendingPayments = db.prepare(`
    SELECT SUM(balance_amount - amount_paid) as pending 
    FROM projects 
    WHERE status != 'Cancelled' AND status != 'Completed'
  `).get().pending || 0;

  const recentProjects = db.prepare(`
    SELECT p.*, c.name as client_name, pk.name as package_name
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN packages pk ON pk.id = p.package_id
    ORDER BY p.id DESC LIMIT 5
  `).all();

  const projectsByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM projects GROUP BY status
  `).all();

  res.json({
    totalClients,
    totalProjects,
    totalRevenue,
    pendingPayments,
    recentProjects,
    projectsByStatus
  });
});

// ============ START SERVER ============
const PORT = 5000;
app.listen(PORT, () => {
  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                                                            ║");
  console.log("║     FrameFlicker Studios - Studio Management System        ║");
  console.log("║                                                            ║");
  console.log("║     API Server Running!                                    ║");
  console.log("║     URL: http://localhost:" + PORT + "                            ║");
  console.log("║                                                            ║");
  console.log("║     Location: Sri Lanka                                    ║");
  console.log("║     Currency: LKR                                          ║");
  console.log("║                                                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("API Endpoints:");
  console.log("  GET  /api/health          - Check if server is running");
  console.log("  GET  /api/dashboard       - Dashboard statistics");
  console.log("  GET  /api/clients         - List all clients");
  console.log("  GET  /api/packages        - List all packages");
  console.log("  GET  /api/projects        - List all projects/bookings");
  console.log("  GET  /api/payments        - List all payments");
  console.log("  GET  /api/team            - List team members");
  console.log("");
});