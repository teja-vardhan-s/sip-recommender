// src/utils/goalCalc.js
/**
 * Calculate monthly SIP required to reach `targetAmount` in `months` at annual expectedReturn.
 * expectedReturn is annual decimal (e.g. 0.12 for 12%)
 *
 * Formula:
 *   FV = SIP * [ ((1+r)^n - 1) / r ] * (1 + r)
 * => SIP = FV / ( ((1+r)^n - 1)/r * (1+r) )
 *
 * r = monthly rate = annual / 12
 */
export function calculateMonthlySIP({ targetAmount, months, annualReturn }) {
    if (!months || months <= 0) throw new Error("Invalid months");
    const r = (annualReturn || 0) / 12;

    // when r == 0 => SIP = FV / n
    if (Math.abs(r) < 1e-12) {
        return Number((targetAmount / months).toFixed(2));
    }

    const factor = (Math.pow(1 + r, months) - 1) / r;
    const sip = targetAmount / (factor * (1 + r));
    return Number(sip.toFixed(2)); // round to 2 decimals
}

/**
 * helper to compute months between today and a target date (round up)
 */
export function monthsBetweenDates(fromDate, toDate) {
    const f = new Date(fromDate);
    const t = new Date(toDate);
    const years = t.getFullYear() - f.getFullYear();
    const months = t.getMonth() - f.getMonth();
    const days = t.getDate() - f.getDate();
    let totalMonths = years * 12 + months;
    if (days > 0) totalMonths += 1; // round partial month up
    return Math.max(0, totalMonths);
}
