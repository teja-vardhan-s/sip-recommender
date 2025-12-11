import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Target,
  Layers,
  Bell,
  LogOut,
  PieChart,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";

const navItems = [
  { label: "Dashboard", icon: <Home size={20} />, to: "/" },
  { label: "SIPs", icon: <Layers size={20} />, to: "/sips" },
  { label: "Goals", icon: <Target size={20} />, to: "/goals" },
  {
    label: "Recommendations",
    icon: <PieChart size={20} />,
    to: "/recommendations",
  },
];

export default function Sidebar({ collapsed, toggleCollapse }) {
  const nav = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();

  // simple helper to mark active nav items
  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // ignore
    } finally {
      nav("/login");
    }
  };

  return (
    <aside
      className={`hidden lg:flex flex-col transition-all duration-200 border-r bg-white 
      ${collapsed ? "w-20" : "w-64"}`}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b">
        {!collapsed && <h1 className="text-xl font-semibold">SIP App</h1>}
        <button
          onClick={toggleCollapse}
          className="p-2 hover:bg-slate-100 rounded"
        >
          <svg width="18" height="18">
            <path d="M0 9h18" stroke="black" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 w-full p-2 rounded hover:bg-slate-100 ${
              isActive(item.to) ? "bg-slate-100 font-medium" : "text-slate-600"
            }`}
          >
            {item.icon}
            {!collapsed && (
              <span className="flex-1 text-sm text-slate-700">
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-2 hover:bg-slate-100 rounded transition"
        >
          {/* Icon wrapper */}
          <div className="w-8 flex justify-center">
            <LogOut size={20} />
          </div>

          {/* Label only if expanded */}
          {!collapsed && (
            <span className="ml-2 text-sm font-medium">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );
}
