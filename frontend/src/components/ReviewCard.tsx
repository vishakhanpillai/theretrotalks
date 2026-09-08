import React, { useState, useEffect } from "react";
import { Heart, Trash2, User, ArrowRight, Calendar } from "lucide-react";
import type { Review, CastMember, CrewMember } from "../types";
import { getPosterUrl, getBackdropUrl } from "../utils/images";
import { StarRating } from "./StarRating";

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
  const [credits, setCredits] = useState<{ cast: CastMember[]; crew: CrewMember[] }>({
    cast: review.cast || [],
    crew: review.crew || [],
  });

  // Fetch cast/crew if not stored in review cache
  useEffect(() => {
    if (review.cast && review.cast.length > 0) {
      setCredits({ cast: review.cast, crew: review.crew || [] });
      return;
    }
    if (review.tmdbId) {
      fetch(`/api/movies/${review.tmdbId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Credits fetch failed");
          return res.json();
        })
        .then((data) => {
          if (data.cast || data.crew) {
            setCredits({ cast: data.cast || [], crew: data.crew || [] });
          }
        })
        .catch(() => {});
    }
  }, [review.cast, review.crew, review.tmdbId]);

  const posterUrl = getPosterUrl(review.poster, "w500");
  const backdropUrl = getBackdropUrl(review.backdrop, "original");

  const castList = credits.cast || [];
  const crewList = credits.crew || [];
  const hasCredits = castList.length > 0 || crewList.length > 0;

  return (
    <article
      onClick={() => onOpenReview(review)}
      className="group relative flex flex-col md:flex-row bg-[#0b0d13] hover:bg-[#0e1119] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-[#ff5500]/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.7)] cursor-pointer"
    >
      {/* Subtle Backdrop Tint in Card Background */}
      {backdropUrl && (
        <div
          className="absolute inset-0 bg-cover bg-top opacity-[0.035] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      )}

      {/* Left: Film Poster */}
      <div className="relative w-full md:w-56 lg:w-64 xl:w-72 flex-shrink-0 aspect-[2/3] md:aspect-auto md:min-h-[340px] bg-[#10131a] overflow-hidden">
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

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/70 md:from-transparent via-transparent to-transparent pointer-events-none opacity-70 group-hover:opacity-40 transition-opacity" />

        {/* Mobile Release Year & Favorite Indicator */}
        <div className="absolute top-3 left-3 md:hidden flex items-center gap-1.5">
          <span className="bg-[#07080a]/90 backdrop-blur-md px-2.5 py-0.5 rounded-md text-[10px] font-inter tracking-wider text-zinc-300 border border-white/[0.08]">
            {review.year}
          </span>
          {review.isFavorite && (
            <span className="p-1 rounded-md bg-[#ff5500]/20 border border-[#ff5500]/30 text-[#ff5500]">
              <Heart className="w-3 h-3 fill-[#ff5500]" />
            </span>
          )}
        </div>
      </div>

      {/* Right: Review Details & Information Body */}
      <div className="p-5 sm:p-7 lg:p-8 flex flex-col justify-between flex-grow space-y-4 min-w-0 relative z-10">
        
        <div className="space-y-3.5">
          {/* Top Row: Year, Favorite, Watched Date & Star Rating */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="bg-white/[0.04] px-2.5 py-0.5 rounded-md text-xs font-inter text-zinc-300 border border-white/[0.08]">
                {review.year}
              </span>

              {review.isFavorite && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/25 text-[11px] font-inter">
                  <Heart className="w-3 h-3 fill-[#ff5500]" />
                  <span>Favorite</span>
                </span>
              )}

              <span className="hidden sm:inline text-xs font-inter text-zinc-500">
                · Watched {review.watchedDate}
              </span>
            </div>

            {/* Star Rating (Supports 0.5 to 5.0) */}
            <div className="flex items-center bg-[#0e1117] px-3 py-1 rounded-xl border border-white/[0.08] shadow-sm ml-auto sm:ml-0">
              <StarRating rating={review.rating} readonly size="sm" />
            </div>
          </div>

          {/* Title & Director */}
          <div className="space-y-1">
            <h3 className="font-poppins font-medium text-xl sm:text-2xl lg:text-3xl text-white group-hover:text-[#ff7a29] transition-colors leading-tight">
              {review.title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-inter">
              Directed by <strong className="text-zinc-200 font-medium">{review.director}</strong>
            </p>
          </div>

          {/* Review Excerpt (Few Lines) */}
          <div className="py-1">
            <p className="text-sm sm:text-base text-zinc-300/90 font-normal leading-relaxed italic border-l-2 border-[#ff5500]/45 pl-4 line-clamp-3 sm:line-clamp-4">
              "{review.review}"
            </p>
          </div>

          {/* Small List of Cast and Crew with Photos */}
          {hasCredits && (
            <div
              className="pt-2 space-y-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-500">
                Key Cast & Crew
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Cast Members (Up to 4) */}
                {castList.slice(0, 4).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 bg-[#090b10] hover:bg-[#121622] px-2.5 py-1 rounded-xl border border-white/[0.05] hover:border-white/[0.12] transition-colors"
                    title={`${member.name} as ${member.character}`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/[0.08]">
                      {member.picture ? (
                        <img
                          src={member.picture}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-white truncate max-w-[95px] sm:max-w-[110px] leading-tight">
                        {member.name}
                      </p>
                      <p className="text-[9px] text-zinc-400 font-inter truncate max-w-[95px] sm:max-w-[110px] leading-tight">
                        {member.character || "Cast"}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Key Crew Members (Up to 2) */}
                {crewList.slice(0, 2).map((member, idx) => (
                  <div
                    key={`${member.id}-${idx}`}
                    className="flex items-center gap-2 bg-[#090b10] hover:bg-[#121622] px-2.5 py-1 rounded-xl border border-white/[0.05] hover:border-white/[0.12] transition-colors"
                    title={`${member.name} (${member.job})`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/[0.08]">
                      {member.picture ? (
                        <img
                          src={member.picture}
                          alt={member.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-white truncate max-w-[95px] sm:max-w-[110px] leading-tight">
                        {member.name}
                      </p>
                      <p className="text-[9px] text-[#ff7a29] font-inter truncate max-w-[95px] sm:max-w-[110px] leading-tight">
                        {member.job}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Card Footer: Read More Action Button */}
        <div className="pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-4 mt-auto">
          <div className="flex items-center gap-2 text-xs font-inter text-zinc-500">
            <Calendar className="w-3.5 h-3.5 text-zinc-600" />
            <span>{review.watchedDate}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReview(review);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-[#ff5500] text-zinc-200 hover:text-black border border-white/[0.08] hover:border-[#ff5500] text-xs font-semibold font-inter transition-all duration-300 cursor-pointer group/btn shadow-sm active:scale-95"
            >
              <span>Read more</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#ff5500] group-hover:text-black group-hover/btn:translate-x-1 transition-all" />
            </button>

            {/* Admin Delete Action */}
            {isAdmin && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Remove "${review.title}" permanently from database?`)) {
                    onDelete(review.id);
                  }
                }}
                className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Remove review"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </article>
  );
};

