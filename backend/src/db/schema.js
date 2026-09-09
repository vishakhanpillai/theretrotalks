const { slugify } = require("../utils/slugify");

const initSchema = (db) => {
  // Initialize Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      tmdb_id INTEGER,
      title TEXT NOT NULL,
      year TEXT,
      poster TEXT NOT NULL,
      backdrop TEXT,
      director TEXT,
      genres TEXT, -- JSON array
      rating REAL NOT NULL,
      review TEXT NOT NULL,
      watched_date TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER
    );
  `);

  // Safely ensure cast and crew columns exist in reviews table
  try {
    db.exec("ALTER TABLE reviews ADD COLUMN cast TEXT;");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE reviews ADD COLUMN crew TEXT;");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE reviews ADD COLUMN overview TEXT;");
  } catch (e) {
    // Column already exists
  }

  try {
    db.exec("ALTER TABLE reviews ADD COLUMN slug TEXT;");
  } catch (e) {
    // Column already exists
  }

  // Populate empty slugs
  try {
    const unslugged = db.prepare("SELECT id, title FROM reviews WHERE slug IS NULL OR slug = ''").all();
    if (unslugged.length > 0) {
      const updateSlug = db.prepare("UPDATE reviews SET slug = ? WHERE id = ?");
      for (const r of unslugged) {
        updateSlug.run(slugify(r.title), r.id);
      }
    }
  } catch (e) {
    console.warn("Slug migration error:", e.message);
  }
};

module.exports = {
  initSchema,
};
