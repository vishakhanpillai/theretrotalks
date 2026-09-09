const { db } = require("./connection");
const { initSchema } = require("./schema");
const { seedInitialReviews } = require("./seed");
const reviewRepository = require("./repositories/reviewRepository");
const adminRepository = require("./repositories/adminRepository");

// Initialize Schema and Seed on initial load
initSchema(db);
seedInitialReviews(db);

module.exports = {
  db,
  ...reviewRepository,
  ...adminRepository,
};
