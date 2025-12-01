import { RecommendationService } from "../services/recommendationService.js";

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
};
