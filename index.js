// server/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const sheets = require('./sheets');

// ===========================================
// 🔐 Environment Validation
// ===========================================

console.log('🔍 Environment Check:');
console.log('   SPREADSHEET_ID exists:', !!process.env.SPREADSHEET_ID);
console.log('   GOOGLE_CREDENTIALS exists:', !!process.env.GOOGLE_CREDENTIALS);

if (!process.env.SPREADSHEET_ID) {
  console.error('❌ FATAL: SPREADSHEET_ID is not set!');
  process.exit(1);
}

if (!process.env.GOOGLE_CREDENTIALS) {
  console.error('❌ FATAL: GOOGLE_CREDENTIALS is not set!');
  process.exit(1);
}

// ===========================================
// 🚀 Express Setup
// ===========================================

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ===========================================
// 📡 API Routes
// ===========================================

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const clients = await sheets.getAllClients();
    res.json({
      status: 'healthy',
      service: 'FrameFlicker Studios API',
      database: 'Google Sheets',
      clientCount: clients.length,
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message,
    });
  }
});

// -----------------------------
// 👥 CLIENTS
// -----------------------------

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await sheets.getAllClients();
    res.json(clients);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await sheets.getClientById(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const client = await sheets.createClient(req.body);
    res.status(201).json(client);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const client = await sheets.updateClient(req.params.id, req.body);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(client);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const deleted = await sheets.deleteClient(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// -----------------------------
// 📦 PACKAGES
// -----------------------------

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await sheets.getAllPackages();
    res.json(packages);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const pkg = await sheets.getPackageById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json(pkg);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    if (!req.body.name || req.body.price === undefined) {
      return res.status(400).json({ error: 'Name and price are required' });
    }
    const pkg = await sheets.createPackage(req.body);
    res.status(201).json(pkg);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.put('/api/packages/:id', async (req, res) => {
  try {
    const pkg = await sheets.updatePackage(req.params.id, req.body);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json(pkg);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

app.delete('/api/packages/:id', async (req, res) => {
  try {
    const deleted = await sheets.deletePackage(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Package not found' });
    }
    res.json({ message: 'Package deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

// -----------------------------
// 📁 PROJECTS
// -----------------------------

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await sheets.getAllProjects();
    res.json(projects);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await sheets.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = await sheets.createProject(req.body);
    res.status(201).json(project);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const project = await sheets.updateProject(req.params.id, req.body);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await sheets.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// -----------------------------
// 💰 PAYMENTS
// -----------------------------

app.get('/api/payments', async (req, res) => {
  try {
    const payments = await sheets.getAllPayments(req.query.project_id);
    res.json(payments);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    if (!req.body.project_id || !req.body.amount || !req.body.method) {
      return res.status(400).json({ error: 'project_id, amount, and method are required' });
    }
    const payment = await sheets.createPayment(req.body);
    res.status(201).json(payment);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.delete('/api/payments/:id', async (req, res) => {
  try {
    const deleted = await sheets.deletePayment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

// ===========================================
// 🚨 Error Handling
// ===========================================

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ===========================================
// 🎬 Start Server
// ===========================================

const PORT = process.env.PORT || 5000;

async function startServer() {
  const connected = await sheets.initSheets();
  
  if (!connected) {
    console.error('⚠️ Starting with Google Sheets issues');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 FrameFlicker Studios API running on port ${PORT}`);
    console.log(`📊 Using Google Sheets as database`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();