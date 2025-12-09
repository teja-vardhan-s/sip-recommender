import { useNavigate } from "react-router-dom";

export default function RecentSipsList({ sips = [] }) {
  const nav = useNavigate();
  if (!sips.length) {
    return <div className="text-sm text-slate-500">No active SIPs found.</div>;
  }

  return (
    <div className="space-y-3">
      {sips.map((s) => (
        <div
          key={s.investment_id ?? s.id ?? s.fund_id ?? s.scheme_code}
          className="flex items-center justify-between p-2 border rounded"
        >
          <div>
            <div className="font-medium">
              {s.fund_name ?? s.fund?.fund_name ?? s.scheme_code}
            </div>
            <div className="text-xs text-slate-500">
              ₹{s.invested_amount ?? s.amount ?? s.current_value}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm">{s.frequency ?? s.freq ?? "Monthly"}</div>
            <button
              onClick={() =>
                nav(`/sips/${s.investment_id ?? s.id ?? s.scheme_code}`)
              }
              className="mt-2 text-indigo-600 text-sm"
            >
              View
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
