/**
 * Future value of a SIP:
 * M = monthly investment
 * r = monthly interest rate
 * n = months
 *
 * FV = M * [ ((1+r)^n - 1) / r ] * (1 + r)
 */
export function sipFutureValue(M, annualReturn, months) {
    const r = annualReturn / 12;

    if (r === 0) return M * months;

    const factor = (Math.pow(1 + r, months) - 1) / r;
    return M * factor * (1 + r);
}

/**
 * Generates a month-by-month projection series for graphing.
 */
export function generateProjectionSeries(M, annualReturn, monthsTotal) {
    const series = [];
    const r = annualReturn / 12;
    let fv = 0;

    for (let m = 1; m <= monthsTotal; m++) {
        fv = sipFutureValue(M, annualReturn, m);
        series.push({
            month: m,
            value: Number(fv.toFixed(2)),
        });
    }

    return series;
}
