import React, { useEffect, useState } from "react";
import { X, Check, Loader2, Image as ImageIcon, Sparkles } from "lucide-react";

export interface PosterOption {
  filePath: string;
  url: string;
  originalUrl: string;
  width: number;
  height: number;
  voteCount: number;
  language?: string | null;
}

interface PosterSelectorModalProps {
  movieId: number;
  movieTitle: string;
  mediaType?: "movie" | "tv";
  currentPosterUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPoster: (newPosterUrl: string) => void;
}

export const PosterSelectorModal: React.FC<PosterSelectorModalProps> = ({
  movieId,
  movieTitle,
  mediaType = "movie",
  currentPosterUrl,
  isOpen,
  onClose,
  onSelectPoster,
}) => {
  const [posters, setPosters] = useState<PosterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !movieId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/movies/${movieId}/posters?mediaType=${mediaType || "movie"}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch alternate posters");
        return res.json();
      })
      .then((data) => {
        setPosters(data.posters || []);
      })
      .catch((err) => {
        console.error("Error loading posters:", err);
        setError("Could not load alternate artwork from TMDB.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, movieId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-4xl bg-[#0a0c10] border border-white/[0.12] rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.15)] z-10 max-h-[88vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-[#0e1117] border-b border-white/[0.08] flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-inter uppercase tracking-wider text-[#ff7a29]">
              <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>Official TMDB Artwork Gallery</span>
            </div>
            <h3 className="text-xl font-poppins font-bold text-white tracking-tight">
              Choose Poster for <span className="text-[#ff7a29]">"{movieTitle}"</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.04] hover:bg-[#ff5500] text-zinc-400 hover:text-black border border-white/[0.08] hover:border-[#ff5500] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Poster Grid */}
        <div className="p-6 overflow-y-auto flex-grow">
          
          {loading && (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#ff5500]" />
              <p className="text-xs font-inter text-zinc-400">
                Fetching alternate posters from TMDB archive...
              </p>
            </div>
          )}

          {error && (
            <div className="py-16 text-center text-xs font-inter text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && posters.length === 0 && (
            <div className="py-20 text-center text-zinc-500 space-y-2">
              <ImageIcon className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm font-poppins">No alternate posters found for this film.</p>
            </div>
          )}

          {!loading && posters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 text-xs font-inter text-zinc-500">
                <span>{posters.length} official posters available</span>
                <span>Click any artwork to apply to your review</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {posters.map((poster, index) => {
                  const isCurrent =
                    currentPosterUrl?.includes(poster.filePath) ||
                    currentPosterUrl === poster.url;

                  return (
                    <div
                      key={poster.filePath || index}
                      onClick={() => {
                        onSelectPoster(poster.url);
                        onClose();
                      }}
                      className={`group relative aspect-[2/3] rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer bg-[#12151c] ${
                        isCurrent
                          ? "border-[#ff5500] ring-2 ring-[#ff5500]/50 shadow-[0_0_20px_rgba(255,85,0,0.4)]"
                          : "border-white/[0.08] hover:border-[#ff5500]/60 hover:-translate-y-1 hover:shadow-lg"
                      }`}
                    >
                      <img
                        src={poster.url}
                        alt={`${movieTitle} poster ${index + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Selected checkmark */}
                      {isCurrent && (
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-[#ff5500] text-black shadow-lg">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      {/* Language or vote tag */}
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-inter text-zinc-300 border border-white/10 uppercase">
                        {poster.language ? poster.language : "Textless"}
                      </div>

                      {/* Hover Select overlay */}
                      <div className="absolute inset-0 bg-[#ff5500]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="px-3 py-1 rounded-full bg-black/90 text-[#ff7a29] text-[10px] font-inter uppercase font-bold border border-[#ff5500]/40">
                          {isCurrent ? "Active Poster" : "Use Artwork"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#0e1117] border-t border-white/[0.08] flex items-center justify-between text-xs font-inter text-zinc-500">
          <span>TMDB Image API</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-all"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
