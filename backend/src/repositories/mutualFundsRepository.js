import prisma from '../prismaClient.js';

export const MutualFundsRepository = {
    async findBySchemeCode(scheme_code) {
        return prisma.mutualFunds.findUnique({
            where: { scheme_code },
            select: {
                scheme_code: true,
                fund_name: true,
                category: true,
                risk_level: true,
                nav: true
            }
        });
    },

    async findById(id) {
        return prisma.mutualFunds.findUnique({ where: { id } });
    },

    // add more helpers (search, latestNav, bulkUpsert) as needed
    async findAll() {
        return prisma.mutualFunds.findMany();
    }
};