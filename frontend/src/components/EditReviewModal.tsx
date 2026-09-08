import React, { useState, useEffect } from "react";
import { X, Heart, Loader2, Film, Check } from "lucide-react";
import type { Review } from "../types";
import { getPosterUrl } from "../utils/images";
import { StarRating } from "./StarRating";
import { ReviewEditor } from "./ReviewEditor";

interface EditReviewModalProps {
  review: Review | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<Review>) => Promise<void>;
}

export const EditReviewModal: React.FC<EditReviewModalProps> = ({
  review,
  isOpen,
  onClose,
  onSave,
}) => {
  const [rating, setRating] = useState<number>(5.0);
  const [reviewText, setReviewText] = useState<string>("");
  const [watchedDate, setWatchedDate] = useState<string>("");
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("");
  const [director, setDirector] = useState<string>("");
  const [year, setYear] = useState<string>("");

  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (review && isOpen) {
      setRating(review.rating || 5.0);
      setReviewText(review.review || "");
      setWatchedDate(review.watchedDate || "");
      setIsFavorite(Boolean(review.isFavorite));
      setTitle(review.title || "");
      setDirector(review.director || "");
      setYear(review.year || "");
      setSavedSuccess(false);
      setErrorMessage(null);
    }
  }, [review, isOpen]);

  if (!isOpen || !review) return null;

  const posterUrl = getPosterUrl(review.poster, "w342");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      setErrorMessage("Review essay cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await onSave({
        title: title.trim(),
        director: director.trim(),
        year: year.trim(),
        rating,
        review: reviewText.trim(),
        watchedDate: watchedDate.trim(),
        isFavorite,
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Large Studio Window Container */}
      <div className="relative w-[96vw] max-w-5xl xl:max-w-6xl h-[92vh] max-h-[960px] bg-[#090b10] border border-white/[0.12] rounded-3xl shadow-[0_30px_100px_rgba(0,0,0,0.95),0_0_60px_rgba(255,85,0,0.12)] overflow-hidden z-10 flex flex-col">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0f16]/95 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-14 rounded-xl overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.1] shadow-md">
              {posterUrl ? (
                <img src={posterUrl} alt={review.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Film className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-inter uppercase tracking-[0.2em] text-[#ff5500] font-semibold">
                  Review Studio
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs font-inter text-zinc-400">
                  Full Critique Editor
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-poppins text-white truncate">
                {review.title} {review.year && <span className="text-zinc-400 font-normal">({review.year})</span>}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-grow flex flex-col">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-inter text-red-400 flex-shrink-0">
              {errorMessage}
            </div>
          )}

          {/* Top Metadata Control Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0e1118] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
            {/* Rating */}
            <div>
              <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block mb-1 font-medium">
                Rating
              </label>
              <StarRating
                rating={rating}
                onChange={setRating}
                size="lg"
                showValue={true}
              />
            </div>

            {/* Favorite Button */}
            <div>
              <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block mb-1 font-medium">
                Curated
              </label>
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-inter font-semibold transition-all cursor-pointer ${
                  isFavorite
                    ? "bg-[#ff5500]/15 border-[#ff5500]/40 text-[#ff7a29] shadow-[0_0_15px_rgba(255,85,0,0.2)]"
                    : "bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFavorite ? "fill-[#ff5500] text-[#ff5500]" : ""
                  }`}
                />
                <span>{isFavorite ? "Curated Favorite" : "Mark as Favorite"}</span>
              </button>
            </div>

            {/* Watched Date */}
            <div className="w-full sm:w-44">
              <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block mb-1 font-medium">
                Watched Date
              </label>
              <input
                type="text"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                placeholder="e.g. Aug 28, 2026"
                className="w-full bg-[#141822] border border-white/[0.08] focus:border-[#ff5500] rounded-xl px-3.5 py-2 text-xs font-inter text-white placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Director */}
            <div className="w-full sm:w-44">
              <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block mb-1 font-medium">
                Director
              </label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Director name"
                className="w-full bg-[#141822] border border-white/[0.08] focus:border-[#ff5500] rounded-xl px-3.5 py-2 text-xs font-inter text-white placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Year */}
            <div className="w-full sm:w-28">
              <label className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block mb-1 font-medium">
                Year
              </label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full bg-[#141822] border border-white/[0.08] focus:border-[#ff5500] rounded-xl px-3.5 py-2 text-xs font-inter text-white placeholder-zinc-500 outline-none"
              />
            </div>
          </div>

          {/* Expansive Review Editor Canvas */}
          <div className="flex-grow flex flex-col min-h-[360px]">
            <ReviewEditor
              value={reviewText}
              onChange={setReviewText}
              label="Film Critique Essay"
              placeholder="Write your cinema critique, reflections on cinematography, pacing, performances, or personal connection..."
              minRows={14}
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-inter text-zinc-500 hidden sm:inline">
              Changes will update the SQLite database immediately.
            </span>

            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-inter font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !reviewText.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] disabled:opacity-50 disabled:cursor-not-allowed text-black font-inter font-bold text-xs transition-all shadow-[0_0_20px_rgba(255,85,0,0.3)] flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
