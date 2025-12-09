// src/pages/NotificationsPage.jsx
import { useEffect, useState } from "react";
import api from "../utils/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("unread"); // 'unread' | 'all'

  async function load() {
    setLoading(true);
    try {
      // backend should return notifications sorted newest-first
      const res = await api.get("/notifications?limit=200");
      setNotifications(res.data?.notifications ?? res.data ?? []);
    } catch (e) {
      console.error("Failed to load notifications", e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const unread = notifications.filter((n) => !n.is_read && !n.isRead);
  const read = notifications.filter((n) => n.is_read || n.isRead);

  async function markOneRead(n) {
    try {
      await api.patch(`/notifications/${n.notification_id}/read`);
      setNotifications((prev) =>
        prev.map((p) =>
          p.notification_id === n.notification_id ? { ...p, is_read: true } : p
        )
      );
    } catch (e) {
      console.error("mark read failed", e);
      load();
    }
  }

  async function markAllRead() {
    // naive approach: call backend endpoint for each unread
    const toMark = unread.slice(0, 200);
    for (const n of toMark) {
      try {
        await api.patch(`/notifications/${n.notification_id}/read`);
      } catch (e) {}
    }
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Notifications</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("unread")}
            className={`px-3 py-2 rounded ${
              tab === "unread" ? "bg-indigo-600 text-white" : "border"
            }`}
          >
            Unread ({unread.length})
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-2 rounded ${
              tab === "all" ? "bg-indigo-600 text-white" : "border"
            }`}
          >
            All ({notifications.length})
          </button>
          <button onClick={markAllRead} className="px-3 py-2 border rounded">
            Mark all read
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : tab === "unread" ? (
        unread.length === 0 ? (
          <div className="text-slate-500">No unread notifications.</div>
        ) : (
          <div className="space-y-2">
            {unread.map((n) => (
              <div
                key={n.notification_id}
                className="p-3 bg-white rounded shadow flex justify-between items-start"
              >
                <div>
                  <div className="font-medium">{n.message}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    className="text-sm text-indigo-600"
                    onClick={() => markOneRead(n)}
                  >
                    Mark read
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.notification_id}
              className={`p-3 bg-white rounded shadow flex justify-between items-start ${
                n.is_read ? "opacity-80" : ""
              }`}
            >
              <div>
                <div className="font-medium">{n.message}</div>
                <div className="text-xs text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {n.is_read ? "Read" : "Unread"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
