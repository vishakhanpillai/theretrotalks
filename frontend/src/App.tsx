import { useState } from "react";

function App(){

  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState([]);

  async function searchMovies() {
    if(!query.trim()){
      return;
    }

    const response = await fetch(`http://localhost:5000/api/movies/search?q=${encodeURIComponent(query)}`);

    const data = await response.json();
    
    setMovies(data.results);
  }

  return(
    <div>

      <h1>The Retro Talks</h1>

      <input type="text" placeholder="Search for a movie..." value={query} onChange={(event) => setQuery(event.target.value)} />

      <button onClick={searchMovies}> Search </button>

      <div>
        {
          movies.map((movie) => (
            <div key={movie.id}>
              <h2>{movie.title}</h2>
              <p>{movie.year}</p>
              <p>{movie.overview}</p>
            </div>
          ))
        }
      </div>
    </div>
  )
}

export default App;
