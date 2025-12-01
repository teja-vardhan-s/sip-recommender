import { SipTrackingService } from "../services/sipTrackingService.js";

export const SipTrackingController = {
    async getSipStatus(req, res, next) {
        try {
            const { id } = req.params;

            const data = await SipTrackingService.getSipStatus(
                Number(id),
                req.user.user_id
            );

            return res.json({ success: true, data });

        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },

    async getAllSips(req, res, next) {
        try {
            const data = await SipTrackingService.getAllSipsForUser(
                req.user.user_id
            );

            return res.json({ success: true, data });

        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },
};
