import { is } from "zod/v4/locales";
import { NAVHistoryService } from "../services/navHistoryService.js";

export const NAVHistoryController = {
    async getHistory(req, res, next) {
        try {
            const { scheme_code } = req.params;
            const { days } = req.query;

            const result = await NAVHistoryService.getNavHistory(
                scheme_code,
                Number(days) || 365
            );

            return res.json({ success: true, ...result });
        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },

    async getRange(req, res, next) {
        try {
            const { scheme_code } = req.params;
            const { start, end } = req.query;

            if (!start || !end)
                return res.status(400).json({ error: "start and end dates required" });

            const result = await NAVHistoryService.getRange(scheme_code, start, end);

            return res.json({ success: true, ...result });
        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },
};
