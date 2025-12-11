import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js';
import { calculate, createGoal, getGoals, getGoalById, createSip, updateGoal, deleteGoal } from '../controllers/goalsController.js'

const router = express.Router();


router.post("/calculate", authMiddleware, calculate);
router.post("/", authMiddleware, createGoal);
router.get("/", authMiddleware, getGoals);
router.post("/:id/create-sip", authMiddleware, createSip);
router.get("/:id", authMiddleware, getGoalById);
router.patch("/:id", authMiddleware, updateGoal);
router.delete("/:id", authMiddleware, deleteGoal);


export default router;