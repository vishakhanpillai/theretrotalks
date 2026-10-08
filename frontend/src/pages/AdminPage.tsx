import React, { useState, useEffect, useMemo } from "react";
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
  ArrowLeft,
  Loader2,
  AlertCircle,
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
  LayoutGrid,
  List,
  Award,
  Layers,
  Clock,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { Review, Movie, BackdropFraming } from "../types";
import { getPosterUrl } from "../utils/images";
import { PosterSelectorModal } from "../components/PosterSelectorModal";
import { BackdropSelectorModal } from "../components/BackdropSelectorModal";
import { BackdropFramingModal } from "../components/BackdropFramingModal";
import { StoryCardBuilderModal } from "../components/StoryCardBuilderModal";
import { EditReviewModal } from "../components/EditReviewModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { DatabaseImportModal } from "../components/DatabaseImportModal";
import { AdminSidebar, type FilterTab } from "../components/AdminSidebar";
import { CinemaSearchModal } from "../components/CinemaSearchModal";
import { CinemaReviewStudioModal } from "../components/CinemaReviewStudioModal";
import { getReviewDraft, clearReviewDraft, type ReviewDraft } from "../utils/draftStorage";
import { slugify } from "../utils/slugify";
import { formatRating } from "../utils/formatRating";

interface AdminPageProps {
  reviews: Review[];
  isAdmin: boolean;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  onRefreshReviews?: () => Promise<void> | void;
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

type SortOption = "custom" | "newest" | "oldest" | "rating_desc" | "rating_asc" | "year_desc" | "title_asc";
type ViewMode = "grid" | "table";

export const AdminPage: React.FC<AdminPageProps> = ({
  reviews,
  isAdmin,
  onLoginSuccess,
  onLogout,
  onRefreshReviews,
  onSaveReview,
  onUpdateReview,
  onDeleteReview,
  onReorderReviews,
  onUpdateBackdropFraming,
  onNavigateHome,
  onNavigateToReview,
}) => {
  // Login form states
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Unified Sidebar state (default collapsed / toggled on page load)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  // View Mode: Grid (Visual Posters) vs Table (Cinema Ledger)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem("retro_talks_admin_view_mode");
      if (saved === "grid" || saved === "table") return saved;
    } catch {
      // Ignore
    }
    return "grid";
  });

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("retro_talks_admin_view_mode", mode);
    } catch {
      // Ignore
    }
  };

  // New Cinema Search & Review Studio Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedMovieForStudio, setSelectedMovieForStudio] = useState<Movie | null>(null);
  const [currentDraft, setCurrentDraft] = useState<ReviewDraft | null>(null);

  // Load draft on mount and when modal closes
  useEffect(() => {
    if (isAdmin) {
      setCurrentDraft(getReviewDraft());
    }
  }, [isAdmin, selectedMovieForStudio]);

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
    } catch {
      showToast("Failed to save display order.");
    } finally {
      setSavingReorder(false);
    }
  };

  // Modals for existing review actions
  const [editReviewTarget, setEditReviewTarget] = useState<Review | null>(null);
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<Review | null>(null);
  const [storyStudioReview, setStoryStudioReview] = useState<Review | null>(null);
  const [posterEditReview, setPosterEditReview] = useState<Review | null>(null);
  const [backdropEditReview, setBackdropEditReview] = useState<Review | null>(null);
  const [framingEditReview, setFramingEditReview] = useState<Review | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Feedback Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Global Keyboard Shortcuts: ⌘K (Cinema Search), ⌘B (Toggle Sidebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && isAdmin) {
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          setIsSearchModalOpen((prev) => !prev);
        } else if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          toggleSidebar();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdmin]);

  // Database Backup Downloads
  const [downloadingFormat, setDownloadingFormat] = useState<"sqlite" | "json" | "csv" | null>(null);

  const handleDownloadBackup = async (format: "sqlite" | "json" | "csv") => {
    try {
      setDownloadingFormat(format);
      const token = localStorage.getItem("the_retro_talks_admin_token");
      const res = await fetch(`/api/admin/backup/${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to download ${format} backup`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      let filename = `retro_talks_${new Date().toISOString().slice(0, 10)}.${format === "sqlite" ? "sqlite" : format}`;
      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast(`Exported ${format.toUpperCase()} (${filename})!`);
    } catch (err: unknown) {
      console.error("Backup download error:", err);
      showToast(`Backup error: ${err instanceof Error ? err.message : "Download failed"}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Login Submit
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
  const tvCount = reviews.filter((r) => r.mediaType === "tv").length;
  const movieCount = reviews.filter((r) => r.mediaType !== "tv").length;

  // Filter & Sort Logged Reviews
  const displayedReviews = useMemo(() => {
    const sourceList = isReorderMode ? orderedList : sortBy === "custom" ? orderedList : reviews;
    return sourceList
      .filter((r) => {
        if (isReorderMode) return true;
        if (filterTab === "tv" && r.mediaType !== "tv") return false;
        if (filterTab === "movie" && r.mediaType === "tv") return false;
        if (filterTab === "favorites" && !r.isFavorite) return false;
        if (filterTab === "5star" && r.rating < 5.0) return false;
        if (filterTab === "4star_plus" && r.rating < 4.0) return false;

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
  // 1. UNAUTHENTICATED STATE: Elevated Cinema Curator Login Portal
  // --------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col items-center justify-center p-4 selection:bg-[#ff5500] selection:text-black font-poppins relative overflow-hidden">
        {/* Ambient Cinema Lighting & Flares */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-[#ff5500]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Brand Lock Card */}
        <div className="relative w-full max-w-md bg-[#090b0e]/95 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-8 sm:p-9 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(255,85,0,0.1)] space-y-7">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] mx-auto shadow-[0_0_25px_rgba(255,85,0,0.25)]">
              <Lock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#ff5500] block font-bold mb-1">
                Curator Terminal
              </span>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">
                Studio Desk
              </h1>
              <p className="text-xs font-inter text-zinc-400 mt-1">
                The Retro Talks · Cinema Archive & Social Studio
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0e1117]/80 border border-white/[0.06] text-xs font-inter text-zinc-400 text-center leading-relaxed">
            Authorized access only. Enter your administrator passcode to author reflections, adjust poster framing, and manage database records.
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-inter text-red-400 flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-inter font-medium text-zinc-300 block">
                Security Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter passcode..."
                  autoFocus
                  required
                  className="w-full bg-[#0d1016] border border-white/[0.1] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] rounded-xl px-4 py-3 text-sm font-inter text-white placeholder-zinc-600 outline-none pr-11 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || !password.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-inter font-bold text-sm transition-all cursor-pointer shadow-[0_0_25px_rgba(255,85,0,0.3)] hover:shadow-[0_0_35px_rgba(255,85,0,0.45)] flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                  <span>Enter Studio</span>
                </>
              )}
            </button>
          </form>

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
  // 2. AUTHENTICATED STATE: Refined Cinema Studio Dashboard
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0e1219] border border-[#ff5500]/40 text-white font-inter text-xs shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(255,85,0,0.2)] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-[#ff5500] stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT NAVIGATION DRAWER / SIDEBAR (AdminSidebar) */}
      <AdminSidebar
        totalReviews={totalReviews}
        favoritesCount={favoritesCount}
        movieCount={movieCount}
        tvCount={tvCount}
        avgRating={avgRating}
        fiveStarCount={fiveStarCount}
        fourStarPlusCount={fourStarPlusCount}
        filterTab={filterTab}
        setFilterTab={setFilterTab}
        isReorderMode={isReorderMode}
        setIsReorderMode={setIsReorderMode}
        hasPendingReorder={hasPendingReorder}
        onSaveReorder={handleSaveReorder}
        savingReorder={savingReorder}
        onOpenAddCinema={() => setIsSearchModalOpen(true)}
        onOpenImport={() => setShowImportModal(true)}
        onDownloadBackup={handleDownloadBackup}
        downloadingFormat={downloadingFormat}
        onNavigateHome={onNavigateHome}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onClose={() => setIsSidebarOpen(false)}
        draft={currentDraft}
        onResumeDraft={() => {
          if (currentDraft) {
            setSelectedMovieForStudio(currentDraft.movie);
          }
        }}
        onDiscardDraft={() => {
          clearReviewDraft();
          setCurrentDraft(null);
          showToast("Draft review discarded");
        }}
      />

      {/* MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out ${
          isSidebarOpen ? "lg:pl-72" : "lg:pl-0"
        }`}
      >
        
        {/* TOP COMMAND HEADER */}
        <header className="sticky top-0 z-30 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl">
          <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            
            {/* Left: Sidebar Toggle & Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={toggleSidebar}
                className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                  isSidebarOpen
                    ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300 hover:text-white"
                    : "bg-[#ff5500]/15 hover:bg-[#ff5500]/25 border-[#ff5500]/30 text-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.2)]"
                }`}
                title={isSidebarOpen ? "Collapse sidebar (⌘B)" : "Expand sidebar (⌘B)"}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center gap-2.5 truncate">
                <h1 className="text-base sm:text-lg font-bold font-poppins text-white tracking-tight truncate">
                  Cinema Catalog
                </h1>
              </div>
            </div>

            {/* Right: Quick Action Deck (View Mode + Search Trigger + Add Cinema) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* View Switcher: Grid vs Table */}
              <div className="hidden sm:flex items-center p-1 rounded-xl bg-[#0d1016] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[#ff5500] text-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Poster Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "table"
                      ? "bg-[#ff5500] text-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                  title="Cinema Ledger Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Add Cinema Primary CTA */}
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(255,85,0,0.25)] hover:shadow-[0_0_25px_rgba(255,85,0,0.4)] active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">Add Cinema</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT CANVAS */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 space-y-6">
          
          {/* ARCHIVE INTELLIGENCE RIBBON (Editorial stats overview) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Stat 1: Total Catalog */}
            <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/[0.07] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-300">
                <Layers className="w-5 h-5 text-[#ff5500]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block truncate">
                  Total Catalog
                </span>
                <span className="text-lg font-bold font-poppins text-white leading-tight">
                  {totalReviews} <span className="text-xs font-inter font-normal text-zinc-400">titles</span>
                </span>
              </div>
            </div>

            {/* Stat 2: Feature Films */}
            <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/[0.07] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-300">
                <Film className="w-5 h-5 text-zinc-300" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block truncate">
                  Feature Films
                </span>
                <span className="text-lg font-bold font-poppins text-white leading-tight">
                  {movieCount} <span className="text-xs font-inter font-normal text-zinc-400">films</span>
                </span>
              </div>
            </div>

            {/* Stat 3: Average Rating */}
            <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/[0.07] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-amber-400">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block truncate">
                  Mean Rating
                </span>
                <span className="text-lg font-bold font-poppins text-white leading-tight">
                  {avgRating} <span className="text-xs font-inter font-normal text-zinc-400">/ 5.0</span>
                </span>
              </div>
            </div>

            {/* Stat 4: Masterpieces */}
            <div className="p-3.5 rounded-2xl bg-[#090b0e] border border-white/[0.07] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-orange-400">
                <Award className="w-5 h-5 text-orange-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block truncate">
                  5★ Masterpieces
                </span>
                <span className="text-lg font-bold font-poppins text-white leading-tight">
                  {fiveStarCount} <span className="text-xs font-inter font-normal text-zinc-400">logged</span>
                </span>
              </div>
            </div>

            {/* Stat 5: Cloud Status */}
            <div className="hidden lg:flex p-3.5 rounded-2xl bg-[#090b0e] border border-white/[0.07] items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <HardDrive className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/90 font-bold block truncate">
                  Database Sync
                </span>
                <span className="text-xs font-semibold font-inter text-zinc-200 leading-tight block">
                  Turso LibSQL Active
                </span>
              </div>
            </div>
          </div>

          {/* CONTROLS BAR: Filters, Search, and Sort */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#090b0e] border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1118] border border-white/[0.08] overflow-x-auto no-scrollbar max-w-full flex-nowrap shrink-0">
              <button
                type="button"
                onClick={() => setFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer shrink-0 ${
                  filterTab === "all"
                    ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All ({reviews.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("movie")}
                className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer shrink-0 ${
                  filterTab === "movie"
                    ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Movies ({movieCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("tv")}
                className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer shrink-0 ${
                  filterTab === "tv"
                    ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                TV ({tvCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("5star")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer shrink-0 ${
                  filterTab === "5star"
                    ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Star className={`w-3 h-3 ${filterTab === "5star" ? "fill-black" : "fill-amber-400 text-amber-400"}`} />
                <span>5★ ({fiveStarCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("4star_plus")}
                className={`px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer shrink-0 ${
                  filterTab === "4star_plus"
                    ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                4★+ ({fourStarPlusCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterTab("favorites")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-colors cursor-pointer shrink-0 ${
                  filterTab === "favorites"
                    ? "bg-[#ff5500] text-black font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Heart className={`w-3 h-3 ${filterTab === "favorites" ? "fill-black" : "text-rose-400"}`} />
                <span>Favorites ({favoritesCount})</span>
              </button>
            </div>

            {/* Quick Search, Sort & Reorder Controls */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              
              {/* Grid Text Search */}
              <div className="relative flex-1 sm:w-60 min-w-[150px]">
                <input
                  type="text"
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  placeholder="Filter by title, director, genre..."
                  className="w-full bg-[#0e1118] border border-white/[0.08] focus:border-[#ff5500] rounded-xl pl-8 pr-7 py-2 text-xs font-inter text-white placeholder-zinc-500 outline-none transition-colors"
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
              <div className="flex items-center gap-1.5 bg-[#0e1118] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs font-inter text-zinc-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-transparent text-white outline-none cursor-pointer text-xs font-inter pr-1"
                >
                  <option value="custom" className="bg-[#0e1118] text-[#ff7a29]">Site Display Order</option>
                  <option value="newest" className="bg-[#0e1118] text-white">Date Added (Newest)</option>
                  <option value="oldest" className="bg-[#0e1118] text-white">Date Added (Oldest)</option>
                  <option value="rating_desc" className="bg-[#0e1118] text-white">Rating (Highest)</option>
                  <option value="rating_asc" className="bg-[#0e1118] text-white">Rating (Lowest)</option>
                  <option value="year_desc" className="bg-[#0e1118] text-white">Release Year (Newest)</option>
                  <option value="title_asc" className="bg-[#0e1118] text-white">Title (A to Z)</option>
                </select>
              </div>

              {/* Mobile View Toggle */}
              <div className="flex sm:hidden items-center p-1 rounded-xl bg-[#0e1118] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("grid")}
                  className={`p-1 rounded-lg ${viewMode === "grid" ? "bg-[#ff5500] text-black" : "text-zinc-400"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("table")}
                  className={`p-1 rounded-lg ${viewMode === "table" ? "bg-[#ff5500] text-black" : "text-zinc-400"}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Toggle Reorder Mode */}
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-inter font-medium transition-all cursor-pointer ${
                    isReorderMode
                      ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-[0_0_15px_rgba(255,85,0,0.35)]"
                      : "bg-[#0e1118] border-white/[0.08] text-zinc-300 hover:text-white"
                  }`}
                  title="Arrange custom sequence of reviews across website"
                >
                  <Move className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isReorderMode ? "Exit Sorting" : "Sort Order"}</span>
                </button>
              )}
            </div>
          </div>

          {/* REARRANGE MODE BANNER */}
          {isReorderMode && (
            <div className="p-4 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#ff5500]/20 text-[#ff5500]">
                  <Move className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold font-poppins text-white">
                    Custom Display Sequence Active
                  </h4>
                  <p className="text-xs font-inter text-zinc-300">
                    Drag items or click arrow triggers to dictate the exact order films appear on the public journal.
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
                  <span>{savingReorder ? "Saving..." : hasPendingReorder ? "Save New Sequence" : "Sequence Saved"}</span>
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

          {/* VIEW MODE 1: THE POSTER GRID */}
          {displayedReviews.length > 0 ? (
            viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5">
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
                      className={`group relative flex flex-col rounded-2xl bg-[#090b0e] border transition-all duration-300 overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.7)] ${
                        isReorderMode
                          ? dragOverIndex === idx
                            ? "border-[#ff5500] ring-2 ring-[#ff5500] scale-[1.03] cursor-grab active:cursor-grabbing"
                            : "border-white/[0.12] hover:border-[#ff5500]/60 cursor-grab active:cursor-grabbing"
                          : "border-white/[0.08] hover:border-[#ff5500]/50 hover:shadow-[0_16px_45px_rgba(255,85,0,0.18)]"
                      }`}
                    >
                      {/* Poster Container (2:3 Aspect Ratio) */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#12151d]">
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
                          {isReorderMode ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#ff5500] text-black text-xs font-inter font-extrabold shadow-[0_0_15px_rgba(255,85,0,0.5)]">
                              <GripVertical className="w-3.5 h-3.5" />
                              <span>#{idx + 1}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/[0.12] text-xs font-inter font-bold text-[#ff7a29] shadow-md">
                              <Star className="w-3 h-3 fill-[#ff5500] text-[#ff5500]" />
                              <span>{formatRating(rev.rating)}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5">
                            {!isReorderMode && rev.mediaType === "tv" && (
                              <div className="px-2 py-0.5 rounded-lg bg-purple-900/80 backdrop-blur-md border border-purple-500/40 text-[10px] font-inter font-bold text-purple-200 shadow-md">
                                <span>TV</span>
                              </div>
                            )}
                            {!isReorderMode && rev.isFavorite && (
                              <div className="p-1 rounded-lg bg-black/80 backdrop-blur-md border border-rose-500/30 shadow-md">
                                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                              </div>
                            )}
                          </div>
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
                                className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
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
                                className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
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
                                className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
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
                                className="flex-1 py-1.5 rounded-lg bg-white/[0.08] hover:bg-[#ff5500] hover:text-black text-zinc-300 disabled:opacity-20 text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                              >
                                <ChevronsRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Hover Overlay with Quick Actions */
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3.5 z-20">
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
                                title="Crop & Frame Backdrop"
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
                      <div className="p-3.5 flex flex-col flex-grow justify-between bg-[#080a0e] space-y-2">
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
                            <span>{rev.mediaType === "tv" ? "Created by" : "Dir."} {rev.director}</span>
                          </p>
                        </div>

                        {/* Watched Date */}
                        <div className="flex items-center justify-between text-[11px] font-inter text-zinc-500 pt-1.5 border-t border-white/[0.05]">
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="w-3 h-3 text-zinc-600 shrink-0" />
                            <span className="truncate">{rev.watchedDate || "Watched"}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => setEditReviewTarget(rev)}
                            className="text-[#ff7a29] hover:underline font-medium cursor-pointer shrink-0"
                          >
                            Edit
                          </button>
                        </div>

                        {/* Mobile Quick Actions Toolbar */}
                        {!isReorderMode && (
                          <div className="flex lg:hidden items-center justify-between gap-1 pt-2 border-t border-white/[0.06]">
                            <button
                              type="button"
                              onClick={() => setEditReviewTarget(rev)}
                              className="p-1.5 rounded-lg bg-white/[0.04] active:bg-[#ff5500] text-[#ff7a29] active:text-black transition-colors"
                              title="Edit Review"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPosterEditReview(rev)}
                              className="p-1.5 rounded-lg bg-white/[0.04] active:bg-[#ff5500] text-zinc-300 active:text-black transition-colors"
                              title="Change Poster"
                            >
                              <Film className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setBackdropEditReview(rev)}
                              className="p-1.5 rounded-lg bg-white/[0.04] active:bg-[#ff5500] text-zinc-300 active:text-black transition-colors"
                              title="Change Backdrop"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFramingEditReview(rev)}
                              className="p-1.5 rounded-lg bg-white/[0.04] active:bg-[#ff5500] text-zinc-300 active:text-black transition-colors"
                              title="Crop Backdrop"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setStoryStudioReview(rev)}
                              className="p-1.5 rounded-lg bg-white/[0.04] active:bg-[#ff5500] text-zinc-300 active:text-black transition-colors"
                              title="Story Studio"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteReviewTarget(rev)}
                              className="p-1.5 rounded-lg bg-white/[0.04] active:bg-red-500 text-zinc-400 active:text-white transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400 active:text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* VIEW MODE 2: CINEMA LEDGER (Table View) */
              <div className="rounded-2xl border border-white/[0.08] bg-[#090b0e] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-inter border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 w-16">Poster</th>
                        <th className="py-3 px-4 min-w-[200px]">Cinema Title</th>
                        <th className="py-3 px-4 min-w-[180px]">Direction & Genres</th>
                        <th className="py-3 px-4 w-28">Rating</th>
                        <th className="py-3 px-4 w-32">Watched</th>
                        <th className="py-3 px-4 w-44 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {displayedReviews.map((rev, idx) => {
                        const poster = getPosterUrl(rev.poster, "w500");
                        return (
                          <tr
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
                            className={`group hover:bg-white/[0.03] transition-colors ${
                              isReorderMode
                                ? dragOverIndex === idx
                                  ? "bg-[#ff5500]/15"
                                  : "cursor-grab active:cursor-grabbing"
                                : ""
                            }`}
                          >
                            {/* Sequence number / drag handle */}
                            <td className="py-3 px-4 text-center">
                              {isReorderMode ? (
                                <div className="flex items-center justify-center gap-1 font-mono font-bold text-[#ff5500]">
                                  <GripVertical className="w-3.5 h-3.5" />
                                  <span>{idx + 1}</span>
                                </div>
                              ) : (
                                <span className="font-mono text-zinc-500">#{idx + 1}</span>
                              )}
                            </td>

                            {/* Thumbnail Poster */}
                            <td className="py-3 px-4">
                              <div className="w-10 h-14 rounded-lg bg-[#141720] overflow-hidden border border-white/[0.08] relative shrink-0">
                                {poster ? (
                                  <img src={poster} alt={rev.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Film className="w-4 h-4 m-auto text-zinc-600" />
                                )}
                              </div>
                            </td>

                            {/* Title & Media Type */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span
                                    onClick={() => setEditReviewTarget(rev)}
                                    className="font-semibold text-white group-hover:text-[#ff7a29] transition-colors cursor-pointer text-sm"
                                  >
                                    {rev.title}
                                  </span>
                                  {rev.mediaType === "tv" && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30">
                                      TV
                                    </span>
                                  )}
                                  {rev.isFavorite && (
                                    <Heart className="w-3 h-3 fill-rose-500 text-rose-500 shrink-0" />
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                                  {rev.year || "N/A"}
                                </span>
                              </div>
                            </td>

                            {/* Director & Genres */}
                            <td className="py-3 px-4 text-zinc-400">
                              <div className="truncate max-w-xs">
                                <span className="text-zinc-200">
                                  {rev.mediaType === "tv" ? "Created by " : "Dir. "}
                                  {rev.director}
                                </span>
                                {rev.genres && rev.genres.length > 0 && (
                                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                                    {rev.genres.slice(0, 3).join(", ")}
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Rating */}
                            <td className="py-3 px-4">
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/60 border border-white/[0.08] text-[#ff7a29] font-bold">
                                <Star className="w-3 h-3 fill-[#ff5500] text-[#ff5500]" />
                                <span>{formatRating(rev.rating)}</span>
                              </div>
                            </td>

                            {/* Watched Date */}
                            <td className="py-3 px-4 text-zinc-400 text-[11px]">
                              <div className="flex items-center gap-1.5 font-mono">
                                <Clock className="w-3 h-3 text-zinc-600" />
                                <span>{rev.watchedDate || "Not set"}</span>
                              </div>
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditReviewTarget(rev)}
                                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#ff5500] text-zinc-300 hover:text-black transition-colors"
                                  title="Edit Review"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setStoryStudioReview(rev)}
                                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#ff5500] text-zinc-300 hover:text-black transition-colors"
                                  title="Story Studio"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFramingEditReview(rev)}
                                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#ff5500] text-zinc-300 hover:text-black transition-colors"
                                  title="Frame Backdrop"
                                >
                                  <Crop className="w-3.5 h-3.5" />
                                </button>
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
                                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-[#ff5500] text-zinc-300 hover:text-black transition-colors"
                                  title="View Public Page"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteReviewTarget(rev)}
                                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                                  title="Delete Review"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            /* EMPTY FILTER STATE */
            <div className="text-center py-20 border border-white/[0.06] rounded-3xl bg-[#090b0e] p-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center mx-auto text-[#ff5500]">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold font-poppins text-white">No film reviews match your filters</h3>
              <p className="text-xs font-inter text-zinc-400 max-w-sm mx-auto">
                Try clearing your search query or switching tabs. Or click below to add a new cinema review.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGridSearch("");
                    setFilterTab("all");
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-inter text-zinc-300 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Add Cinema</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS SECTION (Retains all existing handlers & props) */}
      {/* ========================================================================= */}

      {/* 1. CINEMA SEARCH POPUP (Command-palette style TMDB Search) */}
      <CinemaSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectMovie={(movie) => {
          setSelectedMovieForStudio(movie);
        }}
        onSelectCustom={() => {
          setSelectedMovieForStudio({
            id: 0,
            title: "",
            year: new Date().getFullYear().toString(),
            poster: "",
            backdrop: "",
            overview: "",
            tmdbRating: 0,
            director: "",
            genres: ["Cinema"],
            mediaType: "movie",
          });
        }}
      />

      {/* 2. BIG CINEMA REVIEW STUDIO MODAL (Expansive, comfortable review typing) */}
      {selectedMovieForStudio && (
        <CinemaReviewStudioModal
          movie={selectedMovieForStudio}
          initialDraft={currentDraft}
          isOpen={Boolean(selectedMovieForStudio)}
          onClose={() => {
            setSelectedMovieForStudio(null);
            setCurrentDraft(getReviewDraft());
          }}
          onSaveReview={async (newReview) => {
            await onSaveReview(newReview);
            setSelectedMovieForStudio(null);
            setCurrentDraft(null);
            showToast(`Published review for "${newReview.title}"!`);
          }}
        />
      )}

      {/* 3. EDIT EXISTING REVIEW MODAL */}
      {editReviewTarget && (
        <EditReviewModal
          review={editReviewTarget}
          isOpen={Boolean(editReviewTarget)}
          onClose={() => setEditReviewTarget(null)}
          onSave={handleSaveEditedReview}
        />
      )}

      {/* 4. CONFIRM DELETE REVIEW MODAL */}
      {deleteReviewTarget && (
        <DeleteConfirmModal
          review={deleteReviewTarget}
          isOpen={Boolean(deleteReviewTarget)}
          onClose={() => setDeleteReviewTarget(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {/* 5. POSTER SELECTOR MODAL */}
      {posterEditReview && (
        <PosterSelectorModal
          isOpen={Boolean(posterEditReview)}
          onClose={() => setPosterEditReview(null)}
          movieTitle={posterEditReview.title}
          movieId={Number(posterEditReview.tmdbId) || 0}
          currentPosterUrl={posterEditReview.poster}
          onSelectPoster={async (newPosterUrl) => {
            if (onUpdateReview) {
              await onUpdateReview(posterEditReview.id, { poster: newPosterUrl });
            }
            setPosterEditReview(null);
            showToast(`Updated poster for "${posterEditReview.title}"`);
          }}
        />
      )}

      {/* 6. BACKDROP SELECTOR MODAL */}
      {backdropEditReview && (
        <BackdropSelectorModal
          isOpen={Boolean(backdropEditReview)}
          onClose={() => setBackdropEditReview(null)}
          movieTitle={backdropEditReview.title}
          movieId={Number(backdropEditReview.tmdbId) || 0}
          currentBackdropUrl={backdropEditReview.backdrop}
          onSelectBackdrop={async (newBackdropUrl) => {
            if (onUpdateReview) {
              await onUpdateReview(backdropEditReview.id, { backdrop: newBackdropUrl });
            }
            setBackdropEditReview(null);
            showToast(`Updated backdrop for "${backdropEditReview.title}"`);
          }}
        />
      )}

      {/* 7. BACKDROP FRAMING MODAL */}
      {framingEditReview && (
        <BackdropFramingModal
          isOpen={Boolean(framingEditReview)}
          onClose={() => setFramingEditReview(null)}
          movieTitle={framingEditReview.title}
          backdropUrl={framingEditReview.backdrop}
          currentFraming={framingEditReview.backdropFraming}
          onSaveFraming={async (newFraming) => {
            if (onUpdateBackdropFraming) {
              await onUpdateBackdropFraming(framingEditReview.id, newFraming);
            }
            setFramingEditReview(null);
            showToast(`Saved backdrop framing for "${framingEditReview.title}"`);
          }}
        />
      )}

      {/* 8. STORY CARD BUILDER MODAL */}
      {storyStudioReview && (
        <StoryCardBuilderModal
          isOpen={Boolean(storyStudioReview)}
          onClose={() => setStoryStudioReview(null)}
          review={storyStudioReview}
        />
      )}

      {/* 9. DATABASE IMPORT MODAL */}
      {showImportModal && (
        <DatabaseImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          showToast={showToast}
          onSuccess={() => {
            if (onRefreshReviews) onRefreshReviews();
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
};
