import { Menu, LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import NotificationBell from "../notifications/NotificationBell.jsx";

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded hover:bg-slate-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex items-center gap-3 relative">
        <NotificationBell />
        <div className="hidden sm:flex sm:items-center sm:space-x-3">
          <span className="text-sm text-slate-700">{user?.name}</span>
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              user?.name || "U"
            )}&background=0D8ABC&color=fff`}
            alt="avatar"
            className="h-8 w-8 rounded-full"
          />
        </div>
      </div>
    </header>
  );
}
