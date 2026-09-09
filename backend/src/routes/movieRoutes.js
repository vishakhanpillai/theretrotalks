const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

router.get("/search", movieController.search);
router.get("/upcoming-month", movieController.getUpcomingMonth);
router.get("/:id", movieController.getDetails);
router.get("/:id/posters", movieController.getPosters);
router.get("/:id/backdrops", movieController.getBackdrops);

module.exports = router;
