import FundSearchField from "../../funds/FundSearchField";

export default function SipConfig({ logic }) {
  const {
    createSIP,
    setCreateSIP,
    calcResult,
    fund,
    sipAmount,
    sipStart,
    monthsNeeded,
    setSipAmount,
    setSipStart,
    setFund,
    expectedReturnRate,
  } = logic;

  return (
    <>
      <label className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={createSIP}
          onChange={(e) => {
            if (e.target.checked && !calcResult) {
              alert("Please calculate recommended SIP first.");
              return;
            }
            setCreateSIP(e.target.checked);
          }}
        />
        Create SIP for this goal?
      </label>

      {createSIP && (
        <div className="p-3 border rounded bg-slate-50">
          <FundSearchField initial={fund} onSelect={(f) => setFund(f)} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <input
              type="number"
              className="border p-2 rounded"
              value={sipAmount}
              onChange={(e) => setSipAmount(e.target.value)}
            />

            <input
              type="date"
              className="border p-2 rounded"
              value={sipStart}
              onChange={(e) => setSipStart(e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  );
}
