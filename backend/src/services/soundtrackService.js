/**
 * Soundtrack Service
 * Fetches 30-second official score/soundtrack preview streams from the Apple iTunes Search API (100% free, no API key required).
 */

const soundtrackCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Searches iTunes for the best matching score/soundtrack preview
 * @param {string} movieTitle 
 * @param {string} [composer] 
 * @returns {Promise<object|null>}
 */
async function findSoundtrack(movieTitle, composer = "") {
  if (!movieTitle || typeof movieTitle !== "string") {
    return null;
  }

  const cleanTitle = movieTitle.trim();
  const cacheKey = `${cleanTitle.toLowerCase()}:${(composer || "").toLowerCase()}`;

  const cached = soundtrackCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Multi-tier query cascade
  const searchQueries = [
    `${cleanTitle} Original Motion Picture Soundtrack`,
    `${cleanTitle} Soundtrack`,
    `${cleanTitle} Score`,
    `${cleanTitle} Main Theme`,
  ];

  if (composer) {
    searchQueries.unshift(`${cleanTitle} ${composer} Soundtrack`);
  }

  let bestTrack = null;

  for (const query of searchQueries) {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=10`;
      const res = await fetch(url, { headers: { accept: "application/json" } });

      if (!res.ok) continue;

      const data = await res.json();
      if (!data.results || data.results.length === 0) continue;

      // Filter valid songs with preview URLs and exclude podcasts / review channels
      const candidates = data.results.filter((item) => {
        if (!item.previewUrl) return false;
        const col = (item.collectionName || "").toLowerCase();
        const trk = (item.trackName || "").toLowerCase();
        if (col.includes("podcast") || col.includes("inceleme") || col.includes("review") || trk.includes("review")) {
          return false;
        }
        return true;
      });

      if (candidates.length === 0) continue;

      // Rank candidate tracks
      const scoredCandidates = candidates.sort((a, b) => {
        const scoreA = getTrackScore(a, cleanTitle, composer);
        const scoreB = getTrackScore(b, cleanTitle, composer);
        return scoreB - scoreA;
      });

      if (scoredCandidates.length > 0) {
        const top = scoredCandidates[0];
        bestTrack = {
          trackName: top.trackName,
          artistName: top.artistName,
          collectionName: top.collectionName,
          previewUrl: top.previewUrl,
          artworkUrl: top.artworkUrl100 ? top.artworkUrl100.replace("100x100bb", "300x300bb") : null,
          trackViewUrl: top.trackViewUrl,
        };
        break;
      }
    } catch (err) {
      console.warn(`Soundtrack search failed for query "${query}":`, err.message);
    }
  }

  // Store in cache
  soundtrackCache.set(cacheKey, {
    timestamp: Date.now(),
    data: bestTrack,
  });

  return bestTrack;
}

function getTrackScore(track, movieTitle, composer) {
  let score = 0;
  const col = (track.collectionName || "").toLowerCase();
  const title = (track.trackName || "").toLowerCase();
  const artist = (track.artistName || "").toLowerCase();
  const movieLower = movieTitle.toLowerCase();
  const composerLower = (composer || "").toLowerCase();

  // Album name matching
  if (col.includes("original motion picture soundtrack")) score += 20;
  else if (col.includes("soundtrack") || col.includes("motion picture")) score += 10;
  if (col.includes("original score") || col.includes("ost")) score += 12;
  if (col.includes(movieLower)) score += 15;

  // Track name matching
  if (title.includes(movieLower)) score += 6;
  if (title.includes("theme") || title.includes("suite") || title.includes("opening") || title.includes("main")) score += 8;

  // Composer matching
  if (composerLower && artist.includes(composerLower)) score += 10;

  return score;
}

module.exports = {
  findSoundtrack,
};
