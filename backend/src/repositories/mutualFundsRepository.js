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

    async findAll() {
        return prisma.mutualFunds.findMany();
    },

    async searchFunds(query) {
        return prisma.mutualFunds.findMany({
            where: {
                OR: [
                    { fund_name: { contains: query, mode: 'insensitive' } },
                    { scheme_code: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 20
        });
    }
};