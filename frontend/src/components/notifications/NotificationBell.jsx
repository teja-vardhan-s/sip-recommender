// src/components/notifications/NotificationBell.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { useAuth } from "../../auth/AuthProvider";

export default function NotificationBell() {
  const { user } = useAuth();
  const btnRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]); // newest first
  const nav = useNavigate();

  const unread = notifications.filter((n) => !n.is_read && !n.isRead);
  const read = notifications.filter((n) => n.is_read || n.isRead);

  async function loadNotifications(limit = 20) {
    setLoading(true);
    try {
      const res = await api.get(`/notifications?limit=${limit}`);
      const arr = res.data?.notifications ?? res.data ?? [];
      setNotifications(arr);
    } catch (e) {
      console.error("Failed to load notifications", e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const right = window.innerWidth - (rect.right + window.scrollX);
    setCoords({ top, right });
    loadNotifications();
  }, [open]);

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      const root = document.getElementById("notif-dropdown-root");
      if (root && root.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  async function markRead(n) {
    try {
      // optimistic UI update
      setNotifications((prev) =>
        prev.map((p) =>
          p.notification_id === n.notification_id ? { ...p, is_read: true } : p
        )
      );
      await api.patch(`/notifications/${n.notification_id}/read`);
    } catch (e) {
      console.error("Failed mark read", e);
      // rollback (simple approach: refetch)
      loadNotifications();
    }
  }

  async function markAllShownRead() {
    const toMark = notifications
      .filter((x) => !x.is_read && !x.isRead)
      .slice(0, 20);
    for (const nt of toMark) {
      try {
        await api.patch(`/notifications/${nt.notification_id}/read`);
      } catch (e) {
        console.error("mark one failed", e);
      }
    }
    loadNotifications();
  }

  const unreadCount = unread.length;

  return (
    <>
      <div className="relative inline-block">
        <button
          ref={btnRef}
          className="relative p-2 rounded hover:bg-slate-100"
          aria-label="Notifications"
          onClick={() => setOpen((v) => !v)}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {open &&
        coords &&
        createPortal(
          <div
            id="notif-dropdown-root"
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              zIndex: 9999,
            }}
          >
            <div
              className="w-[360px] max-w-[calc(100vw-24px)] bg-white border rounded shadow"
              style={{ minWidth: 240, maxHeight: 360, overflow: "hidden" }}
            >
              <div className="p-3 border-b flex items-center justify-between">
                <div className="text-sm font-medium">Notifications</div>
                <div className="text-xs text-slate-500">
                  {unreadCount} unread
                </div>
              </div>

              <div className="px-2 py-2 space-y-2 max-h-64 overflow-auto">
                {/* Unread Section */}
                {loading && (
                  <div className="text-sm text-slate-500 p-2">Loading…</div>
                )}

                {!loading && unread.length > 0 && (
                  <div>
                    <div className="px-2 text-xs text-slate-400 font-semibold mb-1">
                      New
                    </div>
                    <div className="space-y-1">
                      {unread.map((n) => (
                        <div
                          key={n.notification_id}
                          className="p-2 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer flex justify-between gap-2 items-start"
                          onClick={() => markRead(n)}
                        >
                          <div className="flex-1">
                            <div className="text-sm">
                              {n.message ?? n.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-xs text-indigo-600 font-medium">
                            Mark
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Read / Earlier Section */}
                {!loading && read.length > 0 && (
                  <div>
                    <div className="px-2 text-xs text-slate-400 font-semibold mt-2 mb-1">
                      Earlier
                    </div>
                    <div className="space-y-1">
                      {read.slice(0, 20).map((n) => (
                        <div
                          key={n.notification_id}
                          className="p-2 hover:bg-slate-50 rounded cursor-default flex justify-between items-start"
                        >
                          <div className="flex-1">
                            <div className="text-sm text-slate-700">
                              {n.message ?? n.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loading && notifications.length === 0 && (
                  <div className="p-2 text-sm text-slate-500">
                    No notifications
                  </div>
                )}
              </div>

              <div className="p-2 border-t flex items-center justify-between">
                <button
                  onClick={() => {
                    setOpen(false);
                    nav("/notifications");
                  }}
                  className="text-sm px-3 py-2 hover:bg-slate-100 rounded"
                >
                  Show all
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={markAllShownRead}
                    className="text-sm px-3 py-2 hover:bg-slate-100 rounded"
                  >
                    Mark all shown read
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
