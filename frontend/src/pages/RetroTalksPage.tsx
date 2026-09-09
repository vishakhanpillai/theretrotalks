import React, { useState, useEffect } from "react";
import {
  Film,
} from "lucide-react";
import type { Movie, Review, UpcomingMovie } from "../types";
import { ReviewCard } from "../components/ReviewCard";
import { MovieModal } from "../components/MovieModal";
import { AboutModal } from "../components/AboutModal";
import { UpcomingMoviesSidebar } from "../components/UpcomingMoviesSidebar";

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
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Top Header: same dynamic transparent-to-solid vibe as ReviewPage */}
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
            <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none font-poppins drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] group-hover:text-zinc-200 transition-colors">
              Retro Talks
            </span>
          </div>

        </div>
      </header>

      {/* Hero Header */}
      <section className="pt-14 pb-10 px-4 sm:px-6 lg:px-10 max-w-4xl mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-inter tracking-widest uppercase text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
          <span>Cinema Reflections & Film Archive</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white font-poppins">
          The Retro Talks
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto font-normal leading-relaxed">
          A personal film diary documenting cinema reflections, character studies, and honest critique by Vishakhan Pillai V P.
        </p>
      </section>

      {/* Main Content: 2-Column Layout */}
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-6">
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

          {/* Right Column: Upcoming Movies of the Month */}
          <div className="w-full lg:w-[330px] xl:w-[380px] flex-shrink-0 lg:sticky lg:top-24">
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
