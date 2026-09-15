const { slugify } = require("../utils/slugify");

const initSchema = async (db) => {
  // Initialize Tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      tmdb_id INTEGER,
      title TEXT NOT NULL,
      year TEXT,
      poster TEXT NOT NULL,
      backdrop TEXT,
      director TEXT,
      genres TEXT,
      rating REAL NOT NULL,
      review TEXT NOT NULL,
      watched_date TEXT,
      is_favorite INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      cast TEXT,
      crew TEXT,
      overview TEXT,
      slug TEXT,
      display_order INTEGER DEFAULT 0,
      backdrop_framing TEXT,
      media_type TEXT DEFAULT 'movie'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER
    );
  `);

  // Safely ensure columns exist if reviews table was created with earlier schema
  const optionalColumns = [
    "ALTER TABLE reviews ADD COLUMN cast TEXT;",
    "ALTER TABLE reviews ADD COLUMN crew TEXT;",
    "ALTER TABLE reviews ADD COLUMN overview TEXT;",
    "ALTER TABLE reviews ADD COLUMN slug TEXT;",
    "ALTER TABLE reviews ADD COLUMN display_order INTEGER DEFAULT 0;",
    "ALTER TABLE reviews ADD COLUMN backdrop_framing TEXT;",
    "ALTER TABLE reviews ADD COLUMN media_type TEXT DEFAULT 'movie';",
  ];

  for (const alterSql of optionalColumns) {
    try {
      await db.execute(alterSql);
    } catch (e) {
      // Column already exists or duplicate column name
    }
  }

  // Populate empty slugs
  try {
    const unsluggedRes = await db.execute("SELECT id, title FROM reviews WHERE slug IS NULL OR slug = ''");
    const unslugged = unsluggedRes.rows;
    if (unslugged.length > 0) {
      for (const r of unslugged) {
        await db.execute({
          sql: "UPDATE reviews SET slug = ? WHERE id = ?",
          args: [slugify(r.title), r.id],
        });
      }
    }
  } catch (e) {
    console.warn("Slug migration error:", e.message);
  }

  // Initialize display_order if all rows are 0 or unassigned
  try {
    const rowsRes = await db.execute("SELECT id, created_at, display_order FROM reviews ORDER BY created_at DESC");
    const rows = rowsRes.rows;
    const hasDistinctOrder = rows.some((r, idx) => r.display_order !== 0 && r.display_order !== idx);
    if (!hasDistinctOrder && rows.length > 1) {
      for (let idx = 0; idx < rows.length; idx++) {
        await db.execute({
          sql: "UPDATE reviews SET display_order = ? WHERE id = ?",
          args: [idx, rows[idx].id],
        });
      }
    }
  } catch (e) {
    console.warn("Display order migration error:", e.message);
  }
};

module.exports = {
  initSchema,
};
