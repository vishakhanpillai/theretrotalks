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

const mapRowToReview = (row) => {
  let genres = [];
  try {
    if (row.genres) {
      genres = typeof row.genres === "string" ? JSON.parse(row.genres) : row.genres;
    }
  } catch (e) {
    genres = [];
  }

  let cast = [];
  try {
    if (row.cast) {
      cast = typeof row.cast === "string" ? JSON.parse(row.cast) : row.cast;
    }
  } catch (e) {
    cast = [];
  }

  let crew = [];
  try {
    if (row.crew) {
      crew = typeof row.crew === "string" ? JSON.parse(row.crew) : row.crew;
    }
  } catch (e) {
    crew = [];
  }

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
    genres,
    rating: Number(row.rating),
    review: row.review,
    watchedDate: row.watched_date,
    isFavorite: Boolean(row.is_favorite),
    cast,
    crew,
    overview: row.overview || null,
    createdAt: Number(row.created_at),
  };
};

const getAllReviews = async () => {
  const res = await db.execute("SELECT * FROM reviews ORDER BY display_order ASC, created_at DESC");
  return res.rows.map(mapRowToReview);
};

const getReviewById = async (idOrSlug) => {
  if (!idOrSlug) return null;
  const clean = String(idOrSlug).trim();

  let res = await db.execute({
    sql: "SELECT * FROM reviews WHERE id = ? LIMIT 1",
    args: [clean],
  });

  if (res.rows.length === 0) {
    res = await db.execute({
      sql: "SELECT * FROM reviews WHERE slug = ? LIMIT 1",
      args: [clean],
    });
  }

  if (res.rows.length === 0) {
    const all = await getAllReviews();
    return all.find((r) => r.slug === clean || slugify(r.title) === clean) || null;
  }

  return mapRowToReview(res.rows[0]);
};

const createReview = async (reviewData) => {
  const id = reviewData.id || `rev-${Date.now()}`;
  const now = Date.now();
  const slug = reviewData.slug || slugify(reviewData.title);
  const mediaType = reviewData.mediaType || reviewData.media_type || "movie";
  const genresStr = JSON.stringify(reviewData.genres || []);
  const castStr = JSON.stringify(reviewData.cast || []);
  const crewStr = JSON.stringify(reviewData.crew || []);

  // Shift existing display orders by 1 so newly logged review starts at top (display_order = 0)
  try {
    await db.execute("UPDATE reviews SET display_order = display_order + 1");
  } catch (e) {
    // Ignore if not present
  }

  const insertSql = `
    INSERT INTO reviews (id, tmdb_id, title, year, poster, backdrop, director, genres, rating, review, watched_date, is_favorite, cast, crew, overview, slug, display_order, media_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await db.execute({
    sql: insertSql,
    args: [
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
      now,
    ],
  });

  return getReviewById(id);
};

const updateReview = async (id, updates) => {
  const current = await getReviewById(id);
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

  await db.execute({
    sql: `
      UPDATE reviews 
      SET title = ?, slug = ?, year = ?, director = ?, rating = ?, review = ?, watched_date = ?, is_favorite = ?, media_type = ?, updated_at = ?
      WHERE id = ?
    `,
    args: [
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
      String(id),
    ],
  });

  return getReviewById(id);
};

const updateReviewCredits = async (id, cast, crew) => {
  const now = Date.now();
  await db.execute({
    sql: "UPDATE reviews SET cast = ?, crew = ?, updated_at = ? WHERE id = ?",
    args: [JSON.stringify(cast || []), JSON.stringify(crew || []), now, String(id)],
  });
  return getReviewById(id);
};

const updateReviewPoster = async (id, newPosterUrl) => {
  const now = Date.now();
  await db.execute({
    sql: "UPDATE reviews SET poster = ?, updated_at = ? WHERE id = ?",
    args: [newPosterUrl, now, String(id)],
  });
  return getReviewById(id);
};

const updateReviewBackdrop = async (id, newBackdropUrl) => {
  const now = Date.now();
  await db.execute({
    sql: "UPDATE reviews SET backdrop = ?, updated_at = ? WHERE id = ?",
    args: [newBackdropUrl, now, String(id)],
  });
  return getReviewById(id);
};

const updateReviewBackdropFraming = async (id, framing) => {
  const now = Date.now();
  const cleanFraming = parseBackdropFraming(framing);
  await db.execute({
    sql: "UPDATE reviews SET backdrop_framing = ?, updated_at = ? WHERE id = ?",
    args: [JSON.stringify(cleanFraming), now, String(id)],
  });
  return getReviewById(id);
};

const updateReviewOverview = async (id, overview) => {
  const now = Date.now();
  await db.execute({
    sql: "UPDATE reviews SET overview = ?, updated_at = ? WHERE id = ?",
    args: [overview, now, String(id)],
  });
  return getReviewById(id);
};

const deleteReview = async (id) => {
  const res = await db.execute({
    sql: "DELETE FROM reviews WHERE id = ?",
    args: [String(id)],
  });
  return res.rowsAffected > 0;
};

const reorderReviews = async (orderedIds) => {
  if (!Array.isArray(orderedIds)) return getAllReviews();
  const now = Date.now();

  const stmts = orderedIds.map((id, index) => ({
    sql: "UPDATE reviews SET display_order = ?, updated_at = ? WHERE id = ?",
    args: [index, now, String(id)],
  }));

  await db.batch(stmts, "write");
  return getAllReviews();
};

const importReviewsBatch = async (rawReviews, mode = "replace") => {
  if (!Array.isArray(rawReviews) || rawReviews.length === 0) {
    const all = await getAllReviews();
    return { count: 0, total: all.length };
  }

  const now = Date.now();
  if (mode === "replace") {
    await db.execute("DELETE FROM reviews;");
  }

  const insertSql = `
    INSERT OR REPLACE INTO reviews (
      id, tmdb_id, title, year, poster, backdrop, backdrop_framing, director, genres,
      rating, review, watched_date, is_favorite, cast, crew, overview, slug,
      display_order, media_type, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `;

  const batchStatements = [];

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

    batchStatements.push({
      sql: insertSql,
      args: [
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
        now,
      ],
    });
  });

  // Execute in batches of up to 100 statements
  const CHUNK_SIZE = 100;
  for (let i = 0; i < batchStatements.length; i += CHUNK_SIZE) {
    const chunk = batchStatements.slice(i, i + CHUNK_SIZE);
    await db.batch(chunk, "write");
  }

  const all = await getAllReviews();
  return { count: batchStatements.length, total: all.length };
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
