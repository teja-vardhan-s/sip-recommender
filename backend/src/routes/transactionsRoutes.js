import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getTxns, updateTxn, getTxnsByInvestmentId } from '../controllers/transactionsController.js';

const router = express.Router();


router.get("/", authMiddleware, getTxns);
router.get("/:investment_id", authMiddleware, getTxnsByInvestmentId);
router.patch("/:txn_id/status", authMiddleware, updateTxn);
router.patch("/:txn_id", authMiddleware, updateTxn);

export default router;