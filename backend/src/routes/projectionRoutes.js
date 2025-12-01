import express from 'express'
import authMiddleware from '../middleware/authMiddleware.js';
import { projectSip, projectGoal } from '../controllers/projectionController.js';

const router = express.Router()

/**
 * 1) Single SIP Projection
 * GET /api/projection/sip/:investment_id
 */
router.get("/sip/:id", authMiddleware, projectSip);

/**
    2) Goal Projection (combined SIPs)
    GET /api/projection/goal/:goal_id
 */
router.get("/goal/:id", authMiddleware, projectGoal);

export default router;