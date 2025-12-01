import { PortfolioService } from "../services/portfolioService.js";
import AppError from "../utils/AppError.js";

export const PortfolioController = {
    async getSummary(req, res, next) {
        try {
            const user_id = req.user.user_id;
            const summary = await PortfolioService.getSummary(user_id);

            return res.json({
                success: true,
                summary,
            });

        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },
};
