const { db, isTurso } = require("./connection");
const { initSchema } = require("./schema");
const { seedInitialReviews } = require("./seed");
const reviewRepository = require("./repositories/reviewRepository");
const adminRepository = require("./repositories/adminRepository");

const initDatabase = async () => {
  try {
    await initSchema(db);
    await seedInitialReviews(db);
    console.log(`Database initialized successfully (${isTurso ? "Turso Cloud Active" : "Local SQLite Active"}).`);
  } catch (err) {
    console.error("Database initialization error:", err);
  }
};

module.exports = {
  db,
  isTurso,
  initDatabase,
  ...reviewRepository,
  ...adminRepository,
};
