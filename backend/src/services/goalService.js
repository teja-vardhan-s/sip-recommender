import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { GoalsRepository } from '../repositories/goalsRepository.js';
import { monthsBetweenDates, calculateMonthlySIP } from '../utils/goalCalc.js';
import { expectedReturnFromRisk } from '../utils/expectedReturn.js';
import prisma from '../prismaClient.js';

export const GoalService = {
    calculateGoal({ targetAmount, targetDate, expectedReturn, user }) {
        const months = monthsBetweenDates(new Date(), new Date(targetDate));
        if (months <= 0) throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Target date must be in the future");

        const annual = expectedReturn ?? expectedReturnFromRisk(user.risk_profile);

        const sip = calculateMonthlySIP({
            targetAmount,
            months,
            annualReturn: annual,
        });

        return { months, requiredSIP: sip, annualReturnUsed: annual, source: expectedReturn ? "user_input" : "risk_profile_default" };
    },

    async createGoal(parsed, user) {
        const months = monthsBetweenDates(new Date(), new Date(parsed.targetDate));
        if (months <= 0) throw new AppError(ERROR_CODES.VALIDATION_ERROR, "Target date must be in the future");

        const annual = parsed.expectedReturn ?? expectedReturnFromRisk(user.risk_profile);

        const sip = calculateMonthlySIP({
            targetAmount: parsed.targetAmount,
            months,
            annualReturn: annual,
        });

        const data = {
            user_id: user.user_id,
            name: parsed.name,
            target_amount: parsed.targetAmount,
            target_date: new Date(parsed.targetDate),
            expected_return: annual,
            calculated_sip: sip,
            note: parsed.note ?? null
        };

        const created = await GoalsRepository.create(data);
        return { created, usedReturnFrom: parsed.expectedReturn ? "user_input" : "risk_profile_default" };
    },

    async getUserGoals(user) {
        const user_id = user.user_id;
        const goals = await GoalsRepository.findByUser(user_id);

        // compute progress for each goal
        const enriched = await Promise.all(goals.map(async (g) => {
            let contributed = 0;
            // sum successful txn amounts for investments linked to this goal
            for (const inv of g.investments) {
                const txns = await prisma.transactions.findMany({
                    where: { investment_id: inv.investment_id, status: "SUCCESS" },
                    select: { amount: true }
                });
                for (const t of txns) contributed += Number(t.amount);
            }

            const percent = Number(((contributed / Number(g.target_amount || 1)) * 100).toFixed(2));
            return {
                ...g,
                progress: {
                    contributed,
                    percent: Math.min(100, percent)
                }
            };
        }));

        return enriched;
    },

    async getGoalById(goal_id, user) {
        const goal = await GoalsRepository.findById(goal_id);
        if (!goal) throw new AppError(ERROR_CODES.NOT_FOUND, "Goal not found");
        if (goal.user_id !== user.user_id) throw new AppError(ERROR_CODES.UNAUTHORIZED, "Access denied");
        return goal;
    }
};
