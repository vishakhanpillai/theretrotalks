import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2, X, Star, Film, Plus, Heart, Sparkles, User } from "lucide-react";
import type { Movie, Review } from "../types";
import { ReviewCard } from "../components/ReviewCard";
import { ReviewModal } from "../components/ReviewModal";
import { MovieModal } from "../components/MovieModal";
import { getPosterUrl } from "../utils/images";

interface RetroTalksPageProps {
  reviews: Review[];
  onNavigateToAbout: () => void;
  onSaveReview: (newReview: Review) => void;
  onDeleteReview: (id: string | number) => void;
  onUpdatePoster: (reviewId: string | number, newPosterUrl: string) => void;
}

export const RetroTalksPage: React.FC<RetroTalksPageProps> = ({
  reviews,
  onNavigateToAbout,
  onSaveReview,
  onDeleteReview,
  onUpdatePoster,
}) => {
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites" | "top">("all");

  // Search & Live Autosuggest State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Live Autosuggestion as user types (debounced 250ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(`/api/movies/search?q=${encodeURIComponent(trimmed)}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions((data.results || []).slice(0, 6));
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Autosuggest error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Click outside to close autosuggest
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (movie: Movie) => {
    setSelectedMovie(movie);
    setShowDropdown(false);
    setSearchQuery("");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  };

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === "favorites") return r.isFavorite;
    if (activeFilter === "top") return r.rating >= 5.0;
    return true;
  });

  const totalWatched = reviews.length;
  const avgRating =
    totalWatched > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalWatched).toFixed(1)
      : "0.0";
  const favoritesCount = reviews.filter((r) => r.isFavorite).length;

  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo: 'The' on top, 'Retro Talks' on bottom */}
          <div className="flex flex-col select-none cursor-pointer">
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#ff5500] leading-none mb-1">
              The
            </span>
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-none font-poppins">
              Retro Talks
            </span>
          </div>

          {/* Right Navigation: Reviews Count & About Me Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
              <span className="text-white font-medium">{reviews.length}</span>
              <span className="hidden sm:inline text-zinc-500">Reviews Logged</span>
            </div>

            {/* About Me Button */}
            <button
              onClick={onNavigateToAbout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#ff5500]/40 text-xs font-medium text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <User className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>About Me</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero & Search Header */}
      <section className="pt-12 pb-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center">
        <div className="space-y-4">
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#ff5500] mb-1">
              Personal Cinema Diary
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase font-poppins">
              THE RETRO TALKS
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto font-normal">
            My private film diary, reviews, and 9:16 editorial Instagram story generator.
          </p>

          {/* Search bar with Live Autosuggestion */}
          <div ref={searchContainerRef} className="max-w-xl mx-auto mt-4 relative">
            <div className="relative flex items-center bg-[#0d0f14] border border-white/[0.1] focus-within:border-[#ff5500]/70 rounded-xl transition-all duration-300 overflow-hidden shadow-lg">
              
              <div className="pl-4 text-zinc-500">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#ff5500]" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </div>

              <input
                type="text"
                placeholder="Search TMDB to log a new film review..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                className="w-full py-3.5 px-3 bg-transparent text-white placeholder-zinc-500 text-sm focus:outline-none font-poppins"
              />

              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="p-2 text-zinc-500 hover:text-white transition-colors mr-1 cursor-pointer"
                  title="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Autosuggest Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0d0f14] border border-white/[0.12] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-50 divide-y divide-white/[0.06]">
                {suggestions.map((movie) => {
                  const thumb = getPosterUrl(movie.poster, "w342");
                  return (
                    <div
                      key={movie.id}
                      onClick={() => handleSelectSuggestion(movie)}
                      className="flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-colors cursor-pointer group text-left"
                    >
                      <div className="w-9 aspect-[2/3] rounded-lg overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.08]">
                        {thumb ? (
                          <img src={thumb} alt={movie.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-3 h-3 text-zinc-600" />
                          </div>
                        )}
                      </div>

                      <div className="flex-grow min-w-0">
                        <h4 className="text-sm font-medium text-white truncate group-hover:text-[#ff7a29] transition-colors">
                          {movie.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <span>{movie.year || "Unknown"}</span>
                          {movie.tmdbRating && (
                            <>
                              <span>·</span>
                              <span className="text-[#ff5500]">★ {movie.tmdbRating}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <Plus className="w-4 h-4 text-zinc-500 group-hover:text-[#ff5500] transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats Strip */}
          <div className="flex items-center justify-center gap-6 pt-2 text-xs font-mono text-zinc-400">
            <div>
              <span className="text-white font-bold">{totalWatched}</span> Films Logged
            </div>
            <span>·</span>
            <div>
              <span className="text-[#ff5500] font-bold">★ {avgRating}</span> Avg Rating
            </div>
            <span>·</span>
            <div>
              <span className="text-white font-bold">{favoritesCount}</span> Favorites
            </div>
          </div>

        </div>
      </section>

      {/* Main Reviews Gallery */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-medium text-zinc-300">
            My Reviews <span className="text-zinc-500">({filteredReviews.length})</span>
          </h2>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#0e1117] p-1 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-[#ff5500] text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>

            <button
              onClick={() => setActiveFilter("favorites")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                activeFilter === "favorites"
                  ? "bg-[#ff5500] text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Heart className="w-3 h-3" />
              <span>Favorites</span>
            </button>

            <button
              onClick={() => setActiveFilter("top")}
              className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                activeFilter === "top"
                  ? "bg-[#ff5500] text-black font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>5 Stars</span>
            </button>
          </div>
        </div>

        {/* Reviews Grid */}
        {filteredReviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredReviews.map((rev) => (
              <ReviewCard
                key={rev.id}
                review={rev}
                onOpenReview={(r) => setSelectedReview(r)}
                onDelete={onDeleteReview}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#090b0e] border border-white/[0.06] rounded-3xl p-8 max-w-md mx-auto">
            <Sparkles className="w-8 h-8 text-[#ff5500] mx-auto mb-3" />
            <h3 className="text-base font-poppins font-bold text-white">No reviews in this category</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Search above to log and review a new film.
            </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff5500]" />
            <span className="text-zinc-300 font-bold font-poppins">The Retro Talks</span>
            <span className="text-zinc-600">— Personal Cinema Archive</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateToAbout}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <User className="w-3 h-3 text-[#ff5500]" />
              <span>About Vishakhan (Portfolio)</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Review Modal with Instagram Story Generator */}
      <ReviewModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        onUpdatePoster={onUpdatePoster}
      />

      {/* TMDB Movie Detail & Review Logger Modal (from Search) */}
      <MovieModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onSaveReview={onSaveReview}
      />

    </div>
  );
};
