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

export interface BackdropFraming {
  y: number; // 0 (top) to 100 (bottom)
  x?: number; // 0 (left) to 100 (right)
  height: number; // in vh, e.g. 45 to 90
  zoom: number; // in percentage, e.g. 100 to 150
}

export interface Review {
  id: string | number;
  tmdbId: number;
  title: string;
  year: string;
  poster: string;
  backdrop: string;
  backdropFraming?: BackdropFraming;
  director: string;
  genres: string[];
  rating: number; // 0.5 to 5.0
  review: string;
  watchedDate: string;
  isFavorite?: boolean;
  cast?: CastMember[];
  crew?: CrewMember[];
  overview?: string | null;
  slug?: string;
  displayOrder?: number;
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
