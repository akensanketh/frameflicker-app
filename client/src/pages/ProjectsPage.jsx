import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Calendar, MapPin, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    clientId: '',
    packageId: '',
    eventDate: '',
    eventTime: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log("Fetching data...");
      const [pRes, cRes, pkRes] = await Promise.all([
        axios.get('/api/projects'),
        axios.get('/api/clients'),
        axios.get('/api/packages')
      ]);
      setProjects(pRes.data);
      setClients(cRes.data);
      setPackages(pkRes.data);
      console.log("Data loaded:", { clients: cRes.data.length, packages: pkRes.data.length });
    } catch (error) { 
      console.error("Error loading data", error);
      alert("Error loading data from server. Check console."); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop page reload
    
    // DEBUG LOGGING
    console.log("Attempting to save:", formData);

    // Manual Validation
    if (!formData.clientId) {
      alert("⚠️ Please select a Client!");
      return;
    }
    if (!formData.packageId) {
      alert("⚠️ Please select a Package!");
      return;
    }

    try {
      const response = await axios.post('/api/projects', formData);
      console.log("Server Response:", response.data);
      alert("✅ Booking Created Successfully!");
      
      setShowForm(false);
      setFormData({
        clientId: '',
        packageId: '',
        eventDate: '',
        eventTime: '',
        location: '',
        notes: ''
      });
      fetchData(); // Reload list
    } catch (error) { 
      console.error("Save failed:", error);
      alert("❌ Save Failed: " + (error.response?.data?.error || error.message)); 
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`/api/projects/${id}/status`, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error("Status update failed");
    }
  };

  // Status Badge Colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Confirmed': return 'bg-green-100 text-green-700';
      case 'Editing': return 'bg-purple-100 text-purple-700';
      case 'Review': return 'bg-orange-100 text-orange-700';
      case 'Delivered': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Project Bookings</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Calendar size={18} /> New Booking
        </button>
      </div>

      {/* Booking Form */}
      {showForm && (
        <div className="card mb-8 animate-fade-in border-l-4 border-[#ff1f1f]">
          <h3 className="font-bold text-lg mb-4">Create New Booking</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Client Select */}
            <div>
              <label className="label">Select Client <span className="text-red-500">*</span></label>
              <select className="input" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                <option value="">-- Choose Client --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {clients.length === 0 && <p className="text-xs text-red-500 mt-1">No clients found! Go to Clients page first.</p>}
            </div>

            {/* Package Select */}
            <div>
              <label className="label">Select Package <span className="text-red-500">*</span></label>
              <select className="input" value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})}>
                <option value="">-- Choose Package --</option>
                {packages.map(p => <option key={p.id} value={p.id}>{p.name} (Rs. {Number(p.price).toLocaleString()})</option>)}
              </select>
              {packages.length === 0 && <p className="text-xs text-red-500 mt-1">No packages found! Go to Packages page first.</p>}
            </div>

            <input type="date" className="input" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} />
            <input type="time" className="input" value={formData.eventTime} onChange={e => setFormData({...formData, eventTime: e.target.value})} />
            <input className="input" placeholder="Location" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
            <input className="input" placeholder="Notes (e.g. Drone needed)" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />

            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={handleSubmit} className="btn btn-primary">Create Booking</button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between gap-4">
            
            {/* Left Info */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(p.status)}`}>
                  {p.status}
                </span>
                <span className="text-gray-400 text-sm">#{p.id}</span>
                <span className="text-sm font-bold text-gray-800">{p.client_name}</span>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{p.package_name}</h3>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                <div className="flex items-center gap-1"><Calendar size={14} /> {p.event_date || "Date TBD"}</div>
                <div className="flex items-center gap-1"><Clock size={14} /> {p.event_time || "--:--"}</div>
                <div className="flex items-center gap-1"><MapPin size={14} /> {p.location || "No Location"}</div>
              </div>
            </div>

            {/* Right Financials & Actions */}
            <div className="flex flex-col items-end gap-3 min-w-[200px]">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase">Total Price</p>
                <p className="font-bold text-lg">Rs. {Number(p.price).toLocaleString()}</p>
                
                {/* Deposit Logic Display */}
                <div className="text-xs mt-1">
                  <span className={p.amount_paid >= p.deposit_amount ? "text-green-600 flex items-center justify-end gap-1" : "text-red-500 flex items-center justify-end gap-1"}>
                    {p.amount_paid >= p.deposit_amount ? <CheckCircle size={10}/> : <AlertCircle size={10}/>}
                    Deposit: Rs. {Number(p.deposit_amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Changer */}
              <select 
                className="text-sm border rounded px-2 py-1 bg-gray-50"
                value={p.status}
                onChange={(e) => updateStatus(p.id, e.target.value)}
              >
                <option>New</option>
                <option>Confirmed</option>
                <option>Shooting</option>
                <option>Editing</option>
                <option>Review</option>
                <option>Delivered</option>
                <option>Completed</option>
              </select>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}