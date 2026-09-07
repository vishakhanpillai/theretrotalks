const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

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

app.get("/", (req, res) => {
    res.json({
        message: "The Retro Talks API is Running...",
        status: "healthy"
    });
});

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
    console.log(`Server running on http://localhost:${PORT}`);
});