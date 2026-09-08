import React, { useState, useEffect, useRef } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Film,
  Star,
  Heart,
  LogOut,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Database,
  ExternalLink,
} from "lucide-react";
import type { Review, Movie } from "../types";
import { getPosterUrl } from "../utils/images";
import { MovieModal } from "../components/MovieModal";
import { ReviewModal } from "../components/ReviewModal";
import { PosterSelectorModal } from "../components/PosterSelectorModal";

interface AdminPageProps {
  reviews: Review[];
  isAdmin: boolean;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  onSaveReview: (review: Review) => Promise<void>;
  onDeleteReview: (id: string | number) => Promise<void>;
  onUpdatePoster: (reviewId: string | number, newPosterUrl: string) => Promise<void>;
  onNavigateHome: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  reviews,
  isAdmin,
  onLoginSuccess,
  onLogout,
  onSaveReview,
  onDeleteReview,
  onUpdatePoster,
  onNavigateHome,
}) => {
  // Login form states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // TMDB Autosuggest Search (for logging new reviews)
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Filter existing reviews
  const [reviewFilter, setReviewFilter] = useState("");

  // Modals inside Admin Page
  const [selectedMovieForReview, setSelectedMovieForReview] = useState<Movie | null>(null);
  const [storyStudioReview, setStoryStudioReview] = useState<Review | null>(null);
  const [posterEditReview, setPosterEditReview] = useState<Review | null>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // TMDB Autosuggest debounce
  useEffect(() => {
    if (!isAdmin || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const movies: Movie[] = (data.results || []).slice(0, 6);
        setSuggestions(movies);
        setShowDropdown(true);
      } catch (err) {
        console.error("Autosuggest error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isAdmin]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Incorrect admin passcode. Access denied.");
      }

      onLoginSuccess(data.token);
      setPassword("");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // Filtered existing reviews list
  const filteredReviews = reviews.filter((r) => {
    if (!reviewFilter.trim()) return true;
    const query = reviewFilter.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.director.toLowerCase().includes(query) ||
      (r.year && r.year.toString().includes(query))
    );
  });

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : "0.0";
  const favoritesCount = reviews.filter((r) => r.isFavorite).length;

  // --------------------------------------------------------------------------
  // 1. UNAUTHENTICATED STATE: Sleek Admin Login View
  // --------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col items-center justify-center p-4 selection:bg-[#ff5500] selection:text-black font-poppins relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff5500]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-[#090b0e] border border-white/[0.12] rounded-3xl p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.12)] space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] mx-auto mb-3 shadow-[0_0_20px_rgba(255,85,0,0.2)]">
              <Lock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#ff5500] block">
              Restricted Area
            </span>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs text-zinc-400">
              The Retro Talks · Cinema Review & Story Studio
            </p>
          </div>

          {/* Notice */}
          <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.06] text-xs text-zinc-400 text-center">
            Enter your admin security passcode to manage cinema reviews and access studio tools.
          </div>

          {/* Error message */}
          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Passcode Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-zinc-400 block">
                Admin Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode..."
                  autoFocus
                  required
                  className="w-full bg-[#0e1117] border border-white/[0.1] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none pr-11 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !password.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm transition-all cursor-pointer shadow-[0_0_25px_rgba(255,85,0,0.3)] flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                  <span>Authenticate</span>
                </>
              )}
            </button>
          </form>

          {/* Return link */}
          <div className="pt-2 text-center border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-mono transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Homepage</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATED STATE: Full Admin Command Center
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-20 flex items-center justify-between">
          
          {/* Logo & Admin Badge */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col select-none cursor-pointer" onClick={onNavigateHome}>
              <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#ff5500] leading-none mb-1">
                The
              </span>
              <span className="text-xl font-extrabold tracking-tight text-white leading-none font-poppins">
                Retro Talks
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/30 text-xs font-mono text-[#ff7a29]">
              <Shield className="w-3 h-3" />
              <span>Admin Center</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="View Public Site"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#ff5500]" />
              <span className="hidden sm:inline">View Public Site</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-400 hover:text-red-300 transition-all cursor-pointer"
              title="Exit Admin Mode"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-8 space-y-8">
        
        {/* Metric Cards Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Total Reviews</span>
            <span className="text-3xl font-black font-poppins text-white mt-1 block">{totalReviews}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Average Rating</span>
            <span className="text-3xl font-black font-poppins text-[#ff5500] mt-1 block">★ {avgRating}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Favorites</span>
            <span className="text-3xl font-black font-poppins text-white mt-1 block">{favoritesCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">Database Storage</span>
            <span className="text-xs font-mono text-emerald-400 font-bold mt-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>retro_talks.db</span>
            </span>
          </div>
        </div>

        {/* Section 1: TMDB Movie Search & Review Logger */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#090b0e] border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold font-poppins text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-[#ff5500]" />
                <span>Log a New Film Review</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Search TMDB's worldwide database to pull official movie details, posters, and write your critique.
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">Live TMDB Sync</span>
          </div>

          {/* Search Input with Autosuggest Dropdown */}
          <div className="relative" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                placeholder="Search TMDB by movie title (e.g. Oppenheimer, Dune, Pulp Fiction)..."
                className="w-full bg-[#0e1117] border border-white/[0.1] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white placeholder-zinc-500 outline-none shadow-inner transition-all"
              />
              <Search className="w-5 h-5 text-zinc-500 absolute left-4 pointer-events-none" />

              {isSearching && (
                <div className="absolute right-4">
                  <Loader2 className="w-4 h-4 text-[#ff5500] animate-spin" />
                </div>
              )}
            </div>

            {/* Autosuggest Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#0d1016] border border-white/[0.12] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-50 divide-y divide-white/[0.06] animate-in fade-in slide-in-from-top-2 duration-150">
                {suggestions.map((movie) => {
                  const poster = getPosterUrl(movie.poster, "w342");
                  return (
                    <div
                      key={movie.id}
                      onClick={() => {
                        setSelectedMovieForReview(movie);
                        setShowDropdown(false);
                        setSearchQuery("");
                      }}
                      className="p-3 flex items-center gap-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <div className="w-10 aspect-[2/3] rounded-lg overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.06]">
                        {poster ? (
                          <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Film className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white group-hover:text-[#ff7a29] transition-colors truncate">
                            {movie.title}
                          </h4>
                          {movie.year && (
                            <span className="text-xs font-mono text-zinc-500">
                              ({movie.year})
                            </span>
                          )}
                        </div>
                        {movie.director && (
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">
                            Dir. {movie.director}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-[#ff7a29] group-hover:translate-x-1 transition-transform">
                        <span>Log Review</span>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Manage Existing Reviews */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#090b0e] border border-white/[0.08] space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-poppins text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#ff5500]" />
                <span>Manage Logged Reviews ({filteredReviews.length})</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Edit posters from TMDB, generate 9:16 Instagram Story cards, or delete entries.
              </p>
            </div>

            {/* Quick Filter */}
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
                placeholder="Filter reviews by title or director..."
                className="w-full bg-[#0e1117] border border-white/[0.08] focus:border-[#ff5500] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none"
              />
            </div>
          </div>

          {/* Review items table */}
          {filteredReviews.length > 0 ? (
            <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0c0e13]">
              {filteredReviews.map((rev) => {
                const poster = getPosterUrl(rev.poster, "w342");
                return (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Left: Poster + Film Info */}
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <div className="w-14 sm:w-16 aspect-[2/3] rounded-xl overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.08] shadow-md">
                        {poster ? (
                          <img src={poster} alt={rev.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-5 h-5 text-zinc-600" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-white font-poppins truncate">
                            {rev.title}
                          </h3>
                          <span className="text-xs font-mono text-zinc-500">
                            ({rev.year})
                          </span>
                          {rev.isFavorite && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/30 text-[10px] font-mono">
                              <Heart className="w-2.5 h-2.5 fill-[#ff5500]" />
                              <span>Favorite</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-400 font-mono">
                          Dir. <strong className="text-zinc-300">{rev.director}</strong> · Watched {rev.watchedDate}
                        </p>

                        <div className="flex items-center gap-1 text-xs text-[#ff5500] font-mono">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-bold">{rev.rating.toFixed(1)}</span>
                          <span className="text-zinc-600 font-normal">/ 5.0</span>
                        </div>

                        {/* Review quote snippet */}
                        <p className="text-xs text-zinc-400 italic line-clamp-1 border-l-2 border-[#ff5500]/40 pl-2">
                          "{rev.review}"
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                      {/* Instagram Story Studio */}
                      <button
                        onClick={() => setStoryStudioReview(rev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                        title="Open Instagram Story Card Studio"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                        <span>Story Studio</span>
                      </button>

                      {/* Change Poster */}
                      <button
                        onClick={() => setPosterEditReview(rev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#ff5500]/15 border border-white/[0.08] hover:border-[#ff5500]/40 text-xs font-mono text-zinc-300 hover:text-[#ff7a29] transition-colors cursor-pointer"
                        title="Change Poster Artwork from TMDB"
                      >
                        <Film className="w-3.5 h-3.5 text-[#ff5500]" />
                        <span>Change Poster</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to permanently delete "${rev.title}" from SQLite?`)) {
                            onDeleteReview(rev.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border border-white/[0.06] rounded-2xl bg-[#0c0e13] p-6">
              <Film className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-poppins">No reviews found matching filter.</p>
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-6 text-center text-xs font-mono text-zinc-500">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>The Retro Talks — Admin Console</span>
          <span>Logged in as Administrator (Vishakhan Pillai)</span>
        </div>
      </footer>

      {/* MODAL 1: Movie Detail & Review Logger Modal */}
      {selectedMovieForReview && (
        <MovieModal
          movie={selectedMovieForReview}
          onClose={() => setSelectedMovieForReview(null)}
          onSaveReview={async (newReview) => {
            await onSaveReview(newReview);
            setSelectedMovieForReview(null);
          }}
          isAdmin={true}
        />
      )}

      {/* MODAL 2: Review Story Studio Modal */}
      {storyStudioReview && (
        <ReviewModal
          review={storyStudioReview}
          onClose={() => setStoryStudioReview(null)}
          onUpdatePoster={onUpdatePoster}
          isAdmin={true}
        />
      )}

      {/* MODAL 3: TMDB Poster Selector Modal */}
      {posterEditReview && (
        <PosterSelectorModal
          movieId={Number(posterEditReview.id)}
          movieTitle={posterEditReview.title}
          currentPosterUrl={posterEditReview.poster}
          isOpen={Boolean(posterEditReview)}
          onSelectPoster={async (newPosterUrl) => {
            await onUpdatePoster(posterEditReview.id, newPosterUrl);
            setPosterEditReview(null);
          }}
          onClose={() => setPosterEditReview(null)}
        />
      )}

    </div>
  );
};
