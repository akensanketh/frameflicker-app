import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Calendar, CreditCard, Users2 } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, path, active }) => (
  <Link
    to={path}
    className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
      active 
        ? "bg-[#ff1f1f] text-white shadow-md font-medium" 
        : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
    }`}
  >
    <Icon size={20} className={active ? "text-white" : "text-[#ff1f1f] group-hover:text-white transition-colors"} />
    <span>{label}</span>
  </Link>
);

export default function Layout({ children }) {
  const location = useLocation();

  const menu = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Users, label: "Clients", path: "/clients" },
    { icon: Package, label: "Packages", path: "/packages" },
    { icon: Calendar, label: "Projects", path: "/projects" },
    { icon: CreditCard, label: "Payments", path: "/payments" },
    { icon: Users2, label: "Team", path: "/team" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - PURE BLACK to match logo background */}
      <aside className="w-64 bg-black flex flex-col fixed h-full z-10 shadow-xl">
        <div className="p-6 border-b border-gray-900">
          {/* Logo Match */}
          <h1 className="text-2xl font-bold tracking-wider italic">
            <span className="text-[#ff1f1f]">Frame</span>
            <span className="text-white">Flicker</span>
          </h1>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-[0.2em] ml-1">Studios</p>
        </div>

        <nav className="flex-1 py-6 space-y-2">
          {menu.map((item) => (
            <SidebarItem 
              key={item.path} 
              {...item} 
              active={location.pathname === item.path} 
            />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-900">
          <div className="bg-[#111] rounded-lg p-3 border border-gray-800">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm font-medium text-white">Admin</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}