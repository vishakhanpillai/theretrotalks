import React, { useState, useEffect } from "react";
import { Heart, Trash2, User, ArrowRight, Calendar, Star, Film } from "lucide-react";
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

  // Clean quote excerpt (remove markdown tags for snippet display)
  const cleanExcerpt = review.review
    .replace(/\*\*|__|\*|_|~~|\|\|/g, "")
    .replace(/^>+\s*/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .trim();

  return (
    <article
      onClick={() => onOpenReview(review)}
      className="group relative flex flex-col md:flex-row bg-[#080a0f] hover:bg-[#0c0f16] rounded-3xl overflow-hidden border border-white/[0.08] hover:border-[#ff5500]/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(255,85,0,0.1)] cursor-pointer"
    >
      {/* Subtle Backdrop Tint dissolved in background */}
      {backdropUrl && (
        <div
          className="absolute inset-0 bg-cover bg-top opacity-[0.035] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        />
      )}

      {/* Left Column: Film Poster (Strict 2:3 ratio, height matches card) */}
      <div className="relative w-full md:w-64 lg:w-72 xl:w-80 flex-shrink-0 aspect-[2/3] bg-[#07090e] overflow-hidden flex items-center justify-center">
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={review.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#101318]">
            <Film className="w-10 h-10 text-zinc-600 mb-2" />
            <span className="font-poppins font-bold text-sm text-zinc-300">
              {review.title}
            </span>
          </div>
        )}

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 md:from-transparent via-transparent to-transparent pointer-events-none opacity-80 group-hover:opacity-50 transition-opacity" />

        {/* Floating Poster Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-10">
          {/* Star Rating Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/[0.12] text-xs font-inter font-bold text-[#ff7a29] shadow-lg">
            <Star className="w-3.5 h-3.5 fill-[#ff5500] text-[#ff5500]" />
            <span>{review.rating.toFixed(1)}</span>
          </div>

          {/* Favorite Badge */}
          {review.isFavorite && (
            <div className="p-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-[#ff5500]/35 text-[#ff5500] shadow-lg">
              <Heart className="w-3.5 h-3.5 fill-[#ff5500]" />
            </div>
          )}
        </div>

        {/* Mobile Release Year Pill */}
        <div className="absolute bottom-3 left-3 md:hidden z-10">
          <span className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-inter text-zinc-200 border border-white/[0.1] shadow-md">
            {review.year}
          </span>
        </div>
      </div>

      {/* Right Column: Review Details & Information Body */}
      <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between flex-grow space-y-3.5 min-w-0 relative z-10">
        
        <div className="space-y-3 sm:space-y-3.5">
          
          {/* Top Row: Year, Genres & Star Rating Component */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden md:inline-block bg-white/[0.05] px-2.5 py-0.5 rounded-lg text-xs font-inter font-medium text-zinc-200 border border-white/[0.08]">
                {review.year}
              </span>

              {/* Genre Pills */}
              {review.genres && review.genres.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {review.genres.slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-md bg-white/[0.02] text-[11px] font-inter text-zinc-400 border border-white/[0.05]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {review.isFavorite && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/30 text-[11px] font-inter font-medium">
                  <Heart className="w-3 h-3 fill-[#ff5500]" />
                  <span>Curated Favorite</span>
                </span>
              )}
            </div>

            {/* Precision Star Rating */}
            <div className="flex items-center bg-[#0d1017] px-3 py-1 rounded-xl border border-white/[0.08] shadow-sm ml-auto sm:ml-0">
              <StarRating rating={review.rating} readonly size="sm" showValue={true} />
            </div>
          </div>

          {/* Title & Director Byline */}
          <div className="space-y-0.5">
            <h3 className="font-poppins font-bold text-xl sm:text-2xl lg:text-3xl text-white group-hover:text-[#ff7a29] transition-colors leading-tight tracking-tight">
              {review.title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 font-inter">
              Directed by <strong className="text-zinc-200 font-medium">{review.director}</strong>
            </p>
          </div>

          {/* Review Critique Excerpt */}
          <div className="py-0.5">
            <div className="relative pl-3.5 border-l-2 border-[#ff5500] bg-white/[0.015] py-1.5 pr-3 rounded-r-xl">
              <p className="text-xs sm:text-sm text-zinc-300 font-poppins font-normal leading-relaxed italic line-clamp-2 sm:line-clamp-3">
                "{cleanExcerpt}"
              </p>
            </div>
          </div>

          {/* Key Cast & Crew Rows */}
          {(castList.length > 0 || crewList.length > 0) && (
            <div
              className="pt-1 space-y-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Row 1: Key Cast */}
              {castList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block font-medium">
                    Key Cast
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
                    {castList.slice(0, 4).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2.5 min-w-0"
                        title={`${member.name} as ${member.character || "Cast"}`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/[0.1] shadow-sm">
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

                        {/* Cast Name & Role Name */}
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs sm:text-sm font-semibold font-inter text-white truncate leading-tight">
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

              {/* Row 2: Key Crew */}
              {crewList.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-inter uppercase tracking-wider text-zinc-400 block font-medium">
                    Key Crew
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
                    {crewList.slice(0, 4).map((member, idx) => (
                      <div
                        key={`${member.id}-${idx}`}
                        className="flex items-center gap-2.5 min-w-0"
                        title={`${member.name} — ${member.job || "Crew"}`}
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-white/[0.1] shadow-sm">
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

                        {/* Crew Name & Role Name */}
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs sm:text-sm font-semibold font-inter text-white truncate leading-tight">
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
            </div>
          )}

        </div>

        {/* Card Footer Bar: Watched Date & Read Full Review Action */}
        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-4 mt-auto">
          <div className="flex items-center gap-2 text-xs font-inter text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>Watched {review.watchedDate}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenReview(review);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] group-hover:bg-[#ff5500] text-zinc-200 group-hover:text-black border border-white/[0.08] group-hover:border-[#ff5500] text-xs font-semibold font-inter transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
            >
              <span>Read review</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#ff5500] group-hover:text-black group-hover:translate-x-1 transition-all" />
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
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </article>
  );
};
