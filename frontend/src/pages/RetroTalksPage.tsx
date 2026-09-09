import React, { useState, useEffect } from "react";
import { Film } from "lucide-react";
import type { Movie, Review, UpcomingMovie } from "../types";
import { ReviewCard } from "../components/ReviewCard";
import { MovieModal } from "../components/MovieModal";
import { AboutModal } from "../components/AboutModal";
import { UpcomingMoviesSidebar } from "../components/UpcomingMoviesSidebar";
import { AvengersCountdown } from "../components/AvengersCountdown";
import { AvengersDoomsdayModal } from "../components/AvengersDoomsdayModal";

interface RetroTalksPageProps {
  reviews: Review[];
  onOpenReview: (id: string | number) => void;
}

export const RetroTalksPage: React.FC<RetroTalksPageProps> = ({
  reviews,
  onOpenReview,
}) => {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showDoomsdayModal, setShowDoomsdayModal] = useState(false);

  const [navSolidProgress, setNavSolidProgress] = useState<number>(0);

  // Scroll to top on mount and track scroll position for header solid transition
  useEffect(() => {
    window.scrollTo(0, 0);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const solidThreshold = 80;
      const progress = Math.min(1, Math.max(0, currentScrollY / solidThreshold));
      setNavSolidProgress(Math.round(progress * 100) / 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black relative overflow-x-hidden">
      
      {/* Ambient Cinema Lighting & Background Depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[520px] pointer-events-none select-none overflow-hidden z-0">
        {/* Subtle warm ember radial glow centered on the hero */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] sm:w-[820px] h-[380px] bg-gradient-to-b from-[#ff5500]/14 via-[#ff5500]/[0.025] to-transparent rounded-full blur-3xl" />
        {/* Fine cinema grain texture */}
        <div className="absolute inset-0 cinema-grain opacity-40" />
        {/* Top hairline amber accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 sm:w-[480px] h-[1px] bg-gradient-to-r from-transparent via-[#ff5500]/40 to-transparent" />
      </div>

      {/* Top Header */}
      <header
        className="sticky top-0 z-40 w-full transition-colors duration-150"
        style={{
          backgroundColor: `rgba(7, 8, 10, ${navSolidProgress})`,
          borderBottomColor: `rgba(255, 255, 255, ${0.08 * navSolidProgress})`,
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
          boxShadow:
            navSolidProgress > 0.4
              ? `0 4px 20px rgba(0, 0, 0, ${0.6 * navSolidProgress})`
              : "none",
        }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div
            className="flex flex-col select-none cursor-pointer group"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-[#ff5500] leading-none mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              The
            </span>
            <span className="text-xl sm:text-2xl font-poppins font-medium font-[500] tracking-tight text-white leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-zinc-200 transition-colors">
              Retro Talks
            </span>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAboutModal(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] text-xs font-inter font-medium text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
              <span>About</span>
            </button>
          </div>

        </div>
      </header>

      {/* Hero Section - Modern Editorial Masthead */}
      <section className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 pt-8 sm:pt-12 pb-6">
        <div className="w-full space-y-3 pb-8 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-[0.25em] text-[#ff5500] uppercase font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
            <span>Film Archive & Journal</span>
          </div>
          
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[2rem] xl:text-[2.35rem] 2xl:text-[2.65rem] font-bold tracking-tight text-white font-poppins leading-tight sm:whitespace-nowrap">
            I watch movies. Sometimes I have a lot to say about them.
          </h1>
          
          <p className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-2xl pt-1">
            Most of it is probably unnecessary. I’m writing it down anyway.
          </p>
        </div>
      </section>

      {/* Main Content: 2-Column Layout */}
      <main className="relative z-10 flex-grow w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-6">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-start">
          
          {/* Left Column: Widened Reviews List */}
          <div className="flex-grow min-w-0 w-full space-y-6">
            
            {/* Reviews Section Header */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-inter uppercase tracking-wider text-zinc-400">
                  Reviews
                </h2>
                <span className="text-xs font-inter text-zinc-600">({reviews.length})</span>
              </div>
            </div>

            {/* Widened Reviews Card List */}
            {reviews.length > 0 ? (
              <div className="space-y-6 sm:space-y-8">
                {reviews.map((rev) => (
                  <ReviewCard
                    key={rev.id}
                    review={rev}
                    onOpenReview={() => onOpenReview(rev.id)}
                    isAdmin={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#090b0e] border border-white/[0.06] rounded-3xl p-8 max-w-md mx-auto">
                <Film className="w-6 h-6 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-poppins font-bold text-white">No reviews published yet</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Check back soon for new reflections.
                </p>
              </div>
            )}

          </div>

          {/* Right Column: Avengers Doomsday Countdown & Upcoming Movies of the Month */}
          <div className="w-full lg:w-[330px] xl:w-[380px] flex-shrink-0 lg:sticky lg:top-20 space-y-6 lg:pt-[57px]">
            <AvengersCountdown onClick={() => setShowDoomsdayModal(true)} />
            <UpcomingMoviesSidebar
              onSelectUpcoming={(upcoming: UpcomingMovie) => {
                setSelectedMovie({
                  id: upcoming.id,
                  title: upcoming.title,
                  year: upcoming.releaseDate ? upcoming.releaseDate.split("-")[0] : null,
                  poster: upcoming.poster,
                  backdrop: upcoming.backdrop || null,
                  overview: upcoming.overview,
                  tmdbRating: upcoming.tmdbRating,
                });
              }}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-8 text-xs text-zinc-500 font-inter">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-zinc-400">The Retro Talks</span>

          <button
            onClick={() => setShowAboutModal(true)}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            About
          </button>
        </div>
      </footer>

      {/* Avengers: Doomsday Summary Modal */}
      <AvengersDoomsdayModal
        isOpen={showDoomsdayModal}
        onClose={() => setShowDoomsdayModal(false)}
      />

      {/* Upcoming Movie Preview Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          isAdmin={false}
        />
      )}

      {/* About Me Popup Card Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

    </div>
  );
};
