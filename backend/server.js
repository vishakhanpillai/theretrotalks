const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { PORT, FRONTEND_DIST } = require("./src/config/env");
const { initDatabase, isTurso } = require("./src/db");
const apiRoutes = require("./src/routes");
const { enrichAllReviewsOnStartup } = require("./src/services/reviewEnrichmentService");

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health check endpoint (for Docker, load balancers, orchestrators)
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    database: isTurso ? "turso_cloud" : "local_sqlite",
    timestamp: new Date().toISOString(),
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
} else {
  // Public message fallback if frontend dist is not built
  app.get("/", (req, res) => {
    res.json({
      message: `The Retro Talks API is Running (${isTurso ? "Turso Cloud Active" : "SQLite Database Active"})...`,
      status: "healthy",
    });
  });
}

// Start server after ensuring database schema and seed are ready
let server = null;
async function startServer() {
  await initDatabase();
  server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (${isTurso ? "Turso Cloud Active" : "SQLite Active"})`);
    // Run credits enrichment in the background on startup
    enrichAllReviewsOnStartup().catch((err) => console.warn("Credit backfill error:", err.message));
  });
  return server;
}

startServer().catch((err) => {
  console.error("Fatal startup error:", err);
});

module.exports = { app, server };
