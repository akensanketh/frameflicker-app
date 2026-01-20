import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Package, Trash2, Check } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '', category: 'Wedding', price: '', description: ''
  });

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    try {
      const res = await axios.get('/api/packages');
      setPackages(res.data);
    } catch (error) { console.error("Error loading packages"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/packages', formData);
    setShowForm(false);
    setFormData({ name: '', category: 'Wedding', price: '', description: '' });
    fetchPackages();
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete this package?")) return;
    await axios.delete(`/api/packages/${id}`);
    fetchPackages();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Packages & Pricing</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus size={18} /> Add Package
        </button>
      </div>

      {showForm && (
        <div className="card mb-8 animate-fade-in border-l-4 border-[#ff1f1f]">
          <h3 className="font-bold text-lg mb-4">Create New Package</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input" placeholder="Package Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <select className="input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option>Wedding</option><option>Event</option><option>Portrait</option><option>Corporate</option>
            </select>
            <input type="number" className="input" placeholder="Price (LKR)" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
            <input className="input" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-2 bg-[#ff1f1f]"></div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase text-gray-400">{pkg.category}</span>
                <button onClick={() => handleDelete(pkg.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
              <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
              <p className="text-2xl font-bold text-[#ff1f1f]">Rs. {Number(pkg.price).toLocaleString()}</p>
              <div className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                <Check size={12} /> <span>Auto-Deposit: {pkg.price <= 15000 ? "50%" : "25%"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}