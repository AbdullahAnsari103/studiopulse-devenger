import { Router } from "express";
import { handleYouTubePushNotification } from "../integrations/youtube-ingestion";

const router = Router();

// Endpoint for YouTube WebSub / PubSubHubbub Push Notifications
router.all("/youtube", async (req, res) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const query = (req.query || {}) as Record<string, string>;

    const result = await handleYouTubePushNotification(req.method, query, rawBody);
    res.status(result.status).send(result.body);
  } catch (err) {
    console.error("[WebhooksRouter] Error handling YouTube push notification:", err);
    res.status(500).send("Internal Server Error");
  }
});

export default router;
