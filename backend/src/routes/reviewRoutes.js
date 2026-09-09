const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { requireAdmin } = require("../middleware/auth");

// Public endpoints
router.get("/", reviewController.getAllReviews);
router.get("/:id", reviewController.getReviewById);

// Admin-only endpoints
router.post("/", requireAdmin, reviewController.createReview);
router.put("/reorder", requireAdmin, reviewController.reorderReviews);
router.put("/:id", requireAdmin, reviewController.updateReview);
router.put("/:id/poster", requireAdmin, reviewController.updatePoster);
router.put("/:id/backdrop", requireAdmin, reviewController.updateBackdrop);
router.delete("/:id", requireAdmin, reviewController.deleteReview);

module.exports = router;
