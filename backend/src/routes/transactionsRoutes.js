import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getTxns, updateTxn } from '../controllers/transactionsController.js';

const router = express.Router();


router.get("/", authMiddleware, getTxns);
router.patch("/:txn_id/status", authMiddleware, updateTxn);

export default router;