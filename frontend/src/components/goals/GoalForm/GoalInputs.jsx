export default function GoalInputs({ logic }) {
  const {
    name,
    targetAmount,
    targetDate,
    expectedReturnRate,
    setName,
    setTargetAmount,
    setTargetDate,
    setExpectedReturnRate,
  } = logic;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
      <input
        className="border p-2 rounded"
        placeholder="Goal name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="number"
        className="border p-2 rounded"
        placeholder="Target amount (₹)"
        value={targetAmount}
        onChange={(e) => setTargetAmount(e.target.value)}
      />

      <input
        type="date"
        className="border p-2 rounded"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
      />

      <input
        type="number"
        step="0.01"
        className="border p-2 rounded"
        value={expectedReturnRate}
        placeholder="Expected return (0.08)"
        onChange={(e) => setExpectedReturnRate(e.target.value)}
      />
    </div>
  );
}
