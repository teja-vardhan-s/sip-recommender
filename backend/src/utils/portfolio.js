export function calculateInvestmentValue(units, nav) {
    return Number((units * nav).toFixed(2));
}

export function calculateAbsoluteReturn(current, invested) {
    if (invested === 0) return 0;
    return Number((((current - invested) / invested) * 100).toFixed(2));
}

export function sumAmounts(items, field) {
    return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}
