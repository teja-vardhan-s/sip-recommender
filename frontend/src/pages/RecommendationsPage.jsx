import { useEffect, useState } from "react";
import api from "../utils/api";
import AddSipModal from "../components/sips/AddSipModal";
import WhyRecommendedModal from "../components/Recommendations/WhyRecommendedModal";

export default function RecommendationsPage() {
  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState([]);
  const [goalMonths, setGoalMonths] = useState(36);
  const [showSipAdd, setShowSipAdd] = useState(null); // recommended fund clicked
  const [selectedScheme, setSelectedScheme] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/recommendations?goalMonths=${goalMonths}`);
      // backend returns array of recommended funds
      const arr = res.data?.results ?? res.data ?? [];
      setRecs(arr);
    } catch (err) {
      console.error("Recommendation load failed:", err);
      setRecs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [goalMonths]);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Recommended Mutual Funds</h2>

      {/* Goal months filter */}
      <div className="flex items-center gap-3 mb-4">
        <label>Goal duration:</label>
        <select
          className="border p-2 rounded"
          value={goalMonths}
          onChange={(e) => setGoalMonths(Number(e.target.value))}
        >
          <option value={12}>1 year</option>
          <option value={24}>2 years</option>
          <option value={36}>3 years</option>
          <option value={60}>5 years</option>
          <option value={120}>10 years</option>
        </select>
        <button onClick={load} className="px-3 py-2 border rounded">
          Refresh
        </button>
      </div>

      {loading ? (
        <div>Loading recommendations...</div>
      ) : recs.length === 0 ? (
        <div>No recommendations available.</div>
      ) : (
        <div className="grid gap-4 overflow-auto max-h-[75vh]">
          {recs.map((fund, idx) => (
            <div
              key={fund.scheme_code}
              className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between"
            >
              <div>
                <div className="font-semibold text-lg">
                  {idx + 1}. {fund.fund_name}
                </div>
                <div className="text-sm text-slate-600">
                  Category: {fund.category}
                </div>
                <div className="text-sm text-slate-600">
                  Risk level: {fund.risk_level}
                </div>
                <div className="text-sm mt-2">
                  1-year return: <b>{fund.one_year_return}%</b>
                </div>
                <div className="text-sm">
                  Volatility: <b>{fund.volatility}</b>
                </div>
                <div className="text-sm mt-2">
                  Final score: <b className="text-indigo-600">{fund.score}</b>
                </div>
              </div>

              <div className="flex items-center mt-4 md:mt-0">
                <button
                  className="px-3 py-2 bg-indigo-600 text-white rounded"
                  onClick={() => setShowSipAdd(fund)}
                >
                  Start SIP
                </button>
                <span className="mx-3 text-slate-500">|</span>
                <button onClick={() => setSelectedScheme(fund.scheme_code)}>
                  Why?
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSipAdd && (
        <AddSipModal
          goalMonths={goalMonths}
          onClose={() => setShowSipAdd(null)}
          onCreated={() => {
            setShowSipAdd(null);
            alert("SIP created!");
          }}
          presetFund={showSipAdd} // custom prop to auto-fill fund details
        />
      )}
      {selectedScheme && (
        <WhyRecommendedModal
          schemeCode={selectedScheme}
          onClose={() => setSelectedScheme(null)}
        />
      )}
    </div>
  );
}
