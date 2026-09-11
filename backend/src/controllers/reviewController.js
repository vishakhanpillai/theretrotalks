const reviewRepository = require("../db/repositories/reviewRepository");
const { TMDB_BASE_URL } = require("../config/env");
const { fetchTMDB, extractTopCast, extractPrioritizedCrew } = require("../services/tmdbService");
const { enrichReviewIfCreditsMissing } = require("../services/reviewEnrichmentService");
const { broadcast } = require("../services/eventsService");

const getAllReviews = (req, res) => {
  try {
    const reviews = reviewRepository.getAllReviews();
    res.json({
      count: reviews.length,
      reviews,
    });
  } catch (err) {
    console.error("Error fetching reviews from SQLite:", err);
    res.status(500).json({ error: "Failed to load reviews" });
  }
};

const getReviewById = async (req, res) => {
  try {
    let review = reviewRepository.getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Dynamic credit enrichment if missing
    review = await enrichReviewIfCreditsMissing(review);

    res.json(review);
  } catch (err) {
    console.error("Error fetching review:", err);
    res.status(500).json({ error: "Failed to load review" });
  }
};

const createReview = async (req, res) => {
  try {
    const reviewData = req.body;
    if (!reviewData.title || !reviewData.review) {
      return res.status(400).json({ error: "Title and review text are required" });
    }

    // Auto-fetch cast & crew from TMDB if not provided
    const tmdbId = reviewData.tmdbId || reviewData.tmdb_id;
    const mediaType = reviewData.mediaType || reviewData.media_type || "movie";
    if ((!reviewData.cast || reviewData.cast.length === 0) && tmdbId) {
      try {
        const endpoint = mediaType === "tv" ? "tv" : "movie";
        let response = await fetchTMDB(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}?append_to_response=credits`);
        if (!response.ok && endpoint === "movie") {
          const tvRes = await fetchTMDB(`${TMDB_BASE_URL}/tv/${tmdbId}?append_to_response=credits`);
          if (tvRes.ok) response = tvRes;
        }
        if (response && response.ok) {
          const data = await response.json();
          reviewData.cast = extractTopCast(data.credits?.cast, 10);
          reviewData.crew = extractPrioritizedCrew(data.credits?.crew, 10);
        }
      } catch (e) {
        console.warn("Could not fetch credits on review create:", e.message);
      }
    }

    const newReview = reviewRepository.createReview(reviewData);
    broadcast("reviews_updated", { action: "create", id: newReview.id });
    res.status(201).json(newReview);
  } catch (err) {
    console.error("Error creating review:", err);
    res.status(500).json({ error: "Failed to save review to database" });
  }
};

const updateReview = (req, res) => {
  try {
    const updated = reviewRepository.updateReview(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Review not found" });
    }
    broadcast("reviews_updated", { action: "update", id: updated.id });
    res.json(updated);
  } catch (err) {
    console.error("Error updating review:", err);
    res.status(500).json({ error: "Failed to update review in database" });
  }
};

const updatePoster = (req, res) => {
  try {
    const { posterUrl } = req.body;
    if (!posterUrl) {
      return res.status(400).json({ error: "posterUrl is required" });
    }

    const updated = reviewRepository.updateReviewPoster(req.params.id, posterUrl);
    if (!updated) {
      return res.status(404).json({ error: "Review not found" });
    }
    broadcast("reviews_updated", { action: "update_poster", id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error("Error updating poster:", err);
    res.status(500).json({ error: "Failed to update poster in database" });
  }
};

const updateBackdrop = (req, res) => {
  try {
    const { backdropUrl } = req.body;
    if (!backdropUrl) {
      return res.status(400).json({ error: "backdropUrl is required" });
    }

    const updated = reviewRepository.updateReviewBackdrop(req.params.id, backdropUrl);
    if (!updated) {
      return res.status(404).json({ error: "Review not found" });
    }
    broadcast("reviews_updated", { action: "update_backdrop", id: req.params.id });
    res.json(updated);
  } catch (err) {
    console.error("Error updating backdrop:", err);
    res.status(500).json({ error: "Failed to update backdrop in database" });
  }
};

const deleteReview = (req, res) => {
  try {
    const success = reviewRepository.deleteReview(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Review not found" });
    }
    broadcast("reviews_updated", { action: "delete", id: req.params.id });
    res.json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({ error: "Failed to delete review from database" });
  }
};

const reorderReviews = (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds array is required" });
    }
    const updatedReviews = reviewRepository.reorderReviews(orderedIds);
    broadcast("reviews_updated", { action: "reorder" });
    res.json({
      success: true,
      message: "Reviews reordered successfully",
      count: updatedReviews.length,
      reviews: updatedReviews,
    });
  } catch (err) {
    console.error("Error reordering reviews:", err);
    res.status(500).json({ error: "Failed to reorder reviews in database" });
  }
};

const updateBackdropFraming = (req, res) => {
  try {
    const { framing } = req.body;
    if (!framing || typeof framing !== "object") {
      return res.status(400).json({ error: "framing object is required" });
    }
    const updatedReview = reviewRepository.updateReviewBackdropFraming(req.params.id, framing);
    if (!updatedReview) {
      return res.status(404).json({ error: "Review not found" });
    }
    broadcast("reviews_updated", { action: "update_framing", id: req.params.id });
    res.json({ success: true, message: "Backdrop framing updated successfully", review: updatedReview });
  } catch (err) {
    console.error("Error updating backdrop framing:", err);
    res.status(500).json({ error: "Failed to update backdrop framing in database" });
  }
};

module.exports = {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  updatePoster,
  updateBackdrop,
  updateBackdropFraming,
  deleteReview,
  reorderReviews,
};
