import express from "express";
import { NAVHistoryController } from "../controllers/navHistoryController.js";

const router = express.Router();

router.get("/:scheme_code", NAVHistoryController.getHistory);
router.get("/:scheme_code/range", NAVHistoryController.getRange);

export default router;
