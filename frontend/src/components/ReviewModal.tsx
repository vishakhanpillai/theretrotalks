import React, { useState } from "react";
import { X, Star, Sparkles, Check, Calendar, Quote } from "lucide-react";
import type { Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { PosterSelectorModal } from "./PosterSelectorModal";

interface ReviewModalProps {
  review: Review | null;
  onClose: () => void;
  onUpdatePoster?: (reviewId: string | number, newPosterUrl: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ review, onClose, onUpdatePoster }) => {
  const [copied, setCopied] = useState(false);
  const [activeStoryTemplate, setActiveStoryTemplate] = useState<"minimal" | "noir" | "editorial">("minimal");
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);

  if (!review) return null;

  const backdropUrl = getBackdropUrl(review.backdrop, "original");
  const posterUrl = getPosterUrl(review.poster, "w500");

  // Determine if review is long
  const isLongReview = review.review.length > 140;

  // AI / Smart punchline generator
  const smartSummary = isLongReview
    ? review.review.split(/(?<=[.?!])\s+/)[0] || review.review
    : review.review;

  const handleCopyStory = () => {
    navigator.clipboard.writeText(`"${smartSummary}" — ${review.title} (${review.year}) ★ ${review.rating}/5.0 via The Retro Talks`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-5xl bg-[#090b0e] border border-white/[0.09] rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.12)] z-10 max-h-[92vh] flex flex-col">
        
        {/* Backdrop Banner Header */}
        <div className="relative h-48 sm:h-64 w-full bg-[#101318] overflow-hidden flex-shrink-0">
          {backdropUrl && (
            <img
              src={backdropUrl}
              alt={review.title}
              className="w-full h-full object-cover filter contrast-110 brightness-75"
            />
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090b0e] via-[#090b0e]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090b0e] via-[#090b0e]/40 to-transparent" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff5500]/10 blur-[100px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-black/60 hover:bg-[#ff5500] text-zinc-300 hover:text-black border border-white/10 hover:border-[#ff5500] transition-all duration-200 shadow-xl group"
          >
            <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
          </button>

          {/* Title and stats overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#ff7a29] uppercase tracking-wider mb-1">
                <span>{review.year}</span>
                <span>•</span>
                <span>Dir. {review.director}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-poppins font-black text-white tracking-tight">
                {review.title}
              </h2>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 bg-[#07080a]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/[0.1] shadow-xl">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(review.rating)
                        ? "fill-[#ff5500] text-[#ff5500]"
                        : i === Math.floor(review.rating) && review.rating % 1 !== 0
                        ? "fill-[#ff5500]/50 text-[#ff5500]"
                        : "text-zinc-600"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-white font-mono ml-1">
                {review.rating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Content Body: Two-column layout (Review notes + Story Card Studio) */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-grow">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Full Review & Meta (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Watched Date */}
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Calendar className="w-4 h-4 text-[#ff5500]" />
                <span>Logged on <strong>{review.watchedDate}</strong></span>
              </div>

              {/* Full Review Content */}
              <div className="bg-[#0e1117] p-6 rounded-2xl border border-white/[0.07] relative space-y-4">
                <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[#ff7a29]">
                  <span className="flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-[#ff5500]" />
                    <span>Personal Review</span>
                  </span>
                  <span className="text-zinc-500">{review.review.length} characters</span>
                </div>

                <p className="text-sm sm:text-base text-zinc-200 leading-relaxed font-normal">
                  {review.review}
                </p>
              </div>

              {/* Genres */}
              {review.genres && review.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {review.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 rounded-full text-xs font-mono bg-white/[0.03] text-zinc-400 border border-white/[0.08]"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

            </div>

            {/* Right Column: 9:16 Instagram Story Card Studio (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              
              <div className="w-full flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-poppins font-bold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Instagram Story Card (9:16)</span>
                </div>

                <div className="flex gap-1 bg-[#12151c] p-1 rounded-lg border border-white/[0.06]">
                  {(["minimal", "noir", "editorial"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveStoryTemplate(t)}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded transition-all ${
                        activeStoryTemplate === t
                          ? "bg-[#ff5500] text-black font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 9:16 Mobile Card Mockup */}
              <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/[0.15] shadow-[0_0_40px_-10px_rgba(255,85,0,0.25)] flex flex-col justify-between p-5 bg-[#07080a] group">
                
                {/* Background Artwork */}
                <div className="absolute inset-0 z-0">
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={review.title}
                      className={`w-full h-full object-cover ${
                        activeStoryTemplate === "minimal"
                          ? "filter blur-sm scale-110 opacity-30"
                          : activeStoryTemplate === "noir"
                          ? "filter contrast-125 brightness-50 opacity-40"
                          : "filter blur-md opacity-25"
                      }`}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-b from-[#07080a]/90 via-[#07080a]/75 to-[#07080a]/95" />
                </div>

                {/* Card Top: Branding */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-semibold tracking-[0.25em] uppercase text-[#ff5500] leading-none">
                      The
                    </span>
                    <span className="text-xs font-extrabold tracking-tight text-white leading-none font-poppins">
                      Retro Talks
                    </span>
                  </div>

                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-zinc-300">
                    {review.year}
                  </span>
                </div>

                {/* Card Center: Poster & Title */}
                <div className="relative z-10 flex flex-col items-center text-center my-auto">
                  <div className="w-24 aspect-[2/3] rounded-lg overflow-hidden border border-white/[0.2] shadow-2xl mb-3 bg-[#181c24]">
                    {posterUrl ? (
                      <img src={posterUrl} alt={review.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                        {review.title}
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-poppins font-black text-white leading-tight">
                    {review.title}
                  </h3>
                  <p className="text-[10px] text-[#ff7a29] font-mono mt-0.5">
                    Dir. {review.director}
                  </p>

                  {/* Stars */}
                  <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(review.rating)
                            ? "fill-[#ff5500] text-[#ff5500]"
                            : "text-zinc-700"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Distilled Quote */}
                  <div className="mt-3 px-2">
                    <p className="text-[10px] text-zinc-300 italic leading-relaxed line-clamp-3">
                      "{smartSummary}"
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Handle */}
                <div className="relative z-10 pt-2 border-t border-white/[0.1] flex items-center justify-between text-[8px] font-mono text-zinc-400">
                  <span>@theretrotalks</span>
                  <span className="text-[#ff5500]">Personal Review</span>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-[280px] mt-4 flex flex-col gap-2">
                <button
                  onClick={handleCopyStory}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(255,85,0,0.35)] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied Quote</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Share Story Quote</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPosterModal(true)}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-[#ff5500]/15 text-zinc-300 hover:text-[#ff7a29] border border-white/[0.08] hover:border-[#ff5500]/30 font-mono text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Change Poster Artwork</span>
                </button>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-4 bg-[#07080a] border-t border-white/[0.07] flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500">
            The Retro Talks Cinema Archive
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-white border border-white/[0.08] transition-all"
          >
            Close
          </button>
        </div>

      </div>

      {/* TMDB Alternate Poster Selector Modal */}
      <PosterSelectorModal
        movieId={review.tmdbId}
        movieTitle={review.title}
        currentPosterUrl={review.poster}
        isOpen={showPosterModal}
        onClose={() => setShowPosterModal(false)}
        onSelectPoster={(newPosterUrl) => {
          if (onUpdatePoster) {
            onUpdatePoster(review.id, newPosterUrl);
          }
        }}
      />
    </div>
  );
};
