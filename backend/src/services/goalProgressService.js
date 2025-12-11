import { GoalsRepository } from "../repositories/goalsRepository.js";
import { InvestmentRepository } from "../repositories/investmentRepository.js";
import { NotificationService } from "./notificationService.js";

// Constants
const PROGRESS_THRESHOLDS = {
    BEHIND: 90,
    AHEAD: 110,
    MAX_PROGRESS: 200
};

const RISK_CAGR = {
    Conservative: 0.06,
    Balanced: 0.10,
    Aggressive: 0.14
};

const DEFAULT_RETURN_RATE = 0.10;

// FV formula: FV = P * [((1+r)^n - 1) / r] * (1 + r)
function projectedValue(monthly, annualRate, months) {
    // Edge case: zero months
    if (months <= 0) return 0;

    // Edge case: zero rate (no returns)
    if (annualRate === 0) return monthly * months;

    const r = annualRate / 12;
    return monthly * (((Math.pow(1 + r, months) - 1) / r) * (1 + r));
}

export const GoalProgressService = {

    async getGoalProgress(goal_id, user_id) {
        try {
            // Validate inputs
            if (!goal_id || !user_id) {
                throw new Error("Goal ID and User ID are required");
            }

            // Fetch goal
            const goal = await GoalsRepository.findById(goal_id, user_id);
            if (!goal) {
                throw new Error("Goal not found or access denied");
            }

            const { target_amount, calculated_sip, target_date, created_at } = goal;

            const monthly_investment = Number(calculated_sip) || 0;
            const duration_months = Math.max(
                Math.round(
                    (new Date(target_date).getFullYear() - new Date(created_at).getFullYear()) * 12 +
                    (new Date(target_date).getMonth() - new Date(created_at).getMonth())
                ),
                0
            );

            // Validate goal data
            if (!target_amount || target_amount <= 0) {
                throw new Error("Invalid target amount");
            }
            if (!monthly_investment || monthly_investment <= 0) {
                throw new Error("Invalid monthly investment");
            }
            if (!duration_months || duration_months <= 0) {
                throw new Error("Invalid duration");
            }

            // Months passed since goal start
            const start = new Date(created_at);
            const now = new Date();

            // Edge case: invalid date
            if (isNaN(start.getTime())) {
                throw new Error("Invalid goal creation date");
            }

            const monthsPassed =
                (now.getFullYear() - start.getFullYear()) * 12 +
                (now.getMonth() - start.getMonth());

            const monthsElapsed = Math.max(monthsPassed, 0);

            // Expected CAGR based on risk profile
            const expectedReturnRate = RISK_CAGR[goal.risk_profile] || DEFAULT_RETURN_RATE;

            // Actual corpus (sum of current_value from investments)
            const investments = await InvestmentRepository.findByGoal(goal_id);

            // Calculate actual total monthly SIP amount
            const actualMonthlyInvestment = investments.reduce(
                (sum, inv) => sum + (Number(inv.invested_amount) || 0),
                0
            );

            // Use actual monthly investment for projection (not goal's suggested amount)
            const expectedCorpus = projectedValue(
                actualMonthlyInvestment, // Use actual SIP total, not goal.monthly_investment
                expectedReturnRate,
                monthsElapsed
            );

            let actualCorpus = 0;
            for (const inv of investments) {
                actualCorpus += Number(inv.current_value) || 0;
            }

            // Projection to end of goal
            const projectedFinalValue = projectedValue(
                monthly_investment,
                expectedReturnRate,
                duration_months
            );

            // Progress %
            let progressPercent = 0;

            if (monthsElapsed === 0) {
                // Edge case: Brand new goal - use actual vs first month expected
                const firstMonthExpected = monthly_investment;
                progressPercent = firstMonthExpected > 0
                    ? Math.min((actualCorpus / firstMonthExpected) * 100, PROGRESS_THRESHOLDS.MAX_PROGRESS)
                    : 0;
            } else if (expectedCorpus > 0) {
                progressPercent = Math.min(
                    (actualCorpus / expectedCorpus) * 100,
                    PROGRESS_THRESHOLDS.MAX_PROGRESS
                );
            }

            // Status
            let status = "On Track";
            if (progressPercent < PROGRESS_THRESHOLDS.BEHIND) {
                status = "Behind";
            } else if (progressPercent > PROGRESS_THRESHOLDS.AHEAD) {
                status = "Ahead";
            }

            // Notification with debouncing (check last notification time)
            if (status === "Behind") {
                try {
                    // Only notify if goal has been active for at least 1 month
                    if (monthsElapsed >= 1) {
                        await NotificationService.notify(
                            user_id,
                            `Your goal "${goal.name}" (₹${target_amount.toLocaleString()}) is behind schedule. Consider increasing your SIP to stay on track.`
                        );
                    }
                } catch (notifError) {
                    // Don't fail the whole request if notification fails
                    console.error("Failed to send notification:", notifError.message);
                }
            }

            return {
                goal_id,
                goal_name: goal.name,
                target_amount,
                duration_months,
                monthly_investment,
                monthsElapsed,
                monthsRemaining: Math.max(duration_months - monthsElapsed, 0),
                expectedReturnRate,
                expectedCorpus: Math.round(expectedCorpus),
                actualCorpus: Math.round(actualCorpus),
                progressPercent: Number(progressPercent.toFixed(2)),
                status,
                projectedFinalValue: Math.round(projectedFinalValue),
                onTrackToMeetGoal: projectedFinalValue >= target_amount,
            };

        } catch (error) {
            // Log error for debugging
            console.error(`Error calculating goal progress for goal ${goal_id}:`, error);

            // Re-throw with context
            if (error.message.includes("not found") || error.message.includes("Invalid")) {
                throw error; // Client errors
            }

            // Server errors
            throw new Error(`Failed to calculate goal progress: ${error.message}`);
        }
    },
};
