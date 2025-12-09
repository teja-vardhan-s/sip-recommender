import prisma from '../prismaClient.js';
import { getNextSipDate } from "../utils/sipDates.js";

const allowedUpdateFields = ["invested_amount", "frequency", "duration_months", "is_active", "expected_return", "goal_id"];
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

    /**
   * Safely update SIP fields.
   * - Only allowed fields are applied.
   * - If invested_amount changes, update pending transactions' amount to match (inside same tx).
   *
   * data: object that may include invested_amount, frequency, duration_months, is_active, expected_return
   */

    async updateSipSafely(investment_id, data) {
        // pick allowed fields only
        const payload = {};
        for (const k of allowedUpdateFields) {
            if (Object.prototype.hasOwnProperty.call(data, k) && data[k] !== undefined) {
                payload[k] = data[k];
            }
        }

        if (Object.keys(payload).length === 0) {
            // nothing to change
            return this.findById(investment_id);
        }

        return prisma.$transaction(async (tx) => {
            // read current investment (optional, for logging/decisions)
            const current = await tx.investments.findUnique({ where: { investment_id } });

            // 1) update investment
            const updatedInvestment = await tx.investments.update({
                where: { investment_id },
                data: payload,
            });

            // 2) If invested_amount changed (and is numeric), update future pending txns
            if (
                payload.hasOwnProperty("invested_amount") &&
                payload.invested_amount != null &&
                Number(payload.invested_amount) !== Number(current?.invested_amount ?? 0)
            ) {
                await tx.transactions.updateMany({
                    where: {
                        investment_id,
                        status: "PENDING", // only future/pending installments
                    },
                    data: {
                        amount: payload.invested_amount,
                    },
                });
            }

            return updatedInvestment;
        });
    },

    /**
   * Restart SIP safely:
   * - set is_active = true
   * - if there is no pending txn scheduled for next due date, create one (so UI shows upcoming)
   * - returns the updated investment (including fund and transactions optionally)
   */
    async restartSipSafely(investment_id) {
        return prisma.$transaction(async (tx) => {
            const inv = await tx.investments.findUnique({ where: { investment_id } });
            if (!inv) throw new Error("Investment not found");

            // mark active
            const updatedInv = await tx.investments.update({
                where: { investment_id },
                data: { is_active: true },
            });

            // compute next due using last txn (if any)
            const lastTxn = await tx.transactions.findFirst({
                where: { investment_id, txn_type: "SIP_INSTALLMENT" },
                orderBy: { txn_date: "desc" },
            });

            const nextDue = getNextSipDate(inv.start_date, lastTxn, inv.frequency ?? "Monthly");

            // day-range normalized check
            const start = new Date(nextDue);
            start.setHours(0, 0, 0, 0);
            const end = new Date(nextDue);
            end.setHours(23, 59, 59, 999);

            const existingPending = await tx.transactions.findFirst({
                where: {
                    investment_id,
                    status: "PENDING",
                    txn_date: { gte: start, lte: end },
                },
            });

            if (!existingPending) {
                await tx.transactions.create({
                    data: {
                        investment_id,
                        amount: inv.invested_amount,
                        txn_type: "SIP_INSTALLMENT",
                        txn_date: nextDue,
                        status: "PENDING",
                    },
                });
            }

            // return the investment with recent txns and fund
            return tx.investments.findUnique({
                where: { investment_id },
                include: {
                    fund: true,
                    transactions: { orderBy: { txn_date: "desc" }, take: 10 },
                },
            });
        });
    },

    async deleteById(investment_id) {
        return prisma.investments.delete({ where: { investment_id } });
    },

    async findActiveSips() {
        return prisma.investments.findMany({
            where: {
                investment_type: "SIP",
                is_active: true
            },
            include: {
                fund: true
            }
        });
    },

    async findSipsForUser(user_id) {
        return prisma.investments.findMany({
            where: {
                user_id,
                investment_type: "SIP",
            },
        });
    }

};