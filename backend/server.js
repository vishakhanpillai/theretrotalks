const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { PORT, FRONTEND_DIST } = require("./src/config/env");
const apiRoutes = require("./src/routes");
const { enrichAllReviewsOnStartup } = require("./src/services/reviewEnrichmentService");

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

// Public health check
app.get("/", (req, res) => {
  res.json({
    message: "The Retro Talks API is Running (SQLite Database Active)...",
    status: "healthy",
  });
});

// Mount all API routes
app.use("/api", apiRoutes);

// Serve frontend build in production if available
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    }
    next();
  });
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (SQLite Active)`);
  // Run credits enrichment in the background on startup
  enrichAllReviewsOnStartup().catch((err) => console.warn("Credit backfill error:", err.message));
});

module.exports = { app, server };
