import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";
import { NAVHistoryRepository } from "../repositories/navHistoryRepository.js";
import { scoreFund, riskLevelNumber } from "../utils/recommendation.js";

/**
 * RecommendationService
 *
 * getRecommendations(user, goalMonths) -> top N scored funds (brief)
 * getRecommendationDetails(scheme_code, userRiskProfile, goalMonths) -> detailed breakdown for a single fund
 *
 * Notes:
 * - Scores are numeric (not strings)
 * - We tolerate per-fund failures and skip those funds
 * - NAV history ordering is handled robustly (we detect ordering)
 */

const MAX_CONCURRENCY = 8; // tweak if DB can handle more

function chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

function ensureNavOrder(history) {
    // Accept either asc (oldest -> newest) or desc (newest -> oldest)
    // Normalize to [oldest, ..., newest]
    if (!history || history.length === 0) return history;
    const firstDate = new Date(history[0].date).getTime();
    const lastDate = new Date(history[history.length - 1].date).getTime();
    if (firstDate <= lastDate) return history; // already oldest->newest
    return history.slice().reverse();
}

export const RecommendationService = {
    /**
     * Calculate recommendation scores for top funds.
     * Returns array of { scheme_code, fund_name, category, risk_level, one_year_return, volatility, score }
     */
    async getRecommendations(user, goalMonths = 36, topN = 10) {
        const userRiskProfile = user?.risk_profile ?? "Balanced";
        const userRisk = riskLevelNumber(userRiskProfile);

        const funds = await MutualFundsRepository.findAll();
        if (!funds || funds.length === 0) return [];

        const scored = [];

        // We will process funds in chunks to limit concurrency
        const chunks = chunkArray(funds, MAX_CONCURRENCY);

        for (const chunk of chunks) {
            // map chunk to promises so we process multiple funds concurrently
            const promises = chunk.map(async (fund) => {
                try {
                    // fetch NAV history (limit 365 days)
                    const rawHistory = await NAVHistoryRepository.getForScheme(
                        fund.scheme_code,
                        365
                    );

                    if (!rawHistory || (rawHistory.length < 30 && process.env.NODE_ENV === "production")) {
                        // skip funds with insufficient data (30 datapoints ~ 1 month)
                        return null;
                    }

                    // normalize order to oldest -> newest
                    const history = ensureNavOrder(rawHistory);

                    // compute simple 1-year return using oldest vs newest in the slice
                    // protect against zero/invalid values
                    const oldestNav = Number(history[0]?.nav ?? 0);
                    const newestNav = Number(history[history.length - 1]?.nav ?? 0);
                    const return1yr =
                        oldestNav > 0 ? ((newestNav - oldestNav) / oldestNav) * 100 : 0;

                    // volatility (std dev)
                    const navNums = history.map((h) => Number(h.nav) || 0);
                    const avg =
                        navNums.reduce((s, v) => s + v, 0) / Math.max(navNums.length, 1);
                    const variance =
                        navNums.reduce((s, v) => s + (v - avg) ** 2, 0) /
                        Math.max(navNums.length, 1);
                    const volatility = Math.sqrt(variance);

                    // category score heuristic
                    let categoryScore = 0;
                    if (goalMonths > 60 && (fund.category || "").toLowerCase().includes("equity"))
                        categoryScore = 3;
                    else if (
                        goalMonths <= 60 &&
                        goalMonths >= 24 &&
                        (fund.category || "").toLowerCase().includes("hybrid")
                    )
                        categoryScore = 3;
                    else if (goalMonths < 24 && (fund.category || "").toLowerCase().includes("debt"))
                        categoryScore = 3;

                    // risk compatibility heuristic
                    let riskScore = 0;
                    const fr = (fund.risk_level || "").toLowerCase();
                    const ur = (userRiskProfile || "").toLowerCase();
                    if (fr === "high" && ur === "aggressive") riskScore = 3;
                    else if (fr === "moderate" && ur === "balanced") riskScore = 3;
                    else if (fr === "low" && ur === "conservative") riskScore = 3;

                    // return score (buckets)
                    const returnScore = return1yr > 12 ? 3 : return1yr > 6 ? 2 : 1;

                    // stability score: lower volatility is better
                    const stabilityScore = volatility < 5 ? 3 : volatility < 10 ? 2 : 1;

                    const finalScore = scoreFund({
                        riskScore,
                        categoryScore,
                        returnScore,
                        stabilityScore,
                    });

                    return {
                        scheme_code: fund.scheme_code,
                        fund_name: fund.fund_name,
                        category: fund.category,
                        risk_level: fund.risk_level,
                        one_year_return: Number(return1yr.toFixed(2)),
                        volatility: Number(volatility.toFixed(4)),
                        score: Number(finalScore.toFixed(4)),
                    };
                } catch (e) {
                    // per-fund errors are logged and skipped
                    console.warn(`Recommendation: skipping fund ${fund.scheme_code}:`, e?.message ?? e);
                    return null;
                }
            });

            // await chunk batch
            const results = await Promise.all(promises);
            for (const r of results) if (r) scored.push(r);
        }

        // sort (desc) and return topN
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, topN);
    },

    /**
     * Return detailed breakdown for a single fund (explainability).
     * Useful for "Why recommended?" UI.
     */
    async getRecommendationDetails(scheme_code, userRiskProfile = "Balanced", goalMonths = 36) {
        if (!scheme_code) throw new Error("scheme_code required");

        const fund = await MutualFundsRepository.findBySchemeCode(scheme_code);
        if (!fund) throw new Error("Fund not found");

        const rawHistory = await NAVHistoryRepository.getForScheme(scheme_code, 365);
        if (!rawHistory || (rawHistory.length < 10 && process.env.NODE_ENV === "production")) {
            return {
                available: false,
                scheme_code,
                fund_name: fund.fund_name,
                reason: "Insufficient NAV history to compute detailed metrics",
            };
        }


        const history = ensureNavOrder(rawHistory);

        const oldestNav = Number(history[0]?.nav ?? 0);
        const newestNav = Number(history[history.length - 1]?.nav ?? 0);
        const return1yr = oldestNav > 0 ? ((newestNav - oldestNav) / oldestNav) * 100 : 0;

        const navNums = history.map((h) => Number(h.nav) || 0);
        const avg = navNums.reduce((s, v) => s + v, 0) / Math.max(navNums.length, 1);
        const variance = navNums.reduce((s, v) => s + (v - avg) ** 2, 0) / Math.max(navNums.length, 1);
        const volatility = Math.sqrt(variance);

        // same scoring heuristics as getRecommendations
        let categoryScore = 0;
        if (goalMonths > 60 && (fund.category || "").toLowerCase().includes("equity")) categoryScore = 3;
        else if (goalMonths <= 60 && goalMonths >= 24 && (fund.category || "").toLowerCase().includes("hybrid")) categoryScore = 3;
        else if (goalMonths < 24 && (fund.category || "").toLowerCase().includes("debt")) categoryScore = 3;

        let riskScore = 0;
        const fr = (fund.risk_level || "").toLowerCase();
        const ur = (userRiskProfile || "").toLowerCase();
        if (fr === "high" && ur === "aggressive") riskScore = 3;
        else if (fr === "moderate" && ur === "balanced") riskScore = 3;
        else if (fr === "low" && ur === "conservative") riskScore = 3;

        const returnScore = return1yr > 12 ? 3 : return1yr > 6 ? 2 : 1;
        const stabilityScore = volatility < 5 ? 3 : volatility < 10 ? 2 : 1;

        const weights = {
            risk: 0.30,
            category: 0.25,
            returns: 0.30,
            stability: 0.15,
        };

        const finalScore = scoreFund({ riskScore, categoryScore, returnScore, stabilityScore });

        return {
            available: true,
            scheme_code,
            fund_name: fund.fund_name,
            category: fund.category,
            risk_level: fund.risk_level,
            metrics: {
                one_year_return_pct: Number(return1yr.toFixed(2)),
                volatility: Number(volatility.toFixed(4)),
                nav_points: history.length,
            },
            scores: {
                riskScore,
                categoryScore,
                returnScore,
                stabilityScore,
            },
            weights,
            finalScore: Number(finalScore.toFixed(4)),
            explanation:
                "Final score is a weighted sum of risk compatibility, category fit, recent returns and stability (lower volatility). Use this to compare funds at a glance.",
        };
    },
};

export default RecommendationService;
