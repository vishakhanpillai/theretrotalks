import React, { useState } from "react";
import { Star, Film, ArrowUpRight } from "lucide-react";
import type { Movie } from "../types";
import { getPosterUrl } from "../utils/images";

interface MovieCardProps {
  movie: Movie;
  onSelect: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onSelect }) => {
  const [imageError, setImageError] = useState(false);
  const posterUrl = getPosterUrl(movie.poster, "w500");

  return (
    <div
      onClick={() => onSelect(movie)}
      className="group relative flex flex-col bg-[#0b0d11] rounded-2xl overflow-hidden border border-white/[0.07] hover:border-[#ff5500]/60 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_-10px_rgba(255,85,0,0.2)] cursor-pointer"
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full bg-[#12151c] overflow-hidden">
        {posterUrl && !imageError ? (
          <img
            src={posterUrl}
            alt={movie.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter group-hover:contrast-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#141820] to-[#0b0d11]">
            <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3">
              <Film className="w-6 h-6 text-[#71717a]" />
            </div>
            <span className="font-poppins font-semibold text-sm text-zinc-300 line-clamp-2">
              {movie.title}
            </span>
            {movie.year && (
              <span className="text-xs text-[#ff7a29] mt-1 font-mono tracking-wider">
                {movie.year}
              </span>
            )}
          </div>
        )}

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d11] via-transparent to-black/30 pointer-events-none opacity-80 group-hover:opacity-60 transition-opacity duration-300" />

        {/* Floating Ember Rating Pill */}
        {movie.tmdbRating !== null && movie.tmdbRating > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#07080a]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/[0.09] shadow-lg">
            <Star className="w-3 h-3 fill-[#ff5500] text-[#ff5500]" />
            <span className="text-[11px] font-bold text-white font-mono tracking-tight">
              {movie.tmdbRating}
            </span>
          </div>
        )}

        {/* Release Year */}
        {movie.year && (
          <div className="absolute top-3 left-3 bg-[#07080a]/85 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono tracking-wider text-zinc-400 border border-white/[0.08]">
            {movie.year}
          </div>
        )}

        {/* Hover Quick Action Glow Pill */}
        <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex justify-center">
          <div className="px-3.5 py-1.5 rounded-full bg-[#ff5500] text-black text-xs font-bold font-poppins flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,85,0,0.6)]">
            <span>Explore Cinema</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Card Metadata */}
      <div className="p-4 flex flex-col flex-grow justify-between bg-[#0b0d11]">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-poppins font-semibold text-sm text-zinc-100 line-clamp-1 group-hover:text-[#ff7a29] transition-colors">
              {movie.title}
            </h3>
          </div>
          <p className="text-[11px] text-[#8892a0] line-clamp-2 mt-1.5 leading-relaxed font-light">
            {movie.overview || "Archived cinema title."}
          </p>
        </div>

        <div className="mt-3.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span className="text-[#a1a1aa]">{movie.year || "Archive"}</span>
          <span className="text-[#ff7a29] flex items-center gap-0.5 group-hover:underline">
            Story Card <ArrowUpRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
