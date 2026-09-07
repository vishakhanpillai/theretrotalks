import React, { useState } from "react";
import { Star, Sparkles, Heart, Trash2 } from "lucide-react";
import type { Review } from "../types";
import { getPosterUrl } from "../utils/images";

interface ReviewCardProps {
  review: Review;
  onOpenReview: (review: Review) => void;
  onDelete?: (id: string | number) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onOpenReview, onDelete }) => {
  const [imageError, setImageError] = useState(false);
  const posterUrl = getPosterUrl(review.poster, "w500");

  // Render stars (up to 5)
  const fullStars = Math.floor(review.rating);
  const hasHalf = review.rating % 1 !== 0;

  return (
    <div
      onClick={() => onOpenReview(review)}
      className="group relative flex flex-col bg-[#0b0d12] rounded-2xl overflow-hidden border border-white/[0.07] hover:border-[#ff5500]/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_45px_-12px_rgba(255,85,0,0.25)] cursor-pointer"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full bg-[#12151c] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-transparent to-black/40 pointer-events-none opacity-85 group-hover:opacity-60 transition-opacity duration-300" />

        {/* User Star Rating Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#07080a]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/[0.1] shadow-lg">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < fullStars
                    ? "fill-[#ff5500] text-[#ff5500]"
                    : i === fullStars && hasHalf
                    ? "fill-[#ff5500]/50 text-[#ff5500]"
                    : "text-zinc-600"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-white font-mono ml-1">
            {review.rating.toFixed(1)}
          </span>
        </div>

        {/* Release Year & Favorite */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-[#07080a]/85 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[10px] font-mono tracking-wider text-zinc-300 border border-white/[0.08]">
            {review.year}
          </span>
          {review.isFavorite && (
            <span className="p-1 rounded-md bg-[#ff5500]/20 border border-[#ff5500]/30 text-[#ff5500]">
              <Heart className="w-3 h-3 fill-[#ff5500]" />
            </span>
          )}
        </div>

        {/* Hover Pill */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex justify-center">
          <div className="px-4 py-2 rounded-full bg-[#ff5500] text-black text-xs font-bold font-poppins flex items-center gap-1.5 shadow-[0_0_25px_rgba(255,85,0,0.6)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Story Card</span>
          </div>
        </div>
      </div>

      {/* Review Information */}
      <div className="p-5 flex flex-col flex-grow justify-between bg-[#0b0d12]">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-poppins font-bold text-base text-zinc-100 line-clamp-1 group-hover:text-[#ff7a29] transition-colors">
              {review.title}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            Dir. {review.director}
          </p>

          {/* Review Excerpt */}
          <p className="text-xs text-zinc-300 italic line-clamp-3 mt-3 leading-relaxed border-l-2 border-[#ff5500]/40 pl-3">
            "{review.review}"
          </p>
        </div>

        {/* Watched Date & Actions */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Watched {review.watchedDate}</span>
          <div className="flex items-center gap-2.5">
            <span className="text-[#ff7a29] font-medium group-hover:underline">
              Story Preview →
            </span>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove "${review.title}" from your personal diary?`)) {
                    onDelete(review.id);
                  }
                }}
                className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                title="Remove from diary"
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
