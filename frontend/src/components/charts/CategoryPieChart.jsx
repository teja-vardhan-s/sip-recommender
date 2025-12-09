import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#6366F1",
  "#06B6D4",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
];

export default function CategoryPieChart({ allocation }) {
  // allocation: { ETF: 100, Equity: 40, Debt: 60, ... }
  const data = Object.entries(allocation || {}).map(([name, value]) => ({
    name,
    value: Number(value),
  }));

  if (!data.length)
    return <div className="text-sm text-slate-500">No allocation data</div>;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={36}
            outerRadius={72}
            paddingAngle={4}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend verticalAlign="bottom" height={32} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
