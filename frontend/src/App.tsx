import { useState, useEffect } from "react";
import type { Review, BackdropFraming } from "./types";
import { RetroTalksPage } from "./pages/RetroTalksPage";
import { AdminPage } from "./pages/AdminPage";
import { ReviewPage } from "./pages/ReviewPage";
import { INITIAL_REVIEWS } from "./data/sampleReviews";
import { slugify, getReviewSlug } from "./utils/slugify";

const STORAGE_KEY = "the_retro_talks_personal_reviews";
const ADMIN_TOKEN_KEY = "the_retro_talks_admin_token";

type Page = "home" | "admin" | "review";

interface RouteState {
  page: Page;
  reviewId: string | null;
}

function parseCurrentRoute(): RouteState {
  if (typeof window === "undefined") return { page: "home", reviewId: null };
  const path = window.location.pathname;
  const hash = window.location.hash;

  if (path === "/admin" || path.startsWith("/admin") || hash.includes("admin")) {
    return { page: "admin", reviewId: null };
  }

  const reviewMatch = path.match(/^\/review\/([^/]+)/) || hash.match(/#\/?review\/([^/]+)/);
  if (reviewMatch) {
    return { page: "review", reviewId: decodeURIComponent(reviewMatch[1]) };
  }

  return { page: "home", reviewId: null };
}

function App() {
  // Page Routing State: "home" vs "admin" vs "review"
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute);

  // Admin Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Reviews State (loaded from SQLite database)
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

  // Verify Admin Token on mount
  useEffect(() => {
    if (!adminToken) {
      setIsAdmin(false);
      return;
    }

    fetch("/api/admin/status", {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isAdmin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          localStorage.removeItem(ADMIN_TOKEN_KEY);
        }
      })
      .catch((err) => {
        console.warn("Admin status check failed:", err);
      });
  }, [adminToken]);

  // Fetch reviews from SQLite Database on mount
  const fetchReviewsFromDb = async () => {
    try {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reviews) && data.reviews.length > 0) {
          setReviews(data.reviews);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.reviews));
        }
      }
    } catch (err) {
      console.warn("Could not fetch from SQLite API, using local cache:", err);
    }
  };

  useEffect(() => {
    fetchReviewsFromDb();
  }, []);

  // Sync browser back/forward history navigation
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const handlePopState = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setRoute(parseCurrentRoute());
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  const navigateToHome = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setRoute({ page: "home", reviewId: null });
    window.history.pushState({}, "", "/");
  };

  const navigateToAdmin = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    setRoute({ page: "admin", reviewId: null });
    window.history.pushState({}, "", "/admin");
  };

  const navigateToReview = (item: Review | string | number) => {
    let slugOrId: string;
    if (typeof item === "object" && item !== null) {
      slugOrId = getReviewSlug(item);
    } else {
      const clean = String(item).trim();
      const matched = reviews.find(
        (r) => String(r.id) === clean || r.slug === clean || slugify(r.title) === clean
      );
      slugOrId = matched ? getReviewSlug(matched) : clean;
    }
    // Instantly reset scroll to top before route transition renders
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    setRoute({ page: "review", reviewId: slugOrId });
    window.history.pushState({}, "", `/review/${slugOrId}`);
  };

  // Secret keyboard shortcut: Ctrl+Shift+A or Cmd+Shift+A jumps to /admin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        navigateToAdmin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAdminToken(token);
    setIsAdmin(true);
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  };

  const handleLogout = async () => {
    if (adminToken) {
      try {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch (e) {
        console.warn("Logout error:", e);
      }
    }
    setAdminToken(null);
    setIsAdmin(false);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  // Save review to SQLite (Admin Only)
  const handleSaveNewReview = async (newReview: Review) => {
    if (!adminToken) return;

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
        const saved = await res.json();
        setReviews((prev) => [saved, ...prev]);
      } else {
        setReviews((prev) => [newReview, ...prev]);
      }
    } catch (err) {
      console.error("Error saving review to SQLite:", err);
      setReviews((prev) => [newReview, ...prev]);
    }
  };

  // Delete review from SQLite (Admin Only)
  const handleDeleteReview = async (id: string | number) => {
    if (!adminToken) return;

    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Error deleting review from SQLite:", err);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Update review poster in SQLite (Admin Only)
  const handleUpdatePoster = async (reviewId: string | number, newPosterUrl: string) => {
    if (!adminToken) return;

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
      }
    } catch (err) {
      console.error("Error updating poster in SQLite:", err);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, poster: newPosterUrl } : r))
      );
    }
  };

  // Update review backdrop in SQLite (Admin Only)
  const handleUpdateBackdrop = async (reviewId: string | number, newBackdropUrl: string) => {
    if (!adminToken) return;

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
      }
    } catch (err) {
      console.error("Error updating backdrop in SQLite:", err);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, backdrop: newBackdropUrl } : r))
      );
    }
  };

  // Update review backdrop framing in SQLite (Admin Only)
  const handleUpdateBackdropFraming = async (
    reviewId: string | number,
    framing: BackdropFraming
  ) => {
    if (!adminToken) return;

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
      }
    } catch (err) {
      console.error("Error updating backdrop framing in SQLite:", err);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, backdropFraming: framing } : r))
      );
    }
  };

  // Update review details in SQLite (Admin Only)
  const handleUpdateReview = async (reviewId: string | number, updatedData: Partial<Review>) => {
    if (!adminToken) return;

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
        const saved = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, ...saved } : r))
        );
      } else {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, ...updatedData } : r))
        );
      }
    } catch (err) {
      console.error("Error updating review in SQLite:", err);
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...updatedData } : r))
      );
    }
  };

  // Reorder reviews in SQLite (Admin Only)
  const handleReorderReviews = async (orderedIds: (string | number)[]) => {
    if (!adminToken) return;

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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.reviews));
        }
      }
    } catch (err) {
      console.error("Error reordering reviews:", err);
    }
  };

  // 1. Admin Page (only accessible at /admin or via secret shortcut)
  if (route.page === "admin") {
    return (
      <AdminPage
        reviews={reviews}
        isAdmin={isAdmin}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onSaveReview={handleSaveNewReview}
        onUpdateReview={handleUpdateReview}
        onDeleteReview={handleDeleteReview}
        onReorderReviews={handleReorderReviews}
        onUpdatePoster={handleUpdatePoster}
        onUpdateBackdrop={handleUpdateBackdrop}
        onUpdateBackdropFraming={handleUpdateBackdropFraming}
        onNavigateHome={navigateToHome}
        onNavigateToReview={navigateToReview}
      />
    );
  }

  // 2. Standalone Dedicated Cinema Review Page
  if (route.page === "review" && route.reviewId) {
    const matchedReview = reviews.find(
      (r) =>
        r.slug === route.reviewId ||
        slugify(r.title) === route.reviewId ||
        String(r.id) === String(route.reviewId)
    );
    return (
      <ReviewPage
        key={route.reviewId}
        reviewId={route.reviewId}
        initialReview={matchedReview}
        isAdmin={isAdmin}
        onNavigateHome={navigateToHome}
        onUpdatePoster={handleUpdatePoster}
        onUpdateBackdrop={handleUpdateBackdrop}
        onUpdateBackdropFraming={handleUpdateBackdropFraming}
      />
    );
  }

  // 3. Primary Home Page: The Retro Talks
  return (
    <RetroTalksPage
      reviews={reviews}
      onOpenReview={navigateToReview}
    />
  );
}

export default App;
