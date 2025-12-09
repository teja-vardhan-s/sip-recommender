import { SipSchedulerService } from "../services/sipSchedulerService.js";
import dotenv from "dotenv";

// Load .env.<NODE_ENV>, fallback to .env
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });
if (!process.env.DATABASE_URL) dotenv.config();


console.log("Running SIP Auto Scheduler...");
SipSchedulerService.runScheduler()
    .then(res => {
        console.log("Scheduler summary:", res);
        process.exit(0);
    })
    .catch(err => {
        console.error("Scheduler error:", err);
        process.exit(1);
    });
