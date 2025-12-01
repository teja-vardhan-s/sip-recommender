import { ProjectionService } from '../services/projectionService.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES } from '../utils/errorCodes.js';

export const projectSip = async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid investment id"));

        const result = await ProjectionService.projectSIP(id, req.user.user_id);
        return res.json({ success: true, ...result });
    } catch (err) {
        // forward AppError as-is, wrap others
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};


export const projectGoal = async (req, res, next) => {
    try {
        const goal_id = Number(req.params.id);
        if (!goal_id) return next(new AppError(ERROR_CODES.VALIDATION_ERROR, "Invalid goal id"));

        const result = await ProjectionService.projectGoal(goal_id, req.user.user_id);
        return res.json({ success: true, ...result });
    } catch (err) {
        return next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
    }
};