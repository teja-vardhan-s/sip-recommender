import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "../utils/api";
import NavRangeSelector from "../components/nav/NavRangeSelector";

/**
 * Props:
 *  - schemeCode (optional) : string - if not provided, will read from route param :scheme_code
 *
 * Example usage:
 *  <NavHistoryPage schemeCode="114456" />
 *  or route: /funds/:scheme_code -> <NavHistoryPage />
 */
export default function NavHistoryPage() {
  const params = useParams();
  const schemeCode = params.scheme_code;

  const [days, setDays] = useState(365); // default 1 year
  const [data, setData] = useState([]);
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // derived API path
  const apiPath = useMemo(() => {
    if (!schemeCode) return null;
    // If you prefer range endpoint use `/api/nav/${schemeCode}/range?start=...&end=...`
    return `/nav/${encodeURIComponent(schemeCode)}?days=${
      days === "all" ? 10000 : days
    }`;
  }, [schemeCode, days]);

  useEffect(() => {
    let mounted = true;
    if (!apiPath) return;

    setLoading(true);
    setErr(null);

    api
      .get(apiPath)
      .then((res) => {
        if (!mounted) return;
        // API returns { success: true, scheme_code, fund_name, category, total_points, data: [...] }
        // Different backends sometimes return wrapped or not; handle both
        const result = res.data;

        // Extract fields
        const fetchedData =
          result?.data ?? (result?.data === undefined ? result : null);

        // If API returned top-level fields (scheme_code, fund_name)
        const fundName = result?.fund_name ?? null;
        const category = result?.category ?? null;

        // Normalize the chart data: expect array of { date: 'YYYY-MM-DD', nav: Number }
        const chart = Array.isArray(fetchedData)
          ? fetchedData.map((d) => ({
              date: d.date,
              nav: Number(d.nav),
            }))
          : [];

        setFund(
          fundName
            ? { scheme_code: schemeCode, fund_name: fundName, category }
            : null
        );
        setData(chart);
      })
      .catch((e) => {
        console.error("Failed to load NAV history", e);
        setErr(e);
        setData([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiPath, schemeCode]);

  if (!schemeCode) {
    return (
      <div className="p-4 bg-white rounded shadow">No scheme selected.</div>
    );
  }

  const propFundName = fund ? fund.fund_name : null;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            NAV History {fund ? `— ${fund.fund_name}` : `(${schemeCode})`}
          </h2>
          {fund?.category && (
            <div className="text-sm text-slate-500">{fund.category}</div>
          )}
          <div className="text-xs text-slate-400 mt-1">
            Scheme code: {schemeCode}
            <br />
            Fund Name: {propFundName ?? (fund ? fund.fund_name : "N/A")}
          </div>
        </div>

        <div className="justify-center ">
          <div className="flex items-center gap-3">
            <NavRangeSelector days={days} onChange={(d) => setDays(d)} />
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={() => window.history.back()}
              className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 text-sm mt-2"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        {loading ? (
          <div>Loading NAV history...</div>
        ) : err ? (
          <div className="text-red-600">
            Failed to load NAV: {err.message ?? String(err)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-slate-500">
            No NAV history available for this fund.
          </div>
        ) : (
          <div className="w-full h-72 ">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  domain={["dataMin", "dataMax"]}
                  tick={{ fontSize: 13 }}
                />
                <Tooltip
                  contentStyle={{ fontSize: "14px" }}
                  formatter={(value) => `₹${Number(value).toFixed(4)}`}
                />
                <Line
                  type="monotone"
                  dataKey="nav"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* quick stats */}
        {!loading && !err && data.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-700">
            <div>
              <div className="text-xs text-slate-500">Points</div>
              <div className="font-medium">{data.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Latest NAV</div>
              <div className="font-medium">
                ₹{Number(data[data.length - 1].nav).toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Change</div>
              <div className="font-medium">
                {(() => {
                  const first = data[0].nav;
                  const last = data[data.length - 1].nav;
                  const pct = ((last - first) / first) * 100;
                  const sign = pct >= 0 ? "+" : "";
                  return `${sign}${pct.toFixed(2)}%`;
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
