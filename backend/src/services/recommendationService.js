import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";
import { NAVHistoryRepository } from "../repositories/navHistoryRepository.js";
import { scoreFund, riskLevelNumber } from "../utils/recommendation.js";

export const RecommendationService = {

    async getRecommendations(user, goalMonths = 36) {
        const userRisk = riskLevelNumber(user.risk_profile);

        // Step 1: Get all funds
        const funds = await MutualFundsRepository.findAll();

        const scored = [];

        for (const fund of funds) {
            // Skip funds with missing data
            const history = await NAVHistoryRepository.getForScheme(fund.scheme_code, 365);
            if (history.length < 180) continue; // need at least 6 months data

            // Step 2: Calculate simple returns
            const firstNAV = Number(history[0].nav);
            const lastNAV = Number(history[history.length - 1].nav);
            const return1yr = ((lastNAV - firstNAV) / firstNAV) * 100;

            // Step 3: Calculate crude volatility (Std deviation simplified)
            const avgNAV = history.reduce((s, h) => s + Number(h.nav), 0) / history.length;
            const variance = history.reduce((s, h) => {
                const diff = Number(h.nav) - avgNAV;
                return s + diff * diff;
            }, 0) / history.length;

            const volatility = Math.sqrt(variance);

            // Step 4: Calculate category match score
            let categoryScore = 0;
            if (goalMonths > 60 && fund.category === "Equity") categoryScore = 3;
            else if (goalMonths <= 60 && goalMonths >= 24 && fund.category === "Hybrid") categoryScore = 3;
            else if (goalMonths < 24 && fund.category === "Debt") categoryScore = 3;

            // Step 5: Risk compatibility score
            let riskScore = 0;
            if (fund.risk_level === "High" && user.risk_profile === "Aggressive") riskScore = 3;
            else if (fund.risk_level === "Moderate" && user.risk_profile === "Balanced") riskScore = 3;
            else if (fund.risk_level === "Low" && user.risk_profile === "Conservative") riskScore = 3;

            // Step 6: Return score based on 1-year returns
            let returnScore = return1yr > 12 ? 3 : return1yr > 6 ? 2 : 1;

            // Step 7: Stability score: lower volatility is better
            let stabilityScore = volatility < 5 ? 3 : volatility < 10 ? 2 : 1;

            const finalScore = scoreFund({
                riskScore,
                categoryScore,
                returnScore,
                stabilityScore
            });

            scored.push({
                scheme_code: fund.scheme_code,
                fund_name: fund.fund_name,
                category: fund.category,
                risk_level: fund.risk_level,
                one_year_return: return1yr.toFixed(2),
                volatility: volatility.toFixed(2),
                score: finalScore.toFixed(4),
            });
        }

        // Sort by descending score ⇒ best first
        scored.sort((a, b) => b.score - a.score);

        // Return top 10
        return scored.slice(0, 10);
    },

};
