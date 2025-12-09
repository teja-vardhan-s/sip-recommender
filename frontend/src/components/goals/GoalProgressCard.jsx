import { useEffect, useState } from "react";
import api from "../../utils/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function GoalProgressCard({ goal, onClose }) {
  const [progress, setProgress] = useState(null);
  const [projection, setProjection] = useState(null);
  const [loading, setLoading] = useState(true);

  // Colors for charts
  const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"];

  const load = async () => {
    setLoading(true);
    try {
      // Fetch progress + projection in parallel
      const [pRes, projRes] = await Promise.all([
        api.get(`/goals/progress/${goal.goal_id}`),
        api.get(`/projections/goal/${goal.goal_id}`),
      ]);

      const p = pRes.data?.data ?? pRes.data ?? null;
      const proj = projRes.data?.data ?? projRes.data ?? null;

      if (p) {
        p.target_amount = Number(p.target_amount ?? 0);
        p.monthly_investment = Number(p.monthly_investment ?? 0);
        p.expectedCorpus = Number(p.expectedCorpus ?? 0);
        p.actualCorpus = Number(p.actualCorpus ?? 0);
        p.progressPercent = Number(p.progressPercent ?? 0);
        p.projectedFinalValue = Number(p.projectedFinalValue ?? 0);
      }

      if (proj) {
        proj.projected_corpus = Number(proj.projected_corpus ?? 0);
        proj.target_amount = Number(proj.target_amount ?? 0);
        proj.breakdown = (proj.breakdown ?? []).map((b) => ({
          ...b,
          projected_value: Number(b.projected_value ?? 0),
          monthly_amount: Number(b.monthly_amount ?? 0),
        }));
      }

      setProgress(p);
      setProjection(proj);
    } catch (e) {
      console.error("Goal progress load error", e);
      setProgress(null);
      setProjection(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [goal]);

  if (loading) return <div>Loading progress...</div>;
  if (!progress) return <div>Failed to fetch progress</div>;

  return (
    <div className="p-4 bg-white rounded shadow">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{goal.name}</h3>
          <div className="text-sm text-slate-500">
            Target: ₹{progress.target_amount.toLocaleString()}
          </div>
        </div>

        <button onClick={onClose} className="px-2 py-1 text-sm border rounded">
          Close
        </button>
      </div>

      {/* METRICS */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric
          label="Monthly Investment"
          value={`₹${progress.monthly_investment.toLocaleString()}`}
        />
        <Metric label="Months Elapsed" value={progress.monthsElapsed ?? "-"} />
        <Metric
          label="Expected Return (annual)"
          value={`${(progress.expectedReturnRate * 100).toFixed(2)}%`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric
          label="Expected Corpus"
          value={`₹${progress.expectedCorpus.toLocaleString()}`}
        />
        <Metric
          label="Actual Corpus"
          value={`₹${progress.actualCorpus.toLocaleString()}`}
        />
        <Metric
          label="Progress"
          value={`${progress.progressPercent.toFixed(2)}%`}
        />
      </div>

      <div className="mt-4">
        <Metric
          label="Projected Final Value"
          value={`₹${progress.projectedFinalValue.toLocaleString()}`}
          extra={`Status: ${progress.status}`}
        />
      </div>

      {/* ---------------------- PROJECTION CHARTS ---------------------- */}

      {projection && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PIE: Projected Corpus vs Target */}
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Projected vs Target</h4>

            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Projected",
                      value: projection.projected_corpus,
                    },
                    {
                      name: "Remaining Gap",
                      value: Math.max(
                        projection.target_amount - projection.projected_corpus,
                        0
                      ),
                    },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {COLORS.map((color, idx) => (
                    <Cell key={idx} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* BAR: Breakdown by SIP */}
          <div className="p-4 border rounded">
            <h4 className="font-medium mb-2">Breakdown by SIP</h4>
            {projection.breakdown.length === 0 ? (
              <div className="text-sm text-slate-500">No SIPs linked</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={projection.breakdown}>
                  <XAxis dataKey="scheme_code" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="projected_value"
                    fill="#4F46E5"
                    name="Projected Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper component
function Metric({ label, value, extra = null }) {
  return (
    <div>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
      {extra && <div className="text-xs text-slate-500 mt-1">{extra}</div>}
    </div>
  );
}
