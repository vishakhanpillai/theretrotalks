const { db } = require("../connection");
const { slugify } = require("../../utils/slugify");

const getAllReviews = () => {
  const rows = db.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all();
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug || slugify(row.title),
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
    overview: row.overview || null,
    createdAt: row.created_at,
  }));
};

const getReviewById = (idOrSlug) => {
  if (!idOrSlug) return null;
  const clean = String(idOrSlug).trim();
  let row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(clean);
  if (!row) {
    row = db.prepare("SELECT * FROM reviews WHERE slug = ?").get(clean);
  }
  if (!row) {
    const all = db.prepare("SELECT * FROM reviews").all();
    row = all.find((r) => r.slug === clean || slugify(r.title) === clean);
  }
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug || slugify(row.title),
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
    overview: row.overview || null,
    createdAt: row.created_at,
  };
};

const createReview = (reviewData) => {
  const id = reviewData.id || `rev-${Date.now()}`;
  const now = Date.now();
  const slug = reviewData.slug || slugify(reviewData.title);
  const genresStr = JSON.stringify(reviewData.genres || []);
  const castStr = JSON.stringify(reviewData.cast || []);
  const crewStr = JSON.stringify(reviewData.crew || []);

  const stmt = db.prepare(`
    INSERT INTO reviews (id, tmdb_id, title, year, poster, backdrop, director, genres, rating, review, watched_date, is_favorite, cast, crew, overview, slug, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    reviewData.overview || null,
    slug,
    now,
    now
  );

  return getReviewById(id);
};

const updateReview = (id, updates) => {
  const current = getReviewById(id);
  if (!current) return null;

  const now = Date.now();
  const rating = updates.rating !== undefined ? Number(updates.rating) : current.rating;
  const review = updates.review !== undefined ? updates.review : current.review;
  const watchedDate = updates.watchedDate !== undefined ? updates.watchedDate : current.watchedDate;
  const isFavorite = updates.isFavorite !== undefined ? (updates.isFavorite ? 1 : 0) : (current.isFavorite ? 1 : 0);
  const title = updates.title !== undefined ? updates.title : current.title;
  const year = updates.year !== undefined ? updates.year : current.year;
  const director = updates.director !== undefined ? updates.director : current.director;
  const slug = updates.slug || (updates.title ? slugify(updates.title) : current.slug);

  db.prepare(`
    UPDATE reviews 
    SET title = ?, slug = ?, year = ?, director = ?, rating = ?, review = ?, watched_date = ?, is_favorite = ?, updated_at = ?
    WHERE id = ?
  `).run(
    title,
    slug,
    year,
    director,
    rating,
    review,
    watchedDate,
    isFavorite,
    now,
    String(id)
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

const updateReviewBackdrop = (id, newBackdropUrl) => {
  const now = Date.now();
  db.prepare("UPDATE reviews SET backdrop = ?, updated_at = ? WHERE id = ?").run(newBackdropUrl, now, String(id));
  return getReviewById(id);
};

const updateReviewOverview = (id, overview) => {
  const now = Date.now();
  db.prepare("UPDATE reviews SET overview = ?, updated_at = ? WHERE id = ?").run(overview, now, String(id));
  return getReviewById(id);
};

const deleteReview = (id) => {
  const info = db.prepare("DELETE FROM reviews WHERE id = ?").run(String(id));
  return info.changes > 0;
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  updateReviewCredits,
  updateReviewPoster,
  updateReviewBackdrop,
  updateReviewOverview,
  deleteReview,
};
