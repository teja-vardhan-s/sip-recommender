import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';

import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import authRoutes from './routes/authRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import sipsRoutes from "./routes/sipsRoutes.js";
import txnRoutes from "./routes/transactionsRoutes.js";
import goalRoutes from "./routes/goalRoutes.js"
import projectionRoutes from "./routes/projectionRoutes.js"
import sipTrackingRoutes from "./routes/sipTrackingRoutes.js"
import portfolioRoutes from "./routes/portfolioRoutes.js"
import sipSchedulerRoute from "./routes/sipSchedulerRoute.js"
import navHistoryRoutes from "./routes/navHistoryRoutes.js"
import recommendationRoutes from './routes/recommendationRoutes.js';
import goalProgressRoutes from "./routes/goalProgressRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"
import fundRoutes from "./routes/fundRoutes.js"


// Cron Jobs
import cron from "node-cron";
import { syncFundsFromAMFI } from "./scripts/fundSync.js";
import { SipSchedulerService, SipNotificationService } from './services/sipSchedulerService.js';

if (process.env.ENABLE_CRON === "true") {
    // Runs daily at 22:00 (10:00 PM) server local time — sync funds from AMFI
    cron.schedule("0 22 * * *", async () => {
        try {
            console.log("Running daily fund sync...");
            await syncFundsFromAMFI();
            console.log("Fund sync complete.");
        } catch (error) {
            console.error("Fund sync failed:", error);
        }
    }, { timezone: "Asia/Kolkata" });
}

if (process.env.ENABLE_CRON === "true") {
    // Runs daily at 01:00 (1:00 AM) server local time — run SIP auto-scheduler
    cron.schedule("0 1 * * *", async () => {
        try {
            console.log("⏳ Running SIP Auto Scheduler...");
            const result = await SipSchedulerService.runScheduler();
            console.log("SIP auto-scheduler complete:", result);
        } catch (error) {
            console.error("SIP auto-scheduler failed:", error);
        }
    }, { timezone: "Asia/Kolkata" });
}


if (process.env.ENABLE_CRON === "true") {

    // 7 AM → Notify SIP due tomorrow
    cron.schedule("0 7 * * *", async () => {
        try {
            console.log("Notifying due SIPs for tomorrow...");
            const res = await SipNotificationService.notifyDueSIPs();
            console.log("SIP due notifications sent:", res);
        } catch (error) {
            console.error("Error notifying due SIPs:", error);
        }
    }, { timezone: "Asia/Kolkata" });

    // 3 PM → Notify due SIPs (retry)
    cron.schedule("0 15 * * *", async () => {
        try {
            console.log("Retrying notifications for due SIPs...");
            const res = await SipNotificationService.notifyDueSIPs();
            console.log("Retry notifications sent:", res);
        } catch (error) {
            console.error("Error retrying notifications for due SIPs:", error);
        }
    }, { timezone: "Asia/Kolkata" });

    // 11 PM → Notify missed SIPs
    cron.schedule("0 23 * * *", async () => {
        try {
            console.log("Notifying missed SIPs...");
            const res = await SipNotificationService.notifyMissedSIPs();
            console.log("Missed SIP notifications sent:", res);
        } catch (error) {
            console.error("Error notifying missed SIPs:", error);
        }
    }, { timezone: "Asia/Kolkata" });
}

// monthly reports: run at 02:00 on day 1 of every month
cron.schedule("0 2 1 * *", async () => {
    console.log("Generating monthly portfolio reports...");
    const users = await UserRepository.findAllActiveUsers();
    for (const u of users) {
        try {
            const summary = await PortfolioService.getSummary(u.user_id);
            await EmailService.generateAndEmailPortfolioReport({ user: u, summary });
            console.log("Sent report to", u.email);
        } catch (e) {
            console.error("Failed to send report for user", u.user_id, e);
        }
    }
});


// Express app setup

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
    cors({
        origin: FRONTEND_ORIGIN,   // MUST be specific when using credentials
        credentials: true,         // allows Access-Control-Allow-Credentials: true
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use("/api/sips/tracking", sipTrackingRoutes);
app.use("/api/sips", sipsRoutes);
app.use("/api/transactions", txnRoutes);
app.use("/api/goals/progress", goalProgressRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/projections", projectionRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/scheduler", sipSchedulerRoute);
app.use("/api/nav", navHistoryRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/funds", fundRoutes); // fund related routes



// centralized error handler at last
app.use(errorHandler);


app.listen(process.env.PORT, () =>
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`)
);


