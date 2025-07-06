import express from "express";
import Activity from "../models/activity.model.js";
import { logActivity, getActivitySummary, getLiveActivity } from "../controllers/activity.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/log", verifyToken, logActivity);
router.post("/", verifyToken, logActivity);
router.get("/summary", verifyToken, getActivitySummary);

// 🔴 Live activity endpoint
router.get("/active", verifyToken, getLiveActivity);

router.post("/end-all", verifyToken, async (req, res) => {
  try {
    const result = await Activity.updateMany({ userId: req.user.id, isActive: true }, {
      isActive: false, endTime: new Date(), action: "close"
    });
    res.json({ success: true, message: `Ended ${result.modifiedCount} active sessions` });
  } catch (err) {
    console.error("Error ending sessions:", err);
    res.status(500).json({ success: false, message: "Failed to end active sessions" });
  }
});

export default router;

