import React, { useEffect, useState } from "react";
import { X, Clock, User, Calendar, Film, Bookmark, Heart, Check, Sparkles, Play } from "lucide-react";
import type { Movie, Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { StarRating } from "./StarRating";
import { PosterSelectorModal } from "./PosterSelectorModal";
import { ReviewEditor } from "./ReviewEditor";

interface MovieModalProps {
  movie: Movie | null;
  onClose: () => void;
  onSaveReview?: (newReview: Review) => void;
  isAdmin?: boolean;
}

export const MovieModal: React.FC<MovieModalProps> = ({
  movie,
  onClose,
  onSaveReview,
  isAdmin = false,
}) => {
  const [details, setDetails] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  // Review Form State for Personal Blog
  const [myRating, setMyRating] = useState<number>(4.5);
  const [myReview, setMyReview] = useState<string>("");
  const [watchedDate, setWatchedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Custom Poster Selection State
  const [selectedPoster, setSelectedPoster] = useState<string | null>(null);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);

  useEffect(() => {
    if (!movie) {
      setDetails(null);
      setMyReview("");
      setMyRating(4.5);
      setSavedSuccess(false);
      setSelectedPoster(null);
      setIsPlayingTrailer(false);
      return;
    }

    setDetails(movie);
    setPosterError(false);
    setMyReview("");
    setSavedSuccess(false);
    setSelectedPoster(null);
    setIsPlayingTrailer(false);
    setSelectedPoster(null);

    setLoading(true);
    fetch(`/api/movies/${movie.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch details");
        return res.json();
      })
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => {
        console.warn("Using movie data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [movie]);

  if (!movie) return null;

  const current = details || movie;
  const backdropUrl = getBackdropUrl(current.backdrop, "original");
  const posterUrl = getPosterUrl(current.poster, "w500");
  const activePosterUrl = selectedPoster || posterUrl;

  const handleSaveToDiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myReview.trim()) return;

    const formattedDate = new Date(watchedDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      tmdbId: current.id,
      title: current.title,
      year: current.year || "N/A",
      poster: activePosterUrl || "",
      backdrop: backdropUrl || "",
      director: current.director || "Unknown Director",
      genres: current.genres || [],
      rating: myRating,
      review: myReview.trim(),
      watchedDate: formattedDate,
      isFavorite
    };

    if (onSaveReview) {
      onSaveReview(newReview);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#090b0e] border border-white/[0.09] rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.12)] z-10 max-h-[92vh] flex flex-col">
        
        {/* Backdrop Banner Header */}
        <div className="relative h-48 sm:h-64 w-full bg-[#101318] overflow-hidden flex-shrink-0">
          {backdropUrl ? (
            <img
              src={backdropUrl}
              alt={current.title}
              className="w-full h-full object-cover filter contrast-110 brightness-75"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#0d0f14] via-[#1a1f28] to-[#090b0e]" />
          )}

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090b0e] via-[#090b0e]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090b0e] via-[#090b0e]/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-black/60 hover:bg-[#ff5500] text-zinc-300 hover:text-black border border-white/10 hover:border-[#ff5500] transition-all duration-200 shadow-xl group"
          >
            <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
          </button>

          {/* Title, tagline & Play Trailer Action */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl sm:text-4xl font-poppins font-bold text-white tracking-tight leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                {current.title}
              </h2>
              {current.tagline && (
                <p className="text-xs sm:text-sm text-zinc-300 italic font-inter drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                  "{current.tagline}"
                </p>
              )}
            </div>

            {/* Play Trailer Button */}
            <button
              type="button"
              onClick={() => {
                if (current.trailer?.key) {
                  setIsPlayingTrailer(!isPlayingTrailer);
                } else {
                  window.open(
                    `https://www.youtube.com/results?search_query=${encodeURIComponent(current.title + " official trailer")}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }
              }}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_25px_rgba(255,85,0,0.45)] hover:shadow-[0_0_30px_rgba(255,85,0,0.6)] active:scale-95 flex-shrink-0"
              title="Play official trailer"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{isPlayingTrailer ? "Hide Trailer" : "Play Trailer"}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-grow">
          {/* Embedded YouTube Trailer Player */}
          {isPlayingTrailer && (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-[#ff5500]/30 shadow-[0_15px_40px_rgba(0,0,0,0.85)]">
              {current.trailer?.key ? (
                <iframe
                  src={`https://www.youtube.com/embed/${current.trailer.key}?autoplay=1&rel=0`}
                  title={`${current.title} Official Trailer`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <p className="text-zinc-400 text-sm">Trailer video stream not directly embeddable.</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(current.title + " official trailer")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#ff5500] text-black font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Search on YouTube</span>
                  </a>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsPlayingTrailer(false)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-inter border border-white/20 hover:border-white/40 flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Player</span>
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-6">
            
            {/* Poster column */}
            <div className="flex-shrink-0 w-36 sm:w-44 mx-auto sm:mx-0">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl bg-[#12151c]">
                {activePosterUrl && !posterError ? (
                  <img
                    src={activePosterUrl}
                    alt={current.title}
                    onError={() => setPosterError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#101318]">
                    <Film className="w-10 h-10 text-zinc-600 mb-2" />
                    <span className="text-xs text-zinc-400 font-poppins">{current.title}</span>
                  </div>
                )}
              </div>

              {/* Change Poster Button (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowPosterModal(true)}
                  className="mt-2.5 w-full py-2 px-2.5 rounded-xl bg-white/[0.04] hover:bg-[#ff5500]/15 text-zinc-300 hover:text-[#ff7a29] border border-white/[0.08] hover:border-[#ff5500]/30 text-xs font-inter flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#ff5500] group-hover:rotate-12 transition-transform" />
                  <span>Change Poster</span>
                </button>
              )}
            </div>

            {/* Details & Personal Review Form */}
            <div className="flex-grow space-y-5 text-sm text-zinc-300">
              
              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-2">
                {current.year && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.03] text-zinc-300 border border-white/[0.08] text-xs font-inter">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{current.year}</span>
                  </div>
                )}

                {current.runtime ? (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.03] text-zinc-300 border border-white/[0.08] text-xs font-inter">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{current.runtime} min</span>
                  </div>
                ) : null}

                {current.director && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/[0.03] text-zinc-300 border border-white/[0.08] text-xs font-inter">
                    <User className="w-3.5 h-3.5 text-[#ff7a29]" />
                    <span>Dir. <strong className="text-white font-medium">{current.director}</strong></span>
                  </div>
                )}
              </div>

              {/* Synopsis */}
              <div>
                <h4 className="text-[10px] uppercase tracking-widest font-inter text-zinc-500 mb-1">
                  Synopsis
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                  {current.overview || "No synopsis recorded."}
                </p>
              </div>

              {/* Key Cast */}
              {current.cast && current.cast.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <h4 className="text-[10px] uppercase tracking-widest font-inter text-zinc-400 font-medium">
                    Key Cast
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {current.cast.slice(0, 6).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2.5 min-w-0"
                        title={`${member.name} as ${member.character || "Cast"}`}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/[0.1] shadow-sm">
                          {member.picture ? (
                            <img
                              src={member.picture}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs font-semibold font-inter text-white truncate leading-tight">
                            {member.name}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-inter truncate leading-tight mt-0.5">
                            {member.character || "Cast"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Crew */}
              {current.crew && current.crew.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                  <h4 className="text-[10px] uppercase tracking-widest font-inter text-zinc-400 font-medium">
                    Key Crew
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {current.crew.slice(0, 6).map((member, idx) => (
                      <div
                        key={`${member.id}-${idx}`}
                        className="flex items-center gap-2.5 min-w-0"
                        title={`${member.name} — ${member.job || "Crew"}`}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/[0.1] shadow-sm">
                          {member.picture ? (
                            <img
                              src={member.picture}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                              <User className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs font-semibold font-inter text-white truncate leading-tight">
                            {member.name}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-[#ff7a29] font-inter truncate leading-tight mt-0.5">
                            {member.job || "Crew"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Review Composer Form (Admin Only when onSaveReview is supplied) */}
              {isAdmin && onSaveReview && (
                <form onSubmit={handleSaveToDiary} className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.08] space-y-4 shadow-xl mt-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-[#ff5500]" />
                      <span className="font-poppins font-bold text-xs uppercase tracking-wider text-white">
                        My Review & Rating
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFavorite(!isFavorite)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-inter transition-all ${
                        isFavorite
                          ? "bg-[#ff5500]/20 border-[#ff5500]/40 text-[#ff5500]"
                          : "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-[#ff5500]" : ""}`} />
                      <span>Favorite</span>
                    </button>
                  </div>

                  {/* Rating and Date Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-500 block mb-1">
                        Your Rating
                      </label>
                      <StarRating rating={myRating} onChange={(r) => setMyRating(r)} size="md" />
                    </div>

                    <div>
                      <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-500 block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#ff5500]" />
                        <span>Watched Date</span>
                      </label>
                      <input
                        type="date"
                        value={watchedDate}
                        onChange={(e) => setWatchedDate(e.target.value)}
                        className="bg-[#141820] border border-white/[0.08] text-xs font-inter text-zinc-200 px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#ff5500] cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Rich Review Editor */}
                  <ReviewEditor
                    value={myReview}
                    onChange={setMyReview}
                    label="Personal Review Essay"
                    placeholder="Write your cinema critique, reflections on pacing, performances, cinematography, or personal resonance..."
                    minRows={12}
                    textareaClassName="min-h-[260px] sm:min-h-[340px]"
                  />

                  {/* Submit Action */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-zinc-500 font-inter">
                      Will appear in your personal diary
                    </span>

                    <button
                      type="submit"
                      disabled={!myReview.trim() || savedSuccess}
                      className="px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] disabled:opacity-40 text-black font-poppins font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer"
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Saved to Diary!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span>Save to My Diary</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-4 bg-[#07080a] border-t border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-inter text-zinc-500">
            <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-[#ff5500]"}`} />
            <span>{loading ? "Syncing details..." : `TMDB #${current.id}`}</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-inter uppercase tracking-wider text-zinc-300 hover:text-white border border-white/[0.08] transition-all"
          >
            Close
          </button>
        </div>

      </div>

      {/* TMDB Alternate Poster Selector Modal */}
      <PosterSelectorModal
        movieId={current.id}
        movieTitle={current.title}
        currentPosterUrl={activePosterUrl}
        isOpen={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        onSelectPoster={(newPoster) => setSelectedPoster(newPoster)}
      />
    </div>
  );
};
