import { useState, useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { Review } from "./types";
import { RetroTalksPage } from "./pages/RetroTalksPage";
import { slugify, getReviewSlug } from "./utils/slugify";
import { AuthProvider } from "./context/AuthContext";
import { ReviewsProvider, useReviews } from "./context/ReviewsContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage }))
);

const ReviewPage = lazy(() =>
  import("./pages/ReviewPage").then((m) => ({ default: m.ReviewPage }))
);

const CinematicLoadingFallback = () => (
  <div className="min-h-screen bg-[#07080a] flex flex-col items-center justify-center text-zinc-400 font-poppins selection:bg-[#ff5500] selection:text-black">
    <div className="w-11 h-11 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] mb-4 shadow-[0_0_20px_rgba(255,85,0,0.2)]">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
    <span className="text-[11px] font-mono tracking-[0.28em] uppercase text-zinc-500 font-semibold">
      Loading Reel...
    </span>
  </div>
);

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

function AppContent() {
  const [route, setRoute] = useState<RouteState>(parseCurrentRoute);
  const { reviews, refreshReviews } = useReviews();

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
    refreshReviews();
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

  // 1. Admin Page (only accessible at /admin or via secret shortcut)
  if (route.page === "admin") {
    return (
      <Suspense fallback={<CinematicLoadingFallback />}>
        <AdminPage
          onNavigateHome={navigateToHome}
          onNavigateToReview={navigateToReview}
        />
      </Suspense>
    );
  }

  // 2. Standalone Dedicated Cinema Review Page
  if (route.page === "review" && route.reviewId) {
    return (
      <Suspense fallback={<CinematicLoadingFallback />}>
        <ReviewPage
          key={route.reviewId}
          reviewId={route.reviewId}
          onNavigateHome={navigateToHome}
        />
      </Suspense>
    );
  }

  // 3. Primary Home Page: The Retro Talks
  return (
    <RetroTalksPage
      onOpenReview={navigateToReview}
    />
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ReviewsProvider>
          <AppContent />
        </ReviewsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
