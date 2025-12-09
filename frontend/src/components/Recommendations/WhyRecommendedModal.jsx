import { useEffect, useState } from "react";
import api from "../../utils/api";
import { X } from "react-feather";

export default function WhyRecommendedModal({ schemeCode, onClose }) {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!schemeCode) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(
          `/recommendations/${encodeURIComponent(schemeCode)}`
        );
        if (cancelled) return;
        setDetails(res.data?.explanation ?? res.data ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error("Recommendation details load error:", e);
        setError(
          e?.response?.data?.error?.message ??
            e.message ??
            "Failed to load details"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [schemeCode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Why recommended?</h3>
            <div className="text-sm text-slate-500">
              Fund: <span className="font-medium">{schemeCode}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="text-center py-6 text-slate-600">
              Loading details…
            </div>
          )}

          {error && (
            <div className="text-center py-6 text-red-600">{error}</div>
          )}

          {!loading && !error && !details && (
            <div className="text-center py-6 text-slate-600">
              No details available.
            </div>
          )}

          {!loading && details && details.available === false && (
            <div className="text-sm text-slate-700">
              <div className="mb-2 font-medium">
                {details.fund_name ?? schemeCode}
              </div>
              <div className="text-xs text-slate-500">{details.reason}</div>
            </div>
          )}

          {!loading && details && details.available === true && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500">Fund</div>
                    <div className="font-medium">{details.fund_name}</div>
                    <div className="text-xs text-slate-500">
                      {details.category} • Risk: {details.risk_level ?? "N/A"}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      One-year return
                    </div>
                    <div className="font-medium">
                      {Number(details.metrics.one_year_return_pct ?? 0).toFixed(
                        2
                      )}
                      %
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Volatility (σ)</div>
                    <div className="font-medium">
                      {Number(details.metrics.volatility ?? 0).toFixed(4)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">
                      NAV data points
                    </div>
                    <div className="font-medium">
                      {details.metrics.nav_points ?? 0}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      Scores (0–3 scale)
                    </div>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1">
                        <div className="text-xs text-slate-500">Risk fit</div>
                        <div className="font-medium">
                          {details.scores.riskScore}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500">
                          Category fit
                        </div>
                        <div className="font-medium">
                          {details.scores.categoryScore}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500">
                          Recent returns
                        </div>
                        <div className="font-medium">
                          {details.scores.returnScore}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-slate-500">Stability</div>
                        <div className="font-medium">
                          {details.scores.stabilityScore}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Weights</div>
                    <div className="text-sm text-slate-600">
                      risk: {(details.weights?.risk * 100).toFixed(0)}% •
                      category: {(details.weights?.category * 100).toFixed(0)}%
                      • returns: {(details.weights?.returns * 100).toFixed(0)}%
                      • stability:{" "}
                      {(details.weights?.stability * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Final score</div>
                    <div className="text-2xl font-bold">
                      {Number(details.finalScore ?? 0).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-slate-500">Explanation</div>
                <div className="mt-2 text-sm text-slate-700">
                  {details.explanation ??
                    "This recommendation is based on a weighted score of risk compatibility, category fit, recent returns and stability (lower volatility preferred)."}
                </div>
              </div>

              {details.comparison && (
                <div className="mt-4">
                  <div className="text-xs text-slate-500">Comparison</div>
                  <pre className="text-xs bg-slate-50 p-2 rounded text-slate-700 overflow-auto">
                    {JSON.stringify(details.comparison, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 border rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
