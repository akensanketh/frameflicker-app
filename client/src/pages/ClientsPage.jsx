import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserPlus, Search, Phone, Trash2 } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data);
    } catch (error) { console.error("Error loading clients"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('/api/clients', formData);
    setShowForm(false);
    setFormData({ name: '', phone: '', email: '', address: '' });
    fetchClients();
  };

  const handleDelete = async (id) => {
    if(!confirm("Delete this client?")) return;
    await axios.delete(`/api/clients/${id}`);
    fetchClients();
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Clients</h2>
        <div className="flex gap-2">
          <input className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary"><UserPlus size={18} /> Add</button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-8 border-l-4 border-[#ff1f1f]">
          <h3 className="font-bold text-lg mb-4">Add Client</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input" placeholder="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <input className="input" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            <input className="input" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            <input className="input" placeholder="Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><th className="p-4">Name</th><th className="p-4">Phone</th><th className="p-4 text-right">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="p-4 font-bold">{c.name}</td>
                <td className="p-4 text-gray-600 flex items-center gap-2"><Phone size={14} /> {c.phone}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}