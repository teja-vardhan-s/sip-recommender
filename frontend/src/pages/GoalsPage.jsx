import { useEffect, useState } from "react";
import api from "../utils/api";
import GoalForm from "../components/goals/GoalForm/GoalForm";
import GoalProgressCard from "../components/goals/GoalProgressCard";

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  function openEdit(goal) {
    setEditing(goal);
  }

  async function confirmDelete(goal) {
    const ok = window.confirm(
      `Delete goal "${goal.name}"? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await api.delete(`/goals/${goal.goal_id}`);
      // reload list
      load();
    } catch (err) {
      alert(err?.response?.data?.error?.message ?? "Failed to delete goal");
    }
  }

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/goals");
      // backend returns enriched array in res.data.data or res.data
      const arr = res.data?.goals ?? res.data ?? [];
      // normalize fields that might be Decimal strings
      const normalized = arr.map((g) => ({
        ...g,
        target_amount: Number(
          g.target_amount ?? g.target_amount?.toString?.() ?? 0
        ),
        calculated_sip: Number(
          g.calculated_sip ?? g.calculated_sip?.toString?.() ?? 0
        ),
        progress: {
          contributed: Number(g.progress?.contributed ?? 0),
          percent: Number(g.progress?.percent ?? 0),
        },
      }));
      setGoals(normalized);
    } catch (e) {
      console.error("Failed to load goals", e);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Goals</h2>
        <GoalForm onCreated={load} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div>Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="text-slate-500">No goals yet.</div>
        ) : (
          goals.map((g) => (
            <div key={g.goal_id} className="p-4 bg-white rounded shadow">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{g.name}</div>
                  <div className="text-sm text-slate-500">
                    Target: ₹{Number(g.target_amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Progress: {Number(g.progress?.percent ?? 0).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => setSelectedGoal(g)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEdit(g)}
                    className="px-2 py-1 border rounded text-sm ml-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => confirmDelete(g)}
                    className="px-2 py-1 text-red-600 rounded ml-2"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-3 text-sm">
                Recommended SIP:{" "}
                <b>₹{Number(g.calculated_sip ?? 0).toLocaleString()}</b>/month
              </div>
            </div>
          ))
        )}
      </div>

      {selectedGoal && (
        <div className="mt-6">
          <GoalProgressCard
            goal={selectedGoal}
            onClose={() => setSelectedGoal(null)}
          />
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl bg-white rounded p-4">
            <h3 className="mb-2">Edit Goal</h3>
            <GoalForm
              initial={editing}
              onUpdated={() => {
                setEditing(null);
                load();
              }}
              onCreated={null}
              isEditing={true}
              goal_id={editing.goal_id}
            />
            <div className="mt-2 text-right">
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1 border rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
