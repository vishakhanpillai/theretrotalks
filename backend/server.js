const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const dbService = require("./database");

const app = express();

const PORT = process.env.PORT || 5000;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_IMAGE_BASE_URL = (process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p").replace(/\/+$/, "");

app.use(cors());
app.use(express.json());

const formatImageUrl = (path, size = "w500") => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
};

async function fetchTMDB(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
                    accept: "application/json"
                },
                keepalive: false
            });
            return response;
        } catch (err) {
            if (i < retries - 1) {
                console.warn(`TMDB connection attempt ${i + 1} failed (${err.message}). Retrying...`);
                await new Promise(res => setTimeout(res, 250));
                continue;
            }
            throw err;
        }
    }
}

// Admin Authentication Middleware
const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer "))
        ? authHeader.split(" ")[1]
        : req.headers["x-admin-token"];

    if (!token || !dbService.validateSessionToken(token)) {
        return res.status(401).json({
            error: "Unauthorized: Admin access required to perform this action."
        });
    }
    next();
};

app.get("/", (req, res) => {
    res.json({
        message: "The Retro Talks API is Running (SQLite Database Active)...",
        status: "healthy"
    });
});

// ==========================================
// PUBLIC REVIEWS ENDPOINTS (SQLite)
// ==========================================

// Get all reviews (anyone can view)
app.get("/api/reviews", (req, res) => {
    try {
        const reviews = dbService.getAllReviews();
        res.json({
            count: reviews.length,
            reviews
        });
    } catch (err) {
        console.error("Error fetching reviews from SQLite:", err);
        res.status(500).json({ error: "Failed to load reviews" });
    }
});

// Get single review by id
app.get("/api/reviews/:id", (req, res) => {
    try {
        const review = dbService.getReviewById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: "Review not found" });
        }
        res.json(review);
    } catch (err) {
        console.error("Error fetching review:", err);
        res.status(500).json({ error: "Failed to load review" });
    }
});

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

// Admin Login
app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: "Password is required" });
    }

    const token = dbService.verifyPasswordAndCreateSession(password);
    if (!token) {
        return res.status(401).json({ error: "Invalid admin password" });
    }

    res.json({
        success: true,
        token,
        message: "Admin authentication successful"
    });
});

// Admin Status Check
app.get("/api/admin/status", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer "))
        ? authHeader.split(" ")[1]
        : req.headers["x-admin-token"];

    const isValid = dbService.validateSessionToken(token);
    res.json({ isAdmin: isValid });
});

// Admin Logout
app.post("/api/admin/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith("Bearer "))
        ? authHeader.split(" ")[1]
        : req.headers["x-admin-token"];

    if (token) {
        dbService.revokeSession(token);
    }
    res.json({ success: true, message: "Logged out" });
});

// ==========================================
// ADMIN-ONLY REVIEWS MANAGEMENT (SQLite)
// ==========================================

// Create new review (ADMIN ONLY)
app.post("/api/reviews", requireAdmin, (req, res) => {
    try {
        const reviewData = req.body;
        if (!reviewData.title || !reviewData.review) {
            return res.status(400).json({ error: "Title and review text are required" });
        }

        const newReview = dbService.createReview(reviewData);
        res.status(201).json(newReview);
    } catch (err) {
        console.error("Error creating review:", err);
        res.status(500).json({ error: "Failed to save review to database" });
    }
});

// Update review poster (ADMIN ONLY)
app.put("/api/reviews/:id/poster", requireAdmin, (req, res) => {
    try {
        const { posterUrl } = req.body;
        if (!posterUrl) {
            return res.status(400).json({ error: "posterUrl is required" });
        }

        const updated = dbService.updateReviewPoster(req.params.id, posterUrl);
        if (!updated) {
            return res.status(404).json({ error: "Review not found" });
        }
        res.json(updated);
    } catch (err) {
        console.error("Error updating poster:", err);
        res.status(500).json({ error: "Failed to update poster in database" });
    }
});

// Delete review (ADMIN ONLY)
app.delete("/api/reviews/:id", requireAdmin, (req, res) => {
    try {
        const success = dbService.deleteReview(req.params.id);
        if (!success) {
            return res.status(404).json({ error: "Review not found" });
        }
        res.json({ success: true, message: "Review deleted successfully" });
    } catch (err) {
        console.error("Error deleting review:", err);
        res.status(500).json({ error: "Failed to delete review from database" });
    }
});

// ==========================================
// TMDB PROXY ENDPOINTS
// ==========================================

app.get("/api/movies/search", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({
            error: "Movie Search Query Is Required"
        });
    }

    try {
        const response = await fetchTMDB(
            `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=true`
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error("TMDB API responded with status:", response.status, errText);
            return res.status(response.status).json({
                error: "TMDB API Error",
                details: errText
            });
        }

        const data = await response.json();

        const movies = (data.results || []).map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split("-")[0] : null,
            poster: formatImageUrl(movie.poster_path, "w500"),
            backdrop: formatImageUrl(movie.backdrop_path, "original"),
            overview: movie.overview,
            tmdbRating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
            voteCount: movie.vote_count
        }));

        res.json({
            results: movies,
            totalResults: data.total_results || movies.length
        });
    } catch (error) {
        console.error("TMDB SEARCH ERROR:", error);
        res.status(500).json({
            error: "Failed To Search TMDB"
        });
    }
});

// GET /api/movies/upcoming-month (Must be before /api/movies/:id)
app.get("/api/movies/upcoming-month", async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const monthIndex = now.getMonth();
        const monthName = now.toLocaleString("en-US", { month: "long" });
        const monthNum = String(monthIndex + 1).padStart(2, "0");

        const firstDay = `${year}-${monthNum}-01`;
        const lastDayObj = new Date(year, monthIndex + 1, 0);
        const lastDay = `${year}-${monthNum}-${String(lastDayObj.getDate()).padStart(2, "0")}`;

        let url = `${TMDB_BASE_URL}/discover/movie?primary_release_date.gte=${firstDay}&primary_release_date.lte=${lastDay}&sort_by=popularity.desc&include_adult=false&page=1`;

        let response = await fetchTMDB(url);
        let data = await response.json();
        let results = data.results || [];

        // If fewer than 8 movies in current month, supplement with upcoming releases
        if (results.length < 8) {
            try {
                const fallbackRes = await fetchTMDB(`${TMDB_BASE_URL}/movie/upcoming?language=en-US&page=1`);
                const fallbackData = await fallbackRes.json();
                const combined = [...results, ...(fallbackData.results || [])];
                const seen = new Set();
                results = combined.filter(m => {
                    if (seen.has(m.id)) return false;
                    seen.add(m.id);
                    return true;
                });
            } catch (fbErr) {
                console.warn("Fallback upcoming error:", fbErr);
            }
        }

        const movies = results.slice(0, 10).map(movie => ({
            id: movie.id,
            title: movie.title,
            releaseDate: movie.release_date || null,
            formattedDate: movie.release_date
                ? new Date(movie.release_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : "TBA",
            poster: formatImageUrl(movie.poster_path, "w342"),
            backdrop: formatImageUrl(movie.backdrop_path, "original"),
            overview: movie.overview,
            tmdbRating: movie.vote_average ? Number(movie.vote_average.toFixed(1)) : null,
            popularity: movie.popularity
        }));

        res.json({
            monthName,
            year,
            count: movies.length,
            movies
        });
    } catch (error) {
        console.error("Upcoming Month Error:", error);
        res.status(500).json({ error: "Failed to fetch upcoming movies for the month" });
    }
});

app.get("/api/movies/:id", async (req, res) => {
    const movieId = req.params.id;

    try {
        const response = await fetchTMDB(
            `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Failed to fetch movie details from TMDB"
            });
        }

        const data = await response.json();

        const director = data.credits?.crew?.find(
            person => person.job === "Director" && person.department === "Directing"
        );

        const movie = {
            id: data.id,
            title: data.title,
            year: data.release_date ? data.release_date.split("-")[0] : null,
            poster: formatImageUrl(data.poster_path, "w500"),
            backdrop: formatImageUrl(data.backdrop_path, "original"),
            overview: data.overview,
            tmdbRating: data.vote_average ? Number(data.vote_average.toFixed(1)) : null,
            runtime: data.runtime,
            genres: Array.isArray(data.genres) ? data.genres.map(genre => genre.name) : [],
            director: director ? director.name : null,
            tagline: data.tagline || null
        };

        res.json(movie);
    } catch (error) {
        console.error("TMDB Details Error:", error);
        res.status(500).json({
            error: "Failed to Fetch Movie Details"
        });
    }
});

app.get("/api/movies/:id/posters", async (req, res) => {
    const movieId = req.params.id;

    try {
        const response = await fetchTMDB(
            `${TMDB_BASE_URL}/movie/${movieId}/images`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Failed to fetch movie posters from TMDB"
            });
        }

        const data = await response.json();

        const posters = (data.posters || [])
            .map(p => ({
                filePath: p.file_path,
                url: formatImageUrl(p.file_path, "w500"),
                originalUrl: formatImageUrl(p.file_path, "original"),
                width: p.width,
                height: p.height,
                aspectRatio: p.aspect_ratio,
                language: p.iso_639_1,
                voteCount: p.vote_count || 0,
                voteAverage: p.vote_average || 0
            }))
            .sort((a, b) => b.voteCount - a.voteCount);

        res.json({
            movieId: Number(movieId),
            totalPosters: posters.length,
            posters
        });
    } catch (error) {
        console.error("TMDB Posters Error:", error);
        res.status(500).json({
            error: "Failed to fetch posters"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (SQLite Active)`);
});
