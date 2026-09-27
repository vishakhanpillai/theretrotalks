import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Film,
  Tv,
  Star,
  Plus,
  Loader2,
  Sparkles,
  Command,
  ArrowRight,
} from "lucide-react";
import type { Movie } from "../types";
import { getPosterUrl } from "../utils/images";

interface CinemaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  onSelectCustom?: () => void;
}

export const CinemaSearchModal: React.FC<CinemaSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMovie,
  onSelectCustom,
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Live TMDB Search with debouncing
  useEffect(() => {
    if (!isOpen || !query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/movies/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        const movies: Movie[] = (data.results || []).slice(0, 10);
        setResults(movies);
      } catch (err) {
        console.error("Cinema search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const filteredResults = results.filter((m) => {
    if (filter === "movie" && m.mediaType === "tv") return false;
    if (filter === "tv" && m.mediaType !== "tv") return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Search Palette Container */}
      <div className="relative w-full max-w-2xl bg-[#090b0e] border border-white/[0.14] rounded-2xl sm:rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.95),0_0_50px_rgba(255,85,0,0.15)] overflow-hidden z-10 flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150">
        
        {/* Search Header Bar */}
        <div className="relative p-3 sm:p-4 border-b border-white/[0.08] bg-[#0c0e13]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] flex-shrink-0 shadow-[0_0_15px_rgba(255,85,0,0.2)]">
              <Film className="w-4 h-4 stroke-[2.5]" />
            </div>

            <div className="relative flex-grow flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search TMDB for movies or TV series to review..."
                className="w-full bg-[#12161f] border border-white/[0.1] focus:border-[#ff5500] focus:ring-1 focus:ring-[#ff5500] rounded-xl pl-9 pr-10 py-2.5 sm:py-3 text-sm font-inter text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors flex-shrink-0 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Chips Bar */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-inter font-medium mr-1 hidden sm:inline">
                Format:
              </span>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-inter transition-all cursor-pointer ${
                  filter === "all"
                    ? "bg-[#ff5500] text-black font-semibold shadow-[0_0_10px_rgba(255,85,0,0.3)]"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("movie")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-inter transition-all cursor-pointer ${
                  filter === "movie"
                    ? "bg-[#ff5500] text-black font-semibold shadow-[0_0_10px_rgba(255,85,0,0.3)]"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Film className="w-3 h-3" />
                <span>Movies</span>
              </button>
              <button
                type="button"
                onClick={() => setFilter("tv")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-inter transition-all cursor-pointer ${
                  filter === "tv"
                    ? "bg-[#ff5500] text-black font-semibold shadow-[0_0_10px_rgba(255,85,0,0.3)]"
                    : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <Tv className="w-3 h-3" />
                <span>TV Shows</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
              <Command className="w-3 h-3" />
              <span>ESC to exit</span>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-grow overflow-y-auto divide-y divide-white/[0.05] p-2">
          {isSearching && (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-zinc-400">
              <Loader2 className="w-6 h-6 text-[#ff5500] animate-spin" />
              <span className="text-xs font-inter">Searching global TMDB cinema index...</span>
            </div>
          )}

          {!isSearching && query.trim().length >= 2 && filteredResults.length === 0 && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-500">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold font-poppins text-white">No matches found for "{query}"</p>
                <p className="text-xs font-inter text-zinc-400 mt-0.5">
                  Try checking the spelling, or create a custom manual cinema review.
                </p>
              </div>
              {onSelectCustom && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectCustom();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5500]/15 hover:bg-[#ff5500] text-[#ff7a29] hover:text-black border border-[#ff5500]/30 hover:border-[#ff5500] text-xs font-inter font-bold transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Custom Cinema Entry</span>
                </button>
              )}
            </div>
          )}

          {!isSearching && query.trim().length < 2 && (
            <div className="py-10 px-4 text-center space-y-2">
              <p className="text-xs font-inter text-zinc-400">
                Type the name of any film or series above to fetch metadata, artwork, cast, and start writing.
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500 pt-2">
                <span>Popular searches:</span>
                <button
                  type="button"
                  onClick={() => setQuery("Oppenheimer")}
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300"
                >
                  Oppenheimer
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("Premam")}
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300"
                >
                  Premam
                </button>
                <button
                  type="button"
                  onClick={() => setQuery("Severance")}
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300"
                >
                  Severance
                </button>
              </div>
            </div>
          )}

          {/* Search Result Items */}
          {!isSearching &&
            filteredResults.map((movie) => {
              const poster = getPosterUrl(movie.poster, "w342");
              const isTv = movie.mediaType === "tv";

              return (
                <div
                  key={`${movie.mediaType || "movie"}-${movie.id}`}
                  onClick={() => {
                    onSelectMovie(movie);
                    onClose();
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl flex items-center gap-3 sm:gap-4 hover:bg-white/[0.05] transition-all cursor-pointer group border border-transparent hover:border-white/[0.08]"
                >
                  {/* Poster Thumbnail */}
                  <div className="w-11 sm:w-13 aspect-[2/3] rounded-xl overflow-hidden bg-[#161a22] flex-shrink-0 border border-white/[0.08] shadow-md group-hover:border-[#ff5500]/50 transition-colors">
                    {poster ? (
                      <img src={poster} alt={movie.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Movie Info */}
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold font-poppins text-white group-hover:text-[#ff7a29] transition-colors truncate">
                        {movie.title}
                      </h4>
                      <span
                        className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.2 rounded ${
                          isTv
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {isTv ? "TV Series" : "Movie"}
                      </span>
                      {movie.year && (
                        <span className="text-xs font-inter text-zinc-500">
                          ({movie.year})
                        </span>
                      )}
                      {movie.tmdbRating ? (
                        <span className="flex items-center gap-0.5 text-[11px] font-mono text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{movie.tmdbRating.toFixed(1)}</span>
                        </span>
                      ) : null}
                    </div>

                    {movie.director && (
                      <p className="text-xs text-zinc-400 font-inter mt-0.5 truncate">
                        {isTv ? "Created by" : "Directed by"}{" "}
                        <strong className="text-zinc-300 font-medium">{movie.director}</strong>
                      </p>
                    )}

                    {movie.overview && (
                      <p className="text-[11px] text-zinc-500 font-inter line-clamp-1 mt-0.5">
                        {movie.overview}
                      </p>
                    )}
                  </div>

                  {/* Action CTA */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] group-hover:bg-[#ff5500] text-zinc-400 group-hover:text-black font-inter text-xs font-bold transition-all flex-shrink-0 shadow-sm">
                    <span className="hidden sm:inline">Write Review</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer / Manual Add Fallback */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0c0e13] flex items-center justify-between text-xs font-inter text-zinc-400">
          <span className="hidden sm:inline">Powered by TMDB Cine-Index</span>
          {onSelectCustom && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectCustom();
              }}
              className="inline-flex items-center gap-1.5 text-xs text-[#ff7a29] hover:text-[#ff924d] font-semibold transition-colors cursor-pointer ml-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Write custom review without TMDB</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
