const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const reviewRoutes = require("./reviewRoutes");
const movieRoutes = require("./movieRoutes");

router.use("/admin", authRoutes);
router.use("/reviews", reviewRoutes);
router.use("/movies", movieRoutes);

module.exports = router;
