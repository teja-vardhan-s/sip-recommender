import { InvestmentRepository } from "../repositories/investmentRepository.js";
import { TransactionsRepository } from "../repositories/transactionsRepository.js";
import { calculateSipStatus } from "../utils/sipTracker.js";

export const SipTrackingService = {
    async getSipStatus(investment_id, user_id) {
        const inv = await InvestmentRepository.findById(investment_id);

        if (!inv || inv.user_id !== user_id) {
            throw new Error("SIP not found");
        }

        const transactions = await TransactionsRepository.findForInvestment(investment_id);

        const status = calculateSipStatus({
            start_date: inv.start_date,
            amount: inv.invested_amount,
            transactions,
        });

        return {
            investment_id,
            scheme_code: inv.scheme_code,
            invested_amount: inv.invested_amount,
            ...status,
        };
    },

    async getAllSipsForUser(user_id) {
        const sips = await InvestmentRepository.findSipsForUser(user_id);

        const result = [];
        for (const inv of sips) {
            const transactions = await TransactionsRepository.findForInvestment(inv.investment_id);

            const status = calculateSipStatus({
                start_date: inv.start_date,
                amount: inv.invested_amount,
                transactions,
            });

            result.push({
                investment_id: inv.investment_id,
                scheme_code: inv.scheme_code,
                invested_amount: inv.invested_amount,
                ...status,
            });
        }

        return result;
    },
};
