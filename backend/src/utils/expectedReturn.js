export function expectedReturnFromRisk(risk_profile) {
    switch (risk_profile) {
        case "Conservative":
            return 0.06;
        case "Balanced":
            return 0.08;
        case "Aggressive":
            return 0.12;
        default:
            return 0.08;
    }
}
