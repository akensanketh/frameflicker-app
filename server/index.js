require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Pool } = require("pg");

// ============ DATABASE SETUP (CLOUD) ============
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Init Database Tables
async function initDb() {
  try {
    const client = await pool.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        price DECIMAL NOT NULL,
        hours TEXT,
        deliverables TEXT,
        description TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        package_id INTEGER REFERENCES packages(id),
        event_type TEXT,
        event_date TEXT,
        event_time TEXT,
        location TEXT,
        status TEXT DEFAULT 'New',
        price DECIMAL NOT NULL,
        deposit_percent DECIMAL NOT NULL,
        deposit_amount DECIMAL NOT NULL,
        balance_amount DECIMAL NOT NULL,
        amount_paid DECIMAL DEFAULT 0,
        drive_link TEXT,
        internal_path TEXT,
        revision_limit INTEGER DEFAULT 2,
        revisions_used INTEGER DEFAULT 0,
        crew_assigned TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id),
        amount DECIMAL NOT NULL,
        method TEXT NOT NULL,
        reference TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS team (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT,
        phone TEXT,
        email TEXT
      );
    `);

    console.log("✅ Connected to Cloud Database (Neon Postgres)");
    client.release();
  } catch (err) {
    console.error("❌ Database Connection Error:", err);
  }
}

initDb();

// ============ EXPRESS APP ============
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Helper: Calculate Deposit
function calcDeposit(price) {
  const p = Number(price);
  const percent = p <= 15000 ? 0.5 : 0.25;
  const depositAmount = Math.round(p * percent);
  const balanceAmount = p - depositAmount;
  return { percent, depositAmount, balanceAmount };
}

// ============ API ROUTES ============

app.get("/api/health", (req, res) => res.json({ status: "Cloud API Running" }));

app.get("/api/clients", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM clients ORDER BY id DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({error: e.message}); }
});

app.post("/api/clients", async (req, res) => {
  const { name, phone, email, address } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO clients (name, phone, email, address) VALUES ($1, $2, $3, $4) RETURNING *",
    [name, phone, email, address]
  );
  res.json(rows[0]);
});

app.delete("/api/clients/:id", async (req, res) => {
  await pool.query("DELETE FROM clients WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

app.get("/api/packages", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM packages ORDER BY price ASC");
  res.json(rows);
});

app.post("/api/packages", async (req, res) => {
  const { name, category, price, hours, deliverables, description } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO packages (name, category, price, hours, deliverables, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [name, category, price, hours, deliverables, description]
  );
  res.json(rows[0]);
});

app.delete("/api/packages/:id", async (req, res) => {
  await pool.query("DELETE FROM packages WHERE id = $1", [req.params.id]);
  res.json({ success: true });
});

// Projects
app.get("/api/projects", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.*, c.name as client_name, pk.name as package_name
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN packages pk ON pk.id = p.package_id
    ORDER BY p.id DESC
  `);
  res.json(rows);
});

app.post("/api/projects", async (req, res) => {
  const { clientId, packageId, eventDate, eventTime, location, notes } = req.body;
  
  // Get Package Price
  const pkgRes = await pool.query("SELECT price FROM packages WHERE id = $1", [packageId]);
  if (pkgRes.rows.length === 0) return res.status(400).json({error: "Package not found"});
  
  const price = Number(pkgRes.rows[0].price);
  const { percent, depositAmount, balanceAmount } = calcDeposit(price);

  const { rows } = await pool.query(
    `INSERT INTO projects 
    (client_id, package_id, event_date, event_time, location, notes, price, deposit_percent, deposit_amount, balance_amount, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'New') RETURNING *`,
    [clientId, packageId, eventDate, eventTime, location, notes, price, percent, depositAmount, balanceAmount]
  );
  res.json(rows[0]);
});

app.patch("/api/projects/:id/status", async (req, res) => {
  await pool.query("UPDATE projects SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const clientsCount = await pool.query("SELECT COUNT(*) FROM clients");
    const projectsCount = await pool.query("SELECT COUNT(*) FROM projects");
    const revenue = await pool.query("SELECT SUM(amount) FROM payments");
    const pending = await pool.query(`SELECT SUM(balance_amount - amount_paid) as pending FROM projects WHERE status != 'Cancelled'`);
    const recent = await pool.query(`
      SELECT p.*, c.name as client_name, pk.name as package_name
      FROM projects p
      LEFT JOIN clients c ON c.id = p.client_id
      LEFT JOIN packages pk ON pk.id = p.package_id
      ORDER BY p.id DESC LIMIT 5
    `);

    res.json({
      totalClients: parseInt(clientsCount.rows[0].count),
      totalProjects: parseInt(projectsCount.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].sum || 0),
      pendingPayments: parseFloat(pending.rows[0].pending || 0),
      recentProjects: recent.rows
    });
  } catch (err) {
    res.json({ totalClients: 0, totalProjects: 0, totalRevenue: 0, pendingPayments: 0, recentProjects: [] });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Cloud Server running on port ${PORT}`);
});