import prisma from '../prismaClient.js';

/**
 * Repository for transactions-related DB access.
 * Keeps Prisma usage in one place so controllers/services remain testable.
 */
export const TransactionsRepository = {

    async create(data) {
        return prisma.transactions.create({ data });
    },

    async findByUserWithFilters(user_id, status, type) {
        return prisma.transactions.findMany({
            where: {
                investment: { user_id },
                ...(status ? { status } : {}),
                ...(type ? { txn_type: type } : {}),
            },
            include: {
                investment: {
                    include: { fund: true },
                },
            },
            orderBy: { txn_date: 'desc' },
        });
    },

    async findById(txn_id) {
        return prisma.transactions.findUnique({
            where: { txn_id },
            include: { investment: true },
        });
    },

    async setTransactionStatus(txn_id, status) {
        return prisma.transactions.update({
            where: { txn_id },
            data: { status },
        });
    },

    async findForInvestment(investment_id) {
        return prisma.transactions.findMany({
            where: { investment_id },
            orderBy: { txn_date: "asc" }
        });
    },

    async findNavHistoryForSchemeOnDate(scheme_code, start, end) {
        return prisma.nAVHistory.findFirst({
            where: {
                scheme_code,
                date: { gte: start, lt: end },
            },
            orderBy: { date: 'desc' },
        });
    },

    async findFundNav(scheme_code) {
        return prisma.mutualFunds.findUnique({
            where: { scheme_code },
            select: { nav: true },
        });
    },

    // DO NOT MODIFY invested_amount here. It represents configured SIP amount.
    async updateInvestmentTotals(investment_id, unitsBought, amount) {
        return prisma.investments.update({
            where: { investment_id },
            data: {
                units: { increment: unitsBought }
            },
            include: {
                fund: true,
                transactions: {
                    orderBy: { txn_date: "desc" },
                    take: 10
                }
            }
        });
    },

    // last SIP_INSTALLMENT txn (desc)
    async findLastInstallment(investment_id) {
        return prisma.transactions.findFirst({
            where: { investment_id, txn_type: "SIP_INSTALLMENT" },
            orderBy: { txn_date: "desc" },
        });
    },


    // fallback delete/update helpers if you want to revert/cleanup
    async rollbackTransactionToPending(txn_id) {
        return prisma.transactions.update({
            where: { txn_id },
            data: { status: 'PENDING' },
        });
    },

    // find pending txn for exact date (day-range)
    async findPendingForDate(investment_id, date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        return prisma.transactions.findFirst({
            where: {
                investment_id,
                status: "PENDING",
                txn_date: { gte: start, lte: end },
            },
        });
    },

    // find nav history for scheme on date (used by updateTxn you already have)
    async findNavHistoryForSchemeOnDate(scheme_code, start, end) {
        return prisma.nAVHistory.findFirst({
            where: { scheme_code, date: { gte: start, lte: end } },
            orderBy: { date: "desc" },
        });
    }
};