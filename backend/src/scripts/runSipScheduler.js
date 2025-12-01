import { SipSchedulerService } from "../services/sipSchedulerService.js";

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
