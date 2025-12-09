import api from "../../utils/api";

export default function StopSipModal({ sip, onClose, onStopped }) {
  async function handleStop() {
    try {
      await api.patch(`/sips/${sip.investment_id}/stop`);
      onStopped?.(sip.investment_id);
    } catch (e) {
      console.error("Stop failed", e);
      alert("Failed to stop SIP");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-4">Stop this SIP?</h3>

        <p className="text-slate-600 mb-6">
          {sip.fund_name}
          <br />
          Amount: ₹{sip.invested_amount}
          <br />
          This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={handleStop}
            className="px-3 py-2 bg-red-600 text-white rounded"
          >
            Stop SIP
          </button>
        </div>
      </div>
    </div>
  );
}
