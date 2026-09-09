const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");
const { DB_PATH } = require("../config/env");

// Ensure target directory exists for container volumes / custom paths
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize Database connection
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and resilience
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

module.exports = {
  db,
};
