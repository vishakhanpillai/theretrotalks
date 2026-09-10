const { TMDB_BASE_URL, TMDB_ACCESS_TOKEN, TMDB_IMAGE_BASE_URL } = require("../config/env");
const { getCrewPriority } = require("../config/crewPriority");

const formatImageUrl = (path, size = "w500") => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
};

async function fetchTMDB(url, retries = 6) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
          accept: "application/json",
        },
        keepalive: false,
      });
      return response;
    } catch (err) {
      if (i < retries - 1) {
        const waitMs = (i + 1) * 350;
        console.warn(`TMDB connection attempt ${i + 1} failed (${err.message}). Retrying in ${waitMs}ms...`);
        await new Promise((res) => setTimeout(res, waitMs));
        continue;
      }
      throw err;
    }
  }
}

const extractPrioritizedCrew = (crewList, limit = 10) => {
  if (!Array.isArray(crewList)) return [];
  const candidates = crewList
    .filter((c) => getCrewPriority(c.job) < 99)
    .sort((a, b) => getCrewPriority(a.job) - getCrewPriority(b.job));

  const seen = new Set();
  const result = [];
  for (const c of candidates) {
    const key = `${c.id}-${c.job}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        id: c.id,
        name: c.name,
        job: c.job,
        department: c.department,
        picture: formatImageUrl(c.profile_path, "w185"),
      });
      if (result.length >= limit) break;
    }
  }
  return result;
};

const extractTopCast = (castList, limit = 10) => {
  if (!Array.isArray(castList)) return [];
  return castList.slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character,
    picture: formatImageUrl(c.profile_path, "w185"),
  }));
};

const searchMovies = async (query) => {
  const response = await fetchTMDB(
    `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&include_adult=true`
  );

  if (!response.ok) {
    const errText = await response.text();
    const error = new Error("TMDB API Error");
    error.status = response.status;
    error.details = errText;
    throw error;
  }

  const data = await response.json();

  const results = (data.results || [])
    .filter((item) => item.media_type === "movie" || item.media_type === "tv")
    .map((item) => {
      const isTv = item.media_type === "tv";
      return {
        id: item.id,
        mediaType: isTv ? "tv" : "movie",
        title: isTv ? (item.name || item.original_name) : (item.title || item.original_title),
        year: isTv
          ? (item.first_air_date ? item.first_air_date.split("-")[0] : null)
          : (item.release_date ? item.release_date.split("-")[0] : null),
        poster: formatImageUrl(item.poster_path, "w500"),
        backdrop: formatImageUrl(item.backdrop_path, "original"),
        overview: item.overview,
        tmdbRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
        voteCount: item.vote_count,
      };
    });

  return {
    results,
    totalResults: data.total_results || results.length,
  };
};

const getUpcomingMonthMovies = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const monthNum = String(monthIndex + 1).padStart(2, "0");

  const firstDay = `${year}-${monthNum}-01`;
  const lastDayObj = new Date(year, monthIndex + 1, 0);
  const lastDay = `${year}-${monthNum}-${String(lastDayObj.getDate()).padStart(2, "0")}`;

  const url = `${TMDB_BASE_URL}/discover/movie?primary_release_date.gte=${firstDay}&primary_release_date.lte=${lastDay}&sort_by=popularity.desc&include_adult=false&page=1`;

  const response = await fetchTMDB(url);
  const data = await response.json();
  let results = data.results || [];

  // If fewer than 8 movies in current month, supplement with upcoming releases
  if (results.length < 8) {
    try {
      const fallbackRes = await fetchTMDB(`${TMDB_BASE_URL}/movie/upcoming?language=en-US&page=1`);
      const fallbackData = await fallbackRes.json();
      const combined = [...results, ...(fallbackData.results || [])];
      const seen = new Set();
      results = combined.filter((m) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    } catch (fbErr) {
      console.warn("Fallback upcoming error:", fbErr.message);
    }
  }

  const movies = results.slice(0, 10).map((movie) => ({
    id: movie.id,
    title: movie.title,
    releaseDate: movie.release_date || null,
    formattedDate: movie.release_date
      ? new Date(movie.release_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "TBA",
    poster: formatImageUrl(movie.poster_path, "w342"),
    backdrop: formatImageUrl(movie.backdrop_path, "original"),
    overview: movie.overview,
    tmdbRating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
    popularity: movie.popularity,
  }));

  return {
    monthName,
    year,
    count: movies.length,
    movies,
  };
};

const getMovieDetails = async (movieId, mediaType = "movie") => {
  const isTv = mediaType === "tv";
  const primaryEndpoint = isTv ? "tv" : "movie";

  let response = await fetchTMDB(
    `${TMDB_BASE_URL}/${primaryEndpoint}/${movieId}?append_to_response=credits,videos`
  );
  let resolvedType = primaryEndpoint;

  // Resilient fallback: If requested endpoint fails with 404, check the other endpoint
  if (!response.ok && !isTv) {
    try {
      const tvResponse = await fetchTMDB(
        `${TMDB_BASE_URL}/tv/${movieId}?append_to_response=credits,videos`
      );
      if (tvResponse.ok) {
        response = tvResponse;
        resolvedType = "tv";
      }
    } catch (e) {
      // Keep original response error
    }
  } else if (!response.ok && isTv) {
    try {
      const movieResponse = await fetchTMDB(
        `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits,videos`
      );
      if (movieResponse.ok) {
        response = movieResponse;
        resolvedType = "movie";
      }
    } catch (e) {
      // Keep original response error
    }
  }

  if (!response.ok) {
    const error = new Error(`Failed to fetch media details from TMDB (${resolvedType})`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const isTvResolved = resolvedType === "tv";

  let director = null;
  if (isTvResolved) {
    const creator = Array.isArray(data.created_by) && data.created_by.length > 0
      ? data.created_by.map((c) => c.name).join(", ")
      : null;
    director = creator || data.credits?.crew?.find(
      (person) => person.job === "Director" || person.job === "Creator" || person.job === "Showrunner" || person.department === "Directing"
    )?.name || null;
  } else {
    const dir = data.credits?.crew?.find(
      (person) => person.job === "Director" && person.department === "Directing"
    );
    director = dir ? dir.name : null;
  }

  const cast = extractTopCast(data.credits?.cast, 10);
  const crew = extractPrioritizedCrew(data.credits?.crew, 10);

  const ytVideos = (data.videos?.results || []).filter((v) => v.site === "YouTube" && v.key);
  const bestTrailer =
    ytVideos.find((v) => v.type === "Trailer" && v.official) ||
    ytVideos.find((v) => v.type === "Trailer") ||
    ytVideos.find((v) => v.type === "Teaser" && v.official) ||
    ytVideos[0] ||
    null;

  const trailer = bestTrailer
    ? {
        key: bestTrailer.key,
        name: bestTrailer.name,
        site: bestTrailer.site,
        url: `https://www.youtube.com/watch?v=${bestTrailer.key}`,
      }
    : null;

  return {
    id: data.id,
    mediaType: isTvResolved ? "tv" : "movie",
    title: isTvResolved ? (data.name || data.original_name) : data.title,
    year: isTvResolved
      ? (data.first_air_date ? data.first_air_date.split("-")[0] : null)
      : (data.release_date ? data.release_date.split("-")[0] : null),
    poster: formatImageUrl(data.poster_path, "w500"),
    backdrop: formatImageUrl(data.backdrop_path, "original"),
    overview: data.overview,
    tmdbRating: data.vote_average ? Number(data.vote_average.toFixed(1)) : null,
    runtime: isTvResolved ? (data.episode_run_time?.[0] || null) : data.runtime,
    genres: Array.isArray(data.genres) ? data.genres.map((genre) => genre.name) : [],
    director: director ? director : null,
    tagline: data.tagline || null,
    cast,
    crew,
    trailer,
  };
};

const getMoviePosters = async (movieId, mediaType = "movie") => {
  const isTv = mediaType === "tv";
  const primaryEndpoint = isTv ? "tv" : "movie";

  let response = await fetchTMDB(`${TMDB_BASE_URL}/${primaryEndpoint}/${movieId}/images`);
  if (!response.ok && !isTv) {
    try {
      const tvResponse = await fetchTMDB(`${TMDB_BASE_URL}/tv/${movieId}/images`);
      if (tvResponse.ok) response = tvResponse;
    } catch (e) {}
  } else if (!response.ok && isTv) {
    try {
      const movieResponse = await fetchTMDB(`${TMDB_BASE_URL}/movie/${movieId}/images`);
      if (movieResponse.ok) response = movieResponse;
    } catch (e) {}
  }

  if (!response.ok) {
    const error = new Error("Failed to fetch posters from TMDB");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  const posters = (data.posters || [])
    .map((p) => ({
      filePath: p.file_path,
      url: formatImageUrl(p.file_path, "w500"),
      originalUrl: formatImageUrl(p.file_path, "original"),
      width: p.width,
      height: p.height,
      aspectRatio: p.aspect_ratio,
      language: p.iso_639_1,
      voteCount: p.vote_count || 0,
      voteAverage: p.vote_average || 0,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  return {
    movieId: Number(movieId),
    totalPosters: posters.length,
    posters,
  };
};

const getMovieBackdrops = async (movieId, mediaType = "movie") => {
  const isTv = mediaType === "tv";
  const primaryEndpoint = isTv ? "tv" : "movie";

  let response = await fetchTMDB(`${TMDB_BASE_URL}/${primaryEndpoint}/${movieId}/images`);
  if (!response.ok && !isTv) {
    try {
      const tvResponse = await fetchTMDB(`${TMDB_BASE_URL}/tv/${movieId}/images`);
      if (tvResponse.ok) response = tvResponse;
    } catch (e) {}
  } else if (!response.ok && isTv) {
    try {
      const movieResponse = await fetchTMDB(`${TMDB_BASE_URL}/movie/${movieId}/images`);
      if (movieResponse.ok) response = movieResponse;
    } catch (e) {}
  }

  if (!response.ok) {
    const error = new Error("Failed to fetch backdrops from TMDB");
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  const backdrops = (data.backdrops || [])
    .map((b) => ({
      filePath: b.file_path,
      url: formatImageUrl(b.file_path, "w1280"),
      originalUrl: formatImageUrl(b.file_path, "original"),
      width: b.width,
      height: b.height,
      aspectRatio: b.aspect_ratio,
      language: b.iso_639_1,
      voteCount: b.vote_count || 0,
      voteAverage: b.vote_average || 0,
    }))
    .sort((a, b) => b.voteCount - a.voteCount);

  return {
    movieId: Number(movieId),
    totalBackdrops: backdrops.length,
    backdrops,
  };
};

module.exports = {
  fetchTMDB,
  formatImageUrl,
  extractPrioritizedCrew,
  extractTopCast,
  searchMovies,
  getUpcomingMonthMovies,
  getMovieDetails,
  getMoviePosters,
  getMovieBackdrops,
};
