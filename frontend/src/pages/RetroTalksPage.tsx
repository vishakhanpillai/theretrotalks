import React, { useState, useEffect, useMemo } from "react";
import { Film, Search, ArrowUpDown, X, LayoutList, LayoutGrid } from "lucide-react";
import type { Movie, Review, UpcomingMovie } from "../types";
import { ReviewCard } from "../components/ReviewCard";
import { ReviewPosterCard } from "../components/ReviewPosterCard";
import { MovieModal } from "../components/MovieModal";
import { AboutModal } from "../components/AboutModal";
import { UpcomingMoviesSidebar } from "../components/UpcomingMoviesSidebar";
import { AvengersCountdown } from "../components/AvengersCountdown";
import { AvengersDoomsdayModal } from "../components/AvengersDoomsdayModal";
import { Footer } from "../components/Footer";

interface RetroTalksPageProps {
  reviews: Review[];
  onOpenReview: (review: Review | string | number) => void;
}

export const RetroTalksPage: React.FC<RetroTalksPageProps> = ({
  reviews,
  onOpenReview,
}) => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDoomsdayModal, setShowDoomsdayModal] = useState(false);

  const [navSolidProgress, setNavSolidProgress] = useState<number>(0);

  // Filter and Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "latest" | "highest_rated" | "lowest_rated" | "year_newest" | "year_oldest" | "title_az"
  >("latest");

  // View Mode (Magazine vs Poster Grid)
  const [viewMode, setViewMode] = useState<"magazine" | "grid">(() => {
    try {
      const saved = localStorage.getItem("retro_talks_view_mode");
      if (saved === "grid" || saved === "magazine") return saved;
    } catch {}
    return "magazine";
  });

  const [visibleCount, setVisibleCount] = useState<number>(() => (viewMode === "grid" ? 9 : 6));

  const handleToggleViewMode = (mode: "magazine" | "grid") => {
    setViewMode(mode);
    try {
      localStorage.setItem("retro_talks_view_mode", mode);
    } catch {}
  };

  // Scroll to top on mount and track scroll position for header solid transition
  useEffect(() => {
    window.scrollTo(0, 0);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const solidThreshold = 80;
      const progress = Math.min(1, Math.max(0, currentScrollY / solidThreshold));
      setNavSolidProgress(Math.round(progress * 100) / 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter and Sort Reviews
  const filteredAndSortedReviews = useMemo(() => {
    let list = [...reviews];

    // 1. Live Search (Movie Title Only)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => r.title?.toLowerCase().includes(q));
    }

    // 2. Sorting
    switch (sortBy) {
      case "highest_rated":
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "lowest_rated":
        list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case "year_newest":
        list.sort((a, b) => {
          const yA = parseInt(a.year || "0", 10) || 0;
          const yB = parseInt(b.year || "0", 10) || 0;
          return yB - yA;
        });
        break;
      case "year_oldest":
        list.sort((a, b) => {
          const yA = parseInt(a.year || "0", 10) || 0;
          const yB = parseInt(b.year || "0", 10) || 0;
          return yA - yB;
        });
        break;
      case "title_az":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "latest":
      default:
        // Respect default chronological / pinned display order
        break;
    }

    return list;
  }, [reviews, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSortBy("latest");
  };

  // Reset pagination when search, sort, or view mode changes
  useEffect(() => {
    setVisibleCount(viewMode === "grid" ? 9 : 6);
  }, [searchQuery, sortBy, viewMode]);

  const visibleReviews = filteredAndSortedReviews.slice(0, visibleCount);
  const hasMore = visibleReviews.length < filteredAndSortedReviews.length;

  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black relative overflow-x-hidden">
      
      {/* Ambient Cinema Lighting & Background Depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[520px] pointer-events-none select-none overflow-hidden z-0">
        {/* Subtle warm ember radial glow centered on the hero */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[820px] h-[380px] bg-gradient-to-b from-[#ff5500]/14 via-[#ff5500]/[0.025] to-transparent rounded-full blur-3xl" />
        {/* Fine cinema grain texture */}
        <div className="absolute inset-0 cinema-grain opacity-40" />
        {/* Top hairline amber accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 sm:w-[480px] h-[1px] bg-gradient-to-r from-transparent via-[#ff5500]/40 to-transparent" />
      </div>

      {/* Top Header */}
      <header
        className="sticky top-0 z-40 w-full transition-colors duration-150"
        style={{
          backgroundColor: `rgba(7, 8, 10, ${navSolidProgress})`,
          borderBottomColor: `rgba(255, 255, 255, ${0.08 * navSolidProgress})`,
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          boxShadow:
            navSolidProgress > 0.4
              ? `0 4px 20px rgba(0, 0, 0, ${0.6 * navSolidProgress})`
              : "none",
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div
            className="flex flex-col select-none cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[#ff5500] leading-none mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              The
            </span>
            <span className="text-xl sm:text-2xl font-poppins font-medium font-[500] tracking-tight text-white leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-zinc-200 transition-colors">
              Retro Talks
            </span>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAboutModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] text-xs font-inter font-medium text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
              <span>About</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero Section - Modern Editorial Masthead */}
      <section className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 pt-8 sm:pt-12 pb-6">
        <div className="w-full space-y-3 pb-8 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] text-[#ff5500] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
            <span>Film Archive & Journal</span>
          </div>
          
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[2rem] xl:text-[2.35rem] 2xl:text-[2.65rem] font-bold tracking-tight text-white font-poppins leading-tight sm:whitespace-nowrap">
            I watch movies. Sometimes I have a lot to say about them.
          </h1>
          
          <p className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-2xl pt-1">
            Most of it is probably unnecessary. I’m writing it down anyway.
          </p>
        </div>
      </section>

      {/* Main Content: 2-Column Layout */}
      <main className="relative z-10 flex-grow w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-6">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-start">
          
          {/* Left Column: Widened Reviews List */}
          <div className="flex-grow min-w-0 w-full space-y-6">
            
            {/* Reviews Section Header & Controls */}
            <div className="space-y-3 pb-3 border-b border-white/[0.06]">
              {/* Top Row: Section Title & High-Width Search + Sort + View Mode Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                <div className="flex items-center gap-2.5 shrink-0">
                  <h2 className="text-xs font-inter uppercase tracking-[0.2em] font-semibold text-zinc-300">
                    Reviews
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono text-zinc-400">
                    {filteredAndSortedReviews.length}
                    {filteredAndSortedReviews.length !== reviews.length && ` / ${reviews.length}`}
                  </span>
                </div>

                {/* High-Width Search & Sort Controls */}
                <div className="flex items-center gap-2.5 flex-grow sm:max-w-2xl justify-end flex-wrap sm:flex-nowrap">
                  {/* Higher Width Live Search Input (Title Only) */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search reviews by movie title..."
                      className="w-full pl-9.5 pr-8 py-2 rounded-xl bg-[#0b0e14] border border-white/[0.08] focus:border-[#ff5500]/50 text-xs sm:text-sm font-inter text-white placeholder-zinc-500 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(255,85,0,0.15)]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b0e14] border border-white/[0.08] text-xs font-inter text-zinc-300 hover:border-white/20 transition-colors">
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#ff5500] shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-xs text-zinc-300 focus:text-white outline-none cursor-pointer pr-1 font-medium"
                      >
                        <option value="latest" className="bg-[#0b0e14] text-white">Latest Logged</option>
                        <option value="highest_rated" className="bg-[#0b0e14] text-white">Highest Rated (5★ → 1★)</option>
                        <option value="lowest_rated" className="bg-[#0b0e14] text-white">Lowest Rated (1★ → 5★)</option>
                        <option value="year_newest" className="bg-[#0b0e14] text-white">Year (Newest First)</option>
                        <option value="year_oldest" className="bg-[#0b0e14] text-white">Year (Oldest First)</option>
                        <option value="title_az" className="bg-[#0b0e14] text-white">Title (A – Z)</option>
                      </select>
                    </div>
                  </div>

                  {/* View Mode Toggle: Magazine (List) vs Poster Grid */}
                  <div className="flex items-center p-1 rounded-xl bg-[#0b0e14] border border-white/[0.08] shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("magazine")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === "magazine"
                          ? "bg-white/[0.14] text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="Editorial Magazine View"
                    >
                      <LayoutList className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-white/[0.14] text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      title="Compact Poster Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Display Area */}
            {filteredAndSortedReviews.length > 0 ? (
              <div className="space-y-8">
                {viewMode === "magazine" ? (
                  <div className="space-y-6 sm:space-y-8">
                    {visibleReviews.map((rev) => (
                      <ReviewCard
                        key={rev.id}
                        review={rev}
                        onOpenReview={() => onOpenReview(rev)}
                        isAdmin={false}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                    {visibleReviews.map((rev) => (
                      <ReviewPosterCard
                        key={rev.id}
                        review={rev}
                        onOpenReview={() => onOpenReview(rev)}
                      />
                    ))}
                  </div>
                )}

                {/* Load More Button */}
                {hasMore && (
                  <div className="pt-4 pb-2 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + (viewMode === "grid" ? 6 : 4))}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0b0e14] hover:bg-[#121620] border border-white/10 hover:border-[#ff5500]/50 text-xs font-inter font-medium text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg hover:shadow-[0_0_20px_rgba(255,85,0,0.15)] group"
                    >
                      <span>Load More Films</span>
                      <span className="text-[10.5px] font-mono text-zinc-500 group-hover:text-zinc-400">
                        ({visibleReviews.length} of {filteredAndSortedReviews.length})
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#090b0e] border border-white/[0.06] rounded-3xl p-8 max-w-md mx-auto">
                <Film className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-poppins font-bold text-white">No reviews found</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {searchQuery.trim()
                    ? `No films found with title matching "${searchQuery}".`
                    : `No reviews found.`}
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#ff5500] text-black font-semibold text-xs hover:bg-[#ff6a1f] transition-all cursor-pointer shadow-lg"
                >
                  Clear Search
                </button>
              </div>
            )}

          </div>

          {/* Right Column: Avengers Doomsday Countdown & Upcoming Movies of the Month */}
          <div className="w-full lg:w-[330px] xl:w-[380px] flex-shrink-0 lg:sticky lg:top-20 space-y-6 lg:pt-[57px]">
            <AvengersCountdown onClick={() => setShowDoomsdayModal(true)} />
            <UpcomingMoviesSidebar
              onSelectUpcoming={(upcoming: UpcomingMovie) => {
                setSelectedMovie({
                  id: upcoming.id,
                  title: upcoming.title,
                  year: upcoming.releaseDate ? upcoming.releaseDate.split("-")[0] : null,
                  poster: upcoming.poster,
                  backdrop: upcoming.backdrop || null,
                  overview: upcoming.overview,
                  tmdbRating: upcoming.tmdbRating,
                });
              }}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Avengers: Doomsday Summary Modal */}
      <AvengersDoomsdayModal
        isOpen={showDoomsdayModal}
        onClose={() => setShowDoomsdayModal(false)}
      />

      {/* Upcoming Movie Preview Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          isAdmin={false}
        />
      )}

      {/* About Me Popup Card Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

    </div>
  );
};
