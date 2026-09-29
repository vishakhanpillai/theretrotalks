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

const extractOfficialReleaseDate = (releaseDatesResults, fallbackDate) => {
  if (!releaseDatesResults || !Array.isArray(releaseDatesResults)) {
    return fallbackDate;
  }
  const usEntry = releaseDatesResults.find((r) => r.iso_3166_1 === "US");
  const fallbackEntry = releaseDatesResults[0];

  const getTheatricalFromEntry = (entry) => {
    if (!entry || !Array.isArray(entry.release_dates)) return null;
    // type 3: Theatrical (wide), type 2: Theatrical (limited), type 4: Digital, type 1: Premiere
    const theatrical =
      entry.release_dates.find((d) => d.type === 3) ||
      entry.release_dates.find((d) => d.type === 2) ||
      entry.release_dates.find((d) => d.type === 4) ||
      entry.release_dates[0];
    return theatrical?.release_date ? theatrical.release_date.split("T")[0] : null;
  };

  const usDate = getTheatricalFromEntry(usEntry);
  if (usDate) return usDate;

  const fallbackDateFromEntry = getTheatricalFromEntry(fallbackEntry);
  if (fallbackDateFromEntry) return fallbackDateFromEntry;

  return fallbackDate;
};

const getUpcomingMonthMovies = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthName = now.toLocaleString("en-US", { month: "long" });

  const monthNum = String(now.getMonth() + 1).padStart(2, "0");
  const dayNum = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${monthNum}-${dayNum}`;

  // Look ahead 90 days to gather upcoming theatrical releases
  const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const futureYear = futureDate.getFullYear();
  const futureMonth = String(futureDate.getMonth() + 1).padStart(2, "0");
  const futureDay = String(futureDate.getDate()).padStart(2, "0");
  const futureDateStr = `${futureYear}-${futureMonth}-${futureDay}`;

  const discoverUrl = `${TMDB_BASE_URL}/discover/movie?region=US&with_release_type=2|3&primary_release_date.gte=${todayStr}&primary_release_date.lte=${futureDateStr}&sort_by=popularity.desc&include_adult=false&page=1`;
  const upcomingUrl = `${TMDB_BASE_URL}/movie/upcoming?language=en-US&page=1&region=US`;

  let results = [];
  try {
    const [resDiscover, resUpcoming] = await Promise.all([
      fetchTMDB(discoverUrl),
      fetchTMDB(upcomingUrl),
    ]);
    const [dataDiscover, dataUpcoming] = await Promise.all([
      resDiscover.json(),
      resUpcoming.json(),
    ]);
    const combined = [...(dataDiscover.results || []), ...(dataUpcoming.results || [])];
    const seen = new Set();
    for (const m of combined) {
      if (m && m.id && m.poster_path && !seen.has(m.id)) {
        seen.add(m.id);
        results.push(m);
      }
    }
  } catch (err) {
    console.warn("Discover upcoming error:", err.message);
  }

  // Fetch official theatrical release dates from TMDB release_dates endpoint
  const candidatesWithOfficialDates = await Promise.all(
    results.slice(0, 20).map(async (movie) => {
      try {
        const detailRes = await fetchTMDB(`${TMDB_BASE_URL}/movie/${movie.id}?append_to_response=release_dates`);
        const detail = await detailRes.json();
        const officialDate = extractOfficialReleaseDate(detail.release_dates?.results, movie.release_date);
        return {
          ...movie,
          release_date: officialDate,
        };
      } catch {
        return movie;
      }
    })
  );

  // STRICT FILTER: Only movies releasing from today (same day) or in the future
  const upcomingOnly = candidatesWithOfficialDates.filter(
    (movie) => movie && movie.release_date && movie.release_date >= todayStr
  );

  // Sort chronologically by official release date (closest upcoming release first); tie-break with popularity
  upcomingOnly.sort((a, b) => {
    const dateDiff = a.release_date.localeCompare(b.release_date);
    if (dateDiff !== 0) return dateDiff;
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const movies = upcomingOnly.slice(0, 10).map((movie) => ({
    id: movie.id,
    title: movie.title,
    releaseDate: movie.release_date || null,
    formattedDate: movie.release_date
      ? new Date(movie.release_date + "T00:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })
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
    `${TMDB_BASE_URL}/${primaryEndpoint}/${movieId}?append_to_response=credits,videos,release_dates`
  );
  let resolvedType = primaryEndpoint;

  // Resilient fallback: If requested endpoint fails with 404, check the other endpoint
  if (!response.ok && !isTv) {
    try {
      const tvResponse = await fetchTMDB(
        `${TMDB_BASE_URL}/tv/${movieId}?append_to_response=credits,videos,content_ratings`
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
        `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits,videos,release_dates`
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
    const creatorNames = Array.isArray(data.created_by) && data.created_by.length > 0
      ? data.created_by.map((c) => c.name?.trim()).filter(Boolean)
      : [];

    if (creatorNames.length > 0) {
      director = Array.from(new Set(creatorNames)).join(", ");
    } else {
      const tvDirecting = [];
      const seen = new Set();
      const directingCrew = data.credits?.crew || [];
      const creators = directingCrew.filter(
        (person) => person.name && (person.job === "Creator" || person.job === "Showrunner")
      );
      const candidates = creators.length > 0
        ? creators
        : directingCrew.filter(
            (person) => person.name && (person.job === "Director" || person.department === "Directing")
          );

      for (const p of candidates) {
        const name = p.name.trim();
        if (!seen.has(name)) {
          seen.add(name);
          tvDirecting.push(name);
        }
      }
      director = tvDirecting.length > 0 ? tvDirecting.join(", ") : null;
    }
  } else {
    const dirs = [];
    const seen = new Set();
    for (const person of (data.credits?.crew || [])) {
      if (person.job === "Director" && person.department === "Directing" && person.name) {
        const name = person.name.trim();
        if (!seen.has(name)) {
          seen.add(name);
          dirs.push(name);
        }
      }
    }
    // Fallback if no person matched department === Directing
    if (dirs.length === 0) {
      for (const person of (data.credits?.crew || [])) {
        if ((person.job === "Director" || person.job === "Co-Director") && person.name) {
          const name = person.name.trim();
          if (!seen.has(name)) {
            seen.add(name);
            dirs.push(name);
          }
        }
      }
    }
    director = dirs.length > 0 ? dirs.join(", ") : null;
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

  let officialReleaseDate = isTvResolved ? (data.first_air_date || null) : (data.release_date || null);
  if (!isTvResolved && data.release_dates?.results) {
    officialReleaseDate = extractOfficialReleaseDate(data.release_dates.results, data.release_date);
  }

  const resolvedYear = officialReleaseDate
    ? officialReleaseDate.split("-")[0]
    : isTvResolved
      ? (data.first_air_date ? data.first_air_date.split("-")[0] : null)
      : (data.release_date ? data.release_date.split("-")[0] : null);

  return {
    id: data.id,
    mediaType: isTvResolved ? "tv" : "movie",
    title: isTvResolved ? (data.name || data.original_name) : data.title,
    year: resolvedYear,
    releaseDate: officialReleaseDate,
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
