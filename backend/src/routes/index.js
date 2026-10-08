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

// Whitelisted hosts for SSRF prevention
const ALLOWED_IMAGE_HOSTS = new Set([
  "image.tmdb.org",
  "images.tmdb.org",
  "themoviedb.org",
  "www.themoviedb.org",
]);

// Image proxy for cross-origin safe canvas & story card image export
router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url query param required" });
  }

  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid image URL format" });
  }

  // Validate protocol
  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return res.status(403).json({ error: "Only HTTP/HTTPS URLs are supported" });
  }

  // SSRF Protection: Restrict proxy to legitimate TMDB image hosts
  const hostname = targetUrl.hostname.toLowerCase();
  const isAllowedHost =
    ALLOWED_IMAGE_HOSTS.has(hostname) ||
    hostname.endsWith(".tmdb.org");

  if (!isAllowedHost) {
    return res.status(403).json({
      error: "Forbidden: Image proxy only permits legitimate TMDB domains.",
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "TheRetroTalks/1.0",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch remote image from source" });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Requested resource is not an image" });
    }

    const arrayBuf = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Remote image fetch timed out" });
    }
    console.error("Proxy image error:", err.message);
    res.status(500).json({ error: "Proxy image error" });
  }
});

module.exports = router;
