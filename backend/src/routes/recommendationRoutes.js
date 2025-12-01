import express from "express";
import { RecommendationController } from "../controllers/recommendationController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, RecommendationController.getRecommendations);

export default router;
