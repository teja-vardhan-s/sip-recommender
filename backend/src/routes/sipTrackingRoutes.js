import express from "express";
import authenticateJWT from "../middleware/authMiddleware.js";
import { SipTrackingController } from "../controllers/sipTrackingController.js";

const router = express.Router();

router.get("/:id", authenticateJWT, SipTrackingController.getSipStatus);
router.get("/", authenticateJWT, SipTrackingController.getAllSips);

export default router;
