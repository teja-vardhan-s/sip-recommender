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



import cron from "node-cron";
import { syncFundsFromAMFI } from "./scripts/fundSync.js";
import { SipSchedulerService, SipNotificationService } from './services/sipSchedulerService.js';

if (process.env.ENABLE_CRON === "true") {
    // Runs daily at 22:00 (10:00 PM) server local time — sync funds from AMFI
    cron.schedule("0 22 * * *", async () => {
        console.log("Running daily fund sync...");
        await syncFundsFromAMFI();
    });
}

if (process.env.ENABLE_CRON === "true") {
    // Runs daily at 01:00 (1:00 AM) server local time — run SIP auto-scheduler
    cron.schedule("0 1 * * *", async () => {
        console.log("⏳ Running SIP Auto Scheduler...");
        const result = await SipSchedulerService.runScheduler();
        console.log("✅ SIP auto-scheduler complete:", result);
    });
}


if (process.env.ENABLE_CRON === "true") {

    // 7 AM → Notify SIP due tomorrow
    cron.schedule("0 7 * * *", async () => {
        await SipNotificationService.notifyDueSIPs();
    });

    // 11 PM → Notify missed SIPs
    cron.schedule("0 23 * * *", async () => {
        await SipNotificationService.notifyMissedSIPs();
    });
}


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


