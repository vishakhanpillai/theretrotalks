import React, { useState } from "react";
import { Star, Sparkles, Heart, Trash2 } from "lucide-react";
import type { Review } from "../types";
import { getPosterUrl } from "../utils/images";

interface ReviewCardProps {
  review: Review;
  onOpenReview: (review: Review) => void;
  onDelete?: (id: string | number) => void;
  isAdmin?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onOpenReview,
  onDelete,
  isAdmin = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const posterUrl = getPosterUrl(review.poster, "w500");

  const fullStars = Math.floor(review.rating);
  const hasHalf = review.rating % 1 !== 0;

  return (
    <div
      onClick={() => onOpenReview(review)}
      className="group relative flex flex-col sm:flex-row bg-[#0b0d12] rounded-3xl overflow-hidden border border-white/[0.08] hover:border-[#ff5500]/60 transition-all duration-400 hover:-translate-y-1 hover:shadow-[0_20px_45px_-12px_rgba(255,85,0,0.25)] cursor-pointer"
    >
      {/* Poster Container (Wider horizontal side) */}
      <div className="relative w-full sm:w-48 md:w-52 lg:w-56 flex-shrink-0 aspect-[2/3] sm:aspect-auto sm:min-h-[260px] bg-[#12151c] overflow-hidden">
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={review.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter group-hover:contrast-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#101318]">
            <span className="font-poppins font-bold text-sm text-zinc-300">
              {review.title}
            </span>
          </div>
        )}

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/60 sm:from-transparent to-transparent pointer-events-none opacity-80 group-hover:opacity-50 transition-opacity" />

        {/* Mobile Release Year & Favorite */}
        <div className="absolute top-3 left-3 sm:hidden flex items-center gap-1.5">
          <span className="bg-[#07080a]/85 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[10px] font-mono tracking-wider text-zinc-300 border border-white/[0.08]">
            {review.year}
          </span>
          {review.isFavorite && (
            <span className="p-1 rounded-md bg-[#ff5500]/20 border border-[#ff5500]/30 text-[#ff5500]">
              <Heart className="w-3 h-3 fill-[#ff5500]" />
            </span>
          )}
        </div>

        {/* Admin Hover Pill (Only for Admin) */}
        {isAdmin && (
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex justify-center">
            <div className="px-3 py-1.5 rounded-full bg-[#ff5500] text-black text-[11px] font-bold font-poppins flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,85,0,0.6)]">
              <Sparkles className="w-3 h-3" />
              <span>Story Studio</span>
            </div>
          </div>
        )}
      </div>

      {/* Review Information Body */}
      <div className="p-5 sm:p-6 md:p-7 flex flex-col flex-grow justify-between bg-[#0b0d12]">
        <div className="space-y-2.5">
          
          {/* Top Row: Year, Favorite, Rating */}
          <div className="flex items-center justify-between gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <span className="bg-white/[0.04] px-2.5 py-0.5 rounded-md text-xs font-mono text-zinc-300 border border-white/[0.08]">
                {review.year}
              </span>
              {review.isFavorite && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/25 text-[11px] font-mono">
                  <Heart className="w-3 h-3 fill-[#ff5500]" />
                  <span>Favorite</span>
                </span>
              )}
            </div>

            {/* Star Rating Badge */}
            <div className="flex items-center gap-1.5 bg-[#12151c] px-3 py-1 rounded-full border border-white/[0.08] shadow-sm ml-auto sm:ml-0">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < fullStars
                        ? "fill-[#ff5500] text-[#ff5500]"
                        : i === fullStars && hasHalf
                        ? "fill-[#ff5500]/50 text-[#ff5500]"
                        : "text-zinc-700"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-white font-mono ml-1">
                {review.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Title & Director */}
          <div>
            <h3 className="font-poppins font-black text-lg sm:text-xl md:text-2xl text-white group-hover:text-[#ff7a29] transition-colors leading-tight">
              {review.title}
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Directed by <strong className="text-zinc-200">{review.director}</strong>
            </p>
          </div>

          {/* Review Excerpt Quote */}
          <p className="text-xs sm:text-sm text-zinc-300 italic line-clamp-3 sm:line-clamp-4 leading-relaxed border-l-2 border-[#ff5500]/40 pl-3.5 py-0.5">
            "{review.review}"
          </p>
        </div>

        {/* Card Footer: Watched Date & Actions */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>Watched on {review.watchedDate}</span>
          <div className="flex items-center gap-3">
            <span className="text-[#ff7a29] font-medium group-hover:underline">
              {isAdmin ? "Story Studio →" : "Read Review →"}
            </span>

            {/* Delete button (Only for Admin) */}
            {isAdmin && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove "${review.title}" permanently from database?`)) {
                    onDelete(review.id);
                  }
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Remove review"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
