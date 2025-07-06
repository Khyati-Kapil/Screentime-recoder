import Activity from "../models/activity.model.js";
import { extractDomain } from "../utils/extractDomain.js";
import redis from "../utils/redisClient.js";

export const logActivity = async (req, res) => {
  try {
    const { tabId, url, sessionId, action, title, duration, endTime } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!url || !sessionId || !action) return res.status(400).json({ success: false, message: "Missing required fields" });
    const domain = extractDomain(url);
    if (!domain) return res.status(400).json({ success: false, message: "Invalid URL" });

    let activity;
    switch (action) {
      case "start":
        activity = await new Activity({ userId, tabId, url, domain, title, sessionId, startTime: new Date(), action, isActive: true }).save();
        break;
      case "update":
        await Activity.findOneAndUpdate({ sessionId, isActive: true }, { duration, updatedAt: new Date() });
        break;
      case "end":
        await Activity.findOneAndUpdate({ sessionId, isActive: true }, { endTime: endTime ? new Date(endTime) : new Date(), duration, isActive: false, action });
        break;
      default:
        activity = await new Activity({ userId, tabId, url, domain, title, sessionId, startTime: new Date(), endTime: new Date(), duration, action, isActive: false }).save();
    }

    const liveData = { sessionId, domain, url, title, duration, startTime: activity?.startTime || new Date() };
    await redis.publish(`user:${userId}:live`, JSON.stringify(liveData));

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("logActivity error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getActivitySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await Activity.aggregate([
      { $match: { userId } },
      { $group: { _id: "$domain", totalDuration: { $sum: "$duration" }, sessionCount: { $sum: 1 }, lastVisit: { $max: "$startTime" } } },
      { $sort: { totalDuration: -1 } }
    ]);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("getActivitySummary error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getLiveActivity = async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.user.id, isActive: true }).sort({ startTime: -1 });
    const data = activities.map(a => ({
      sessionId: a.sessionId,
      domain: a.domain,
      url: a.url,
      title: a.title,
      duration: a.duration,
      startTime: a.startTime
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error("getLiveActivity error:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
