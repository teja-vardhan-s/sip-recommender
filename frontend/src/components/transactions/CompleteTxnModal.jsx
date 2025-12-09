// src/components/transactions/CompleteTxnModal.jsx
import { useState } from "react";
import api from "../../utils/api";

export default function CompleteTxnModal({ txn, onClose, onCompleted }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState(""); // optional note for frontend only
  const [error, setError] = useState(null);

  const handleConfirm = async (e) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Backend expects { status: 'SUCCESS' } (controller will compute units)
      // If your backend accepts extra payload (like payment_ref/amount), add them here.
      const res = await api.patch(`/transactions/${txn.txn_id}/status`, {
        status: "SUCCESS",
        // optional: note (not used server-side unless you added it)
        note: note || undefined,
      });

      // Normalize response
      const payload = res.data?.data ?? res.data ?? res;
      onCompleted?.(payload);
      onClose();
    } catch (err) {
      console.error("Complete txn failed", err);
      setError(
        err?.response?.data?.error?.message ??
          err.message ??
          "Failed to mark paid"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white rounded shadow p-5">
        <h3 className="text-lg font-semibold mb-2">
          Confirm: Mark Installment Paid
        </h3>

        <p className="text-sm text-slate-600 mb-4">
          Fund:{" "}
          <b>
            {txn?.investment?.fund?.fund_name ?? txn?.investment?.scheme_code}
          </b>
        </p>

        <form onSubmit={handleConfirm} className="space-y-3">
          <div>
            <label className="text-sm block mb-1">Optional note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bank ref / UTR / note"
              className="w-full border p-2 rounded"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              {loading ? "Processing..." : "Mark Paid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
