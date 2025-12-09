import { z } from 'zod';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { GoalService } from '../services/goalService.js';
import { SipService } from '../services/sipService.js';
import { GoalsRepository } from '../repositories/goalsRepository.js';
import prisma from '../prismaClient.js';


// Zod schemas
const calcSchema = z.object({
    targetAmount: z.number().positive(),
    targetDate: z.string().refine(s => !isNaN(Date.parse(s)), { message: "Invalid date" }),
    expectedReturn: z.number().min(0).max(1).optional() // 0.12 -> 12%
});

const createSchema = calcSchema.extend({
    name: z.string().min(1),
    note: z.string().optional()
});

export const updateGoalSchema = createSchema.partial().extend({
    goal_id: z.number().optional(),
});
export const calculate = async (req, res, next) => {
    try {
        const parsed = calcSchema.parse(req.body);
        const result = GoalService.calculateGoal({ ...parsed, user: req.user });
        return res.json(result);
    } catch (err) {
        if (err?.name === "ZodError") return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.errors));
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR));
    }
}

export const createGoal = async (req, res, next) => {
    try {
        const parsed = createSchema.parse(req.body);
        const { created, usedReturnFrom } = await GoalService.createGoal(parsed, req.user);
        return res.status(201).json({ success: true, goal: created, usedReturnFrom });
    } catch (err) {
        if (err?.name === "ZodError") return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.errors));
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR));
    }
}

export const getGoals = async (req, res, next) => {
    try {
        const enriched = await GoalService.getUserGoals(req.user);
        return res.json({ success: true, goals: enriched });
    } catch (err) {
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR));
    }
}

export const createSip = async (req, res, next) => {
    const createSipSchema = z.object({
        scheme_code: z.string(),
        amount: z.number().positive(),
        start_date: z.string().refine(s => !isNaN(Date.parse(s)))
    });

    try {
        const parsed = createSipSchema.parse(req.body);
        // keep createSip logic small — delegate DB checks/creation to investments service/repo later
        const goal_id = Number(req.params.id);
        // basic guard
        if (!goal_id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid goal id"));

        const result = await SipService.createSip({
            user_id: req.user.user_id,
            goal_id,
            scheme_code: parsed.scheme_code,
            amount: parsed.amount,
            start_date: parsed.start_date,
            frequency: "Monthly"
        });

        return res.status(201).json({ success: true, sip: result.sip, expectedReturn: result.expectedReturn, basedOn: result.basedOn });

    } catch (err) {
        if (err?.name === "ZodError") return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.errors));
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR));
    }
}

export const updateGoal = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const goal_id = Number(req.params.id);
        if (!goal_id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid goal id"));

        // parse/validate input (partial allowed)
        let parsed;
        try {
            parsed = updateGoalSchema.parse(req.body);
        } catch (err) {
            return next(new AppError(ERROR_CODES.VALIDATION_ERROR, err.errors));
        }

        const existing = await GoalsRepository.findById(goal_id);
        if (!existing) return next(new AppError(ERROR_CODES.NOT_FOUND, "Goal not found"));
        if (existing.user_id !== user_id) return next(new AppError(ERROR_CODES.UNAUTHORIZED, "Not authorized"));

        // Build update payload - ensure we convert dates & numbers properly
        const payload = {};
        if (parsed.name !== undefined) payload.name = parsed.name;
        if (parsed.targetAmount !== undefined) payload.target_amount = parsed.targetAmount;
        if (parsed.targetDate !== undefined) payload.target_date = new Date(parsed.targetDate);
        if (parsed.expectedReturn !== undefined) payload.expected_return = parsed.expectedReturn;
        if (parsed.monthlyInvestment !== undefined) payload.monthly_investment = parsed.monthlyInvestment;
        if (parsed.note !== undefined) payload.note = parsed.note;

        const updated = await GoalsRepository.updateById(goal_id, payload);

        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error("PATCH /api/goals/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

export const deleteGoal = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const goal_id = Number(req.params.id);
        if (!goal_id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid goal id"));

        const existing = await GoalsRepository.findById(goal_id);
        if (!existing) return next(new AppError(ERROR_CODES.NOT_FOUND, "Goal not found"));
        if (existing.user_id !== user_id) return next(new AppError(ERROR_CODES.UNAUTHORIZED, "Not authorized"));

        // Business decision: if goal has investments linked, you can either forbid delete or cascade.
        // Here we'll allow delete only if there are no active investments; otherwise return 409.
        const linkedInv = await prisma.investments.findFirst({
            where: { goal_id: goal_id },
        });
        if (linkedInv) {
            return next(new AppError(ERROR_CODES.DUPLICATE_ENTRY, "Goal has linked investments. Unlink before deleting."));
        }

        await GoalsRepository.deleteById(goal_id);
        return res.json({ success: true, message: "Goal deleted" });
    } catch (err) {
        console.error("DELETE /api/goals/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};

export const getGoalById = async (req, res, next) => {
    try {
        const user_id = req.user.user_id;
        const goal_id = Number(req.params.id);
        if (!goal_id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid goal id"));

        const goal = await GoalsRepository.findById(goal_id);
        if (!goal) return next(new AppError(ERROR_CODES.NOT_FOUND, "Goal not found"));
        if (goal.user_id !== user_id) return next(new AppError(ERROR_CODES.UNAUTHORIZED, "Not authorized"));

        return res.json({ success: true, goal });
    } catch (err) {
        console.error("GET /api/goals/:id error:", err);
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
}