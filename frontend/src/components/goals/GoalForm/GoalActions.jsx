export default function GoalActions({ logic }) {
  const { handleCalculate, handleClear, loading, calcResult, isEditing } =
    logic;

  return (
    <div className="flex items-center gap-2 mb-3">
      <button
        type="button"
        onClick={handleCalculate}
        className="px-3 py-2 border rounded"
      >
        Calculate
      </button>

      <button
        type="submit"
        disabled={loading}
        className="px-3 py-2 bg-indigo-600 text-white rounded"
      >
        {loading
          ? isEditing
            ? "Saving..."
            : "Creating..."
          : isEditing
          ? "Save Goal"
          : "Create Goal"}
      </button>

      <button
        type="button"
        onClick={handleClear}
        className="px-3 py-2 border rounded"
      >
        Clear
      </button>

      {calcResult != null && (
        <div className="ml-3 text-sm">
          Recommended SIP: <b>₹{calcResult.toLocaleString()}</b>/month
        </div>
      )}
    </div>
  );
}
