import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/MainLayout';
import Dashboard from './pages/DashboardPage';
import Packages from './pages/PackagesPage';
import Clients from './pages/ClientsPage';
import Projects from './pages/ProjectsPage'; // <--- Import the Projects Page

// Placeholder for remaining pages
const Placeholder = ({ title }) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">{title}</h2>
    <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 text-center text-gray-400">
      Feature coming soon!
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/projects" element={<Projects />} /> {/* <--- USE THE REAL PAGE HERE */}
          <Route path="/payments" element={<Placeholder title="Payments & Invoices" />} />
          <Route path="/team" element={<Placeholder title="Team Members" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;