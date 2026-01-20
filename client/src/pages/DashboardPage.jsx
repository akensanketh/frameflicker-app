import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DollarSign, Users, Briefcase, Clock } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group">
    <div className={`absolute right-0 top-0 w-24 h-24 opacity-10 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-110 ${color}`}></div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1 text-gray-900">{value}</h3>
    </div>
    <div className={`p-3 rounded-lg shadow-md ${color} text-white`}>
      <Icon size={24} />
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setStats(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats", error);
    }
  };

  if (loading) return <div className="p-10 text-gray-500">Loading Dashboard...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Studio Overview</h2>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Revenue" 
          value={`Rs. ${stats.totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          color="bg-green-600" 
        />
        <StatCard 
          title="Active Projects" 
          value={stats.totalProjects} 
          icon={Briefcase} 
          color="bg-[#ff1f1f]"  // <--- RED BRAND COLOR
        />
        <StatCard 
          title="Total Clients" 
          value={stats.totalClients} 
          icon={Users} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Pending Payments" 
          value={`Rs. ${stats.pendingPayments.toLocaleString()}`} 
          icon={Clock} 
          color="bg-orange-500" 
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">Recent Projects</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium">Event Date</th>
              <th className="px-6 py-3 font-medium">Package</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.recentProjects.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                  No projects yet.
                </td>
              </tr>
            ) : (
              stats.recentProjects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.client_name}</td>
                  <td className="px-6 py-4 text-gray-600">{p.event_date}</td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-200">
                      {p.package_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border
                      ${p.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">Rs. {p.price.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}