// server/index.js
require("dotenv").config(); // Only affects local development

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { Pool } = require("pg");

// ===========================================
// 🔐 Environment Variable Validation
// ===========================================
const DATABASE_URL = process.env.DATABASE_URL;

// Debug: Log environment check (remove in production later)
console.log("🔍 Environment Check:");
console.log("   NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("   DATABASE_URL exists:", !!DATABASE_URL);
console.log("   DATABASE_URL length:", DATABASE_URL ? DATABASE_URL.length : 0);

// Validate DATABASE_URL before proceeding
if (!DATABASE_URL) {
  console.error("❌ FATAL: DATABASE_URL environment variable is not set!");
  console.error("   Please set it in your Render Dashboard under Environment Variables.");
  process.exit(1);
}

if (!DATABASE_URL.startsWith("postgres://") && !DATABASE_URL.startsWith("postgresql://")) {
  console.error("❌ FATAL: DATABASE_URL does not appear to be a valid PostgreSQL connection string.");
  console.error("   It should start with 'postgres://' or 'postgresql://'");
  console.error("   Received value starts with:", DATABASE_URL.substring(0, 20) + "...");
  process.exit(1);
}

// ===========================================
// 🗄️ Database Connection Pool
// ===========================================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon.tech
  },
  // Connection pool settings for production
  max: 10,                     // Maximum connections in pool
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s if can't connect
});

// Handle pool errors
pool.on("error", (err) => {
  console.error("❌ Unexpected database pool error:", err.message);
});

// ===========================================
// 🏗️ Database Initialization
// ===========================================
async function initDb() {
  let client;
  
  try {
    console.log("🔄 Connecting to database...");
    client = await pool.connect();
    console.log("✅ Database connection established!");

    // Create tables
    console.log("🔄 Creating tables if they don't exist...");

    // 1. Clients Table
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
    console.log("   ✓ clients table ready");

    // 2. Packages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        price DECIMAL(10, 2) NOT NULL,
        hours TEXT,
        deliverables TEXT,
        description TEXT
      );
    `);
    console.log("   ✓ packages table ready");

    // 3. Projects Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
        event_type TEXT,
        event_date TEXT,
        event_time TEXT,
        location TEXT,
        status TEXT DEFAULT 'New',
        price DECIMAL(10, 2) NOT NULL,
        deposit_percent DECIMAL(5, 2) NOT NULL,
        deposit_amount DECIMAL(10, 2) NOT NULL,
        balance_amount DECIMAL(10, 2) NOT NULL,
        amount_paid DECIMAL(10, 2) DEFAULT 0,
        drive_link TEXT,
        internal_path TEXT,
        revision_limit INTEGER DEFAULT 2,
        revisions_used INTEGER DEFAULT 0,
        crew_assigned TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("   ✓ projects table ready");

    // 4. Payments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        method TEXT NOT NULL,
        reference TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("   ✓ payments table ready");

    console.log("✅ All database tables initialized successfully!");
    return true;

  } catch (err) {
    console.error("❌ Database Initialization Error:");
    console.error("   Message:", err.message);
    console.error("   Code:", err.code);
    
    if (err.code === "ENOTFOUND") {
      console.error("   🔧 Fix: Check that DATABASE_URL hostname is correct");
    } else if (err.code === "ECONNREFUSED") {
      console.error("   🔧 Fix: Database server may be down or blocking connections");
    } else if (err.code === "28P01") {
      console.error("   🔧 Fix: Invalid password in DATABASE_URL");
    }
    
    return false;

  } finally {
    if (client) {
      client.release();
    }
  }
}

// ===========================================
// 🚀 Express App Setup
// ===========================================
const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "*", // Set FRONTEND_URL in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(morgan("dev"));

// ===========================================
// 📡 API Routes
// ===========================================

// Health Check
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as time");
    res.json({
      status: "healthy",
      service: "FrameFlicker Studios API",
      database: "connected",
      serverTime: result.rows[0].time,
    });
  } catch (err) {
    res.status(503).json({
      status: "unhealthy",
      service: "FrameFlicker Studios API",
      database: "disconnected",
      error: err.message,
    });
  }
});

// -----------------------------
// 👥 CLIENTS ROUTES
// -----------------------------
app.get("/api/clients", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM clients ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching clients:", err);
    res.status(500).json({ error: "Failed to fetch clients" });
  }
});

app.get("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM clients WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching client:", err);
    res.status(500).json({ error: "Failed to fetch client" });
  }
});

app.post("/api/clients", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    
    const result = await pool.query(
      `INSERT INTO clients (name, phone, email, address) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, phone || null, email || null, address || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating client:", err);
    res.status(500).json({ error: "Failed to create client" });
  }
});

app.put("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address } = req.body;
    
    const result = await pool.query(
      `UPDATE clients 
       SET name = $1, phone = $2, email = $3, address = $4 
       WHERE id = $5 
       RETURNING *`,
      [name, phone, email, address, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating client:", err);
    res.status(500).json({ error: "Failed to update client" });
  }
});

app.delete("/api/clients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM clients WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("Error deleting client:", err);
    res.status(500).json({ error: "Failed to delete client" });
  }
});

// -----------------------------
// 📦 PACKAGES ROUTES
// -----------------------------
app.get("/api/packages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM packages ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching packages:", err);
    res.status(500).json({ error: "Failed to fetch packages" });
  }
});

app.get("/api/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM packages WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching package:", err);
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

app.post("/api/packages", async (req, res) => {
  try {
    const { name, category, price, hours, deliverables, description } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({ error: "Name and price are required" });
    }
    
    const result = await pool.query(
      `INSERT INTO packages (name, category, price, hours, deliverables, description) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, category || null, price, hours || null, deliverables || null, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating package:", err);
    res.status(500).json({ error: "Failed to create package" });
  }
});

app.put("/api/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, hours, deliverables, description } = req.body;
    
    const result = await pool.query(
      `UPDATE packages 
       SET name = $1, category = $2, price = $3, hours = $4, deliverables = $5, description = $6 
       WHERE id = $7 
       RETURNING *`,
      [name, category, price, hours, deliverables, description, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating package:", err);
    res.status(500).json({ error: "Failed to update package" });
  }
});

app.delete("/api/packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM packages WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Package not found" });
    }
    res.json({ message: "Package deleted successfully" });
  } catch (err) {
    console.error("Error deleting package:", err);
    res.status(500).json({ error: "Failed to delete package" });
  }
});

// -----------------------------
// 📁 PROJECTS ROUTES
// -----------------------------
app.get("/api/projects", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        pkg.name as package_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN packages pkg ON p.package_id = pkg.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.*,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        pkg.name as package_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN packages pkg ON p.package_id = pkg.id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const {
      client_id, package_id, event_type, event_date, event_time,
      location, status, price, deposit_percent, deposit_amount,
      balance_amount, amount_paid, drive_link, internal_path,
      revision_limit, revisions_used, crew_assigned, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO projects (
        client_id, package_id, event_type, event_date, event_time,
        location, status, price, deposit_percent, deposit_amount,
        balance_amount, amount_paid, drive_link, internal_path,
        revision_limit, revisions_used, crew_assigned, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        client_id || null, package_id || null, event_type, event_date, event_time,
        location, status || 'New', price, deposit_percent, deposit_amount,
        balance_amount, amount_paid || 0, drive_link, internal_path,
        revision_limit || 2, revisions_used || 0, crew_assigned, notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.put("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      client_id, package_id, event_type, event_date, event_time,
      location, status, price, deposit_percent, deposit_amount,
      balance_amount, amount_paid, drive_link, internal_path,
      revision_limit, revisions_used, crew_assigned, notes
    } = req.body;
    
    const result = await pool.query(
      `UPDATE projects SET
        client_id = $1, package_id = $2, event_type = $3, event_date = $4,
        event_time = $5, location = $6, status = $7, price = $8,
        deposit_percent = $9, deposit_amount = $10, balance_amount = $11,
        amount_paid = $12, drive_link = $13, internal_path = $14,
        revision_limit = $15, revisions_used = $16, crew_assigned = $17, notes = $18
      WHERE id = $19
      RETURNING *`,
      [
        client_id, package_id, event_type, event_date, event_time,
        location, status, price, deposit_percent, deposit_amount,
        balance_amount, amount_paid, drive_link, internal_path,
        revision_limit, revisions_used, crew_assigned, notes, id
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM projects WHERE id = $1 RETURNING *",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// -----------------------------
// 💰 PAYMENTS ROUTES
// -----------------------------
app.get("/api/payments", async (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = `
      SELECT p.*, pr.event_type, c.name as client_name
      FROM payments p
      LEFT JOIN projects pr ON p.project_id = pr.id
      LEFT JOIN clients c ON pr.client_id = c.id
    `;
    const params = [];
    
    if (project_id) {
      query += " WHERE p.project_id = $1";
      params.push(project_id);
    }
    
    query += " ORDER BY p.created_at DESC";
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

app.post("/api/payments", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { project_id, amount, method, reference, note } = req.body;
    
    if (!project_id || !amount || !method) {
      return res.status(400).json({ error: "project_id, amount, and method are required" });
    }
    
    await client.query("BEGIN");
    
    // Insert payment
    const paymentResult = await client.query(
      `INSERT INTO payments (project_id, amount, method, reference, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, amount, method, reference || null, note || null]
    );
    
    // Update project's amount_paid
    await client.query(
      `UPDATE projects 
       SET amount_paid = amount_paid + $1,
           balance_amount = balance_amount - $1
       WHERE id = $2`,
      [amount, project_id]
    );
    
    await client.query("COMMIT");
    
    res.status(201).json(paymentResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating payment:", err);
    res.status(500).json({ error: "Failed to create payment" });
  } finally {
    client.release();
  }
});

app.delete("/api/payments/:id", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    
    await client.query("BEGIN");
    
    // Get payment details first
    const paymentResult = await client.query(
      "SELECT * FROM payments WHERE id = $1",
      [id]
    );
    
    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Payment not found" });
    }
    
    const payment = paymentResult.rows[0];
    
    // Delete payment
    await client.query("DELETE FROM payments WHERE id = $1", [id]);
    
    // Update project's amount_paid
    await client.query(
      `UPDATE projects 
       SET amount_paid = amount_paid - $1,
           balance_amount = balance_amount + $1
       WHERE id = $2`,
      [payment.amount, payment.project_id]
    );
    
    await client.query("COMMIT");
    
    res.json({ message: "Payment deleted successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error deleting payment:", err);
    res.status(500).json({ error: "Failed to delete payment" });
  } finally {
    client.release();
  }
});

// ===========================================
// 🚨 Error Handling
// ===========================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ===========================================
// 🎬 Start Server
// ===========================================
const PORT = process.env.PORT || 5000;

async function startServer() {
  const dbInitialized = await initDb();
  
  if (!dbInitialized) {
    console.error("⚠️ Server starting with database issues. Some features may not work.");
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 FrameFlicker Studios API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });


  // ===========================================
// 🗄️ Database Connection Pool
// ===========================================
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  // Neon uses connection pooling, so we adjust these settings
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
}

startServer();