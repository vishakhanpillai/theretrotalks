import React, { useEffect, useState } from "react";
import { ArrowLeft, Heart, User, Film } from "lucide-react";
import type { Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { AboutModal } from "../components/AboutModal";
import { StarRating } from "../components/StarRating";

interface ReviewPageProps {
  reviewId: string;
  initialReview?: Review | null;
  onNavigateHome: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  reviewId,
  initialReview,
  onNavigateHome,
}) => {
  const [review, setReview] = useState<Review | null>(initialReview || null);
  const [loading, setLoading] = useState<boolean>(!initialReview);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [posterError, setPosterError] = useState<boolean>(false);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [reviewId]);

  // Fetch review from backend if not passed in or missing cast/crew
  useEffect(() => {
    if (initialReview && initialReview.id === reviewId) {
      setReview(initialReview);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/reviews/${reviewId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Review not found");
        return res.json();
      })
      .then((data: Review) => {
        setReview(data);
      })
      .catch((err) => {
        console.warn("Could not load review:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reviewId, initialReview]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col items-center justify-center font-poppins">
        <div className="flex flex-col items-center gap-3">
          <Film className="w-8 h-8 text-[#ff5500] animate-pulse" />
          <span className="text-xs font-mono text-zinc-500">Loading film review...</span>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col items-center justify-center p-6 font-poppins">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-white">Review Not Found</h2>
          <p className="text-sm text-zinc-400">
            This review could not be located or may have been removed from the archive.
          </p>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-sm text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Reviews</span>
          </button>
        </div>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl(review.backdrop, "original");
  const posterUrl = getPosterUrl(review.poster, "w500");

  const castList = review.cast || [];
  const crewList = review.crew || [];

  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Top Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-[#07080a]/80 backdrop-blur-xl transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 h-16 flex items-center justify-between">
          
          {/* Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#ff5500] group-hover:-translate-x-0.5 transition-transform" />
              <span>Reviews</span>
            </button>

            <span className="text-zinc-700 font-mono">/</span>

            <span className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-md">
              {review.title}
            </span>
          </div>

          {/* Right Action: About Me */}
          <button
            onClick={() => setShowAboutModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#ff5500]/40 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#ff5500]" />
            <span>About</span>
          </button>

        </div>
      </header>

      {/* Letterboxd-Style Full-Bleed Film Backdrop Banner */}
      <section className="relative w-full h-[320px] sm:h-[440px] md:h-[500px] overflow-hidden bg-[#0a0c10] mt-16">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={`${review.title} still`}
            className="w-full h-full object-cover filter contrast-105 brightness-90"
          />
        )}

        {/* Cinematic Vignette & Bottom Gradient Mask */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/65 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080a]/70 via-transparent to-[#07080a]/70 pointer-events-none" />
      </section>

      {/* Main Content Area: Poster Overlaps Backdrop */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-28 sm:-mt-44 md:-mt-52 flex-grow space-y-12">
        
        {/* Film Header Section: Poster on Left, Film Info & Review on Right */}
        <div className="flex flex-col sm:flex-row gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Film Poster & Fast Facts */}
          <div className="w-48 sm:w-56 md:w-64 flex-shrink-0 mx-auto sm:mx-0 space-y-5">
            
            {/* The Poster */}
            <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.12] shadow-[0_25px_60px_rgba(0,0,0,0.85)] bg-[#12151c]">
              {posterUrl && !posterError ? (
                <img
                  src={posterUrl}
                  alt={review.title}
                  onError={() => setPosterError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#101318]">
                  <Film className="w-8 h-8 text-zinc-600 mb-2" />
                  <span className="text-xs text-zinc-400 font-poppins">{review.title}</span>
                </div>
              )}
            </div>

            {/* Quick Metadata Box */}
            <div className="p-4 rounded-2xl bg-[#0b0d12] border border-white/[0.06] space-y-3 text-xs text-zinc-400 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <span className="text-zinc-500">Watched</span>
                <span className="text-zinc-200">{review.watchedDate}</span>
              </div>

              {review.year && (
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-zinc-500">Year</span>
                  <span className="text-zinc-200">{review.year}</span>
                </div>
              )}

              {review.director && (
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-zinc-500">Director</span>
                  <span className="text-white font-medium text-right truncate ml-2">
                    {review.director}
                  </span>
                </div>
              )}

              {review.genres && review.genres.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {review.genres.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-md bg-white/[0.03] text-zinc-400 border border-white/[0.06] text-[11px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Title, Rating, Written Review Critique */}
          <div className="flex-grow min-w-0 space-y-8 pt-2 sm:pt-6">
            
            {/* Title & Rating */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    {review.title}
                  </h1>
                  {review.year && (
                    <span className="text-xl sm:text-2xl font-mono text-zinc-500 font-normal">
                      {review.year}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base text-zinc-400">
                  Directed by <strong className="text-white font-medium">{review.director}</strong>
                </p>
              </div>

              {/* Star Rating & Favorite */}
              <div className="flex items-center gap-3 pt-1">
                <StarRating rating={review.rating} readonly size="md" />

                {review.isFavorite && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/30 text-xs font-mono ml-2">
                    <Heart className="w-3.5 h-3.5 fill-[#ff5500]" />
                    <span>Favorite</span>
                  </span>
                )}
              </div>
            </div>

            {/* The Review Essay / Critique */}
            <div className="space-y-4 pt-4 border-t border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>Review by Vishakhan Pillai V P</span>
                <span>{review.watchedDate}</span>
              </div>

              <div className="text-base sm:text-lg text-zinc-200 font-normal leading-[1.85] whitespace-pre-line">
                {review.review}
              </div>
            </div>

            {/* Cast Section */}
            {castList.length > 0 && (
              <section className="space-y-4 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Cast ({castList.length})
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {castList.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c0e14] border border-white/[0.06] hover:border-white/[0.15] transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.1] shadow-sm">
                        {member.picture ? (
                          <img
                            src={member.picture}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-[#151922]">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-medium text-white truncate leading-snug">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 font-mono truncate leading-snug mt-0.5">
                          {member.character || "Actor"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Key Creative Crew Section */}
            {crewList.length > 0 && (
              <section className="space-y-4 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Key Crew ({crewList.length})
                  </h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {crewList.map((member, idx) => (
                    <div
                      key={`${member.id}-${idx}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0c0e14] border border-white/[0.06] hover:border-white/[0.15] transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.1] shadow-sm">
                        {member.picture ? (
                          <img
                            src={member.picture}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-[#151922]">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-medium text-white truncate leading-snug">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-[#ff7a29] font-mono truncate leading-snug mt-0.5">
                          {member.job}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-10 text-center text-xs text-zinc-500 font-mono mt-20">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-300 font-bold font-poppins">The Retro Talks</span>
            <span className="text-zinc-600">— Curated by Vishakhan Pillai V P</span>
          </div>

          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#ff5500]" />
            <span>Return to All Reviews</span>
          </button>
        </div>
      </footer>

      {/* About Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

    </div>
  );
};
