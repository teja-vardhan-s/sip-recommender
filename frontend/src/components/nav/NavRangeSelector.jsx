export default function NavRangeSelector({ days, onChange }) {
  const choices = [
    { label: "1M", value: 30 },
    { label: "3M", value: 90 },
    { label: "6M", value: 180 },
    { label: "1Y", value: 365 },
    { label: "All", value: "all" },
  ];

  return (
    <div className="flex items-center gap-2">
      {choices.map((c) => (
        <button
          key={c.value}
          onClick={() => onChange(c.value)}
          className={`px-3 py-1 text-sm rounded ${
            String(days) === String(c.value)
              ? "bg-indigo-600 text-white"
              : "bg-slate-50"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
