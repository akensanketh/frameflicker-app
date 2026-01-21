import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/MainLayout'; // We renamed this earlier
import Dashboard from './pages/DashboardPage'; // <--- New Name
import Packages from './pages/PackagesPage';   // <--- New Name
import Clients from './pages/ClientsPage';     // <--- New Name
import Projects from './pages/ProjectsPage';

// Placeholder pages
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
          <Route path="/projects" element={<Placeholder title="Project Bookings" />} />
          <Route path="/payments" element={<Placeholder title="Payments & Invoices" />} />
          <Route path="/team" element={<Placeholder title="Team Members" />} />
          <Route path="/projects" element={<Projects />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;