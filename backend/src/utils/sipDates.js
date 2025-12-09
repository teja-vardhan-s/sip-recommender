/**
 * Utility for SIP date calculations.
 * - normalize: set to midnight
 * - addMonths/addDays: safe month/day arithmetic
 * - getNextSipDate(start_date, lastTxn, frequency)
 *
 * frequency: "Monthly" (default) | "Weekly" | "Quarterly"
 */

function clone(date) {
    return new Date(date.getTime());
}

function normalize(date) {
    const d = clone(date);
    d.setHours(0, 0, 0, 0);
    d.setMilliseconds(0);
    return d;
}

function addMonths(date, months) {
    const d = clone(date);
    const day = d.getDate();

    d.setMonth(d.getMonth() + months);

    // If month rolled over (e.g. Jan 31 -> Feb 31 becomes Mar 3 or similar),
    // fix by setting to last day of month when needed:
    if (d.getDate() < day) {
        d.setDate(0); // last day of previous month
    }

    return d;
}

function addDays(date, days) {
    const d = clone(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * getNextSipDate
 * @param {string|Date} start_date - original SIP start date
 * @param {object|null} lastTxn - optional last transaction object { txn_date: Date|string }
 * @param {string} frequency - Monthly | Weekly | Quarterly
 * @returns {Date} next due date (normalized to midnight)
 */
export function getNextSipDate(start_date, lastTxn = null, frequency = "Monthly") {
    if (!start_date) throw new Error("start_date required for getNextSipDate");

    const start = normalize(new Date(start_date));

    // If no last transaction, the next due is the start date (SIP hasn't started)
    if (!lastTxn) {
        return start;
    }

    const lastDate = normalize(new Date(lastTxn.txn_date));

    let next;
    switch ((frequency || "Monthly").toLowerCase()) {
        case "weekly":
            next = addDays(lastDate, 7);
            break;
        case "quarterly":
            next = addMonths(lastDate, 3);
            break;
        case "monthly":
        default:
            next = addMonths(lastDate, 1);
            break;
    }

    return normalize(next);
}
