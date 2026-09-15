const path = require("path");
const fs = require("fs");
const { createClient } = require("@libsql/client");
const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, DB_PATH } = require("../config/env");

const isTurso = Boolean(TURSO_DATABASE_URL);

// Ensure target directory exists for local file fallback
if (!isTurso) {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// Initialize @libsql/client (connects to Turso cloud or local file)
const db = createClient({
  url: isTurso ? TURSO_DATABASE_URL : `file:${DB_PATH}`,
  authToken: isTurso ? TURSO_AUTH_TOKEN : undefined,
});

module.exports = {
  db,
  isTurso,
};
