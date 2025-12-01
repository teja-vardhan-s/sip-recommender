import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js';
import { calculate, createGoal, getGoals, createSip } from '../controllers/goalsController.js'

const router = express.Router();


router.post("/calculate", authMiddleware, calculate);
router.post("/", authMiddleware, createGoal);
router.get("/", authMiddleware, getGoals);
router.post("/:id/create-sip", authMiddleware, createSip);


export default router;