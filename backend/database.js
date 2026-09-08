const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const DB_PATH = path.resolve(__dirname, "retro_talks.db");
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and resilience
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

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
  // column already exists
}
try {
  db.exec("ALTER TABLE reviews ADD COLUMN crew TEXT;");
} catch (e) {
  // column already exists
}

// Strictly retrieve admin password from environment variable
const getAdminPassword = () => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error("SECURITY ALERT: ADMIN_PASSWORD environment variable is not defined in backend/.env!");
    return null;
  }
  return password;
};

// Seed initial sample reviews if table is empty
const seedCount = db.prepare("SELECT COUNT(*) as count FROM reviews").get().count;

if (seedCount === 0) {
  console.log("Seeding initial personal cinema reviews into SQLite database...");
  const initialReviews = [
    {
      id: "rev-1",
      tmdb_id: 2164,
      title: "Swades",
      year: "2004",
      poster: "https://image.tmdb.org/t/p/w500/i9f3H2XbE0P9gLp0R4M8Hk7F6Q5.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/m9P3H2XbE0P9gLp0R4M8Hk7F6Q5.jpg",
      director: "Ashutosh Gowariker",
      genres: JSON.stringify(["Drama"]),
      rating: 5.0,
      review: "A masterpiece in restrained patriotism. The caravan sequence with water sold at the train station remains one of the most poignant moments in Indian cinema.",
      watched_date: "Aug 15, 2026",
      is_favorite: 1,
      created_at: 1723680000000,
      updated_at: 1723680000000
    },
    {
      id: "rev-2",
      tmdb_id: 61128,
      title: "Zindagi Na Milegi Dobara",
      year: "2011",
      poster: "https://image.tmdb.org/t/p/w500/y6p9p9a6S4z5A6z3L5R1T7y8U9V.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/7vYp9p9a6S4z5A6z3L5R1T7y8U9V.jpg",
      director: "Zoya Akhtar",
      genres: JSON.stringify(["Drama", "Comedy", "Adventure"]),
      rating: 4.5,
      review: "The ultimate modern road film. Beyond the stunning Spanish landscapes and skydiving sequences, it's really an examination of baggage we carry and the fear of truly living.",
      watched_date: "Aug 28, 2026",
      is_favorite: 1,
      created_at: 1724803200000,
      updated_at: 1724803200000
    },
    {
      id: "rev-3",
      tmdb_id: 157336,
      title: "Interstellar",
      year: "2014",
      poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/rAiYTsqJJR0nhkQw852apzgG0vV.jpg",
      director: "Christopher Nolan",
      genres: JSON.stringify(["Adventure", "Drama", "Science Fiction"]),
      rating: 5.0,
      review: "Nolan's triumph of combining theoretical physics with visceral emotional weight. Zimmer's organ score drives the docking sequence into pure cinematic adrenaline.",
      watched_date: "Sep 01, 2026",
      is_favorite: 1,
      created_at: 1725148800000,
      updated_at: 1725148800000
    },
    {
      id: "rev-4",
      tmdb_id: 353081,
      title: "Mission: Impossible - Fallout",
      year: "2018",
      poster: "https://image.tmdb.org/t/p/w500/AkJQvtR09Nuvv7z8x1p75TSt2sm.jpg",
      backdrop: "https://image.tmdb.org/t/p/original/aw4Acl5EFwV79aoqR56S89sC62x.jpg",
      director: "Christopher McQuarrie",
      genres: JSON.stringify(["Action", "Adventure", "Thriller"]),
      rating: 4.5,
      review: "The gold standard of modern practical action. The bathroom brawl and halo jump set pieces are masterclasses in kinetic cinematography and sound design.",
      watched_date: "Sep 04, 2026",
      is_favorite: 0,
      created_at: 1725408000000,
      updated_at: 1725408000000
    }
  ];

  const insertStmt = db.prepare(`
    INSERT INTO reviews (id, tmdb_id, title, year, poster, backdrop, director, genres, rating, review, watched_date, is_favorite, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of initialReviews) {
    insertStmt.run(
      r.id,
      r.tmdb_id,
      r.title,
      r.year,
      r.poster,
      r.backdrop,
      r.director,
      r.genres,
      r.rating,
      r.review,
      r.watched_date,
      r.is_favorite,
      r.created_at,
      r.updated_at
    );
  }
}

// Database helper methods
const getAllReviews = () => {
  const rows = db.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all();
  return rows.map((row) => ({
    id: row.id,
    tmdbId: row.tmdb_id,
    title: row.title,
    year: row.year,
    poster: row.poster,
    backdrop: row.backdrop,
    director: row.director,
    genres: row.genres ? JSON.parse(row.genres) : [],
    rating: row.rating,
    review: row.review,
    watchedDate: row.watched_date,
    isFavorite: Boolean(row.is_favorite),
    cast: row.cast ? JSON.parse(row.cast) : [],
    crew: row.crew ? JSON.parse(row.crew) : [],
    createdAt: row.created_at
  }));
};

const getReviewById = (id) => {
  const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(String(id));
  if (!row) return null;
  return {
    id: row.id,
    tmdbId: row.tmdb_id,
    title: row.title,
    year: row.year,
    poster: row.poster,
    backdrop: row.backdrop,
    director: row.director,
    genres: row.genres ? JSON.parse(row.genres) : [],
    rating: row.rating,
    review: row.review,
    watchedDate: row.watched_date,
    isFavorite: Boolean(row.is_favorite),
    cast: row.cast ? JSON.parse(row.cast) : [],
    crew: row.crew ? JSON.parse(row.crew) : []
  };
};

const createReview = (reviewData) => {
  const id = reviewData.id || `rev-${Date.now()}`;
  const now = Date.now();
  const genresStr = JSON.stringify(reviewData.genres || []);
  const castStr = JSON.stringify(reviewData.cast || []);
  const crewStr = JSON.stringify(reviewData.crew || []);

  const stmt = db.prepare(`
    INSERT INTO reviews (id, tmdb_id, title, year, poster, backdrop, director, genres, rating, review, watched_date, is_favorite, cast, crew, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    reviewData.tmdbId || reviewData.tmdb_id || 0,
    reviewData.title,
    reviewData.year || "",
    reviewData.poster,
    reviewData.backdrop || "",
    reviewData.director || "Unknown Director",
    genresStr,
    Number(reviewData.rating) || 5.0,
    reviewData.review,
    reviewData.watchedDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    reviewData.isFavorite ? 1 : 0,
    castStr,
    crewStr,
    now,
    now
  );

  return getReviewById(id);
};

const updateReviewCredits = (id, cast, crew) => {
  const now = Date.now();
  db.prepare("UPDATE reviews SET cast = ?, crew = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(cast || []),
    JSON.stringify(crew || []),
    now,
    String(id)
  );
  return getReviewById(id);
};

const updateReviewPoster = (id, newPosterUrl) => {
  const now = Date.now();
  db.prepare("UPDATE reviews SET poster = ?, updated_at = ? WHERE id = ?").run(newPosterUrl, now, String(id));
  return getReviewById(id);
};

const deleteReview = (id) => {
  const info = db.prepare("DELETE FROM reviews WHERE id = ?").run(String(id));
  return info.changes > 0;
};

// Admin Session Management
const verifyPasswordAndCreateSession = (password) => {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword || typeof password !== "string") {
    return null;
  }

  const inputBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expectedPassword);

  if (inputBuf.length !== expectedBuf.length) {
    // Timing attack mitigation
    crypto.timingSafeEqual(inputBuf, inputBuf);
    return null;
  }

  if (!crypto.timingSafeEqual(inputBuf, expectedBuf)) {
    return null;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare("INSERT INTO admin_sessions (token, created_at) VALUES (?, ?)").run(token, now);
  return token;
};

const validateSessionToken = (token) => {
  if (!token) return false;
  const session = db.prepare("SELECT * FROM admin_sessions WHERE token = ?").get(token);
  return Boolean(session);
};

const revokeSession = (token) => {
  if (!token) return;
  db.prepare("DELETE FROM admin_sessions WHERE token = ?").run(token);
};

module.exports = {
  db,
  getAllReviews,
  getReviewById,
  createReview,
  updateReviewCredits,
  updateReviewPoster,
  deleteReview,
  verifyPasswordAndCreateSession,
  validateSessionToken,
  revokeSession
};
