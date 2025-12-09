import { RecommendationService } from "../services/recommendationService.js";
import AppError from "../utils/AppError.js";
import { ERROR_CODES } from "../utils/errorCodes.js";

export const RecommendationController = {
    async getRecommendations(req, res, next) {
        try {
            const goalMonths = Number(req.query.goalMonths || 36);
            const user = req.user;

            const results = await RecommendationService.getRecommendations(user, goalMonths);

            return res.json({
                success: true,
                results
            });

        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },
    async getWhyRecommended(req, res, next) {
        try {
            const schemeCode = String(req.params.schemeCode);
            const user = req.user;
            const goalMonths = Number(req.query.goalMonths || 36);

            const explanation = await RecommendationService.getRecommendationDetails(schemeCode, user.risk_profile, goalMonths);

            return res.json({
                success: true,
                explanation
            });

        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    }
};
