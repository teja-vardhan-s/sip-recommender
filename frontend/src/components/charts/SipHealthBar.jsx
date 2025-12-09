import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEffect, useState } from "react";

/*
  Expects sipSummary: { total, onTrack, delayed, offTrack }
  We'll show counts stacked or grouped
*/
export default function SipHealthBar({ sipSummary }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [
    {
      name: "SIPs",
      OnTrack: sipSummary?.onTrack ?? 0,
      Delayed: sipSummary?.delayed ?? 0,
      OffTrack: sipSummary?.offTrack ?? 0,
    },
  ];
  if (!mounted) {
    // placeholder box keeps layout stable so ResponsiveContainer later gets dimensions
    return <div className="w-full h-40" />;
  }

  return (
    <div className="w-full h-75 min-h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="OnTrack" stackId="a" fill="#10B981" />
          <Bar dataKey="Delayed" stackId="a" fill="#F59E0B" />
          <Bar dataKey="OffTrack" stackId="a" fill="#EF4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
