const { TMDB_BASE_URL } = require("../config/env");
const { fetchTMDB, extractTopCast, extractPrioritizedCrew } = require("./tmdbService");
const reviewRepository = require("../db/repositories/reviewRepository");

const enrichReviewIfCreditsMissing = async (review) => {
  if (!review) return review;

  const isEnrichmentNeeded =
    Boolean(review.tmdbId) &&
    (!review.cast || review.cast.length === 0 || !review.crew || review.crew.length < 10 || !review.overview);

  if (!isEnrichmentNeeded) return review;

  try {
    const endpoint = review.mediaType === "tv" ? "tv" : "movie";
    let response = await fetchTMDB(`${TMDB_BASE_URL}/${endpoint}/${review.tmdbId}?append_to_response=credits`);
    if (!response.ok && endpoint === "movie") {
      const tvRes = await fetchTMDB(`${TMDB_BASE_URL}/tv/${review.tmdbId}?append_to_response=credits`);
      if (tvRes.ok) response = tvRes;
    }
    if (response && response.ok) {
      const data = await response.json();
      const cast = extractTopCast(data.credits?.cast, 10);
      const crew = extractPrioritizedCrew(data.credits?.crew, 10);
      if (cast.length > 0 || crew.length > 0) {
        reviewRepository.updateReviewCredits(review.id, cast, crew);
      }
      if (data.overview) {
        reviewRepository.updateReviewOverview(review.id, data.overview);
        review.overview = data.overview;
      }
      return reviewRepository.getReviewById(review.id);
    }
  } catch (err) {
    console.warn(`Dynamic enrichment failed for review ${review.id}:`, err.message);
  }

  return review;
};

const enrichAllReviewsOnStartup = async () => {
  try {
    const reviews = reviewRepository.getAllReviews();
    for (const review of reviews) {
      if (
        review.tmdbId &&
        (!review.cast || review.cast.length === 0 || !review.crew || review.crew.length < 10 || !review.overview)
      ) {
        try {
          const endpoint = review.mediaType === "tv" ? "tv" : "movie";
          let response = await fetchTMDB(
            `${TMDB_BASE_URL}/${endpoint}/${review.tmdbId}?append_to_response=credits`
          );
          if (!response.ok && endpoint === "movie") {
            const tvRes = await fetchTMDB(`${TMDB_BASE_URL}/tv/${review.tmdbId}?append_to_response=credits`);
            if (tvRes.ok) response = tvRes;
          }
          if (response && response.ok) {
            const data = await response.json();
            const cast = extractTopCast(data.credits?.cast, 10);
            const crew = extractPrioritizedCrew(data.credits?.crew, 10);

            if (cast.length > 0 || crew.length > 0) {
              reviewRepository.updateReviewCredits(review.id, cast, crew);
            }
            if (data.overview) {
              reviewRepository.updateReviewOverview(review.id, data.overview);
            }
            console.log(`Auto-enriched cast, crew, and overview for: "${review.title}"`);
          }
        } catch (err) {
          console.warn(`Credits enrichment skipped for "${review.title}":`, err.message);
        }
      }
    }
  } catch (e) {
    console.warn("Credits enrichment error on startup:", e.message);
  }
};

module.exports = {
  enrichReviewIfCreditsMissing,
  enrichAllReviewsOnStartup,
};
