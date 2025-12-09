import { useEffect, useState } from "react";
import api from "../utils/api";
import SummaryCard from "../components/ui/SummaryCard";
import RecentSipsList from "../components/dashboard/RecentSipsList";
import AddSipModal from "../components/sips/AddSipModal";
import CategoryPieChart from "../components/charts/CategoryPieChart";
import CategoryBreakdown from "../components/charts/CategoryBreakdown";
import PortfolioLineChart from "../components/charts/PortfolioLineChart";
import SipHealthBar from "../components/charts/SipHealthBar";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [recentSips, setRecentSips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // modal state
  const [showAdd, setShowAdd] = useState(false);
  const [editSip, setEditSip] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    // helper to normalize sips response shapes
    const normalizeSips = (resData) => {
      // many possible shapes: array, { data: [] }, { sips: [] }, { sips: { data: [] } }
      if (!resData) return [];
      if (Array.isArray(resData)) return resData;
      if (Array.isArray(resData.data)) return resData.data;
      if (Array.isArray(resData.sips)) return resData.sips;
      if (Array.isArray(resData.sips?.data)) return resData.sips.data;
      return [];
    };

    Promise.all([
      api
        .get("/portfolio/summary")
        .then((r) => r.data?.data ?? r.data?.summary ?? r.data ?? null)
        .catch(() => null),
      api
        .get("/sips/tracking")
        .then((r) => r.data?.data ?? r.data ?? [])
        .catch(() =>
          api.get("/sips").then((r) => r.data?.data ?? r.data ?? [])
        ),
    ])
      .then(([summaryRes, sipsRes]) => {
        if (!mounted) return;
        setSummary(summaryRes);
        const sipsArray = normalizeSips(sipsRes);
        setRecentSips(sipsArray.slice(0, 6));
      })
      .catch((e) => {
        console.error("Dashboard load error", e);
        if (!mounted) return;
        setErr(e);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => (mounted = false);
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (err)
    return (
      <div className="text-red-600">
        Failed to load dashboard: {err.message || err.toString()}
      </div>
    );

  // called when AddSipModal returns created sip
  const handleSipCreated = (newSip) => {
    // If server returned wrapper, try to unwrap
    const sip = newSip?.sip ?? newSip?.data ?? newSip;
    if (!sip) {
      // fallback: re-fetch the sips list (simple)
      api
        .get("/sips")
        .then((r) => {
          const arr = r.data?.data ?? r.data ?? [];
          setRecentSips(arr.slice(0, 6));
        })
        .catch(() => {});
      setShowAdd(false);
      return;
    }

    // prepend to recentSips (unique by investment_id / scheme_code)
    setRecentSips((prev) => {
      const key = sip.investment_id ?? sip.id ?? sip.scheme_code;
      const filtered = prev.filter((p) => {
        const pk = p.investment_id ?? p.id ?? p.scheme_code;
        return pk !== key;
      });
      return [sip, ...filtered].slice(0, 6);
    });
    setShowAdd(false);
  };

  // called when AddSipModal updates an existing sip
  const handleSipUpdated = (updated) => {
    const sip = updated?.sip ?? updated?.data ?? updated;
    if (!sip) {
      setShowAdd(false);
      return;
    }
    setRecentSips((prev) =>
      prev.map((p) => {
        const pk = p.investment_id ?? p.id ?? p.scheme_code;
        const uk = sip.investment_id ?? sip.id ?? sip.scheme_code;
        return pk === uk ? sip : p;
      })
    );
    setEditSip(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-3">Portfolio Summary</h2>

        <div className="space-y-2">
          <button
            onClick={() => {
              setEditSip(null);
              setShowAdd(true);
            }}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Add SIP
          </button>

          <button
            onClick={() => window.location.assign("/goals")}
            className="mx-2 px-3 py-2 border rounded"
          >
            Plan a Goal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <SummaryCard
          title="Total Invested"
          value={summary?.totals?.totalInvested ?? 0}
        />
        <SummaryCard
          title="Current Value"
          value={summary?.totals?.totalCurrentValue ?? 0}
        />
        <SummaryCard title="Total Gain" value={summary?.totals?.gains ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-3">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-3">Recent SIPs</h3>
          <RecentSipsList sips={recentSips ?? []} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">SIP Health</h3>
          <SipHealthBar sipSummary={summary?.sipSummary ?? {}} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Allocation</h3>
          <CategoryPieChart allocation={summary?.categoryAllocation ?? {}} />

          <CategoryBreakdown allocation={summary?.categoryAllocation ?? {}} />
        </div>

        <div className="bg-white p-4 rounded shadow col-span-1 lg:col-span-2">
          <h3 className="font-medium mb-2">Portfolio Trend</h3>
          <PortfolioLineChart
            history={summary?.history ?? []}
            fallbackSummary={summary}
          />
        </div>
      </div>

      {/* Add / Edit SIP Modal */}
      {showAdd && (
        <AddSipModal
          onClose={() => setShowAdd(false)}
          onCreated={handleSipCreated}
          onUpdated={handleSipUpdated}
          sip={editSip}
        />
      )}
    </div>
  );
}
