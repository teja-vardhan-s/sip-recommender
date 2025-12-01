export function calculateSipStatus({ start_date, amount, transactions }) {
    const start = new Date(start_date);
    const now = new Date();

    // Total months from start until now
    let expectedMonths =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());

    // If SIP started this month, expectedMonths = 1
    if (expectedMonths < 1) expectedMonths = 1;

    // Count actual installments
    const actualMonths = transactions.filter(
        (t) => t.txn_type === "SIP_INSTALLMENT"
    ).length;

    const missing = expectedMonths - actualMonths;

    let status = "ON_TRACK";
    if (missing === 1) status = "DELAYED";
    if (missing >= 2) status = "OFF_TRACK";

    return {
        expectedMonths,
        actualMonths,
        missingMonths: missing < 0 ? 0 : missing,
        status,
    };
}
