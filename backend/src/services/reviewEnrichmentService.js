const { TMDB_BASE_URL } = require("../config/env");
const { fetchTMDB, extractTopCast, extractPrioritizedCrew } = require("./tmdbService");
const reviewRepository = require("../db/repositories/reviewRepository");

const enrichReviewIfCreditsMissing = async (review) => {
  if (!review) return review;

  const isCreditsMissing =
    (!review.cast || review.cast.length === 0 || !review.crew || review.crew.length < 10) &&
    Boolean(review.tmdbId);

  if (!isCreditsMissing) return review;

  try {
    const response = await fetchTMDB(`${TMDB_BASE_URL}/movie/${review.tmdbId}?append_to_response=credits`);
    if (response && response.ok) {
      const data = await response.json();
      const cast = extractTopCast(data.credits?.cast, 10);
      const crew = extractPrioritizedCrew(data.credits?.crew, 10);
      if (cast.length > 0 || crew.length > 0) {
        return reviewRepository.updateReviewCredits(review.id, cast, crew);
      }
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
        (!review.cast || review.cast.length === 0 || !review.crew || review.crew.length < 10)
      ) {
        try {
          const response = await fetchTMDB(
            `${TMDB_BASE_URL}/movie/${review.tmdbId}?append_to_response=credits`
          );
          if (response && response.ok) {
            const data = await response.json();
            const cast = extractTopCast(data.credits?.cast, 10);
            const crew = extractPrioritizedCrew(data.credits?.crew, 10);

            reviewRepository.updateReviewCredits(review.id, cast, crew);
            console.log(`Auto-enriched cast and crew for: "${review.title}"`);
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
