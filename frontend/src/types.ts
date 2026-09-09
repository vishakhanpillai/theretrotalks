export interface CastMember {
  id: number;
  name: string;
  character: string;
  picture: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department?: string;
  picture: string | null;
}

export interface MovieTrailer {
  key: string;
  name: string;
  site: string;
  url: string;
}

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
  cast?: CastMember[];
  crew?: CrewMember[];
  trailer?: MovieTrailer | null;
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
  cast?: CastMember[];
  crew?: CrewMember[];
}

export interface UpcomingMovie {
  id: number;
  title: string;
  releaseDate: string | null;
  formattedDate: string;
  poster: string | null;
  backdrop?: string | null;
  overview: string;
  tmdbRating: number | null;
  popularity?: number;
}
