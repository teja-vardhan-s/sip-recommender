import { NAVHistoryRepository } from "../repositories/navHistoryRepository.js";
import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";

export const NAVHistoryService = {
    async getNavHistory(scheme_code, days = 365) {
        const fund = await MutualFundsRepository.findBySchemeCode(scheme_code);

        if (!fund) throw new Error("Fund not found");

        const history = await NAVHistoryRepository.getForScheme(scheme_code, days);

        // Transform for frontend graph format
        const formatted = history
            .map((nav) => ({
                date: nav.date.toISOString().split("T")[0],
                nav: Number(nav.nav),
            }))
            .reverse(); // newest last for graph readability

        return {
            scheme_code,
            fund_name: fund.fund_name,
            category: fund.category,
            total_points: formatted.length,
            data: formatted,
        };
    },

    async getRange(scheme_code, start, end) {
        const fund = await MutualFundsRepository.findBySchemeCode(scheme_code);
        if (!fund) throw new Error("Fund not found");

        const history = await NAVHistoryRepository.getRange(
            scheme_code,
            new Date(start),
            new Date(end)
        );

        const formatted = history.map((nav) => ({
            date: nav.date.toISOString().split("T")[0],
            nav: Number(nav.nav),
        }));

        return {
            scheme_code,
            fund_name: fund.fund_name,
            range: { start, end },
            data: formatted,
        };
    },
};
