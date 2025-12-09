import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import ProjectionBarChart from "../components/charts/ProjectionBarChart";

export default function GoalProjectionPage() {
  const { id } = useParams();
  const [proj, setProj] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/projection/goal/${id}`);
        setProj(res.data?.projection);
      } catch (e) {
        console.error("Goal projection error", e);
      }
    })();
  }, [id]);

  if (!proj) return <div>Loading goal projection...</div>;

  const chartData = proj.breakdown.map((b) => ({
    name: b.scheme_code,
    projected: b.projected_value,
  }));

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-3">
        Goal Projection — {proj.name}
      </h2>

      <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-slate-500">Months Left</div>
          <div className="font-medium">{proj.months}</div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Projected Corpus</div>
          <div className="font-medium">
            ₹{proj.projected_corpus.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-500">Target Amount</div>
          <div className="font-medium">
            ₹{proj.target_amount.toLocaleString()}
          </div>
        </div>
      </div>

      <h3 className="font-medium mb-2">Breakdown by Investment</h3>

      <div className="bg-white p-4 rounded shadow mb-6">
        <ProjectionBarChart data={chartData} />
      </div>

      <button
        onClick={() => window.history.back()}
        className="mt-4 px-3 py-2 border rounded"
      >
        Back
      </button>
    </div>
  );
}
