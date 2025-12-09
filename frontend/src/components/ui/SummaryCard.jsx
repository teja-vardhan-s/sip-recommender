export default function SummaryCard({ title, value }) {
  const formatted =
    typeof value === "number"
      ? new Intl.NumberFormat("en-IN").format(value)
      : value;
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold">₹{formatted}</div>
    </div>
  );
}
