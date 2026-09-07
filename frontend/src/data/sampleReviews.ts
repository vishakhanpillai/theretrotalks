import type { Review } from "../types";

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    tmdbId: 15774,
    title: "Swades",
    year: "2004",
    poster: "https://image.tmdb.org/t/p/w500/yUSL24kpHc9Nls4Pohia4shgcIM.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/AmRfsOyEXpVhnaYXZMoDlZd9Siq.jpg",
    director: "Ashutosh Gowariker",
    genres: ["Drama"],
    rating: 5.0,
    review: "A quiet, profound masterpiece about homecoming and civic duty. Shah Rukh Khan's most restrained and moving performance, backed by A.R. Rahman's sublime score. The water glass scene on the train still breaks my heart every time.",
    watchedDate: "Aug 28, 2026",
    isFavorite: true
  },
  {
    id: "rev-2",
    tmdbId: 61202,
    title: "Zindagi Na Milegi Dobara",
    year: "2011",
    poster: "https://image.tmdb.org/t/p/w500/hKO9O715wYxjkQSEv47giCYcyO8.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/z4k7b66jAHP8sQbEahxss6Ct8BW.jpg",
    director: "Zoya Akhtar",
    genres: ["Drama", "Comedy", "Adventure"],
    rating: 4.5,
    review: "More than just a lavish road trip across Spain — it's a tender exploration of unlearning generational trauma, confronting fears, and choosing presence over endless hustle. The poetry by Javed Akhtar grounds the film with genuine soul.",
    watchedDate: "Aug 15, 2026",
    isFavorite: true
  },
  {
    id: "rev-3",
    tmdbId: 157336,
    title: "Interstellar",
    year: "2014",
    poster: "https://image.tmdb.org/t/p/w500/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg",
    director: "Christopher Nolan",
    genres: ["Science Fiction", "Drama", "Adventure"],
    rating: 5.0,
    review: "Nolan at his most emotionally ambitious. Blending theoretical physics with the transcendent tether of human love. Zimmer's organ score is monolithic, and the docking scene remains one of the greatest technical triumphs in modern sci-fi.",
    watchedDate: "Jul 20, 2026",
    isFavorite: true
  },
  {
    id: "rev-4",
    tmdbId: 353081,
    title: "Mission: Impossible - Fallout",
    year: "2018",
    poster: "https://image.tmdb.org/t/p/w500/AkJQpZp9WoNdj7pLYSj1L0RcMMN.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/3IzR3VhZAyhxVnuRRUHFLkfK4hT.jpg",
    director: "Christopher McQuarrie",
    genres: ["Action", "Thriller", "Adventure"],
    rating: 4.5,
    review: "The pinnacle of practical modern action cinema. The HALO jump, Paris bathroom brawl, and Kashmir helicopter chase are masterclasses in pacing and visceral choreography. Tom Cruise's relentless dedication elevates the entire genre.",
    watchedDate: "Jun 10, 2026",
    isFavorite: false
  }
];
