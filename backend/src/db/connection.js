const { DatabaseSync } = require("node:sqlite");
const { DB_PATH } = require("../config/env");

// Initialize Database connection
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and resilience
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

module.exports = {
  db,
};
