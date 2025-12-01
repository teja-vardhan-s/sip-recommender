import express from "express";
import { SipSchedulerController } from "../controllers/sipSchedulerController.js";

const router = express.Router();
router.post("/run", SipSchedulerController.run);

export default router;
