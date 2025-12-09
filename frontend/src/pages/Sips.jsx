import { useEffect, useState } from "react";
import api from "../utils/api";
import AddSipModal from "../components/sips/AddSipModal";
import StopSipModal from "../components/sips/StopSipModal";
import { useNavigate } from "react-router-dom";

export default function SipsPage() {
  const [sips, setSips] = useState([]); // full list from server
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editSip, setEditSip] = useState(null);
  const [cancelSip, setCancelSip] = useState(null);
  const nav = useNavigate();

  const normalizeId = (s) => s.investment_id ?? s.id ?? null;

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sips");
      const arr = res.data?.data ?? res.data ?? [];
      setSips(Array.isArray(arr) ? arr : []);
    } catch (e) {
      console.error("Failed to load sips", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // helpers to split lists
  const activeSips = sips.filter((s) =>
    s.is_active === undefined ? true : !!s.is_active
  );
  const stoppedSips = sips.filter((s) => s.is_active === false);

  // called when a new SIP is created
  const handleCreated = (newSip) => {
    // normalise shape and insert at top
    setSips((prev) => [newSip, ...prev]);
    setShowAdd(false);
  };

  // called when a SIP is updated (edit)
  const handleUpdated = (updated) => {
    const id = normalizeId(updated);
    setSips((prev) => prev.map((s) => (normalizeId(s) === id ? updated : s)));
    setEditSip(null);
  };

  // called when a SIP is stopped (from modal). Prefer returning updated SIP object.
  // If modal returns only id, we fallback to reloading from server.
  const handleStopped = async (payload) => {
    // payload might be { id } or updatedSip
    const updatedSip = payload?.sip ?? payload?.updatedSip ?? null;
    const id = payload?.id ?? (updatedSip ? normalizeId(updatedSip) : null);

    if (updatedSip && id) {
      // update local list: replace SIP with updated version
      setSips((prev) =>
        prev.map((s) => (normalizeId(s) === id ? updatedSip : s))
      );
      setCancelSip(null);
      return;
    }

    if (id) {
      // conservative update: mark is_active = false locally (optimistic)
      setSips((prev) =>
        prev.map((s) =>
          normalizeId(s) === id ? { ...s, is_active: false } : s
        )
      );
      setCancelSip(null);
      return;
    }

    // fallback: reload from server to get authoritative state
    await load();
    setCancelSip(null);
  };

  // optional: restart a stopped sip
  const handleRestart = async (sip) => {
    const id = normalizeId(sip);
    try {
      const res = await api.patch(`/sips/${id}/start`);
      const updated = res.data?.sip ?? res.data ?? null;
      if (updated) {
        setSips((prev) =>
          prev.map((s) => (normalizeId(s) === id ? updated : s))
        );
      } else {
        // optimistic fallback
        setSips((prev) =>
          prev.map((s) =>
            normalizeId(s) === id ? { ...s, is_active: true } : s
          )
        );
      }
    } catch (e) {
      console.error("Failed to restart SIP", e);
      alert("Failed to restart SIP");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">My SIPs</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Add SIP
          </button>
          <button onClick={load} className="px-3 py-2 border rounded">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : sips.length === 0 ? (
        <div className="text-slate-500">
          No SIPs found. Click{" "}
          <button className="underline" onClick={() => setShowAdd(true)}>
            Add SIP
          </button>{" "}
          to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active column */}
          <div>
            <h3 className="text-lg font-medium mb-2">Active SIPs</h3>
            <div className="space-y-3">
              {activeSips.map((s) => (
                <div
                  key={normalizeId(s)}
                  className="bg-white p-3 rounded shadow flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">
                      {s.fund?.fund_name ?? s.fund_name ?? s.scheme_code}
                    </div>
                    <div className="text-sm text-slate-500">
                      ₹
                      {Number(
                        s.invested_amount ?? s.investedAmount ?? 0
                      ).toLocaleString()}{" "}
                      • {s.frequency ?? "Monthly"} • Started{" "}
                      {s.start_date
                        ? new Date(s.start_date).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => nav(`/sips/${normalizeId(s)}`)}
                      className="text-indigo-600 text-sm"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => setEditSip(s)}
                      className="text-slate-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setCancelSip(s)}
                      className="text-red-600 text-sm"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stopped column */}
          <div>
            <h3 className="text-lg font-medium mb-2">
              Stopped / Inactive SIPs
            </h3>
            <div className="space-y-3">
              {stoppedSips.length === 0 ? (
                <div className="text-slate-500">No stopped SIPs</div>
              ) : (
                stoppedSips.map((s) => (
                  <div
                    key={normalizeId(s)}
                    className="bg-white p-3 rounded shadow flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium line-through text-slate-700">
                        {s.fund?.fund_name ?? s.fund_name ?? s.scheme_code}
                      </div>
                      <div className="text-sm text-slate-500">
                        ₹
                        {Number(
                          s.invested_amount ?? s.investedAmount ?? 0
                        ).toLocaleString()}{" "}
                        • {s.frequency ?? "Monthly"} • Started{" "}
                        {s.start_date
                          ? new Date(s.start_date).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => nav(`/sips/${normalizeId(s)}`)}
                        className="text-indigo-600 text-sm"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => handleRestart(s)}
                        className="text-green-600 text-sm"
                      >
                        Restart
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddSipModal
          onClose={() => setShowAdd(false)}
          onCreated={handleCreated}
        />
      )}
      {editSip && (
        <AddSipModal
          sip={editSip}
          onClose={() => setEditSip(null)}
          onUpdated={handleUpdated}
        />
      )}
      {cancelSip && (
        <StopSipModal
          sip={cancelSip}
          onClose={() => setCancelSip(null)}
          // Expect StopSipModal to return either { id } or { sip: updatedSip }
          onStopped={handleStopped}
        />
      )}
    </div>
  );
}
