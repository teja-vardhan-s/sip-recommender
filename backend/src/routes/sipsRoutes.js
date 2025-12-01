import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createSip, getSips, updateSip, deleteSip } from "../controllers/sipsController.js"


const router = express.Router()

router.post("/create", authMiddleware, createSip);
router.get("/", authMiddleware, getSips);
router.patch("/:id", authMiddleware, updateSip);
router.delete("/:id", deleteSip);

export default router;