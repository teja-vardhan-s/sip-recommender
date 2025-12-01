import prisma from "../prismaClient.js";

export const NotificationsRepository = {
    create(data) {
        return prisma.notifications.create({ data });
    },

    getUserNotifications(user_id) {
        return prisma.notifications.findMany({
            where: { user_id },
            orderBy: { created_at: "desc" }
        });
    },

    markRead(notification_id, user_id) {
        return prisma.notifications.updateMany({
            where: { notification_id, user_id },
            data: { is_read: true }
        });
    }
};
