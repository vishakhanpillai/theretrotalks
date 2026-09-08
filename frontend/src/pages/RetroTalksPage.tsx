import React, { useState, useEffect } from "react";
import {
  Film,
  Star,
  Heart,
  User,
  Sparkles,
} from "lucide-react";
import type { Movie, Review, UpcomingMovie } from "../types";
import { ReviewCard } from "../components/ReviewCard";
import { ReviewModal } from "../components/ReviewModal";
import { MovieModal } from "../components/MovieModal";
import { AboutModal } from "../components/AboutModal";
import { UpcomingMoviesSidebar } from "../components/UpcomingMoviesSidebar";

interface RetroTalksPageProps {
  reviews: Review[];
}

export const RetroTalksPage: React.FC<RetroTalksPageProps> = ({
  reviews,
}) => {
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites" | "top">("all");

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === "favorites") return r.isFavorite;
    if (activeFilter === "top") return r.rating >= 5.0;
    return true;
  });

  const totalWatched = reviews.length;
  const avgRating =
    totalWatched > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalWatched).toFixed(1)
      : "0.0";
  const favoritesCount = reviews.filter((r) => r.isFavorite).length;

  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Sticky Full-Width Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-20 flex items-center justify-between">
          
          {/* Logo: 'The' on top, 'Retro Talks' on bottom */}
          <div className="flex flex-col select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#ff5500] leading-none mb-1">
              The
            </span>
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-none font-poppins">
              Retro Talks
            </span>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-3">
            
            {/* Review Count Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
              <span className="text-white font-medium">{reviews.length}</span>
              <span className="hidden sm:inline text-zinc-500">Reviews Logged</span>
            </div>

            {/* About Me Button (Opens Modal Card) */}
            <button
              onClick={() => setShowAboutModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#ff5500]/40 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <User className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>About Me</span>
            </button>

          </div>

        </div>
      </header>

      {/* Hero Header */}
      <section className="pt-10 pb-6 px-4 sm:px-6 lg:px-10 max-w-4xl mx-auto w-full text-center">
        <div className="space-y-4">
          
          <div className="flex flex-col items-center justify-center">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-[#ff5500] mb-1">
              Personal Cinema Diary
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase font-poppins">
              THE RETRO TALKS
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto font-normal">
            Personal film diary, reflections, and movie critique archive by Vishakhan Pillai V P.
          </p>

          {/* Quick Stats Strip */}
          <div className="pt-4 flex items-center justify-center gap-3 sm:gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 bg-[#0e1117] px-3.5 py-1.5 rounded-full border border-white/[0.06]">
              <Film className="w-3.5 h-3.5 text-[#ff5500]" />
              <span className="font-semibold text-white">{totalWatched}</span>
              <span className="text-zinc-500 font-mono">Films Logged</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0e1117] px-3.5 py-1.5 rounded-full border border-white/[0.06]">
              <Star className="w-3.5 h-3.5 fill-[#ff5500] text-[#ff5500]" />
              <span className="font-semibold text-white">{avgRating}</span>
              <span className="text-zinc-500 font-mono">Avg Score</span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#0e1117] px-3.5 py-1.5 rounded-full border border-white/[0.06]">
              <Heart className="w-3.5 h-3.5 fill-[#ff5500] text-[#ff5500]" />
              <span className="font-semibold text-white">{favoritesCount}</span>
              <span className="text-zinc-500 font-mono">Favorites</span>
            </div>
          </div>

        </div>
      </section>

      {/* Main Full-Width Content: 2-Column Responsive Layout */}
      <main className="flex-grow w-full px-4 sm:px-6 lg:px-10 xl:px-14 py-6">
        
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-start">
          
          {/* Left Column: Reviews Gallery (Takes the full primary width) */}
          <div className="flex-grow min-w-0 w-full space-y-6">
            
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-medium text-zinc-300">
                Personal Reviews <span className="text-zinc-500">({filteredReviews.length})</span>
              </h2>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 bg-[#0e1117] p-1 rounded-lg border border-white/[0.06]">
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                    activeFilter === "all"
                      ? "bg-[#ff5500] text-black font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All
                </button>

                <button
                  onClick={() => setActiveFilter("favorites")}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                    activeFilter === "favorites"
                      ? "bg-[#ff5500] text-black font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Heart className="w-3 h-3" />
                  <span>Favorites</span>
                </button>

                <button
                  onClick={() => setActiveFilter("top")}
                  className={`flex items-center gap-1 px-3 py-1 text-xs rounded-md transition-all cursor-pointer ${
                    activeFilter === "top"
                      ? "bg-[#ff5500] text-black font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>5 Stars</span>
                </button>
              </div>
            </div>

            {/* Expansive Wider Reviews Grid */}
            {filteredReviews.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {filteredReviews.map((rev) => (
                  <ReviewCard
                    key={rev.id}
                    review={rev}
                    onOpenReview={(r) => setSelectedReview(r)}
                    isAdmin={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#090b0e] border border-white/[0.06] rounded-3xl p-8 max-w-md mx-auto">
                <Sparkles className="w-8 h-8 text-[#ff5500] mx-auto mb-3" />
                <h3 className="text-base font-poppins font-bold text-white">No reviews in this category</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Check back soon for new movie reviews.
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

      {/* Footer (Full Width, strictly visitor-facing) */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-8 text-center text-xs text-zinc-500">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff5500]" />
            <span className="text-zinc-300 font-bold font-poppins">The Retro Talks</span>
          </div>

        </div>
      </footer>

      {/* Review Modal (Public Reader Only) */}
      <ReviewModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        isAdmin={false}
      />

      {/* Upcoming Movie Preview Modal (Public Reader Only) */}
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
