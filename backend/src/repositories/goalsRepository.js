import prisma from '../prismaClient.js';

export const GoalsRepository = {
    async create(data) {
        return prisma.goals.create({ data });
    },

    async findByUser(user_id) {
        return prisma.goals.findMany({
            where: { user_id },
            include: {
                investments: { include: { transactions: true } }
            },
            orderBy: { created_at: "desc" }
        });
    },

    async findById(goal_id) {
        return prisma.goals.findUnique({ where: { goal_id } });
    },

    // new helper used by projection service: include investments
    async findByIdWithInvestments(goal_id) {
        return prisma.goals.findUnique({
            where: { goal_id },
            include: { investments: true }
        });
    },

    // for later use
    async deleteById(goal_id) {
        return prisma.goals.delete({ where: { goal_id } });
    },

    async updateById(goal_id, data) {
        return prisma.goals.update({ where: { goal_id }, data });
    }
};