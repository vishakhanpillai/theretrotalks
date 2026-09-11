const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const reviewRoutes = require("./reviewRoutes");
const movieRoutes = require("./movieRoutes");
const { handleSseConnection } = require("../services/eventsService");

router.use("/admin", authRoutes);
router.use("/reviews", reviewRoutes);
router.use("/movies", movieRoutes);

// Real-time Server-Sent Events (SSE) live updates stream
router.get("/events", handleSseConnection);

// Image proxy for cross-origin safe canvas & story card image export
router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url query param required" });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch remote image" });
    }
    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("Proxy image error:", err);
    res.status(500).json({ error: "Proxy image error" });
  }
});

module.exports = router;
