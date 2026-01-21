// server/sheets.js
const { google } = require('googleapis');

// Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');

// Initialize Google Sheets
let sheets;

async function initSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    sheets = google.sheets({ version: 'v4', auth: authClient });
    
    console.log('✅ Connected to Google Sheets');
    return true;
  } catch (err) {
    console.error('❌ Google Sheets Connection Error:', err.message);
    return false;
  }
}

// ===========================================
// 📊 HELPER FUNCTIONS
// ===========================================

// Get all rows from a sheet
async function getAll(sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z1000`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  const headers = rows[0];
  const data = rows.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj;
  });

  return data;
}

// Get single row by ID
async function getById(sheetName, id) {
  const all = await getAll(sheetName);
  return all.find(item => item.id === String(id)) || null;
}

// Get next ID for a sheet
async function getNextId(sheetName) {
  const all = await getAll(sheetName);
  if (all.length === 0) return 1;
  
  const maxId = Math.max(...all.map(item => parseInt(item.id) || 0));
  return maxId + 1;
}

// Find row number by ID
async function findRowNumber(sheetName, id) {
  const all = await getAll(sheetName);
  const index = all.findIndex(item => item.id === String(id));
  return index === -1 ? -1 : index + 2; // +2 for header row and 1-based index
}

// Append a new row
async function appendRow(sheetName, data) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    resource: {
      values: [data],
    },
  });
}

// Update a row
async function updateRow(sheetName, rowNumber, data) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: 'RAW',
    resource: {
      values: [data],
    },
  });
}

// Delete a row
async function deleteRow(sheetName, rowNumber) {
  // Get sheet ID
  const sheetMeta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  
  const sheet = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error('Sheet not found');
  
  const sheetId = sheet.properties.sheetId;
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      }],
    },
  });
}

// ===========================================
// 👥 CLIENTS
// ===========================================

async function getAllClients() {
  return await getAll('clients');
}

async function getClientById(id) {
  return await getById('clients', id);
}

async function createClient(client) {
  const id = await getNextId('clients');
  const now = new Date().toISOString();
  
  const row = [
    id,
    client.name || '',
    client.phone || '',
    client.email || '',
    client.address || '',
    now,
  ];
  
  await appendRow('clients', row);
  return { id, ...client, created_at: now };
}

async function updateClient(id, client) {
  const rowNumber = await findRowNumber('clients', id);
  if (rowNumber === -1) return null;
  
  const existing = await getClientById(id);
  
  const row = [
    id,
    client.name || existing.name,
    client.phone || existing.phone,
    client.email || existing.email,
    client.address || existing.address,
    existing.created_at,
  ];
  
  await updateRow('clients', rowNumber, row);
  return { id, ...client };
}

async function deleteClient(id) {
  const rowNumber = await findRowNumber('clients', id);
  if (rowNumber === -1) return false;
  
  await deleteRow('clients', rowNumber);
  return true;
}

// ===========================================
// 📦 PACKAGES
// ===========================================

async function getAllPackages() {
  return await getAll('packages');
}

async function getPackageById(id) {
  return await getById('packages', id);
}

async function createPackage(pkg) {
  const id = await getNextId('packages');
  
  const row = [
    id,
    pkg.name || '',
    pkg.category || '',
    pkg.price || 0,
    pkg.hours || '',
    pkg.deliverables || '',
    pkg.description || '',
  ];
  
  await appendRow('packages', row);
  return { id, ...pkg };
}

async function updatePackage(id, pkg) {
  const rowNumber = await findRowNumber('packages', id);
  if (rowNumber === -1) return null;
  
  const existing = await getPackageById(id);
  
  const row = [
    id,
    pkg.name || existing.name,
    pkg.category || existing.category,
    pkg.price || existing.price,
    pkg.hours || existing.hours,
    pkg.deliverables || existing.deliverables,
    pkg.description || existing.description,
  ];
  
  await updateRow('packages', rowNumber, row);
  return { id, ...pkg };
}

async function deletePackage(id) {
  const rowNumber = await findRowNumber('packages', id);
  if (rowNumber === -1) return false;
  
  await deleteRow('packages', rowNumber);
  return true;
}

// ===========================================
// 📁 PROJECTS
// ===========================================

async function getAllProjects() {
  const projects = await getAll('projects');
  const clients = await getAll('clients');
  const packages = await getAll('packages');
  
  // Join data manually
  return projects.map(project => {
    const client = clients.find(c => c.id === project.client_id);
    const pkg = packages.find(p => p.id === project.package_id);
    
    return {
      ...project,
      client_name: client?.name || '',
      client_phone: client?.phone || '',
      client_email: client?.email || '',
      package_name: pkg?.name || '',
    };
  });
}

async function getProjectById(id) {
  const project = await getById('projects', id);
  if (!project) return null;
  
  const client = await getClientById(project.client_id);
  const pkg = await getPackageById(project.package_id);
  
  return {
    ...project,
    client_name: client?.name || '',
    client_phone: client?.phone || '',
    client_email: client?.email || '',
    package_name: pkg?.name || '',
  };
}

async function createProject(project) {
  const id = await getNextId('projects');
  const now = new Date().toISOString();
  
  const row = [
    id,
    project.client_id || '',
    project.package_id || '',
    project.event_type || '',
    project.event_date || '',
    project.location || '',
    project.status || 'New',
    project.price || 0,
    project.deposit_amount || 0,
    project.balance_amount || 0,
    project.amount_paid || 0,
    project.notes || '',
    now,
  ];
  
  await appendRow('projects', row);
  return { id, ...project, created_at: now };
}

async function updateProject(id, project) {
  const rowNumber = await findRowNumber('projects', id);
  if (rowNumber === -1) return null;
  
  const existing = await getById('projects', id);
  
  const row = [
    id,
    project.client_id ?? existing.client_id,
    project.package_id ?? existing.package_id,
    project.event_type ?? existing.event_type,
    project.event_date ?? existing.event_date,
    project.location ?? existing.location,
    project.status ?? existing.status,
    project.price ?? existing.price,
    project.deposit_amount ?? existing.deposit_amount,
    project.balance_amount ?? existing.balance_amount,
    project.amount_paid ?? existing.amount_paid,
    project.notes ?? existing.notes,
    existing.created_at,
  ];
  
  await updateRow('projects', rowNumber, row);
  return { id, ...project };
}

async function deleteProject(id) {
  const rowNumber = await findRowNumber('projects', id);
  if (rowNumber === -1) return false;
  
  await deleteRow('projects', rowNumber);
  return true;
}

// ===========================================
// 💰 PAYMENTS
// ===========================================

async function getAllPayments(projectId = null) {
  let payments = await getAll('payments');
  
  if (projectId) {
    payments = payments.filter(p => p.project_id === String(projectId));
  }
  
  return payments;
}

async function createPayment(payment) {
  const id = await getNextId('payments');
  const now = new Date().toISOString();
  
  const row = [
    id,
    payment.project_id || '',
    payment.amount || 0,
    payment.method || '',
    payment.reference || '',
    payment.note || '',
    now,
  ];
  
  await appendRow('payments', row);
  
  // Update project's amount_paid and balance
  if (payment.project_id) {
    const project = await getById('projects', payment.project_id);
    if (project) {
      const newAmountPaid = parseFloat(project.amount_paid || 0) + parseFloat(payment.amount);
      const newBalance = parseFloat(project.balance_amount || 0) - parseFloat(payment.amount);
      
      await updateProject(payment.project_id, {
        amount_paid: newAmountPaid,
        balance_amount: newBalance,
      });
    }
  }
  
  return { id, ...payment, created_at: now };
}

async function deletePayment(id) {
  const payment = await getById('payments', id);
  if (!payment) return false;
  
  const rowNumber = await findRowNumber('payments', id);
  if (rowNumber === -1) return false;
  
  // Update project's amount_paid and balance
  if (payment.project_id) {
    const project = await getById('projects', payment.project_id);
    if (project) {
      const newAmountPaid = parseFloat(project.amount_paid || 0) - parseFloat(payment.amount);
      const newBalance = parseFloat(project.balance_amount || 0) + parseFloat(payment.amount);
      
      await updateProject(payment.project_id, {
        amount_paid: newAmountPaid,
        balance_amount: newBalance,
      });
    }
  }
  
  await deleteRow('payments', rowNumber);
  return true;
}

// ===========================================
// 📤 EXPORTS
// ===========================================

module.exports = {
  initSheets,
  // Clients
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  // Packages
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  // Projects
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  // Payments
  getAllPayments,
  createPayment,
  deletePayment,
};