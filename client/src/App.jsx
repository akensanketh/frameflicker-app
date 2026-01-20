import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';

// Placeholder pages for now (we will build these next)
const Placeholder = ({ title }) => (
  <div>
    <h2 className="text-2xl font-bold mb-4">{title}</h2>
    <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-200 text-center text-gray-400">
      Feature coming next step!
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Placeholder title="Clients Management" />} />
          <Route path="/packages" element={<Placeholder title="Packages & Pricing" />} />
          <Route path="/projects" element={<Placeholder title="Project Bookings" />} />
          <Route path="/payments" element={<Placeholder title="Payments & Invoices" />} />
          <Route path="/team" element={<Placeholder title="Team Members" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;