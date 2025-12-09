import express from "express";
import { getAllFunds, searchFunds } from "../controllers/fundController.js";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();
router.get("/", authMiddleware, getAllFunds);
router.get("/search", authMiddleware, searchFunds);


export default router;
