const express = require("express");
const cors = require("cors")
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN

app.use(cors());

app.get("/", (req, res) =>{
    res.json({
        message: "Retro Talks API is Running..."
    });
});

app.get("/api/movies/search", async(req, res) =>{
    const query = req.query.q;

    if(!query){
        return res.status(400).json({
            error: "Movie Search Query Is Required"
        });
    }
    
    try{
        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}`,
            {
                headers:{
                    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
                    accept: "application/json"
                }
            }
        );

        const data = await response.json();
        
        const movies = data.results.map(movie => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.split("-")[0] : null,
            poster: movie.poster_path,
            overview: movie.overview,
            tmdbRating: movie.vote_average
        }));

        res.json({
            results: movies
        })
    }

    catch(error){
        console.error("TMDB ERROR:", error);
        res.status(500).json({
            error: "Failed To Search TMDB"
        })
    }
    
});

app.get("/api/movies/:id", async(req, res) => {
    const movieId = req.params.id;

    try{
        const response = await fetch(
            `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits`,
            {
                headers: {
                    Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
                    accept: "application/json"
                }
            }
        );

        const data = await response.json();

        const director = data.credits.crew.find(person => person.job === "Director" && person.department === "Directing");
        console.log("Diretor:", director)


        const movie = {
            id: data.id,
            title: data.title,
            year: data.release_date ? data.release_date.split("-")[0] : null,
            poster: data.poster_path,
            backdrop: data.backdrop_path,
            overview: data.overview,
            tmdbRating: data.vote_average,
            runtime: data.runtime,
            genres: data.genres.map(genre => genre.name),
            director: director ? director.name : null
        };

        res.json(movie);
    }
    catch(error){
        console.error("TMDB Error:", error);
        res.status(500).json({
            error: "Failed to Fetch Movie Details"
        });
    }
})

app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${5000}`);
});