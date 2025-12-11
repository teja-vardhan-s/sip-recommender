import prisma from '../prismaClient.js';

export const AuthRepository = {
    async findUserByEmail(email) {
        return prisma.users.findUnique({ where: { email } });
    },

    async findUserById(user_id) {
        return prisma.users.findUnique({ where: { user_id } });
    },

    async createUser(data) {
        return prisma.users.create({ data });
    },

    async createRefreshToken({ user_id, token, expires_at }) {
        return prisma.refreshTokens.create({
            data: { user_id, token, expires_at }
        });
    },

    async deleteRefreshTokensByUser(user_id) {
        return prisma.refreshTokens.deleteMany({ where: { user_id } });
    },

    async findRefreshToken(token) {
        return prisma.refreshTokens.findUnique({ where: { token } });
    },

    async deleteRefreshToken(token) {
        return prisma.refreshTokens.deleteMany({ where: { token } });
    },

    /**
   * Attempt to atomically replace an existing token's value.
   * Returns the number of rows affected (0 or 1).
   */
    replaceRefreshToken(oldToken, newToken, expires_at) {
        return prisma.refreshTokens.updateMany({
            where: { token: oldToken },
            data: { token: newToken, expires_at },
        }); // returns { count }
    },

    async findLatestRefreshTokenForUser(user_id) {
        return prisma.refreshTokens.findFirst({
            where: { user_id },
            orderBy: { created_at: "desc" },
        });
    }
};