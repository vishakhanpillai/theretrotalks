const tmdbService = require("../services/tmdbService");

const search = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({
      error: "Movie Search Query Is Required",
    });
  }

  try {
    const result = await tmdbService.searchMovies(query);
    res.json(result);
  } catch (error) {
    console.error("TMDB SEARCH ERROR:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: "TMDB API Error",
        details: error.details,
      });
    }
    res.status(500).json({
      error: "Failed To Search TMDB",
    });
  }
};

const getUpcomingMonth = async (req, res) => {
  try {
    const result = await tmdbService.getUpcomingMonthMovies();
    res.json(result);
  } catch (error) {
    console.error("Upcoming Month Error:", error);
    res.status(500).json({ error: "Failed to fetch upcoming movies for the month" });
  }
};

const getDetails = async (req, res) => {
  const movieId = req.params.id;
  const mediaType = req.query.mediaType || "movie";

  try {
    const movie = await tmdbService.getMovieDetails(movieId, mediaType);
    res.json(movie);
  } catch (error) {
    console.error("TMDB Details Error:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: "Failed to fetch movie details from TMDB",
      });
    }
    res.status(500).json({
      error: "Failed To Fetch Movie Details",
    });
  }
};

const getPosters = async (req, res) => {
  const movieId = req.params.id;
  const mediaType = req.query.mediaType || "movie";

  try {
    const result = await tmdbService.getMoviePosters(movieId, mediaType);
    res.json(result);
  } catch (error) {
    console.error("TMDB Posters Error:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: "Failed to fetch movie posters from TMDB",
      });
    }
    res.status(500).json({
      error: "Failed to fetch posters",
    });
  }
};

const getBackdrops = async (req, res) => {
  const movieId = req.params.id;
  const mediaType = req.query.mediaType || "movie";

  try {
    const result = await tmdbService.getMovieBackdrops(movieId, mediaType);
    res.json(result);
  } catch (error) {
    console.error("TMDB Backdrops Error:", error);
    if (error.status) {
      return res.status(error.status).json({
        error: "Failed to fetch movie backdrops from TMDB",
      });
    }
    res.status(500).json({
      error: "Failed to fetch backdrops",
    });
  }
};

module.exports = {
  search,
  getUpcomingMonth,
  getDetails,
  getPosters,
  getBackdrops,
};
