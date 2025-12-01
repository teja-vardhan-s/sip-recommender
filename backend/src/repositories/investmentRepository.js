import prisma from '../prismaClient.js';

export const InvestmentRepository = {
    async create(data) {
        return prisma.investments.create({ data });
    },

    async findById(investment_id) {
        return prisma.investments.findUnique({
            where: { investment_id },
            include: {
                goal: true,
                fund: true,
                transactions: { orderBy: { txn_date: 'desc' } }
            },
        });
    },

    async findByUserAndId(user_id, investment_id) {
        return prisma.investments.findFirst({
            where: { investment_id, user_id },
            include: { goal: true, fund: true, transactions: { orderBy: { txn_date: 'desc' } } },
        });
    },

    async findByUser(user_id) {
        return prisma.investments.findMany({
            where: { user_id },
            include: {
                fund: true,
                transactions: { orderBy: { txn_date: 'desc' } }
            },
            orderBy: { created_at: "desc" }
        });
    },

    async updateById(investment_id, data) {
        return prisma.investments.update({ where: { investment_id }, data });
    },

    async deleteById(investment_id) {
        return prisma.investments.delete({ where: { investment_id } });
    },

    async findActiveSips() {
        return prisma.investments.findMany({
            where: {
                investment_type: "SIP",
            },
            include: {
                user: true
            }
        });
    }

};