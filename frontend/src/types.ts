export interface Movie {
  id: number;
  title: string;
  year: string | null;
  poster: string | null;
  backdrop?: string | null;
  overview: string;
  tmdbRating: number | null;
  voteCount?: number;
  director?: string | null;
  runtime?: number | null;
  genres?: string[];
  tagline?: string | null;
}

export interface Review {
  id: string | number;
  tmdbId: number;
  title: string;
  year: string;
  poster: string;
  backdrop: string;
  director: string;
  genres: string[];
  rating: number; // 0.5 to 5.0
  review: string;
  watchedDate: string;
  isFavorite?: boolean;
}
