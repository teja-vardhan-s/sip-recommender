import { InvestmentRepository } from "../repositories/investmentRepository.js";
import { MutualFundsRepository } from "../repositories/mutualFundsRepository.js";
import { TransactionsRepository } from "../repositories/transactionsRepository.js";
import { calculateInvestmentValue, calculateAbsoluteReturn } from "../utils/portfolio.js";
import { calculateSipStatus } from "../utils/sipTracker.js";
import { NAVHistoryRepository } from "../repositories/navHistoryRepository.js";


async function getNavOnOrBeforeDateFromMap(navMap, dateStr) {
    // navMap is array sorted asc { date: Date, nav }
    // find last entry <= dateStr
    const target = new Date(dateStr);
    for (let i = navMap.length - 1; i >= 0; i--) {
        const d = new Date(navMap[i].date);
        if (d.getTime() <= target.getTime()) return Number(navMap[i].nav);
    }
    return null;
}

async function buildMonthlyHistory(investments, monthsBack = 12) {
    // Group investments by scheme_code for nav fetch efficiency
    const schemes = {};
    for (const inv of investments) {
        schemes[inv.scheme_code] = schemes[inv.scheme_code] || [];
        schemes[inv.scheme_code].push(inv);
    }

    // Fetch NAV history for each scheme (take monthsBack*31 days approx)
    const navCache = {};
    const daysToFetch = Math.max(90, monthsBack * 31);
    for (const scheme of Object.keys(schemes)) {
        const navs = await NAVHistoryRepository.getForScheme(scheme, daysToFetch);
        // sort ascending by date (oldest first)
        navCache[scheme] = (navs || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    // Build month-end points oldest -> newest
    const now = new Date();
    const points = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1); // first of month
        // choose end-of-month for label (last day)
        const endOfMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
        const label = endOfMonth.toISOString().slice(0, 10);

        let totalValue = 0;
        // for each investment, get nav on or before endOfMonth and multiply by units
        for (const inv of investments) {
            const scheme = inv.scheme_code;
            const navList = navCache[scheme] || [];
            let nav = await getNavOnOrBeforeDateFromMap(navList, label);
            if (nav == null) {
                // fallback to latest known NAV in MutualFunds table (fast)
                const fund = await MutualFundsRepository.findBySchemeCode(scheme);
                nav = fund && fund.nav ? Number(fund.nav) : 0;
            }
            const units = Number(inv.units ?? 0);
            totalValue += units * Number(nav);
        }

        points.push({ date: label, totalValue: Number(totalValue.toFixed(2)) });
    }

    return points;
}


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

            const paidTxns = txns.filter(t => t.txn_type === "SIP_INSTALLMENT" && t.status === "SUCCESS");

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

        const history = await buildMonthlyHistory(investments, 12);

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
            history,
        };
    },
};
