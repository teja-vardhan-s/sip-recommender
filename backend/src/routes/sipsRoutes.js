import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createSip, getSips, updateSip, getSipById, stopSip, startSip } from "../controllers/sipsController.js"


const router = express.Router()

router.post("/", authMiddleware, createSip);
router.get("/", authMiddleware, getSips);
router.get("/:id", authMiddleware, getSipById);
router.patch("/:id", authMiddleware, updateSip);
router.patch("/:id/stop", authMiddleware, stopSip);
router.patch("/:id/start", authMiddleware, startSip);

export default router;