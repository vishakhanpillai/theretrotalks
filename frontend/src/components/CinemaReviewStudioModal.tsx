import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  X,
  Clock,
  Calendar,
  Film,
  Heart,
  Play,
  Sparkles,
  Check,
  Loader2,
  FileText,
  Edit3,
  Upload,
  Sliders,
} from "lucide-react";
import type { Movie, Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { StarRating } from "./StarRating";
import { PosterSelectorModal } from "./PosterSelectorModal";
import { ReviewEditor } from "./ReviewEditor";
import { saveReviewDraft, clearReviewDraft, type ReviewDraft } from "../utils/draftStorage";

interface CinemaReviewStudioModalProps {
  movie: Movie | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveReview: (newReview: Review) => Promise<void> | void;
  initialDraft?: ReviewDraft | null;
}

export const CinemaReviewStudioModal: React.FC<CinemaReviewStudioModalProps> = ({
  movie,
  isOpen,
  onClose,
  onSaveReview,
  initialDraft,
}) => {
  const [details, setDetails] = useState<Movie | null>(null);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);

  // Review Form States
  const [mobileTab, setMobileTab] = useState<"editor" | "details">("editor");
  const [myRating, setMyRating] = useState<number>(4.5);
  const [myReview, setMyReview] = useState<string>("");
  const [watchedDate, setWatchedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // Custom Metadata States (Editable for both custom and TMDB cinema)
  const [customTitle, setCustomTitle] = useState<string>("");
  const [customDirector, setCustomDirector] = useState<string>("");
  const [customYear, setCustomYear] = useState<string>("");
  const [customRuntime, setCustomRuntime] = useState<string>("");
  const [customGenres, setCustomGenres] = useState<string>("");
  const [customOverview, setCustomOverview] = useState<string>("");
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [customBackdrop, setCustomBackdrop] = useState<string | null>(null);

  // Toggle for full metadata editing panel
  const [showMetaEdit, setShowMetaEdit] = useState<boolean>(false);

  // Hidden File Inputs for Poster & Backdrop image uploads
  const posterFileInputRef = useRef<HTMLInputElement>(null);
  const backdropFileInputRef = useRef<HTMLInputElement>(null);

  // Poster Selector Modal (for TMDB films)
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);

  // Submission State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-Draft saved timestamp
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string | null>(null);

  const isCustomMovie = movie?.id === 0 || !movie?.id;

  // Initialize or restore from initialDraft / movie
  useEffect(() => {
    if (!movie || !isOpen) {
      setDetails(null);
      setMyReview("");
      setMyRating(4.5);
      setWatchedDate(new Date().toISOString().slice(0, 10));
      setIsFavorite(false);
      setSelectedPoster(null);
      setCustomBackdrop(null);
      setIsPlayingTrailer(false);
      setIsSaving(false);
      setSavedSuccess(false);
      setErrorMessage(null);
      setLastDraftSavedAt(null);
      return;
    }

    if (initialDraft && (initialDraft.movie?.id === movie.id || initialDraft.customTitle === movie.title)) {
      // Restore from draft
      setDetails(initialDraft.movie);
      setCustomTitle(initialDraft.customTitle || movie.title || "");
      setCustomDirector(initialDraft.customDirector || movie.director || "");
      setCustomYear(initialDraft.customYear || movie.year || "");
      setCustomRuntime(initialDraft.customRuntime || (movie.runtime ? movie.runtime.toString() : ""));
      setCustomGenres(initialDraft.customGenres || (movie.genres || []).join(", "));
      setCustomOverview(initialDraft.customOverview || movie.overview || "");
      setSelectedPoster(initialDraft.customPoster || null);
      setCustomBackdrop(initialDraft.customBackdrop || null);
      setMyReview(initialDraft.myReview || "");
      setMyRating(initialDraft.myRating || 4.5);
      setWatchedDate(initialDraft.watchedDate || new Date().toISOString().slice(0, 10));
      setIsFavorite(Boolean(initialDraft.isFavorite));
      setShowMetaEdit(isCustomMovie);
      setLastDraftSavedAt(new Date(initialDraft.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      return;
    }

    // Default initialization from movie
    setDetails(movie);
    setCustomTitle(movie.title || "");
    setCustomDirector(movie.director || "");
    setCustomYear(movie.year || "");
    setCustomRuntime(movie.runtime ? movie.runtime.toString() : "");
    setCustomGenres((movie.genres || []).join(", "));
    setCustomOverview(movie.overview || "");
    setSelectedPoster(movie.poster || null);
    setCustomBackdrop(movie.backdrop || null);
    setMyReview("");
    setMyRating(4.5);
    setWatchedDate(new Date().toISOString().slice(0, 10));
    setIsFavorite(false);
    setIsPlayingTrailer(false);
    setIsSaving(false);
    setSavedSuccess(false);
    setErrorMessage(null);
    setLastDraftSavedAt(null);
    setShowMetaEdit(isCustomMovie);

    // If it's a real TMDB movie (id > 0), fetch deep metadata (credits, trailer, runtime)
    if (movie.id && movie.id > 0) {
      fetch(`/api/movies/${movie.id}?mediaType=${movie.mediaType || "movie"}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch full metadata");
          return res.json();
        })
        .then((data) => {
          setDetails((prev) => ({ ...(prev || movie), ...data }));
          if (data.director && !customDirector) setCustomDirector(data.director);
          if (data.runtime && !customRuntime) setCustomRuntime(data.runtime.toString());
          if (data.overview && !customOverview) setCustomOverview(data.overview);
          if (data.genres && data.genres.length > 0 && !customGenres) setCustomGenres(data.genres.join(", "));
        })
        .catch((err) => {
          console.warn("Using basic movie metadata:", err);
        });
    }
  }, [movie, isOpen, initialDraft]);

  // AUTO-SAVE DRAFT TO LOCALSTORAGE whenever content changes
  useEffect(() => {
    if (!isOpen || !movie) return;

    // Only save if user has started typing or modified fields
    const hasContent =
      myReview.trim().length > 0 ||
      (customTitle && customTitle !== movie.title) ||
      (customDirector && customDirector !== movie.director) ||
      selectedPoster !== movie.poster;

    if (!hasContent) return;

    const draftData: ReviewDraft = {
      movie,
      customTitle,
      customDirector,
      customYear,
      customRuntime,
      customGenres,
      customOverview,
      customPoster: selectedPoster || "",
      customBackdrop: customBackdrop || "",
      myReview,
      myRating,
      watchedDate,
      isFavorite,
      updatedAt: Date.now(),
    };

    saveReviewDraft(draftData);
    setLastDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, [
    isOpen,
    movie,
    customTitle,
    customDirector,
    customYear,
    customRuntime,
    customGenres,
    customOverview,
    selectedPoster,
    customBackdrop,
    myReview,
    myRating,
    watchedDate,
    isFavorite,
  ]);

  // Keyboard shortcut: Cmd + Enter or Ctrl + Enter to publish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isOpen) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, myReview, myRating, watchedDate, isFavorite, selectedPoster, customBackdrop, customTitle, customDirector, customYear, details, movie]);

  const current = details || movie;

  // Review statistics: word count & read time
  const stats = useMemo(() => {
    const text = myReview.trim();
    if (!text) return { words: 0, readTimeMinutes: 0, characters: 0 };
    const words = text.split(/\s+/).filter(Boolean).length;
    const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
    return { words, readTimeMinutes, characters: text.length };
  }, [myReview]);

  if (!isOpen || !movie) return null;

  const rawBackdrop = customBackdrop || current?.backdrop;
  const backdropUrl = rawBackdrop
    ? rawBackdrop.startsWith("data:") || rawBackdrop.startsWith("http")
      ? rawBackdrop
      : getBackdropUrl(rawBackdrop, "original")
    : "";

  const rawPoster = selectedPoster || current?.poster;
  const activePosterUrl = rawPoster
    ? rawPoster.startsWith("data:") || rawPoster.startsWith("http")
      ? rawPoster
      : getPosterUrl(rawPoster, "w500")
    : "";

  const isTv = (current?.mediaType || movie.mediaType) === "tv";

  const getRatingLabel = (score: number) => {
    if (score >= 5.0) return "Masterpiece";
    if (score >= 4.5) return "Exceptional";
    if (score >= 4.0) return "Great Cinema";
    if (score >= 3.5) return "Very Good";
    if (score >= 3.0) return "Decent Watch";
    if (score >= 2.0) return "Mediocre";
    return "Skip / Poor";
  };

  // Handle Local Image Upload for Poster
  const handlePosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setSelectedPoster(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Local Image Upload for Backdrop
  const handleBackdropFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setCustomBackdrop(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Discard draft
  const handleDiscardDraft = () => {
    clearReviewDraft();
    setLastDraftSavedAt(null);
    setMyReview("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!myReview.trim()) {
      setErrorMessage("Please type your critique before publishing.");
      return;
    }

    const titleToSave = customTitle.trim() || current?.title || "Untitled Cinema";

    setIsSaving(true);
    setErrorMessage(null);

    const formattedDate = new Date(watchedDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const parsedGenres = customGenres
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      tmdbId: current?.id || 0,
      mediaType: isTv ? "tv" : "movie",
      title: titleToSave,
      year: customYear.trim() || current?.year || new Date().getFullYear().toString(),
      poster: activePosterUrl || "",
      backdrop: backdropUrl || "",
      director: customDirector.trim() || current?.director || "Unknown Director",
      genres: parsedGenres.length > 0 ? parsedGenres : current?.genres || [],
      rating: myRating,
      review: myReview.trim(),
      watchedDate: formattedDate,
      isFavorite,
      overview: customOverview.trim() || current?.overview || null,
      cast: current?.cast || [],
      crew: current?.crew || [],
    };

    try {
      await onSaveReview(newReview);
      clearReviewDraft(); // Clear draft on successful publish
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      console.error("Save review error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to publish review.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Hidden File Inputs for Poster & Backdrop uploads */}
      <input
        ref={posterFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePosterFileUpload}
        className="hidden"
      />
      <input
        ref={backdropFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleBackdropFileUpload}
        className="hidden"
      />

      {/* Main Studio Modal Window */}
      <div className="relative w-full max-w-6xl bg-[#090b0e] border sm:border border-white/[0.14] rounded-none sm:rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_60px_rgba(255,85,0,0.18)] overflow-hidden z-10 flex flex-col h-[100dvh] sm:h-[94vh] max-h-none sm:max-h-[960px] animate-in zoom-in-95 duration-150">
        
        {/* Top Studio Bar */}
        <header className="px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.08] bg-[#0c0e14] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] flex-shrink-0">
              <Film className="w-4 h-4 stroke-[2.5]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#ff7a29] font-bold">
                  {isCustomMovie ? "Custom Cinema Entry" : "Cinema Review Studio"}
                </span>
                <span
                  className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.2 rounded ${
                    isTv
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {isTv ? "TV Series" : "Movie"}
                </span>
                {lastDraftSavedAt && (
                  <span className="hidden sm:inline text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    Draft auto-saved at {lastDraftSavedAt}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold font-poppins text-white truncate max-w-md">
                {customTitle || current?.title || "Untitled Cinema"}
                {(customYear || current?.year) && (
                  <span className="text-zinc-500 text-xs ml-1.5 font-normal">
                    ({customYear || current?.year})
                  </span>
                )}
              </h2>
            </div>
          </div>

          {/* Quick Metrics & Close */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>{stats.words} words</span>
              <span className="text-zinc-600">·</span>
              <span>~{stats.readTimeMinutes} min read</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center justify-center p-2 border-b border-white/[0.08] bg-[#0c0e14]">
          <div className="grid grid-cols-2 bg-[#08090d] p-1 rounded-xl border border-white/[0.08] w-full max-w-sm gap-1">
            <button
              type="button"
              onClick={() => setMobileTab("editor")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-poppins font-medium transition-all cursor-pointer ${
                mobileTab === "editor"
                  ? "bg-[#ff5500] text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Review Essay</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("details")}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-poppins font-medium transition-all cursor-pointer ${
                mobileTab === "details"
                  ? "bg-[#ff5500] text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Film Info & Rating</span>
            </button>
          </div>
        </div>

        {/* Studio Body: Split Columns */}
        <div className="flex-grow overflow-y-auto lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
          
          {/* LEFT COLUMN: Cinema Visuals & Metadata Reference (4 of 12 cols) */}
          <div className={`${mobileTab === "details" ? "block" : "hidden"} lg:block lg:col-span-4 xl:col-span-4 lg:overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#08090d]/80 shrink-0`}>
            
            {/* Backdrop Banner with Trailer Overlay and Upload */}
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[#101318] border border-white/[0.08] shadow-md group">
              {backdropUrl ? (
                <img
                  src={backdropUrl}
                  alt={current?.title}
                  className="w-full h-full object-cover filter brightness-85 group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12151c] to-[#0a0c10] text-zinc-600 p-4 text-center">
                  <Film className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[11px] text-zinc-500 font-inter">No backdrop attached</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Action buttons on backdrop */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                {/* Upload / Change Backdrop button */}
                <button
                  type="button"
                  onClick={() => backdropFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-[#ff5500] text-white hover:text-black border border-white/20 hover:border-[#ff5500] font-inter text-[11px] font-semibold backdrop-blur-md transition-all cursor-pointer shadow-lg"
                  title="Upload local backdrop image file"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Backdrop</span>
                </button>

                {/* Play Trailer Button (if available) */}
                {current?.id && current.id > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (current?.trailer?.key) {
                        setIsPlayingTrailer(!isPlayingTrailer);
                      } else {
                        window.open(
                          `https://www.youtube.com/results?search_query=${encodeURIComponent(
                            (customTitle || current?.title || "") + " official trailer"
                          )}`,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-[#ff5500] text-white hover:text-black border border-white/20 hover:border-[#ff5500] font-inter text-[11px] font-semibold backdrop-blur-md transition-all cursor-pointer shadow-lg"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isPlayingTrailer ? "Hide Trailer" : "Trailer"}</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Embedded YouTube Trailer Player */}
            {isPlayingTrailer && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-[#ff5500]/40 shadow-xl">
                {current?.trailer?.key ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${current.trailer.key}?autoplay=1&rel=0`}
                    title={`${current.title} Official Trailer`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs text-zinc-400">Direct stream unavailable.</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsPlayingTrailer(false)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-white hover:text-[#ff5500]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Poster & Meta Details Strip */}
            <div className="flex gap-4 items-start">
              {/* Poster Thumbnail + Upload / Switch buttons */}
              <div className="w-24 sm:w-28 flex-shrink-0 space-y-1.5">
                <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.1] bg-[#12151c] shadow-lg">
                  {activePosterUrl ? (
                    <img src={activePosterUrl} alt={current?.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600 p-2 text-center">
                      <Film className="w-6 h-6 mb-1" />
                      <span className="text-[10px] text-zinc-500">No poster</span>
                    </div>
                  )}
                </div>

                {/* Upload Poster Button */}
                <button
                  type="button"
                  onClick={() => posterFileInputRef.current?.click()}
                  className="w-full py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-[#ff5500]/20 text-zinc-300 hover:text-[#ff7a29] border border-white/[0.08] hover:border-[#ff5500]/30 text-[11px] font-inter flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Upload local poster image file"
                >
                  <Upload className="w-3 h-3 text-[#ff5500]" />
                  <span>Upload Poster</span>
                </button>

                {/* Alternative TMDB Poster Button (if TMDB movie) */}
                {current?.id && current.id > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowPosterModal(true)}
                    className="w-full py-1 px-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-white border border-white/[0.06] text-[10px] font-inter flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#ff5500]" />
                    <span>TMDB Posters</span>
                  </button>
                ) : null}
              </div>

              {/* Cinema Metadata Info / Quick Overview */}
              <div className="min-w-0 flex-grow space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold font-poppins text-white leading-tight">
                      {customTitle || current?.title || "Untitled"}
                    </h3>
                    <p className="text-xs text-zinc-400 font-inter mt-0.5">
                      {isTv ? "Created by" : (customDirector || current?.director)?.includes(",") ? "Dirs." : "Dir."}{" "}
                      <strong className="text-white font-medium">{customDirector || current?.director || "Unknown"}</strong>
                    </p>
                  </div>

                  {/* Toggle Edit Metadata Button */}
                  <button
                    type="button"
                    onClick={() => setShowMetaEdit(!showMetaEdit)}
                    className={`p-1.5 rounded-lg border text-xs font-inter transition-all cursor-pointer flex-shrink-0 ${
                      showMetaEdit
                        ? "bg-[#ff5500] text-black border-[#ff5500]"
                        : "bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.08]"
                    }`}
                    title="Edit cinema title, director, year, runtime, and artwork links"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Runtime & Year */}
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <span>{customYear || current?.year || "Year N/A"}</span>
                  {(customRuntime || current?.runtime) && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{customRuntime || current?.runtime}m</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Genre chips */}
                {customGenres && (
                  <div className="flex flex-wrap gap-1">
                    {customGenres.split(",").slice(0, 3).map((g) => (
                      <span
                        key={g.trim()}
                        className="text-[10px] font-inter px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                      >
                        {g.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CUSTOM CINEMA FULL METADATA EDITING DRAWER (Title, Director, Year, Genres, Synopsis, URLs) */}
            {showMetaEdit && (
              <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.1] space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#ff7a29] font-bold">
                    Edit Cinema Details & Artwork
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMetaEdit(false)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Title */}
                  <div>
                    <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Title</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Inception"
                      className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Director & Year row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Director</label>
                      <input
                        type="text"
                        value={customDirector}
                        onChange={(e) => setCustomDirector(e.target.value)}
                        placeholder="e.g. Christopher Nolan"
                        className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Release Year</label>
                      <input
                        type="text"
                        value={customYear}
                        onChange={(e) => setCustomYear(e.target.value)}
                        placeholder="e.g. 2010"
                        className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Runtime & Genres */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Runtime (min)</label>
                      <input
                        type="number"
                        value={customRuntime}
                        onChange={(e) => setCustomRuntime(e.target.value)}
                        placeholder="e.g. 148"
                        className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Genres</label>
                      <input
                        type="text"
                        value={customGenres}
                        onChange={(e) => setCustomGenres(e.target.value)}
                        placeholder="Sci-Fi, Action"
                        className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Poster Image URL */}
                  <div>
                    <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Poster Image URL (or upload above)</label>
                    <input
                      type="text"
                      value={selectedPoster || ""}
                      onChange={(e) => setSelectedPoster(e.target.value)}
                      placeholder="https://... or upload image"
                      className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Backdrop Image URL */}
                  <div>
                    <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Backdrop Image URL (or upload above)</label>
                    <input
                      type="text"
                      value={customBackdrop || ""}
                      onChange={(e) => setCustomBackdrop(e.target.value)}
                      placeholder="https://... or upload image"
                      className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    />
                  </div>

                  {/* Synopsis / Overview */}
                  <div>
                    <label className="text-[10px] font-inter uppercase text-zinc-400 block mb-1">Synopsis / Story Premise</label>
                    <textarea
                      value={customOverview}
                      onChange={(e) => setCustomOverview(e.target.value)}
                      placeholder="Brief description of the film's premise..."
                      rows={2}
                      className="w-full bg-[#141822] border border-white/[0.1] focus:border-[#ff5500] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cinema Rating & Curation Bar */}
            <div className="p-4 rounded-2xl bg-[#0d1016] border border-white/[0.08] space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-inter text-zinc-400 font-semibold">
                  Cinema Verdict
                </span>
                <span className="text-xs font-mono font-bold text-[#ff5500]">
                  ★ {myRating.toFixed(1)} · {getRatingLabel(myRating)}
                </span>
              </div>

              <div className="py-1">
                <StarRating rating={myRating} onChange={(r) => setMyRating(r)} size="lg" />
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
                {/* Watched Date */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#ff5500]" />
                  <input
                    type="date"
                    value={watchedDate}
                    onChange={(e) => setWatchedDate(e.target.value)}
                    className="bg-[#141822] border border-white/[0.08] text-xs font-inter text-zinc-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-[#ff5500] cursor-pointer [color-scheme:dark]"
                  />
                </div>

                {/* Favorite Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-inter font-medium transition-all cursor-pointer ${
                    isFavorite
                      ? "bg-[#ff5500]/20 border-[#ff5500]/50 text-[#ff5500] shadow-[0_0_15px_rgba(255,85,0,0.3)]"
                      : "bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-[#ff5500]" : ""}`} />
                  <span>Favorite</span>
                </button>
              </div>
            </div>

            {/* Synopsis Card (when not editing) */}
            {!showMetaEdit && (customOverview || current?.overview) && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-inter text-zinc-500 font-semibold block">
                  Synopsis
                </span>
                <p className="text-xs text-zinc-400 font-inter leading-relaxed line-clamp-4">
                  {customOverview || current?.overview}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: The Big Typing Studio Canvas (8 of 12 cols) */}
          <div className={`${mobileTab === "editor" ? "flex" : "hidden"} lg:flex lg:col-span-8 xl:col-span-8 flex-col lg:h-full bg-[#0a0c10] lg:overflow-hidden`}>
            
            {/* Writer Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-white/[0.06] bg-[#0c0e14] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#ff5500]" />
                <span className="text-xs font-bold font-poppins text-white uppercase tracking-wider">
                  The Critique & Review Essay
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-inter text-zinc-500">
                {lastDraftSavedAt && (
                  <span className="flex items-center gap-1 text-emerald-400/90 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Auto-saved</span>
                  </span>
                )}
                <span>Markdown supported</span>
              </div>
            </div>

            {/* Error banner if validation fails */}
            {errorMessage && (
              <div className="mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-inter text-red-400 flex items-center gap-2">
                <X className="w-4 h-4 flex-shrink-0 cursor-pointer" onClick={() => setErrorMessage(null)} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Big Review Editor Canvas */}
            <div className="flex-grow p-4 sm:p-6 lg:overflow-y-auto flex flex-col">
              <ReviewEditor
                value={myReview}
                onChange={(val) => {
                  setMyReview(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                label=""
                placeholder="Compose your cinema critique here... Write reflections on narrative pacing, director's visual style, performances, soundtrack, cinematography, or personal resonance."
                minRows={18}
                textareaClassName="min-h-[340px] lg:min-h-[460px] text-base leading-relaxed bg-[#08090d] border-white/[0.1] focus:border-[#ff5500] font-inter"
                autoFocus
              />
            </div>

            {/* Studio Bottom Action Bar */}
            <div className="sticky bottom-0 z-20 px-4 sm:px-6 py-3 sm:py-3.5 border-t border-white/[0.08] bg-[#0c0e14] flex items-center justify-between flex-shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-inter font-medium transition-colors cursor-pointer"
                >
                  Close
                </button>

                {/* Discard Draft Option */}
                {myReview.trim() && (
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2.5 sm:px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-inter transition-colors cursor-pointer"
                    title="Discard current draft"
                  >
                    <span className="hidden sm:inline">Discard Draft</span>
                    <span className="sm:hidden">Discard</span>
                  </button>
                )}

                <span className="hidden md:inline text-[11px] font-mono text-zinc-500">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300">⌘ + Enter</kbd> to publish
                </span>
              </div>

              {/* Publish Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || savedSuccess}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-poppins font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_25px_rgba(255,85,0,0.45)] hover:shadow-[0_0_35px_rgba(255,85,0,0.6)] active:scale-95 shrink-0"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Publishing...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-black stroke-[3]" />
                    <span>Published!</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 stroke-[2.5]" />
                    <span className="hidden sm:inline">Publish Cinema Review</span>
                    <span className="sm:hidden">Publish Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Poster Selector Modal */}
      {showPosterModal && current && current.id > 0 && (
        <PosterSelectorModal
          isOpen={showPosterModal}
          onClose={() => setShowPosterModal(false)}
          movieTitle={current.title}
          movieId={current.id}
          currentPosterUrl={activePosterUrl || ""}
          onSelectPoster={(newUrl) => {
            setSelectedPoster(newUrl);
            setShowPosterModal(false);
          }}
        />
      )}
    </div>
  );
};
