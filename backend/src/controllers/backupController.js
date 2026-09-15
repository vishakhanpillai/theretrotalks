const path = require('path');
const fs = require('fs');
const os = require('os');
const { DatabaseSync } = require('node:sqlite');
const { db, isTurso } = require('../db/connection');
const { DB_PATH } = require('../config/env');
const reviewRepository = require('../db/repositories/reviewRepository');
const adminRepository = require('../db/repositories/adminRepository');
const { broadcast } = require('../services/eventsService');

const verifyAdmin = async (req, res) => {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
    req.headers['x-admin-token'] ||
    req.query.token;

  const isValid = await adminRepository.validateSessionToken(token);
  if (!token || !isValid) {
    res.status(401).json({ error: 'Unauthorized. Valid admin session token required.' });
    return false;
  }
  return true;
};

const downloadSqlite = async (req, res) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `retro_talks_${dateStr}.sqlite`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (!isTurso && fs.existsSync(DB_PATH)) {
      const fileStream = fs.createReadStream(DB_PATH);
      fileStream.pipe(res);
      return;
    }

    // If Turso Cloud (or local file missing): generate consolidated SQLite file on-the-fly from reviews
    const reviews = await reviewRepository.getAllReviews();
    const tempExportPath = path.join(
      os.tmpdir(),
      `export_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.sqlite`
    );

    const tempDb = new DatabaseSync(tempExportPath);
    try {
      tempDb.exec(`
        CREATE TABLE reviews (
          id TEXT PRIMARY KEY,
          tmdb_id INTEGER,
          title TEXT NOT NULL,
          year TEXT,
          poster TEXT NOT NULL,
          backdrop TEXT,
          backdrop_framing TEXT,
          director TEXT,
          genres TEXT,
          rating REAL NOT NULL,
          review TEXT NOT NULL,
          watched_date TEXT,
          is_favorite INTEGER DEFAULT 0,
          cast TEXT,
          crew TEXT,
          overview TEXT,
          slug TEXT,
          display_order INTEGER DEFAULT 0,
          media_type TEXT DEFAULT 'movie',
          created_at INTEGER,
          updated_at INTEGER
        );
      `);

      const insertStmt = tempDb.prepare(`
        INSERT INTO reviews (
          id, tmdb_id, title, year, poster, backdrop, backdrop_framing, director, genres,
          rating, review, watched_date, is_favorite, cast, crew, overview, slug,
          display_order, media_type, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `);

      for (const r of reviews) {
        insertStmt.run(
          r.id,
          r.tmdbId ?? null,
          r.title,
          r.year ?? '',
          r.poster,
          r.backdrop ?? '',
          r.backdropFraming ? JSON.stringify(r.backdropFraming) : null,
          r.director ?? 'Unknown Director',
          JSON.stringify(r.genres || []),
          Number(r.rating) || 0,
          r.review,
          r.watchedDate ?? '',
          r.isFavorite ? 1 : 0,
          JSON.stringify(r.cast || []),
          JSON.stringify(r.crew || []),
          r.overview ?? null,
          r.slug ?? '',
          r.displayOrder ?? 0,
          r.mediaType ?? 'movie',
          Number(r.createdAt) || Date.now(),
          Date.now()
        );
      }
    } finally {
      tempDb.close();
    }

    const fileStream = fs.createReadStream(tempExportPath);
    fileStream.pipe(res);
    fileStream.on('close', () => {
      if (fs.existsSync(tempExportPath)) {
        try {
          fs.unlinkSync(tempExportPath);
        } catch (e) {
          // ignore
        }
      }
    });
  } catch (err) {
    console.error('Download SQLite error:', err);
    res.status(500).json({ error: 'Failed to download database backup' });
  }
};

const exportJson = async (req, res) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const reviews = await reviewRepository.getAllReviews();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `theretrotalks_backup_${dateStr}.json`;

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      platform: 'The Retro Talks',
      schemaVersion: '1.0',
      totalReviews: reviews.length,
      reviews,
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(jsonString);
  } catch (err) {
    console.error('Export JSON error:', err);
    res.status(500).json({ error: 'Failed to export reviews as JSON' });
  }
};

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

const exportCsv = async (req, res) => {
  if (!(await verifyAdmin(req, res))) return;

  try {
    const reviews = await reviewRepository.getAllReviews();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `theretrotalks_reviews_${dateStr}.csv`;

    const headers = [
      'ID',
      'TMDB_ID',
      'Type',
      'Title',
      'Year',
      'Director',
      'Rating',
      'Watched_Date',
      'Favorite',
      'Genres',
      'Review',
      'Overview',
      'Poster_URL',
      'Backdrop_URL',
      'Slug',
      'Created_At',
    ];

    const rows = reviews.map((r) => [
      escapeCSV(r.id),
      escapeCSV(r.tmdbId),
      escapeCSV(r.mediaType || 'movie'),
      escapeCSV(r.title),
      escapeCSV(r.year),
      escapeCSV(r.director),
      escapeCSV(r.rating),
      escapeCSV(r.watchedDate),
      escapeCSV(r.isFavorite ? 'Yes' : 'No'),
      escapeCSV(Array.isArray(r.genres) ? r.genres.join(', ') : ''),
      escapeCSV(r.review),
      escapeCSV(r.overview || ''),
      escapeCSV(r.poster),
      escapeCSV(r.backdrop),
      escapeCSV(r.slug || ''),
      escapeCSV(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export reviews as CSV' });
  }
};

const parseCSV = (text) => {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentVal);
      currentVal = '';
      if (row.some((cell) => cell.trim().length > 0)) {
        lines.push(row);
      }
      row = [];
    } else {
      currentVal += char;
    }
  }
  if (currentVal || row.length > 0) {
    row.push(currentVal);
    if (row.some((cell) => cell.trim().length > 0)) {
      lines.push(row);
    }
  }

  if (lines.length < 2) return [];
  const headers = lines[0].map((h) => h.trim().replace(/^[\uFEFF"']|["']$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    records.push(record);
  }
  return records;
};

const importDatabase = async (req, res) => {
  if (!(await verifyAdmin(req, res))) return;

  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: "No file uploaded. Please provide a .sqlite, .json, or .csv file." });
  }

  const mode = req.body.mode === "merge" ? "merge" : "replace";
  const buffer = req.file.buffer;
  const originalName = (req.file.originalname || "").toLowerCase();

  let reviews = [];
  let detectedFormat = "unknown";

  try {
    const isSqliteHeader = buffer.length > 16 && buffer.subarray(0, 16).toString("ascii") === "SQLite format 3\0";
    const isSqliteExt = originalName.endsWith(".sqlite") || originalName.endsWith(".db");

    if (isSqliteHeader || isSqliteExt) {
      detectedFormat = "sqlite";
      const tempPath = path.join(
        os.tmpdir(),
        `import_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.sqlite`
      );

      try {
        fs.writeFileSync(tempPath, buffer);
        const tempDb = new DatabaseSync(tempPath);
        try {
          const tableCheck = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'").get();
          if (!tableCheck) {
            throw new Error("Invalid SQLite database: 'reviews' table was not found.");
          }
          reviews = tempDb.prepare("SELECT * FROM reviews").all();
        } finally {
          tempDb.close();
        }
      } finally {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {
            // ignore cleanup error
          }
        }
      }
    } else {
      const text = buffer.toString("utf-8").trim();

      if (text.startsWith("{") || text.startsWith("[")) {
        detectedFormat = "json";
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          reviews = parsed;
        } else if (parsed && Array.isArray(parsed.reviews)) {
          reviews = parsed.reviews;
        } else if (parsed && typeof parsed === "object") {
          const values = Object.values(parsed);
          if (values.length > 0 && typeof values[0] === "object") {
            reviews = values;
          }
        }
      } else {
        detectedFormat = "csv";
        reviews = parseCSV(text);
      }
    }

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        error: "No valid movie reviews could be extracted from the uploaded file.",
        detectedFormat,
      });
    }

    const result = await reviewRepository.importReviewsBatch(reviews, mode);

    try {
      broadcast("reviews_updated", { action: "import", count: result.count, mode });
    } catch (e) {
      console.warn("Broadcast warning:", e.message);
    }

    res.json({
      success: true,
      message: `Successfully imported ${result.count} review${result.count === 1 ? "" : "s"} (${mode === "replace" ? "Replaced database" : "Merged with existing"}).`,
      importedCount: result.count,
      totalReviews: result.total,
      mode,
      format: detectedFormat,
    });
  } catch (err) {
    console.error("Import error:", err);
    res.status(400).json({
      error: `Failed to import database: ${err.message || "Invalid or corrupt file format."}`,
    });
  }
};

module.exports = {
  downloadSqlite,
  exportJson,
  exportCsv,
  importDatabase,
};
