// src/components/transactions/TransactionRow.jsx
import { useState } from "react";
import api from "../../utils/api";
import CompleteTxnModal from "./CompleteTxnModal";

export default function TransactionRow({ t, fund_name, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  async function markFailed() {
    if (!confirm("Mark this installment as FAILED?")) return;
    setLoading(true);
    try {
      // Patch status -> FAILED
      await api.patch(`/transactions/${t.txn_id}/status`, { status: "FAILED" });
      // refresh parent
      onUpdated?.();
    } catch (err) {
      console.error("Mark failed error", err);
      alert(err?.response?.data?.error?.message ?? "Failed to mark failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="p-3 border rounded flex items-center justify-between">
        <div>
          <div className="font-medium">{fund_name}</div>
          <div className="text-sm text-slate-500">
            ₹{Number(t.amount).toLocaleString()} •{" "}
            {new Date(t.txn_date).toLocaleDateString()}
          </div>
          <div className="text-xs mt-1">
            Status:{" "}
            <span
              className={`font-medium ${
                t.status === "PENDING"
                  ? "text-yellow-600"
                  : t.status === "SUCCESS" || t.status === "COMPLETED"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {t.status}
            </span>
            {t.status === "SUCCESS" && t.units && (
              <span className="ml-2 text-slate-600">• {t.units} units</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {t.status === "PENDING" && (
            <>
              <button
                onClick={() => setShowComplete(true)}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
              >
                Mark Paid
              </button>
              <button
                onClick={markFailed}
                disabled={loading}
                className="px-3 py-1 border rounded text-sm text-red-600"
              >
                Mark Failed
              </button>
            </>
          )}

          {(t.status === "SUCCESS" || t.status === "COMPLETED") && (
            <div className="text-sm text-slate-500">Completed</div>
          )}

          {t.status === "FAILED" && (
            <div className="text-sm text-red-600">Failed</div>
          )}
        </div>
      </div>

      {showComplete && (
        <CompleteTxnModal
          txn={t}
          onClose={() => setShowComplete(false)}
          onCompleted={() => {
            setShowComplete(false);
            onUpdated?.();
          }}
        />
      )}
    </>
  );
}
