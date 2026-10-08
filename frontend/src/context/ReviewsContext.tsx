import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Review, BackdropFraming } from "../types";
import { INITIAL_REVIEWS } from "../data/sampleReviews";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "the_retro_talks_personal_reviews";

export interface ReviewsContextType {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  refreshReviews: () => Promise<void>;
  saveReview: (newReview: Review) => Promise<Review>;
  updateReview: (reviewId: string | number, updatedData: Partial<Review>) => Promise<Review | void>;
  deleteReview: (reviewId: string | number) => Promise<void>;
  reorderReviews: (orderedIds: (string | number)[]) => Promise<void>;
  updatePoster: (reviewId: string | number, newPosterUrl: string) => Promise<void>;
  updateBackdrop: (reviewId: string | number, newBackdropUrl: string) => Promise<void>;
  updateBackdropFraming: (reviewId: string | number, framing: BackdropFraming) => Promise<void>;
}

const ReviewsContext = createContext<ReviewsContextType | undefined>(undefined);

export const ReviewsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { adminToken } = useAuth();

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load from localStorage cache:", e);
    }
    return INITIAL_REVIEWS;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch reviews from SQLite Database API
  const refreshReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reviews)) {
          setReviews(data.reviews);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.reviews));
          } catch {}
        }
      } else {
        throw new Error(`Failed to fetch reviews: ${res.statusText}`);
      }
    } catch (err) {
      console.warn("Could not fetch reviews from API, using cached state:", err);
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time synchronization via Server-Sent Events (SSE) + window focus/visibility
  useEffect(() => {
    refreshReviews();

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource("/api/events");

        eventSource.addEventListener("reviews_updated", () => {
          refreshReviews();
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
              reconnectTimeout = null;
              connectSSE();
            }, 5000);
          }
        };
      } catch (e) {
        console.warn("SSE connection error:", e);
      }
    };

    connectSSE();

    // Revalidate on visibility change or window focus
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshReviews();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [refreshReviews]);

  // Save new review to SQLite (Admin)
  const saveReview = useCallback(
    async (newReview: Review): Promise<Review> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to save a review");
      }

      try {
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(newReview),
        });

        if (res.ok) {
          const saved: Review = await res.json();
          setReviews((prev) => [saved, ...prev]);
          return saved;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to save review to database");
        }
      } catch (err) {
        console.error("Error saving review:", err);
        // Fallback optimistic update
        setReviews((prev) => [newReview, ...prev]);
        return newReview;
      }
    },
    [adminToken]
  );

  // Update existing review (Admin)
  const updateReview = useCallback(
    async (reviewId: string | number, updatedData: Partial<Review>): Promise<Review | void> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to update a review");
      }

      try {
        const res = await fetch(`/api/reviews/${reviewId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify(updatedData),
        });

        if (res.ok) {
          const saved: Review = await res.json();
          setReviews((prev) =>
            prev.map((r) => (r.id === reviewId ? { ...r, ...saved } : r))
          );
          return saved;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update review in database");
        }
      } catch (err) {
        console.error("Error updating review:", err);
        // Fallback optimistic update
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, ...updatedData } : r))
        );
      }
    },
    [adminToken]
  );

  // Delete review (Admin)
  const deleteReview = useCallback(
    async (reviewId: string | number): Promise<void> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to delete a review");
      }

      try {
        const res = await fetch(`/api/reviews/${reviewId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to delete review");
        }

        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      } catch (err) {
        console.error("Error deleting review:", err);
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    },
    [adminToken]
  );

  // Reorder reviews (Admin)
  const reorderReviews = useCallback(
    async (orderedIds: (string | number)[]): Promise<void> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to reorder reviews");
      }

      try {
        const res = await fetch("/api/reviews/reorder", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ orderedIds: orderedIds.map(String) }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.reviews)) {
            setReviews(data.reviews);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.reviews));
            } catch {}
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to reorder reviews");
        }
      } catch (err) {
        console.error("Error reordering reviews:", err);
        throw err;
      }
    },
    [adminToken]
  );

  // Update poster (Admin)
  const updatePoster = useCallback(
    async (reviewId: string | number, newPosterUrl: string): Promise<void> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to update poster");
      }

      try {
        const res = await fetch(`/api/reviews/${reviewId}/poster`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ posterUrl: newPosterUrl }),
        });

        if (res.ok) {
          setReviews((prev) =>
            prev.map((r) => (r.id === reviewId ? { ...r, poster: newPosterUrl } : r))
          );
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update poster");
        }
      } catch (err) {
        console.error("Error updating poster:", err);
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, poster: newPosterUrl } : r))
        );
      }
    },
    [adminToken]
  );

  // Update backdrop (Admin)
  const updateBackdrop = useCallback(
    async (reviewId: string | number, newBackdropUrl: string): Promise<void> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to update backdrop");
      }

      try {
        const res = await fetch(`/api/reviews/${reviewId}/backdrop`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ backdropUrl: newBackdropUrl }),
        });

        if (res.ok) {
          setReviews((prev) =>
            prev.map((r) => (r.id === reviewId ? { ...r, backdrop: newBackdropUrl } : r))
          );
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update backdrop");
        }
      } catch (err) {
        console.error("Error updating backdrop:", err);
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, backdrop: newBackdropUrl } : r))
        );
      }
    },
    [adminToken]
  );

  // Update backdrop framing (Admin)
  const updateBackdropFraming = useCallback(
    async (reviewId: string | number, framing: BackdropFraming): Promise<void> => {
      if (!adminToken) {
        throw new Error("Admin authentication required to update backdrop framing");
      }

      try {
        const res = await fetch(`/api/reviews/${reviewId}/backdrop-framing`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ framing }),
        });

        if (res.ok) {
          setReviews((prev) =>
            prev.map((r) => (r.id === reviewId ? { ...r, backdropFraming: framing } : r))
          );
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update backdrop framing");
        }
      } catch (err) {
        console.error("Error updating backdrop framing:", err);
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, backdropFraming: framing } : r))
        );
      }
    },
    [adminToken]
  );

  const value: ReviewsContextType = {
    reviews,
    isLoading,
    error,
    refreshReviews,
    saveReview,
    updateReview,
    deleteReview,
    reorderReviews,
    updatePoster,
    updateBackdrop,
    updateBackdropFraming,
  };

  return <ReviewsContext.Provider value={value}>{children}</ReviewsContext.Provider>;
};

export const useReviews = (): ReviewsContextType => {
  const context = useContext(ReviewsContext);
  if (!context) {
    throw new Error("useReviews must be used within a ReviewsProvider");
  }
  return context;
};
