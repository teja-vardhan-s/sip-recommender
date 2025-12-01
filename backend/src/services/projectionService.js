import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { InvestmentRepository } from '../repositories/investmentRepository.js';
import { GoalsRepository } from '../repositories/goalsRepository.js';
import { sipFutureValue, generateProjectionSeries } from '../utils/projection.js';

export const ProjectionService = {

    async projectSIP(investment_id, user_id) {
        const inv = await InvestmentRepository.findById(investment_id);

        if (!inv) {
            throw new AppError(ERROR_CODES.NOT_FOUND, "SIP not found");
        }
        if (inv.user_id !== user_id) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "Access denied");
        }

        const M = Number(inv.invested_amount);
        const annualReturn = Number(inv.expected_return ?? 0.08);

        let months = 60; // default: 5 years projection

        if (inv.goal) {
            // inv.goal is included by repository
            months = this._monthsUntil(inv.goal.target_date);
        }

        const fv = sipFutureValue(M, annualReturn, months);
        const series = generateProjectionSeries(M, annualReturn, months);

        return {
            investment_id,
            invested_amount_per_month: M,
            expected_return: annualReturn,
            months,
            future_value: Number(fv.toFixed(2)),
            series,
            goal_linked: inv.goal_id != null,
        };
    },

    async projectGoal(goal_id, user_id) {
        // fetch goal along with investments
        const goal = await GoalsRepository.findByIdWithInvestments(goal_id);

        if (!goal) {
            throw new AppError(ERROR_CODES.NOT_FOUND, "Goal not found");
        }
        if (goal.user_id !== user_id) {
            throw new AppError(ERROR_CODES.UNAUTHORIZED, "Access denied");
        }

        const months = this._monthsUntil(goal.target_date);

        let totalFV = 0;
        const breakdown = [];

        for (const inv of goal.investments || []) {
            const M = Number(inv.invested_amount);
            const annualReturn = Number(inv.expected_return ?? goal.expected_return ?? 0.08);

            const fv = sipFutureValue(M, annualReturn, months);
            totalFV += fv;

            breakdown.push({
                investment_id: inv.investment_id,
                scheme_code: inv.scheme_code,
                monthly_amount: M,
                annual_return: annualReturn,
                projected_value: Number(fv.toFixed(2)),
            });
        }

        return {
            goal_id,
            name: goal.name,
            months,
            projected_corpus: Number(totalFV.toFixed(2)),
            target_amount: Number(goal.target_amount),
            breakdown,
        };
    },

    /**
     * Helper: months between now & future date
     */
    _monthsUntil(target) {
        const now = new Date();
        const t = new Date(target);
        let months =
            (t.getFullYear() - now.getFullYear()) * 12 +
            (t.getMonth() - now.getMonth());
        if (t.getDate() > now.getDate()) months += 1;
        return Math.max(months, 0);
    },
};
