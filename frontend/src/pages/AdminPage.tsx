import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Image as ImageIcon,
  Edit3,
  ArrowUpDown,
  Check,
  X,
  Calendar,
  Move,
  Save,
  GripVertical,
  ChevronsLeft,
  ChevronsRight,
  Crop,
} from "lucide-react";
import type { Review, Movie, BackdropFraming } from "../types";
import { getPosterUrl } from "../utils/images";
import { MovieModal } from "../components/MovieModal";
import { PosterSelectorModal } from "../components/PosterSelectorModal";
import { BackdropSelectorModal } from "../components/BackdropSelectorModal";
import { BackdropFramingModal } from "../components/BackdropFramingModal";
import { StoryCardBuilderModal } from "../components/StoryCardBuilderModal";
import { EditReviewModal } from "../components/EditReviewModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { Footer } from "../components/Footer";
import { slugify } from "../utils/slugify";

interface AdminPageProps {
  reviews: Review[];
  isAdmin: boolean;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  onSaveReview: (review: Review) => Promise<void>;
  onUpdateReview?: (reviewId: string | number, updatedData: Partial<Review>) => Promise<void>;
  onDeleteReview: (id: string | number) => Promise<void>;
  onReorderReviews?: (orderedIds: (string | number)[]) => Promise<void>;
  onUpdatePoster: (reviewId: string | number, newPosterUrl: string) => Promise<void>;
  onUpdateBackdrop?: (reviewId: string | number, newBackdropUrl: string) => Promise<void>;
  onUpdateBackdropFraming?: (reviewId: string | number, framing: BackdropFraming) => Promise<void>;
  onNavigateHome: () => void;
  onNavigateToReview?: (id: string | number) => void;
}

type FilterTab = "all" | "favorites" | "5star" | "4star_plus";
type SortOption = "custom" | "newest" | "oldest" | "rating_desc" | "rating_asc" | "year_desc" | "title_asc";

export const AdminPage: React.FC<AdminPageProps> = ({
  reviews,
  isAdmin,
  onLoginSuccess,
  onLogout,
  onSaveReview,
  onUpdateReview,
  onDeleteReview,
  onReorderReviews,
  onUpdatePoster,
  onUpdateBackdrop,
  onUpdateBackdropFraming,
  onNavigateHome,
  onNavigateToReview,
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

  // Filter & Sort State for Logged Reviews Grid
  const [gridSearch, setGridSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("custom");

  // Reordering Reviews State
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [orderedList, setOrderedList] = useState<Review[]>(reviews);
  const [hasPendingReorder, setHasPendingReorder] = useState<boolean>(false);
  const [savingReorder, setSavingReorder] = useState<boolean>(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Sync orderedList when reviews prop updates (if not dirty)
  useEffect(() => {
    if (!hasPendingReorder) {
      setOrderedList(reviews);
    }
  }, [reviews, hasPendingReorder]);

  const moveReview = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedList.length || fromIndex === toIndex) return;
    const updated = [...orderedList];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setOrderedList(updated);
    setHasPendingReorder(true);
  };

  const handleSaveReorder = async () => {
    if (!onReorderReviews) return;
    setSavingReorder(true);
    try {
      await onReorderReviews(orderedList.map((r) => r.id));
      setHasPendingReorder(false);
      showToast("Display order updated on website!");
    } catch (e) {
      showToast("Failed to save display order.");
    } finally {
      setSavingReorder(false);
    }
  };

  // Modals inside Admin Page
  const [selectedMovieForReview, setSelectedMovieForReview] = useState<Movie | null>(null);
  const [editReviewTarget, setEditReviewTarget] = useState<Review | null>(null);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null);
  const [storyStudioReview, setStoryStudioReview] = useState<Review | null>(null);
  const [posterEditReview, setPosterEditReview] = useState<Review | null>(null);
  const [backdropEditReview, setBackdropEditReview] = useState<Review | null>(null);
  const [framingEditReview, setFramingEditReview] = useState<Review | null>(null);

  // Feedback Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

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

  // Handle Edit Review Save
  const handleSaveEditedReview = async (updatedData: Partial<Review>) => {
    if (!editReviewTarget) return;
    if (onUpdateReview) {
      await onUpdateReview(editReviewTarget.id, updatedData);
    }
    showToast(`Updated review for "${updatedData.title || editReviewTarget.title}"`);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteReviewTarget) return;
    const title = deleteReviewTarget.title;
    await onDeleteReview(deleteReviewTarget.id);
    showToast(`Deleted review for "${title}"`);
  };

  // Stats computation
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : "0.0";
  const favoritesCount = reviews.filter((r) => r.isFavorite).length;
  const fiveStarCount = reviews.filter((r) => r.rating >= 5.0).length;
  const fourStarPlusCount = reviews.filter((r) => r.rating >= 4.0).length;

  // Filter & Sort Logged Reviews
  const displayedReviews = useMemo(() => {
    const sourceList = isReorderMode ? orderedList : (sortBy === "custom" ? orderedList : reviews);
    return sourceList
      .filter((r) => {
        if (isReorderMode) return true; // Show all reviews in reorder mode
        // Tab Filter
        if (filterTab === "favorites" && !r.isFavorite) return false;
        if (filterTab === "5star" && r.rating < 5.0) return false;
        if (filterTab === "4star_plus" && r.rating < 4.0) return false;

        // Search Filter
        if (gridSearch.trim()) {
          const q = gridSearch.toLowerCase();
          const matchTitle = r.title.toLowerCase().includes(q);
          const matchDirector = r.director.toLowerCase().includes(q);
          const matchYear = r.year && r.year.toString().includes(q);
          const matchGenre = r.genres && r.genres.some((g) => g.toLowerCase().includes(q));
          return matchTitle || matchDirector || matchYear || matchGenre;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "custom" || isReorderMode) {
          const indexA = orderedList.findIndex((item) => String(item.id) === String(a.id));
          const indexB = orderedList.findIndex((item) => String(item.id) === String(b.id));
          return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
        }
        if (sortBy === "newest") {
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        }
        if (sortBy === "oldest") {
          return (Number(a.id) || 0) - (Number(b.id) || 0);
        }
        if (sortBy === "rating_desc") {
          return b.rating - a.rating;
        }
        if (sortBy === "rating_asc") {
          return a.rating - b.rating;
        }
        if (sortBy === "year_desc") {
          return (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
        }
        if (sortBy === "title_asc") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [reviews, orderedList, isReorderMode, filterTab, gridSearch, sortBy]);

  // --------------------------------------------------------------------------
  // 1. UNAUTHENTICATED STATE: Sleek Admin Login View
  // --------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col items-center justify-center p-4 selection:bg-[#ff5500] selection:text-black font-poppins relative overflow-hidden">
        {/* Ambient lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff5500]/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-[#090b0e] border border-white/[0.12] rounded-3xl p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.12)] space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] mx-auto mb-3 shadow-[0_0_20px_rgba(255,85,0,0.2)]">
              <Lock className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-inter uppercase tracking-[0.25em] text-[#ff5500] block font-semibold">
              Restricted Area
            </span>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs font-inter text-zinc-400">
              The Retro Talks · Cinema Review & Management Center
            </p>
          </div>

          {/* Notice */}
          <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.06] text-xs font-inter text-zinc-400 text-center leading-relaxed">
            Enter your admin security passcode to edit critiques, customize artwork, and manage database records.
          </div>

          {/* Error message */}
          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-inter text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Passcode Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-inter font-medium text-zinc-400 block">
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
                  className="w-full bg-[#0e1117] border border-white/[0.1] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] rounded-xl px-4 py-3 text-sm font-inter text-white placeholder-zinc-600 outline-none pr-11 transition-all"
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
              className="w-full py-3 px-4 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-inter font-bold text-sm transition-all cursor-pointer shadow-[0_0_25px_rgba(255,85,0,0.3)] flex items-center justify-center gap-2"
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
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-inter transition-colors cursor-pointer"
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
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0e1219] border border-[#ff5500]/40 text-white font-inter text-xs shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(255,85,0,0.2)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-[#ff5500] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-20 flex items-center justify-between">
          
          {/* Logo & Admin Badge */}
          <div className="flex items-center gap-3">
            <div
              className="flex flex-col select-none cursor-pointer group"
              onClick={onNavigateHome}
              title="Return to Public Site"
            >
              <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#ff5500] leading-none mb-1">
                The
              </span>
              <span className="text-xl font-extrabold tracking-tight text-white leading-none font-poppins group-hover:text-[#ff7a29] transition-colors">
                Retro Talks
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ff5500]/15 border border-[#ff5500]/30 text-xs font-inter text-[#ff7a29]">
              <Shield className="w-3 h-3" />
              <span>Admin Center</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-xs font-inter text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="View Public Site"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#ff5500]" />
              <span className="hidden sm:inline">View Public Site</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-inter text-red-400 hover:text-red-300 transition-all cursor-pointer"
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff5500]/5 rounded-full blur-2xl group-hover:bg-[#ff5500]/10 transition-all pointer-events-none" />
            <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-500 block font-medium">Total Reviews</span>
            <span className="text-3xl font-black font-poppins text-white mt-1.5 block">{totalReviews}</span>
            <span className="text-[11px] font-inter text-zinc-400 mt-1 block">Logged cinema entries</span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff5500]/5 rounded-full blur-2xl group-hover:bg-[#ff5500]/10 transition-all pointer-events-none" />
            <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-500 block font-medium">Average Rating</span>
            <span className="text-3xl font-black font-poppins text-[#ff5500] mt-1.5 block">★ {avgRating}</span>
            <span className="text-[11px] font-inter text-zinc-400 mt-1 block">Out of 5.0 scale</span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff5500]/5 rounded-full blur-2xl group-hover:bg-[#ff5500]/10 transition-all pointer-events-none" />
            <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-500 block font-medium">Curated Favorites</span>
            <span className="text-3xl font-black font-poppins text-white mt-1.5 block flex items-center gap-2">
              <span>{favoritesCount}</span>
              <Heart className="w-5 h-5 text-[#ff5500] fill-[#ff5500] inline" />
            </span>
            <span className="text-[11px] font-inter text-zinc-400 mt-1 block">Highlighted on homepage</span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#090b0e] border border-white/[0.08] shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-500 block font-medium">Database Storage</span>
              <span className="text-base font-bold font-poppins text-white mt-1.5 block flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>SQLite WAL Mode</span>
              </span>
            </div>
            <span className="text-[11px] font-inter text-emerald-400/90 font-medium flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>retro_talks.db Active</span>
            </span>
          </div>
        </div>

        {/* Section 1: TMDB Movie Search & Fast Review Logger */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#090b0e] border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold font-poppins text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-[#ff5500]" />
                <span>Log a New Film Review</span>
              </h2>
              <p className="text-xs font-inter text-zinc-400 mt-0.5">
                Search TMDB's global movie database to pull artwork, directors, cast, crew, and write your critique.
              </p>
            </div>
            <span className="text-xs font-inter text-zinc-500">Live TMDB Sync</span>
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
                className="w-full bg-[#0e1117] border border-white/[0.1] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] rounded-2xl pl-12 pr-10 py-3.5 text-sm font-inter text-white placeholder-zinc-500 outline-none shadow-inner transition-all"
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
                          <h4 className="text-sm font-medium font-poppins text-white group-hover:text-[#ff7a29] transition-colors truncate">
                            {movie.title}
                          </h4>
                          {movie.year && (
                            <span className="text-xs font-inter text-zinc-500">
                              ({movie.year})
                            </span>
                          )}
                        </div>
                        {movie.director && (
                          <p className="text-xs text-zinc-400 font-inter mt-0.5">
                            Dir. {movie.director}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-inter text-[#ff7a29] group-hover:translate-x-1 transition-transform pr-2 font-medium">
                        <span>Write Review</span>
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Logged Movies Poster Grid */}
        <section className="space-y-6">
          
          {/* Header & Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#090b0e] border border-white/[0.08]">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg sm:text-xl font-bold font-poppins text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#ff5500]" />
                  <span>Logged Movies Collection</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/30 text-xs font-inter font-semibold">
                  {displayedReviews.length} {displayedReviews.length === 1 ? "film" : "films"}
                </span>
              </div>
              <p className="text-xs font-inter text-zinc-400 mt-1">
                Edit reviews, switch high-resolution TMDB posters or backdrops, generate story cards, or delete entries.
              </p>
            </div>

            {/* Filter Pills, Search & Sort */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1118] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer ${
                    filterTab === "all"
                      ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All ({reviews.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("favorites")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer ${
                    filterTab === "favorites"
                      ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Heart className={`w-3 h-3 ${filterTab === "favorites" ? "fill-black" : "text-[#ff5500]"}`} />
                  <span>Favorites ({favoritesCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("5star")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer ${
                    filterTab === "5star"
                      ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Star className={`w-3 h-3 ${filterTab === "5star" ? "fill-black" : "text-[#ff5500]"}`} />
                  <span>5★ ({fiveStarCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("4star_plus")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer ${
                    filterTab === "4star_plus"
                      ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  4★+ ({fourStarPlusCount})
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  placeholder="Filter by title, dir..."
                  className="w-full bg-[#0e1118] border border-white/[0.08] focus:border-[#ff5500] rounded-xl pl-8 pr-7 py-1.5 text-xs font-inter text-white placeholder-zinc-500 outline-none"
                />
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {gridSearch && (
                  <button
                    type="button"
                    onClick={() => setGridSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-[#0e1118] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs font-inter text-zinc-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-white outline-none cursor-pointer text-xs font-inter pr-1"
                >
                  <option value="custom" className="bg-[#0e1118] text-[#ff7a29]">Site Display Order (Default)</option>
                  <option value="newest" className="bg-[#0e1118] text-white">Date Added (Newest)</option>
                  <option value="oldest" className="bg-[#0e1118] text-white">Date Added (Oldest)</option>
                  <option value="rating_desc" className="bg-[#0e1118] text-white">Rating (Highest)</option>
                  <option value="rating_asc" className="bg-[#0e1118] text-white">Rating (Lowest)</option>
                  <option value="year_desc" className="bg-[#0e1118] text-white">Release Year (Newest)</option>
                  <option value="title_asc" className="bg-[#0e1118] text-white">Title (A to Z)</option>
                </select>
              </div>

              {/* Rearrange Order Mode Toggle */}
              {onReorderReviews && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = !isReorderMode;
                    setIsReorderMode(nextMode);
                    if (nextMode) {
                      setSortBy("custom");
                      setGridSearch("");
                      setFilterTab("all");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-inter font-medium transition-all cursor-pointer ${
                    isReorderMode
                      ? "bg-[#ff5500] text-black border-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.35)] font-bold"
                      : "bg-[#0e1118] border-white/[0.08] text-zinc-300 hover:text-white hover:border-white/20"
                  }`}
                  title="Rearrange order of reviews on homepage and reviews page"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span>{isReorderMode ? "Exit Rearrange" : "Rearrange Order"}</span>
                </button>
              )}
            </div>
          </div>

          {/* REARRANGE MODE BANNER */}
          {isReorderMode && (
            <div className="mb-6 p-4 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#ff5500]/20 text-[#ff5500]">
                  <Move className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold font-poppins text-white">
                    Rearrange Review Order Mode
                  </h4>
                  <p className="text-xs font-inter text-zinc-300">
                    Drag cards or use the arrow buttons to define the order of reviews shown across the site.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasPendingReorder && (
                  <button
                    type="button"
                    onClick={() => {
                      setOrderedList(reviews);
                      setHasPendingReorder(false);
                    }}
                    disabled={savingReorder}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-inter text-zinc-300 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveReorder}
                  disabled={savingReorder || !hasPendingReorder}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-inter font-bold text-xs transition-all cursor-pointer ${
                    hasPendingReorder
                      ? "bg-[#ff5500] hover:bg-[#ff6a1f] text-black shadow-[0_0_20px_rgba(255,85,0,0.4)] animate-pulse"
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingReorder ? "Saving..." : hasPendingReorder ? "Save New Order" : "Order Saved"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReorderMode(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-inter text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* THE POSTER GRID */}
          {displayedReviews.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
              {displayedReviews.map((rev, idx) => {
                const poster = getPosterUrl(rev.poster, "w500");
                return (
                  <div
                    key={rev.id}
                    draggable={isReorderMode}
                    onDragStart={(e) => {
                      if (!isReorderMode) return;
                      e.dataTransfer.setData("text/plain", String(idx));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (!isReorderMode) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverIndex !== idx) setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === idx) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      if (!isReorderMode) return;
                      e.preventDefault();
                      setDragOverIndex(null);
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      if (!isNaN(from) && from !== idx) {
                        moveReview(from, idx);
                      }
                    }}
                    className={`group relative flex flex-col rounded-2xl bg-[#0b0d13] border transition-all duration-300 overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.6)] ${
                      isReorderMode
                        ? dragOverIndex === idx
                          ? "border-[#ff5500] ring-2 ring-[#ff5500] scale-[1.03] cursor-grab active:cursor-grabbing"
                          : "border-white/[0.15] hover:border-[#ff5500]/60 cursor-grab active:cursor-grabbing"
                        : "border-white/[0.08] hover:border-[#ff5500]/50 hover:shadow-[0_15px_40px_rgba(255,85,0,0.18)]"
                    }`}
                  >
                    {/* Poster with 2:3 ratio */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#141720]">
                      {poster ? (
                        <img
                          src={poster}
                          alt={rev.title}
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            isReorderMode ? "" : "group-hover:scale-105"
                          }`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                        {/* Position Badge in Reorder Mode or Rating Badge */}
                        {isReorderMode ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ff5500] text-black text-xs font-inter font-extrabold shadow-[0_0_15px_rgba(255,85,0,0.5)]">
                            <GripVertical className="w-3.5 h-3.5" />
                            <span>#{idx + 1}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/[0.12] text-xs font-inter font-bold text-[#ff7a29] shadow-md">
                            <Star className="w-3 h-3 fill-[#ff5500] text-[#ff5500]" />
                            <span>{rev.rating.toFixed(1)}</span>
                          </div>
                        )}

                        {/* Favorite Badge */}
                        {!isReorderMode && rev.isFavorite && (
                          <div className="p-1 rounded-lg bg-black/75 backdrop-blur-md border border-[#ff5500]/30 shadow-md">
                            <Heart className="w-3.5 h-3.5 fill-[#ff5500] text-[#ff5500]" />
                          </div>
                        )}
                      </div>

                      {/* Reorder Direction Controls overlay */}
                      {isReorderMode ? (
                        <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-1.5 z-20">
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveReview(idx, 0);
                              }}
                              disabled={idx === 0}
                              title="Move to first"
                              className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 disabled:hover:bg-white/[0.08] disabled:hover:text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <ChevronsLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveReview(idx, idx - 1);
                              }}
                              disabled={idx === 0}
                              title="Move left/up"
                              className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 disabled:hover:bg-white/[0.08] disabled:hover:text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveReview(idx, idx + 1);
                              }}
                              disabled={idx === displayedReviews.length - 1}
                              title="Move right/down"
                              className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 disabled:hover:bg-white/[0.08] disabled:hover:text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                            >
                              →
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveReview(idx, displayedReviews.length - 1);
                              }}
                              disabled={idx === displayedReviews.length - 1}
                              title="Move to last"
                              className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 disabled:hover:bg-white/[0.08] disabled:hover:text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <ChevronsRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Hover Overlay with Quick Actions */
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3.5 z-20">
                          {/* Top View Link */}
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const target = rev.slug || slugify(rev.title) || rev.id;
                                if (onNavigateToReview) {
                                  onNavigateToReview(target);
                                } else {
                                  window.open(`/review/${target}`, "_blank");
                                }
                              }}
                            className="p-1.5 rounded-xl bg-black/60 hover:bg-[#ff5500] hover:text-black border border-white/[0.15] text-white text-xs transition-colors cursor-pointer shadow-md"
                            title="View Public Review Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Center Primary Action: Edit Review */}
                        <div className="flex flex-col items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditReviewTarget(rev)}
                            className="w-full py-2.5 px-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Review</span>
                          </button>
                        </div>

                        {/* Bottom Mini Toolbar */}
                        <div className="grid grid-cols-5 gap-1 pt-2 border-t border-white/[0.1]">
                          <button
                            type="button"
                            onClick={() => setPosterEditReview(rev)}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/[0.1] text-zinc-300 hover:text-[#ff7a29] flex items-center justify-center transition-colors cursor-pointer"
                            title="Change Poster Artwork"
                          >
                            <Film className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setBackdropEditReview(rev)}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/[0.1] text-zinc-300 hover:text-[#ff7a29] flex items-center justify-center transition-colors cursor-pointer"
                            title="Change Backdrop Artwork"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setFramingEditReview(rev)}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/[0.1] text-zinc-300 hover:text-[#ff7a29] flex items-center justify-center transition-colors cursor-pointer"
                            title="Crop & Frame Backdrop (Adjust vertical position & height)"
                          >
                            <Crop className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setStoryStudioReview(rev)}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-white/[0.1] text-zinc-300 hover:text-[#ff7a29] flex items-center justify-center transition-colors cursor-pointer"
                            title="Story Studio (Instagram 9:16)"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteReviewTarget(rev)}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-red-500/30 text-zinc-300 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Movie Info below poster */}
                    <div className="p-3.5 flex flex-col flex-grow justify-between bg-[#090b0f] space-y-2">
                      <div>
                        <h3
                          onClick={() => setEditReviewTarget(rev)}
                          className="text-sm font-semibold font-poppins text-white truncate group-hover:text-[#ff7a29] transition-colors cursor-pointer"
                          title={rev.title}
                        >
                          {rev.title}
                        </h3>

                        <p className="text-xs font-inter text-zinc-400 truncate mt-0.5">
                          {rev.year && <span className="text-zinc-400 font-medium">{rev.year} · </span>}
                          <span>Dir. {rev.director}</span>
                        </p>
                      </div>

                      {/* Watched Date */}
                      <div className="flex items-center justify-between text-[11px] font-inter text-zinc-500 pt-1.5 border-t border-white/[0.05]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          <span>{rev.watchedDate || "Watched"}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => setEditReviewTarget(rev)}
                          className="text-[#ff7a29] hover:underline font-medium cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 border border-white/[0.06] rounded-3xl bg-[#090b0e] p-8 space-y-3">
              <Film className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold font-poppins text-white">No film reviews found</h3>
              <p className="text-xs font-inter text-zinc-400 max-w-sm mx-auto">
                No logged reviews match your current filter or search query. Try clearing your filters or search above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setGridSearch("");
                  setFilterTab("all");
                }}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-inter text-zinc-200 transition-colors cursor-pointer mt-2"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

      </main>

      {/* Footer */}
      <Footer />

      {/* MODAL 1: Movie Detail & Fast Review Logger Modal */}
      {selectedMovieForReview && (
        <MovieModal
          movie={selectedMovieForReview}
          onClose={() => setSelectedMovieForReview(null)}
          onSaveReview={async (newReview) => {
            await onSaveReview(newReview);
            setSelectedMovieForReview(null);
            showToast(`Logged review for "${newReview.title}"!`);
          }}
          isAdmin={true}
        />
      )}

      {/* MODAL 2: Dedicated Edit Review Modal */}
      <EditReviewModal
        review={editReviewTarget}
        isOpen={Boolean(editReviewTarget)}
        onClose={() => setEditReviewTarget(null)}
        onSave={handleSaveEditedReview}
      />

      {/* MODAL 3: Cinema Delete Confirmation Modal */}
      <DeleteConfirmModal
        review={deleteReviewTarget}
        isOpen={Boolean(deleteReviewTarget)}
        onClose={() => setDeleteReviewTarget(null)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* MODAL 4: Instagram Story Card Builder Studio */}
      {storyStudioReview && (
        <StoryCardBuilderModal
          isOpen={Boolean(storyStudioReview)}
          onClose={() => setStoryStudioReview(null)}
          review={storyStudioReview}
        />
      )}

      {/* MODAL 5: TMDB Poster Selector Modal */}
      {posterEditReview && (
        <PosterSelectorModal
          movieId={posterEditReview.tmdbId || Number(posterEditReview.id)}
          movieTitle={posterEditReview.title}
          currentPosterUrl={posterEditReview.poster}
          isOpen={Boolean(posterEditReview)}
          onSelectPoster={async (newPosterUrl) => {
            await onUpdatePoster(posterEditReview.id, newPosterUrl);
            setPosterEditReview(null);
            showToast(`Poster artwork updated for "${posterEditReview.title}"!`);
          }}
          onClose={() => setPosterEditReview(null)}
        />
      )}

      {/* MODAL 6: TMDB Backdrop Selector Modal */}
      {backdropEditReview && onUpdateBackdrop && (
        <BackdropSelectorModal
          movieId={backdropEditReview.tmdbId || Number(backdropEditReview.id)}
          movieTitle={backdropEditReview.title}
          currentBackdropUrl={backdropEditReview.backdrop}
          isOpen={Boolean(backdropEditReview)}
          onSelectBackdrop={async (newBackdropUrl) => {
            await onUpdateBackdrop(backdropEditReview.id, newBackdropUrl);
            setBackdropEditReview(null);
            showToast(`Backdrop artwork updated for "${backdropEditReview.title}"!`);
          }}
          onClose={() => setBackdropEditReview(null)}
        />
      )}

      {/* MODAL 7: Backdrop Framing & Crop Modal */}
      {framingEditReview && onUpdateBackdropFraming && (
        <BackdropFramingModal
          isOpen={Boolean(framingEditReview)}
          onClose={() => setFramingEditReview(null)}
          movieTitle={framingEditReview.title}
          backdropUrl={framingEditReview.backdrop}
          currentFraming={framingEditReview.backdropFraming}
          onSaveFraming={async (newFraming) => {
            await onUpdateBackdropFraming(framingEditReview.id, newFraming);
            setFramingEditReview(null);
            showToast(`Backdrop framing saved for "${framingEditReview.title}"!`);
          }}
        />
      )}

    </div>
  );
};
