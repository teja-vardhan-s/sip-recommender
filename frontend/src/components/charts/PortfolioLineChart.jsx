import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/*
  Props:
    history: [
      { date: "2025-10-01", totalValue: 12000 },
      { date: "2025-11-01", totalValue: 12500 },
      ...
    ]
    fallbackSummary: optional, the full portfolio summary object returned by /api/portfolio/summary
      (used only to synthesize a tiny fallback series if no history is available)
*/
function formatINR(v) {
  if (typeof v !== "number") return v;
  return v.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function shortDateLabel(d) {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { month: "short", day: "2-digit" }); // "13 Nov"
  } catch {
    return d;
  }
}

export default function PortfolioLineChart({
  history = [],
  fallbackSummary = null,
}) {
  // Normalize & sort input
  const normalized = Array.isArray(history) ? history.slice() : [];
  normalized.sort((a, b) => new Date(a.date) - new Date(b.date));

  // If no real history, try to synthesize minimal two-point series using totals or detailed data
  let data = normalized;
  let synthesized = false;
  if (!data.length && fallbackSummary) {
    // Use totals (today) and a synthetic point 1 month ago (approx)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const todayValue = Number(fallbackSummary?.totals?.totalCurrentValue ?? 0);

    // 1 month ago: try to approximate by subtracting contributions (not accurate but better than empty)
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthStr = oneMonthAgo.toISOString().slice(0, 10);

    // If detailed breakdown available, use that to create a rough previous value by subtracting any recent paid installments.
    // For simplicity we just create small variation if today's value exists
    const prevVal = Math.max(0, Math.round(todayValue * 0.98)); // assume small growth/decline
    data = [
      { date: oneMonthStr, totalValue: prevVal },
      { date: todayStr, totalValue: todayValue },
    ];
    synthesized = true;
  }

  if (!data.length)
    return <div className="text-sm text-slate-500">No history to plot</div>;

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 40, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={shortDateLabel}
            interval="preserveStartEnd"
            minTickGap={10}
          />
          <YAxis
            tickFormatter={(v) =>
              // show number with comma separators (no currency symbol on axis)
              Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })
            }
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            formatter={(value) => formatINR(Number(value))}
            labelFormatter={(label) => {
              try {
                const dt = new Date(label);
                return dt.toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                });
              } catch {
                return label;
              }
            }}
            wrapperStyle={{ zIndex: 9999 }}
          />
          <Line
            type="monotone"
            dataKey="totalValue"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {synthesized && (
        <div className="mt-2 text-xs text-slate-500">
          (Showing a simple estimate because detailed history is not available.)
        </div>
      )}
    </div>
  );
}
