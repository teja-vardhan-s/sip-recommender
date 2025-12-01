import express from "express";
import authenticateJWT from "../middleware/authMiddleware.js";
import { NotificationsController } from "../controllers/notificationsController.js";

const router = express.Router();

router.get("/", authenticateJWT, NotificationsController.list);
router.patch("/:id/read", authenticateJWT, NotificationsController.markRead);

export default router;
