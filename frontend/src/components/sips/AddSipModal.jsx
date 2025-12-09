// src/components/sips/AddSipModal.jsx
import { useEffect, useState } from "react";
import api from "../../utils/api";
import useDebounce from "../../hooks/useDebounce";
import FundSearchField from "../funds/FundSearchField";

export default function AddSipModal({
  onClose,
  onCreated,
  onUpdated,
  sip,
  presetFund,
}) {
  const isEdit = !!sip;
  const [form, setForm] = useState({
    scheme_code: presetFund?.scheme_code ?? sip?.scheme_code ?? "",
    fund_name: presetFund?.fund_name ?? sip?.fund_name ?? "",
    invested_amount: sip?.invested_amount ?? "",
    frequency: sip?.frequency ?? "Monthly",
    start_date: sip?.start_date
      ? sip.start_date.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    duration_months: sip?.duration_months ?? 12,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    setError(null);
  }, [form]);

  // search funds effect
  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    api
      .get(`/funds/search?q=${encodeURIComponent(q)}`)
      .then((r) => {
        if (cancelled) return;
        setSearchResults(r.data?.data ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        const serverMsg =
          e?.response?.data?.error?.message ??
          e?.response?.data ??
          e?.message ??
          e;
        console.error("Fund search failed:", serverMsg);
        setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => (cancelled = true);
  }, [debouncedSearch]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        const res = await api.put(`/sips/${sip.investment_id}`, form);
        onUpdated?.(res.data.sip ?? res.data);
      } else {
        const res = await api.post("/sips", form);
        onCreated?.(res.data.sip ?? res.data);
      }
      onClose();
    } catch (e) {
      console.error("Save SIP failed", e);
      setError(e?.response?.data?.error?.message ?? e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl bg-white rounded shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            {isEdit ? "Edit SIP" : "Add SIP"}
          </h3>
          <button onClick={onClose} className="text-slate-600">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!presetFund ? (
            <div>
              <label className="text-sm block mb-1">Fund (search)</label>
              <FundSearchField
                placeholder="Search by name or scheme code"
                onChange={(f) => {
                  setForm((prev) => ({
                    ...prev,
                    scheme_code: f.scheme_code ?? f.fund_id,
                    fund_name: f.fund_name ?? f.name,
                  }));
                }}
                maxResults={10}
              />
            </div>
          ) : null}

          <div>
            <label className="text-sm block mb-1">Fund name (editable)</label>
            <input
              className="w-full border p-2 rounded"
              value={presetFund?.fund_name ?? form.fund_name}
              onChange={(e) => setForm({ ...form, fund_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm block mb-1">Amount (₹)</label>
              <input
                type="number"
                min="1"
                className="w-full border p-2 rounded"
                value={form.invested_amount}
                onChange={(e) =>
                  setForm({ ...form, invested_amount: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Frequency</label>
              <select
                className="w-full border p-2 rounded"
                value={form.frequency}
                onChange={(e) =>
                  setForm({ ...form, frequency: e.target.value })
                }
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Weekly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm block mb-1">Start date</label>
              <input
                type="date"
                className="w-full border p-2 rounded"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Duration (months)</label>
              <input
                type="number"
                min="1"
                className="w-full border p-2 rounded"
                value={form.duration_months}
                onChange={(e) =>
                  setForm({ ...form, duration_months: e.target.value })
                }
              />
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
