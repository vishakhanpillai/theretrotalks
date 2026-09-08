const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
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

async function fetchTMDB(url, retries = 6) {
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
                const waitMs = (i + 1) * 350;
                console.warn(`TMDB connection attempt ${i + 1} failed (${err.message}). Retrying in ${waitMs}ms...`);
                await new Promise(res => setTimeout(res, waitMs));
                continue;
            }
            throw err;
        }
    }
}

// Crew priority mapping:
// 1: Director
// 2: Cinematographer / Director of Photography
// 3: Original Music Composer / Music
// 4: Producer
// 5: Screenplay / Writer / Story
// 6: Editor
// 7: Executive Producer
// 8: Production Design / Art Direction
// 9: Sound / Costume Design
const getCrewPriority = (job) => {
    switch (job) {
        case "Director":
            return 1;
        case "Director of Photography":
        case "Cinematographer":
            return 2;
        case "Original Music Composer":
        case "Music":
            return 3;
        case "Producer":
            return 4;
        case "Screenplay":
        case "Writer":
        case "Story":
            return 5;
        case "Editor":
            return 6;
        case "Executive Producer":
            return 7;
        case "Production Design":
        case "Art Direction":
            return 8;
        case "Costume Design":
        case "Sound Designer":
        case "Sound":
            return 9;
        default:
            return 99;
    }
};

const extractPrioritizedCrew = (crewList, limit = 10) => {
    if (!Array.isArray(crewList)) return [];
    const candidates = crewList
        .filter(c => getCrewPriority(c.job) < 99)
        .sort((a, b) => getCrewPriority(a.job) - getCrewPriority(b.job));

    const seen = new Set();
    const result = [];
    for (const c of candidates) {
        const key = `${c.id}-${c.job}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push({
                id: c.id,
                name: c.name,
                job: c.job,
                department: c.department,
                picture: formatImageUrl(c.profile_path, "w185")
            });
            if (result.length >= limit) break;
        }
    }
    return result;
};

const extractTopCast = (castList, limit = 10) => {
    if (!Array.isArray(castList)) return [];
    return castList.slice(0, limit).map(c => ({
        id: c.id,
        name: c.name,
        character: c.character,
        picture: formatImageUrl(c.profile_path, "w185")
    }));
};

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

// Get single review by id (auto-enriches missing cast/crew if needed)
app.get("/api/reviews/:id", async (req, res) => {
    try {
        let review = dbService.getReviewById(req.params.id);
        if (!review) {
            return res.status(404).json({ error: "Review not found" });
        }

        // On-the-fly backfill if cast or crew is missing and tmdbId is present
        if ((!review.cast || review.cast.length === 0 || !review.crew || review.crew.length < 10) && review.tmdbId) {
            try {
                const response = await fetchTMDB(`${TMDB_BASE_URL}/movie/${review.tmdbId}?append_to_response=credits`);
                if (response && response.ok) {
                    const data = await response.json();
                    const cast = extractTopCast(data.credits?.cast, 10);
                    const crew = extractPrioritizedCrew(data.credits?.crew, 10);
                    if (cast.length > 0 || crew.length > 0) {
                        review = dbService.updateReviewCredits(review.id, cast, crew);
                    }
                }
            } catch (enrichErr) {
                console.warn(`Dynamic enrichment failed for review ${review.id}:`, enrichErr.message);
            }
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
app.post("/api/reviews", requireAdmin, async (req, res) => {
    try {
        const reviewData = req.body;
        if (!reviewData.title || !reviewData.review) {
            return res.status(400).json({ error: "Title and review text are required" });
        }

        // Auto-fetch cast & crew from TMDB if not provided
        const tmdbId = reviewData.tmdbId || reviewData.tmdb_id;
        if ((!reviewData.cast || reviewData.cast.length === 0) && tmdbId) {
            try {
                const response = await fetchTMDB(`${TMDB_BASE_URL}/movie/${tmdbId}?append_to_response=credits`);
                if (response && response.ok) {
                    const data = await response.json();
                    reviewData.cast = extractTopCast(data.credits?.cast, 10);
                    reviewData.crew = extractPrioritizedCrew(data.credits?.crew, 10);
                }
            } catch (e) {
                console.warn("Could not fetch credits on review create:", e.message);
            }
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

// Update review backdrop (ADMIN ONLY)
app.put("/api/reviews/:id/backdrop", requireAdmin, (req, res) => {
    try {
        const { backdropUrl } = req.body;
        if (!backdropUrl) {
            return res.status(400).json({ error: "backdropUrl is required" });
        }

        const updated = dbService.updateReviewBackdrop(req.params.id, backdropUrl);
        if (!updated) {
            return res.status(404).json({ error: "Review not found" });
        }
        res.json(updated);
    } catch (err) {
        console.error("Error updating backdrop:", err);
        res.status(500).json({ error: "Failed to update backdrop in database" });
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

        const cast = extractTopCast(data.credits?.cast, 10);
        const crew = extractPrioritizedCrew(data.credits?.crew, 10);

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
            tagline: data.tagline || null,
            cast,
            crew
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

app.get("/api/movies/:id/backdrops", async (req, res) => {
    const movieId = req.params.id;

    try {
        const response = await fetchTMDB(
            `${TMDB_BASE_URL}/movie/${movieId}/images`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: "Failed to fetch movie backdrops from TMDB"
            });
        }

        const data = await response.json();

        const backdrops = (data.backdrops || [])
            .map(b => ({
                filePath: b.file_path,
                url: formatImageUrl(b.file_path, "w1280"),
                originalUrl: formatImageUrl(b.file_path, "original"),
                width: b.width,
                height: b.height,
                aspectRatio: b.aspect_ratio,
                language: b.iso_639_1,
                voteCount: b.vote_count || 0,
                voteAverage: b.vote_average || 0
            }))
            .sort((a, b) => b.voteCount - a.voteCount);

        res.json({
            movieId: Number(movieId),
            totalBackdrops: backdrops.length,
            backdrops
        });
    } catch (error) {
        console.error("TMDB Backdrops Error:", error);
        res.status(500).json({
            error: "Failed to fetch backdrops"
        });
    }
});

// Serve frontend build in production if available
const frontendDist = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
        if (req.method === "GET" && !req.path.startsWith("/api")) {
            return res.sendFile(path.join(frontendDist, "index.html"));
        }
        next();
    });
}

// Automatically enrich reviews missing cast & crew from TMDB
async function enrichReviewsWithCredits() {
    try {
        const reviews = dbService.getAllReviews();
        for (const review of reviews) {
            if (review.tmdbId && (!review.cast || review.cast.length === 0 || !review.crew || review.crew.length < 10)) {
                try {
                    const response = await fetchTMDB(`${TMDB_BASE_URL}/movie/${review.tmdbId}?append_to_response=credits`);
                    if (response && response.ok) {
                        const data = await response.json();
                        const cast = extractTopCast(data.credits?.cast, 10);
                        const crew = extractPrioritizedCrew(data.credits?.crew, 10);

                        dbService.updateReviewCredits(review.id, cast, crew);
                        console.log(`Auto-enriched cast and crew for: "${review.title}"`);
                    }
                } catch (err) {
                    console.warn(`Credits enrichment skipped for "${review.title}":`, err.message);
                }
            }
        }
    } catch (e) {
        console.warn("Credits enrichment error:", e.message);
    }
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT} (SQLite Active)`);
    // Run credit enrichment in the background on startup
    enrichReviewsWithCredits().catch(err => console.warn("Credit backfill error:", err));
});
