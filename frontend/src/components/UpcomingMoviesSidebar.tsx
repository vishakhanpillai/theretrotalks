import React, { useEffect, useState } from "react";
import { Calendar, Film, Star, Loader2, Sparkles, ChevronRight } from "lucide-react";
import type { UpcomingMovie } from "../types";

interface UpcomingMoviesSidebarProps {
  onSelectUpcoming?: (movie: UpcomingMovie) => void;
}

export const UpcomingMoviesSidebar: React.FC<UpcomingMoviesSidebarProps> = ({
  onSelectUpcoming,
}) => {
  const [movies, setMovies] = useState<UpcomingMovie[]>([]);
  const [monthName, setMonthName] = useState<string>("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch("/api/movies/upcoming-month")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch upcoming releases");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setMovies(data.movies || []);
          setMonthName(data.monthName || "");
          setYear(data.year || new Date().getFullYear());
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn("Could not load upcoming movies:", err);
          setError("Upcoming releases unavailable");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="w-full bg-[#0b0d12] border border-white/[0.08] rounded-3xl p-5 sm:p-6 flex flex-col space-y-5 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
      
      {/* Sidebar Header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#ff7a29] uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-[#ff5500]" />
            <span>Releasing {monthName || "This Month"} {year}</span>
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-white font-poppins">
            Upcoming Movies
          </h3>
        </div>

        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ff5500]/10 border border-[#ff5500]/25 text-[10px] font-mono text-[#ff7a29]">
          <Sparkles className="w-2.5 h-2.5 text-[#ff5500]" />
          <span>Monthly Sync</span>
        </span>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff5500]" />
          <span className="text-xs font-mono text-zinc-500">
            Syncing {monthName || "monthly"} releases...
          </span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="py-8 text-center text-xs font-mono text-zinc-500">
          {error}
        </div>
      )}

      {/* Movies List */}
      {!loading && movies.length > 0 && (
        <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {movies.map((movie, index) => (
            <div
              key={movie.id}
              onClick={() => onSelectUpcoming && onSelectUpcoming(movie)}
              className="group flex items-center gap-3.5 p-2.5 rounded-2xl bg-[#0e1117] hover:bg-[#141822] border border-white/[0.05] hover:border-[#ff5500]/40 transition-all duration-300 cursor-pointer"
            >
              {/* Poster Thumbnail */}
              <div className="w-13 sm:w-14 aspect-[2/3] rounded-xl overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.08] shadow-md group-hover:shadow-[0_0_15px_rgba(255,85,0,0.3)] transition-all">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Film className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">
                    #{index + 1}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/20">
                    {movie.formattedDate}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white truncate group-hover:text-[#ff7a29] transition-colors mt-1 font-poppins">
                  {movie.title}
                </h4>

                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                  {movie.tmdbRating ? (
                    <span className="flex items-center gap-1 text-[#ff5500]">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{movie.tmdbRating}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500">Anticipated</span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 text-zinc-600 group-hover:text-[#ff5500] group-hover:translate-x-0.5 transition-all">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-white/[0.06] text-[11px] font-mono text-zinc-500 text-center">
        <span>Auto-updated monthly via TMDB API</span>
      </div>

    </aside>
  );
};
