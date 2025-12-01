import { GoalsRepository } from "../repositories/goalsRepository.js";
import { InvestmentRepository } from "../repositories/investmentRepository.js";

// FV formula: FV = P * [((1+r)^n - 1) / r] * (1 + r)
function projectedValue(monthly, annualRate, months) {
    const r = annualRate / 12;
    return monthly * (((Math.pow(1 + r, months) - 1) / r) * (1 + r));
}

export const GoalProgressService = {

    async getGoalProgress(goal_id, user_id) {
        const goal = await GoalsRepository.findById(goal_id, user_id);
        if (!goal) throw new Error("Goal not found");

        const { target_amount, monthly_investment, duration_months, created_at } = goal;

        // 1️⃣ Months passed since goal start
        const start = new Date(created_at);
        const now = new Date();
        const monthsPassed =
            (now.getFullYear() - start.getFullYear()) * 12 +
            (now.getMonth() - start.getMonth());

        const monthsElapsed = Math.max(monthsPassed, 0);

        // 2️⃣ Expected CAGR based on risk profile
        const riskCAGR = {
            Conservative: 0.06,
            Balanced: 0.10,
            Aggressive: 0.14
        };

        const expectedReturnRate = riskCAGR[goal.risk_profile] || 0.10;

        // 3️⃣ Expected corpus today
        const expectedCorpus = projectedValue(
            monthly_investment,
            expectedReturnRate,
            monthsElapsed
        );

        // 4️⃣ Actual corpus (sum of current_value from investments)
        const investments = await InvestmentRepository.findUserInvestments(user_id);

        const actualCorpus = investments.reduce(
            (sum, inv) => sum + Number(inv.current_value || 0),
            0
        );

        // 5️⃣ Projection to end of goal
        const projectedFinalValue = projectedValue(
            monthly_investment,
            expectedReturnRate,
            duration_months
        );

        // 6️⃣ Progress %
        const progressPercent =
            expectedCorpus > 0
                ? Math.min((actualCorpus / expectedCorpus) * 100, 200)
                : 0;

        // 7️⃣ Status
        let status = "On Track";
        if (progressPercent < 90) status = "Behind";
        if (progressPercent > 110) status = "Ahead";

        if (status === "Behind") {
            await NotificationService.notify(
                user_id,
                `Your goal of ₹${target_amount} is behind schedule. Increase your SIP to stay on track.`
            );
        }


        return {
            goal_id,
            target_amount,
            duration_months,
            monthly_investment,
            monthsElapsed,
            expectedReturnRate,
            expectedCorpus: Math.round(expectedCorpus),
            actualCorpus: Math.round(actualCorpus),
            progressPercent: Number(progressPercent.toFixed(2)),
            status,
            projectedFinalValue: Math.round(projectedFinalValue),
        };
    },
};
