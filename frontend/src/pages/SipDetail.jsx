// src/pages/SipDetail.jsx
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";
import TransactionRow from "../components/transactions/TransactionRow";
import GoalLinker from "../components/sips/GoalLinker";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function SipDetail() {
  const { id } = useParams();
  const [sip, setSip] = useState(null);
  const [txns, setTxns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [projection, setProjection] = useState(null);
  const [projLoading, setProjLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setProjLoading(true);

    try {
      const [sipRes, txRes, projRes] = await Promise.all([
        api.get(`/sips/${id}`).then((r) => r.data?.data ?? r.data ?? null),
        api.get(`/transactions/${id}`).then((r) => r.data?.data ?? []),
        api.get(`/projections/sip/${id}`).then((r) => r.data),
      ]);

      setSip(sipRes);

      const arr = Array.isArray(txRes) ? txRes : txRes?.transactions ?? [];
      setTxns(arr);

      setProjection(projRes);
    } catch (e) {
      console.error("Failed to load SIP Details", e);
      setErr(e);
    } finally {
      setLoading(false);
      setProjLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div>Loading SIP...</div>;
  if (err)
    return (
      <div className="text-red-600">
        Failed to load SIP: {err.message ?? err.toString()}
      </div>
    );
  if (!sip) return <div>No SIP found</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">
          {sip.fund?.fund_name ?? sip.scheme_code}
        </h2>
        <div>
          <Link
            to={`/funds/${sip.scheme_code}`}
            className="px-3 py-2 border rounded text-sm mx-2"
          >
            View NAV history
          </Link>
          <button
            onClick={() => window.history.back()}
            className="ml-3 px-3 py-2 border rounded text-sm"
          >
            Back
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-slate-500">Configured SIP Amount</div>
          <div className="font-medium">
            ₹{Number(sip.invested_amount).toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Units</div>
          <div className="font-medium">{sip.units ?? 0}</div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Frequency</div>
          <div>{sip.frequency}</div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Start Date</div>
          <div>
            {sip.start_date
              ? new Date(sip.start_date).toLocaleDateString()
              : "-"}
          </div>
        </div>
      </div>

      <GoalLinker sip={sip} onUpdated={load} />

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-3">Projection</h3>

        {projLoading ? (
          <div>Loading projection...</div>
        ) : projection ? (
          <div className="bg-white p-4 rounded shadow">
            <div className="mb-3">
              Future Value in {projection.months} months:
              <span className="font-semibold ml-2">
                ₹{projection.future_value.toLocaleString()}
              </span>
            </div>

            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projection.series}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4f46e5"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-slate-500">No projection available.</div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-3">Transactions</h3>
        {txns === null ? (
          <div>Loading transactions...</div>
        ) : txns.length === 0 ? (
          <div className="text-slate-500">
            No transactions yet. Run scheduler or add manually.
          </div>
        ) : (
          <div className="space-y-3">
            {txns.map((t) => (
              <TransactionRow
                key={t.txn_id}
                t={t}
                fund_name={sip.fund?.fund_name ?? sip.scheme_code}
                onUpdated={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
