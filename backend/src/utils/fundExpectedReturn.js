export function expectedReturnFromFund(category, risk_level) {
    if (!category) return 0.08; // fallback

    const c = category.toLowerCase();
    const r = risk_level?.toLowerCase() || "";

    // Equity Funds
    if (c.includes("equity")) {
        if (r.includes("high")) return 0.12;
        if (r.includes("moderate")) return 0.10;
        return 0.08;
    }

    // Hybrid Funds
    if (c.includes("hybrid")) {
        if (r.includes("high")) return 0.10;
        if (r.includes("moderate")) return 0.08;
        return 0.07;
    }

    // Debt Funds
    if (c.includes("debt")) {
        return 0.06;
    }

    // ETFs (assume equity-like)
    if (c.includes("etf")) {
        return 0.10;
    }

    return 0.08;
}
