export function calculateSipStatus({ start_date, amount, transactions }) {
    const start = new Date(start_date);
    const now = new Date();

    // Total months from start until now
    let expectedMonths =
        (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth());

    // If SIP started this month, expectedMonths = 1
    if (expectedMonths < 1) expectedMonths = 1;

    // Count actual successful installments (only SUCCESS status)
    const successfulTransactions = transactions.filter(
        (t) => t.txn_type === "SIP_INSTALLMENT" && t.status === "SUCCESS"
    );
    const actualMonths = successfulTransactions.length;

    // Count pending/delayed transactions
    const pendingTransactions = transactions.filter(
        (t) => t.txn_type === "SIP_INSTALLMENT" && t.status === "PENDING"
    ).length;

    // Count failed/skipped transactions
    const failedTransactions = transactions.filter(
        (t) => t.txn_type === "SIP_INSTALLMENT" &&
            (t.status === "FAILED" || t.status === "SKIPPED")
    ).length;

    // Missing months = Expected - Successful - Pending
    const missing = expectedMonths - actualMonths - pendingTransactions;

    let status = "ON_TRACK";
    if (missing === 1) status = "DELAYED";
    if (missing >= 2) status = "OFF_TRACK";

    // Override status if there are failed transactions
    if (failedTransactions > 0) status = "FAILED";

    return {
        expectedMonths,
        actualMonths,
        pendingMonths: pendingTransactions,
        failedMonths: failedTransactions,
        missingMonths: missing < 0 ? 0 : missing,
        status,
    };
}
