// ...imports unchanged
import { useEffect, useState } from "react";
import api from "../../utils/api";

export default function GoalLinker({ sip, onUpdated }) {
  const sipId = sip?.investment_id ?? sip?.id ?? null;

  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState(
    sip?.goal_id ?? sip?.goalId ?? null
  );
  const [error, setError] = useState(null);

  useEffect(() => {
    // load user goals
    let cancelled = false;
    async function load() {
      setLoadingGoals(true);
      setError(null);
      try {
        const res = await api.get("/goals");
        // backend may return { data: [...] } or { goals: [...] } or array directly
        const arr = res.data?.data ?? res.data?.goals ?? res.data ?? [];

        if (cancelled) return;

        // Normalize keys: ensure each goal has goal_id and name
        const normalized = arr.map((g) => ({
          goal_id: g.goal_id ?? g.id ?? g.goalId ?? null,
          name: g.name ?? g.title ?? "Untitled Goal",
          target_amount: g.target_amount ?? g.targetAmount ?? null,
          ...g,
        }));

        // If the SIP already has a linked goal (sip.goal_id) but it's not in the fetched list,
        // prepend a stub item so the user sees it and can unlink/change it.
        const linkedGoalId = sip?.goal_id ?? sip?.goalId ?? null;
        if (linkedGoalId != null) {
          const found = normalized.find((x) => x.goal_id == linkedGoalId);
          if (!found) {
            const stub = {
              goal_id: linkedGoalId,
              name:
                sip?.goal_name ??
                sip?.goal?.name ??
                `Linked goal #${linkedGoalId}`,
              // keep other fields minimal; optional: target_amount: sip?.goal?.target_amount
            };
            normalized.unshift(stub);
          }
        }

        setGoals(normalized);

        // Ensure selectedGoalId honors sip.link even if goals weren't loaded when component mounted
        if (
          selectedGoalId == null &&
          (sip?.goal_id ?? sip?.goalId ?? null) != null
        ) {
          setSelectedGoalId(sip?.goal_id ?? sip?.goalId ?? null);
        }
      } catch (err) {
        console.error("Failed to load goals", err);
        if (!cancelled)
          setError(
            err?.response?.data?.error?.message ?? err.message ?? "Failed"
          );
      } finally {
        if (!cancelled) setLoadingGoals(false);
      }
    }
    load();
    return () => (cancelled = true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sip]);

  useEffect(() => {
    // update selected if sip prop changes (e.g., after re-fetch)
    setSelectedGoalId(sip?.goal_id ?? sip?.goalId ?? null);
  }, [sip]);

  async function handleSave() {
    if (!sipId) return;
    setSaving(true);
    setError(null);

    try {
      // backend: PUT /api/sips/:id expects fields that can include goal_id (nullable)
      await api.put(`/sips/${sipId}`, { goal_id: selectedGoalId ?? null });
      // refresh sip details
      await onUpdated?.();
    } catch (err) {
      console.error("Failed to link goal", err);
      setError(
        err?.response?.data?.error?.message ?? err.message ?? "Save failed"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 bg-white p-4 rounded shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-500">Linked Goal</div>
          <div className="font-medium">
            {/* prefer sip.goal_name or sip.goal?.name; fallback to finding it in goals array */}
            {sip?.goal_name ??
              (sip?.goal?.name ? sip.goal.name : null) ??
              (selectedGoalId
                ? goals.find((g) => g.goal_id == selectedGoalId)?.name ??
                  `Goal #${selectedGoalId}`
                : "None")}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Change / unlink</div>
          <div className="text-xs text-slate-400">Save to apply</div>
        </div>
      </div>

      <div className="mt-3">
        {loadingGoals ? (
          <div className="text-sm text-slate-500">Loading goals...</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : goals.length === 0 ? (
          <div className="text-sm text-slate-500">You have no goals yet.</div>
        ) : (
          <>
            <div className="border rounded max-h-40 overflow-auto p-1">
              <ul>
                <li
                  key="none"
                  className={`p-2 cursor-pointer rounded mb-1 ${
                    selectedGoalId == null
                      ? "bg-slate-100"
                      : "hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedGoalId(null)}
                >
                  <div className="text-sm">No goal (unlink)</div>
                </li>

                {goals.map((g) => {
                  const gid = g.goal_id ?? g.id;
                  return (
                    <li
                      key={gid}
                      className={`p-2 cursor-pointer rounded mb-1 flex justify-between items-center ${
                        selectedGoalId === gid
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                      onClick={() => setSelectedGoalId(gid)}
                    >
                      <div>
                        <div className="font-medium">{g.name}</div>
                        <div className="text-xs text-slate-500">
                          Target: ₹
                          {Number(
                            g.target_amount ?? g.targetAmount ?? 0
                          ).toLocaleString()}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">
                        {selectedGoalId === gid ? "Selected" : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  // reset selection to original linked value
                  setSelectedGoalId(sip?.goal_id ?? sip?.goalId ?? null);
                }}
                className="px-3 py-2 border rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
