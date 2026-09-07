import { useState, useEffect } from "react";
import type { Review } from "./types";
import { RetroTalksPage } from "./pages/RetroTalksPage";
import { AboutPage } from "./pages/AboutPage";
import { INITIAL_REVIEWS } from "./data/sampleReviews";

const STORAGE_KEY = "the_retro_talks_personal_reviews";

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

  // Load personal reviews from localStorage or initial sample set
  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
    return INITIAL_REVIEWS;
  });

  // Persist reviews to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }, [reviews]);

  // Sync browser back/forward history navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path === "/about" ||
        path.startsWith("/about") ||
        path === "/portfolio" ||
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

  const handleSaveNewReview = (newReview: Review) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  const handleDeleteReview = (id: string | number) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdatePoster = (reviewId: string | number, newPosterUrl: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, poster: newPosterUrl } : r))
    );
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
      onNavigateToAbout={navigateToAbout}
      onSaveReview={handleSaveNewReview}
      onDeleteReview={handleDeleteReview}
      onUpdatePoster={handleUpdatePoster}
    />
  );
}

export default App;
