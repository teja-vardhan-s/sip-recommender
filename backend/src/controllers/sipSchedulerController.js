import { SipSchedulerService } from "../services/sipSchedulerService.js";

export const SipSchedulerController = {
    async run(req, res, next) {
        try {
            const result = await SipSchedulerService.runScheduler();
            return res.json({ success: true, result });
        } catch (err) {
            next(err instanceof AppError ? err : new AppError(ERROR_CODES.SERVER_ERROR, err.message));
        }
    }
};
