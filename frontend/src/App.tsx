import { useState, useEffect } from "react";
import type { Review } from "./types";
import { RetroTalksPage } from "./pages/RetroTalksPage";
import { AboutPage } from "./pages/AboutPage";
import { INITIAL_REVIEWS } from "./data/sampleReviews";

const STORAGE_KEY = "the_retro_talks_personal_reviews";
const ADMIN_TOKEN_KEY = "the_retro_talks_admin_token";

type Page = "home" | "about";

function getInitialPage(): Page {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (
      path === "/about" ||
      path.startsWith("/about") ||
      path === "/portfolio" ||
      hash === "#about" ||
      hash.includes("about")
    ) {
      return "about";
    }
  }
  return "home";
}

function App() {
  // Page Routing State: "home" (The Retro Talks) vs "about" (About Me / Portfolio)
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);

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
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path === "/about" ||
        path.startsWith("/about") ||
        path === "/portfolio" ||
        hash === "#about" ||
        hash.includes("about")
      ) {
        setCurrentPage("about");
      } else {
        setCurrentPage("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  const navigateToAbout = () => {
    setCurrentPage("about");
    window.history.pushState({}, "", "/about");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToHome = () => {
    setCurrentPage("home");
    window.history.pushState({}, "", "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
        // Fallback optimistic update
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

  if (currentPage === "about") {
    return (
      <AboutPage
        onNavigateHome={navigateToHome}
        reviewCount={reviews.length}
      />
    );
  }

  // Primary Home Page: The Retro Talks
  return (
    <RetroTalksPage
      reviews={reviews}
      isAdmin={isAdmin}
      onLoginSuccess={handleLoginSuccess}
      onLogout={handleLogout}
      onNavigateToAbout={navigateToAbout}
      onSaveReview={handleSaveNewReview}
      onDeleteReview={handleDeleteReview}
      onUpdatePoster={handleUpdatePoster}
    />
  );
}

export default App;
