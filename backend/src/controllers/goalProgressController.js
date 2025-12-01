import { GoalProgressService } from "../services/goalProgressService.js";
import AppError from "../utils/AppError.js";
import { ERROR_CODES } from "../utils/errorCodes.js";

export const GoalProgressController = {
    async getProgress(req, res, next) {
        try {
            const { id } = req.params;
            const user_id = req.user.user_id;

            const data = await GoalProgressService.getGoalProgress(Number(id), user_id);

            return res.json({ success: true, data });
        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },
};
