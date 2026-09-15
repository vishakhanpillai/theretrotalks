const { db } = require("../connection");
const { slugify } = require("../../utils/slugify");

const parseBackdropFraming = (val) => {
  if (!val) return { y: 0, x: 50, height: 70, zoom: 100 };
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    return {
      y: typeof parsed.y === "number" ? Math.min(100, Math.max(0, parsed.y)) : 0,
      x: typeof parsed.x === "number" ? Math.min(100, Math.max(0, parsed.x)) : 50,
      height: typeof parsed.height === "number" ? Math.min(95, Math.max(40, parsed.height)) : 70,
      zoom: typeof parsed.zoom === "number" ? Math.min(200, Math.max(30, parsed.zoom)) : 100,
    };
  } catch (e) {
    return { y: 0, x: 50, height: 70, zoom: 100 };
  }
};

const getAllReviews = () => {
  const rows = db.prepare("SELECT * FROM reviews ORDER BY display_order ASC, created_at DESC").all();
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug || slugify(row.title),
    displayOrder: row.display_order ?? 0,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type || "movie",
    title: row.title,
    year: row.year,
    poster: row.poster,
    backdrop: row.backdrop,
    backdropFraming: parseBackdropFraming(row.backdrop_framing),
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
    displayOrder: row.display_order ?? 0,
    tmdbId: row.tmdb_id,
    mediaType: row.media_type || "movie",
    title: row.title,
    year: row.year,
    poster: row.poster,
    backdrop: row.backdrop,
    backdropFraming: parseBackdropFraming(row.backdrop_framing),
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
  const mediaType = reviewData.mediaType || reviewData.media_type || "movie";
  const genresStr = JSON.stringify(reviewData.genres || []);
  const castStr = JSON.stringify(reviewData.cast || []);
  const crewStr = JSON.stringify(reviewData.crew || []);

  // Shift existing display orders by 1 so newly logged review starts at top (display_order = 0)
  try {
    db.prepare("UPDATE reviews SET display_order = display_order + 1").run();
  } catch (e) {
    // Ignore if column doesn't exist yet
  }

  const stmt = db.prepare(`
    INSERT INTO reviews (id, tmdb_id, title, year, poster, backdrop, director, genres, rating, review, watched_date, is_favorite, cast, crew, overview, slug, display_order, media_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    0,
    mediaType,
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
  const mediaType = updates.mediaType !== undefined ? updates.mediaType : (current.mediaType || "movie");
  const slug = updates.slug || (updates.title ? slugify(updates.title) : current.slug);

  db.prepare(`
    UPDATE reviews 
    SET title = ?, slug = ?, year = ?, director = ?, rating = ?, review = ?, watched_date = ?, is_favorite = ?, media_type = ?, updated_at = ?
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
    mediaType,
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

const updateReviewBackdropFraming = (id, framing) => {
  const now = Date.now();
  const cleanFraming = parseBackdropFraming(framing);
  db.prepare("UPDATE reviews SET backdrop_framing = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(cleanFraming),
    now,
    String(id)
  );
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

const reorderReviews = (orderedIds) => {
  if (!Array.isArray(orderedIds)) return getAllReviews();
  const stmt = db.prepare("UPDATE reviews SET display_order = ?, updated_at = ? WHERE id = ?");
  const now = Date.now();
  db.exec("BEGIN TRANSACTION;");
  try {
    orderedIds.forEach((id, index) => {
      stmt.run(index, now, String(id));
    });
    db.exec("COMMIT;");
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
  return getAllReviews();
};

const importReviewsBatch = (rawReviews, mode = "replace") => {
  if (!Array.isArray(rawReviews) || rawReviews.length === 0) {
    return { count: 0, total: getAllReviews().length };
  }

  const now = Date.now();
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO reviews (
      id, tmdb_id, title, year, poster, backdrop, backdrop_framing, director, genres,
      rating, review, watched_date, is_favorite, cast, crew, overview, slug,
      display_order, media_type, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  db.exec("BEGIN TRANSACTION;");
  try {
    if (mode === "replace") {
      db.exec("DELETE FROM reviews;");
    }

    let inserted = 0;
    rawReviews.forEach((item, index) => {
      if (!item || (!item.title && !item.Title)) return;

      const title = String(item.title || item.Title || "Untitled").trim();
      const id = String(item.id || item.ID || `rev-${now}-${index}-${Math.random().toString(36).substring(2, 6)}`);
      const tmdbId = item.tmdbId ?? item.tmdb_id ?? item.TMDB_ID;
      const parsedTmdbId = tmdbId !== undefined && tmdbId !== null && tmdbId !== "" ? Number(tmdbId) : null;
      const year = String(item.year ?? item.Year ?? "").trim();
      const poster = String(item.poster ?? item.Poster_URL ?? item.poster_url ?? "");
      const backdrop = String(item.backdrop ?? item.Backdrop_URL ?? item.backdrop_url ?? "");
      
      let framingVal = item.backdropFraming ?? item.backdrop_framing;
      if (framingVal && typeof framingVal === "object") {
        framingVal = JSON.stringify(framingVal);
      } else if (typeof framingVal !== "string") {
        framingVal = null;
      }

      const director = String(item.director ?? item.Director ?? "Unknown Director").trim();

      let genresVal = item.genres ?? item.Genres;
      let genresStr = "[]";
      if (Array.isArray(genresVal)) {
        genresStr = JSON.stringify(genresVal);
      } else if (typeof genresVal === "string") {
        const trimmed = genresVal.trim();
        if (trimmed.startsWith("[")) {
          genresStr = trimmed;
        } else {
          genresStr = JSON.stringify(trimmed.split(",").map((s) => s.trim()).filter(Boolean));
        }
      }

      const rating = Number(item.rating ?? item.Rating ?? 0) || 0;
      const reviewText = String(item.review ?? item.Review ?? "").trim();
      const watchedDate = String(
        item.watchedDate ?? item.watched_date ?? item.Watched_Date ?? new Date(now).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      ).trim();

      const favVal = item.isFavorite ?? item.is_favorite ?? item.Favorite;
      const isFavorite = favVal === 1 || favVal === true || favVal === "Yes" || favVal === "true" ? 1 : 0;

      let castVal = item.cast ?? item.Cast;
      let castStr = "[]";
      if (Array.isArray(castVal)) {
        castStr = JSON.stringify(castVal);
      } else if (typeof castVal === "string" && castVal.trim().startsWith("[")) {
        castStr = castVal.trim();
      }

      let crewVal = item.crew ?? item.Crew;
      let crewStr = "[]";
      if (Array.isArray(crewVal)) {
        crewStr = JSON.stringify(crewVal);
      } else if (typeof crewVal === "string" && crewVal.trim().startsWith("[")) {
        crewStr = crewVal.trim();
      }

      const overview = item.overview ?? item.Overview ?? null;
      const slug = item.slug ?? item.Slug ?? slugify(title);
      const displayOrder = typeof (item.displayOrder ?? item.display_order ?? item.Display_Order) === "number"
        ? (item.displayOrder ?? item.display_order ?? item.Display_Order)
        : index;
      const mediaType = String(item.mediaType ?? item.media_type ?? item.Type ?? "movie").toLowerCase() === "tv" ? "tv" : "movie";

      let createdAt = Number(item.createdAt ?? item.created_at);
      if (!createdAt || isNaN(createdAt)) {
        if (item.Created_At) {
          const parsedDate = new Date(item.Created_At).getTime();
          createdAt = !isNaN(parsedDate) ? parsedDate : now - index * 1000;
        } else {
          createdAt = now - index * 1000;
        }
      }

      insertStmt.run(
        id,
        parsedTmdbId,
        title,
        year,
        poster,
        backdrop,
        framingVal,
        director,
        genresStr,
        rating,
        reviewText,
        watchedDate,
        isFavorite,
        castStr,
        crewStr,
        overview,
        slug,
        displayOrder,
        mediaType,
        createdAt,
        now
      );
      inserted++;
    });

    db.exec("COMMIT;");
    return { count: inserted, total: getAllReviews().length };
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  updateReviewCredits,
  updateReviewPoster,
  updateReviewBackdrop,
  updateReviewBackdropFraming,
  updateReviewOverview,
  deleteReview,
  reorderReviews,
  importReviewsBatch,
};
