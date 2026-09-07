const { Pool } = require("pg");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL || "postgres://retro:retro@localhost:5432/retrotalks";

const pool = new Pool({
  connectionString,
  // If hosted on cloud providers like Render/Supabase with SSL:
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

let isConnected = false;

async function initDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      console.log("Connected to PostgreSQL successfully!");
      isConnected = true;

      // Create reviews table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reviews (
          id SERIAL PRIMARY KEY,
          tmdb_id INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          year VARCHAR(10),
          poster_path TEXT,
          backdrop_path TEXT,
          director VARCHAR(255),
          genres TEXT[],
          rating NUMERIC(3,1) NOT NULL,
          review TEXT NOT NULL,
          ai_summary TEXT,
          one_liner TEXT,
          watched_date DATE NOT NULL DEFAULT CURRENT_DATE,
          is_favorite BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_reviews_tmdb_id ON reviews(tmdb_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_watched_date ON reviews(watched_date);
        CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
      `);

      client.release();
      console.log("Database schema initialized.");
      return true;
    } catch (err) {
      console.warn(`Database connection attempt ${i + 1}/${retries} failed: ${err.message}. Retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error("Could not connect to PostgreSQL after multiple retries.");
  return false;
}

function getPool() {
  return pool;
}

function getDBStatus() {
  return isConnected;
}

module.exports = {
  pool,
  initDB,
  getPool,
  getDBStatus,
};
