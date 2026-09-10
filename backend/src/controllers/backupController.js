const path = require('path');
const fs = require('fs');
const { db } = require('../db/connection');
const { DB_PATH } = require('../config/env');
const reviewRepository = require('../db/repositories/reviewRepository');
const adminRepository = require('../db/repositories/adminRepository');

const verifyAdmin = (req, res) => {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
    req.headers['x-admin-token'] ||
    req.query.token;

  if (!token || !adminRepository.validateSessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Valid admin session token required.' });
    return false;
  }
  return true;
};

const downloadSqlite = (req, res) => {
  if (!verifyAdmin(req, res)) return;

  try {
    // Flush WAL writes so retro_talks.db is completely consolidated and clean
    try {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      console.warn('WAL checkpoint warning:', e.message);
    }

    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ error: 'Database file not found on server' });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `retro_talks_${dateStr}.sqlite`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(DB_PATH);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Download SQLite error:', err);
    res.status(500).json({ error: 'Failed to download database backup' });
  }
};

const exportJson = (req, res) => {
  if (!verifyAdmin(req, res)) return;

  try {
    const reviews = reviewRepository.getAllReviews();
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

const exportCsv = (req, res) => {
  if (!verifyAdmin(req, res)) return;

  try {
    const reviews = reviewRepository.getAllReviews();
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

module.exports = {
  downloadSqlite,
  exportJson,
  exportCsv,
};
