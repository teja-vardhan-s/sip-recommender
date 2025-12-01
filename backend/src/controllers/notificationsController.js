import { NotificationService } from "../services/notificationService.js";

export const NotificationsController = {

    async list(req, res, next) {
        try {
            const user_id = req.user.user_id;
            const notifications = await NotificationService.getUserNotifications(user_id);

            return res.json({ success: true, notifications });
        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },

    async markRead(req, res, next) {
        try {
            const { id } = req.params;

            await NotificationService.markRead(Number(id), req.user.user_id);

            return res.json({ success: true, message: "Notification marked read" });
        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    },

};
