const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const PORT = parseInt(process.env.PORT, 10) || 5000;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN || "";
const TMDB_IMAGE_BASE_URL = (process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p").replace(/\/+$/, "");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || null;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";

const DB_PATH = path.resolve(__dirname, "../../retro_talks.db");
const FRONTEND_DIST = path.resolve(__dirname, "../../../frontend/dist");

module.exports = {
  PORT,
  TMDB_BASE_URL,
  TMDB_ACCESS_TOKEN,
  TMDB_IMAGE_BASE_URL,
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  DB_PATH,
  FRONTEND_DIST,
};
