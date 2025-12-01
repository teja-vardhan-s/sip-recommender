import express from "express";
import authenticateJWT from "../middleware/authMiddleware.js";
import { PortfolioController } from "../controllers/portfolioController.js";

const router = express.Router();

router.get("/summary", authenticateJWT, PortfolioController.getSummary);

export default router;
