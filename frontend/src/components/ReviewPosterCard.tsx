import React, { useState } from "react";
import { Star, Film } from "lucide-react";
import type { Review } from "../types";
import { getPosterUrl } from "../utils/images";
import { formatRating } from "../utils/formatRating";

interface ReviewPosterCardProps {
  review: Review;
  onOpenReview: (review: Review) => void;
}

export const ReviewPosterCard: React.FC<ReviewPosterCardProps> = ({
  review,
  onOpenReview,
}) => {
  const [imageError, setImageError] = useState(false);
  const posterUrl = getPosterUrl(review.poster, "w500");

  // Clean quote excerpt (first sentence or clean snippet for hover preview)
  const cleanExcerpt = review.review
    .replace(/\*\*|__|\*|_|~~|\|\|/g, "")
    .replace(/^>+\s*/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

  return (
    <article
      onClick={() => onOpenReview(review)}
      className="group relative w-full aspect-[2/3] bg-[#07090e] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-[#ff5500]/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(255,85,0,0.2)] cursor-pointer"
    >
      {/* Film Poster Image */}
      {posterUrl && !imageError ? (
        <img
          src={posterUrl}
          alt={review.title}
          loading="lazy"
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 group-hover:blur-[6px] group-hover:brightness-[0.25]"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#101318]">
          <Film className="w-8 h-8 text-zinc-600 mb-2" />
          <span className="font-poppins font-bold text-xs text-zinc-300">
            {review.title}
          </span>
        </div>
      )}

      {/* Cinematic Dark Gradient for Bottom Title Legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 via-40% to-transparent pointer-events-none transition-opacity duration-300 group-hover:opacity-40" />

      {/* Floating Top Left: Star Rating Badge */}
      <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-[11px] font-inter font-bold text-[#ff7a29] shadow-lg">
        <Star className="w-3 h-3 fill-[#ff5500] text-[#ff5500]" />
        <span>{formatRating(review.rating)}</span>
      </div>

      {/* Floating Top Right: Year */}
      {review.year && (
        <div className="absolute top-2.5 right-2.5 z-30 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono text-zinc-300 font-semibold shadow-lg">
          {review.year}
        </div>
      )}

      {/* Full Poster Hover Review Overlay (Direct text on blurred poster without box) */}
      {cleanExcerpt && (
        <div className="absolute inset-0 z-25 flex items-center justify-center p-4 sm:p-5 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-black/35 backdrop-blur-[1px]">
          <p className="font-poppins text-xs sm:text-[12.5px] font-medium text-white/95 leading-relaxed italic line-clamp-6 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] select-none">
            "{cleanExcerpt}"
          </p>
        </div>
      )}

      {/* Embedded Bottom Metadata (Title, Director, Genre) */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-3 sm:p-4 space-y-1 transition-all duration-300 group-hover:opacity-20 group-hover:translate-y-1">
        <h3 className="font-poppins font-bold text-sm sm:text-base text-white group-hover:text-[#ff7a29] transition-colors line-clamp-1 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
          {review.title}
        </h3>

        <p className="text-[11px] text-zinc-300 font-inter line-clamp-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}
        </p>

        {review.genres && review.genres.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-0.5">
            {review.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 font-medium"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};
