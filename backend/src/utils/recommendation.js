export function scoreFund({ riskScore, categoryScore, returnScore, stabilityScore }) {
    // Weighted scoring → Adjust weights as needed
    return (
        riskScore * 0.30 +
        categoryScore * 0.25 +
        returnScore * 0.30 +
        stabilityScore * 0.15
    );
}

// Converts user risk profile to a numeric scale
export function riskLevelNumber(risk) {
    switch (risk) {
        case "Aggressive": return 3;
        case "Balanced": return 2;
        case "Conservative": return 1;
        default: return 2;
    }
}
