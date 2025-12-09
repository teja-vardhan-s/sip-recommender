export default function CategoryBreakdown({ allocation = {} }) {
  const entries = Object.entries(allocation); // [["ETF", 100], ...]

  if (!entries.length)
    return <div className="text-sm text-slate-500">No category data.</div>;

  return (
    <div className="mt-4 border-t pt-3">
      <h4 className="text-sm font-medium mb-2">Breakdown</h4>

      <table className="w-full text-sm">
        <tbody>
          {entries.map(([category, percent]) => (
            <tr key={category} className="border-b last:border-none">
              <td className="py-1">{category}</td>
              <td className="py-1 text-right font-medium">{percent}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
