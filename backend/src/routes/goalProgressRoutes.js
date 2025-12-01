import express from "express";
import authenticateJWT from "../middleware/authMiddleware.js";
import { GoalProgressController } from "../controllers/goalProgressController.js";

const router = express.Router();

router.get("/:id", authenticateJWT, GoalProgressController.getProgress);

export default router;
