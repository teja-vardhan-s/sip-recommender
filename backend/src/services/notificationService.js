import { NotificationsRepository } from "../repositories/notificationsRepository.js";

export const NotificationService = {

    async notify(user_id, message) {
        return NotificationsRepository.create({
            user_id,
            message,
        });
    },

    async getUserNotifications(user_id) {
        return NotificationsRepository.getUserNotifications(user_id);
    },

    async markRead(notification_id, user_id) {
        const updated = await NotificationsRepository.markRead(notification_id, user_id);
        if (updated.count === 0) throw new Error("Notification not found or unauthorized");
        return true;
    }

};
