import type { Movie } from "../types";

export interface ReviewDraft {
  movie: Movie;
  customTitle: string;
  customDirector: string;
  customYear: string;
  customGenres: string;
  customOverview: string;
  customRuntime?: string;
  customPoster: string;
  customBackdrop: string;
  myReview: string;
  myRating: number;
  watchedDate: string;
  isFavorite: boolean;
  updatedAt: number;
}

const DRAFT_KEY = "the_retro_talks_review_draft";

export const saveReviewDraft = (draft: ReviewDraft): void => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn("Failed to save review draft to localStorage:", e);
  }
};

export const getReviewDraft = (): ReviewDraft | null => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReviewDraft;
  } catch (e) {
    console.warn("Failed to parse review draft:", e);
    return null;
  }
};

export const clearReviewDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    console.warn("Failed to clear review draft:", e);
  }
};
