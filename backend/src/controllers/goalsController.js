import { z } from 'zod';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';
import { GoalService } from '../services/goalService.js';
import { SipService } from '../services/sipService.js';


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