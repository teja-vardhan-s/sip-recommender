import dotenv from "dotenv";
// load .env.<NODE_ENV> with fallback to .env
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });
if (!process.env.DATABASE_URL) dotenv.config();

import { syncFundsFromAMFI } from "./fundSync.js";

(async () => {
    console.log("Running fund sync manually...");
    await syncFundsFromAMFI();
    console.log("Done.");
    process.exit(0);
})();
