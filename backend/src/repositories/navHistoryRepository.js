import prisma from "../prismaClient.js";

export const NAVHistoryRepository = {
    addNavEntry(data) {
        return prisma.nAVHistory.create({ data });
    },

    getForScheme(scheme_code, limit = 365) {
        return prisma.nAVHistory.findMany({
            where: { scheme_code },
            orderBy: { date: "desc" },
            take: limit,
            select: { date: true, nav: true },
        });
    },

    getRange(scheme_code, startDate, endDate) {
        return prisma.nAVHistory.findMany({
            where: {
                scheme_code,
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: { date: "asc" },
            select: { date: true, nav: true },
        });
    },
};
