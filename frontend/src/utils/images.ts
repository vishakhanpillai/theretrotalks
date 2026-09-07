const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function getPosterUrl(poster: string | null | undefined, size: "w342" | "w500" | "original" = "w500"): string | null {
  if (!poster) return null;
  if (poster.startsWith("http")) return poster;
  const clean = poster.startsWith("/") ? poster : `/${poster}`;
  return `${TMDB_IMAGE_BASE}/${size}${clean}`;
}

export function getBackdropUrl(backdrop: string | null | undefined, size: "w780" | "w1280" | "original" = "original"): string | null {
  if (!backdrop) return null;
  if (backdrop.startsWith("http")) return backdrop;
  const clean = backdrop.startsWith("/") ? backdrop : `/${backdrop}`;
  return `${TMDB_IMAGE_BASE}/${size}${clean}`;
}
