import { InvestmentRepository } from "../repositories/investmentRepository.js";
import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";
import { TransactionsRepository } from "../repositories/transactionsRepository.js";
import { calculateInvestmentValue, calculateAbsoluteReturn } from "../utils/portfolio.js";
import { calculateSipStatus } from "../utils/sipTracker.js";

export const PortfolioService = {

    async getSummary(user_id) {
        // Fetch all SIP investments
        const investments = await InvestmentRepository.findSipsForUser(user_id);

        let totalInvested = 0;
        let totalCurrentValue = 0;

        const categoryMap = {}; // { Equity: x, Debt: y, Hybrid: z }

        const sipSummary = {
            total: investments.length,
            onTrack: 0,
            delayed: 0,
            offTrack: 0,
        };

        const detailed = [];

        for (const inv of investments) {

            // Fetch fund info
            const fund = await MutualFundsRepository.findBySchemeCode(inv.scheme_code);

            // Fetch all transactions for this SIP
            const txns = await TransactionsRepository.findForInvestment(inv.investment_id);

            const paidTxns = txns.filter(t => t.txn_type === "SIP_INSTALLMENT");

            // Total invested = sum of all SIP installments
            const investedAmount = paidTxns.reduce((s, t) => s + Number(t.amount), 0);

            //  Current Value = units × latest NAV
            const currentValue = calculateInvestmentValue(inv.units, fund.nav);

            totalInvested += investedAmount;
            totalCurrentValue += currentValue;

            //  Track allocation by category
            if (!categoryMap[fund.category]) categoryMap[fund.category] = 0;
            categoryMap[fund.category] += currentValue;

            //  SIP On Track / Delayed / Off Track
            const sipStatus = calculateSipStatus({
                start_date: inv.start_date,
                amount: inv.invested_amount,
                transactions: txns,
            });

            if (sipStatus.status === "ON_TRACK") sipSummary.onTrack++;
            else if (sipStatus.status === "DELAYED") sipSummary.delayed++;
            else sipSummary.offTrack++;

            //  Push detailed SIP breakdown
            detailed.push({
                investment_id: inv.investment_id,
                scheme_code: inv.scheme_code,
                category: fund.category,
                investedAmount,
                currentValue,
                absReturn: calculateAbsoluteReturn(currentValue, investedAmount),
                sipStatus,
            });
        }

        //  Calculate category % allocation
        const categoryAllocation = {};
        for (const cat in categoryMap) {
            categoryAllocation[cat] = Number(
                ((categoryMap[cat] / totalCurrentValue) * 100).toFixed(2)
            );
        }

        return {
            user_id,
            totals: {
                totalInvested: Number(totalInvested.toFixed(2)),
                totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
                gains: Number((totalCurrentValue - totalInvested).toFixed(2)),
                absReturn: calculateAbsoluteReturn(totalCurrentValue, totalInvested),
            },
            categoryAllocation,
            sipSummary,
            detailed,
        };
    },
};
