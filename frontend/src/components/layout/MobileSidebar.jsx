// src/components/layout/MobileSidebar.jsx
import { Link } from "react-router-dom";

export default function MobileSidebar({ open, close }) {
  return (
    <div
      className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden 
      ${
        open
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
      onClick={close}
    >
      <div
        className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4">Menu</h2>

        <div className="space-y-3">
          <Link
            to="/"
            onClick={close}
            className="block p-2 rounded hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            to="/sips"
            onClick={close}
            className="block p-2 rounded hover:bg-slate-100"
          >
            SIPs
          </Link>
          <Link
            to="/goals"
            onClick={close}
            className="block p-2 rounded hover:bg-slate-100"
          >
            Goals
          </Link>
          <Link
            to="/projections"
            onClick={close}
            className="block p-2 rounded hover:bg-slate-100"
          >
            Projections
          </Link>
          <Link
            to="/notifications"
            onClick={close}
            className="block p-2 rounded hover:bg-slate-100"
          >
            Notifications
          </Link>
        </div>
      </div>
    </div>
  );
}
