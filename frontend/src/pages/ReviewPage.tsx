import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Heart, User, Film, Image as ImageIcon } from "lucide-react";
import type { Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { AboutModal } from "../components/AboutModal";
import { StarRating } from "../components/StarRating";
import { PosterSelectorModal } from "../components/PosterSelectorModal";
import { BackdropSelectorModal } from "../components/BackdropSelectorModal";
import { FormattedReviewText } from "../components/FormattedReviewText";

interface ReviewPageProps {
  reviewId: string;
  initialReview?: Review | null;
  isAdmin?: boolean;
  onNavigateHome: () => void;
  onUpdatePoster?: (reviewId: string | number, newPosterUrl: string) => Promise<void> | void;
  onUpdateBackdrop?: (reviewId: string | number, newBackdropUrl: string) => Promise<void> | void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({
  reviewId,
  initialReview,
  isAdmin = false,
  onNavigateHome,
  onUpdatePoster,
  onUpdateBackdrop,
}) => {
  const [review, setReview] = useState<Review | null>(initialReview || null);
  const [loading, setLoading] = useState<boolean>(!initialReview);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);
  const [showBackdropModal, setShowBackdropModal] = useState<boolean>(false);
  const [posterError, setPosterError] = useState<boolean>(false);
  const [creditsTab, setCreditsTab] = useState<'cast' | 'crew'>('cast');
  const [headerOpacity, setHeaderOpacity] = useState<number>(0);
  const [navSolidProgress, setNavSolidProgress] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);

  // Progressive scroll interpolation for top nav transparency and sticky review header
  useEffect(() => {
    const handleScroll = () => {
      // 1. Top Navbar transition: fully transparent at top, solid #07080a as user scrolls down
      const currentScrollY = window.scrollY;
      const solidThreshold = 90;
      const progress = Math.min(1, Math.max(0, currentScrollY / solidThreshold));
      setNavSolidProgress(Math.round(progress * 100) / 100);

      // 2. Sticky review header fade
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        const stickPoint = 64; // Sticky at top-16 (64px)
        const fadeStart = 134; // Begin gradual fade 70px before sticking
        
        let target = 0;
        if (rect.top <= stickPoint) {
          target = 1;
        } else if (rect.top >= fadeStart) {
          target = 0;
        } else {
          // Smooth progressive opacity directly linked to user's scroll speed
          target = Math.round(((fadeStart - rect.top) / (fadeStart - stickPoint)) * 100) / 100;
        }

        setHeaderOpacity((prev) => (prev !== target ? target : prev));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [reviewId]);

  // Fetch review from backend (always loads freshest data including cast & prioritized crew)
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/reviews/${reviewId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Review not found");
        return res.json();
      })
      .then((data: Review) => {
        if (isMounted) {
          setReview(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn("Could not load review:", err);
        if (isMounted) {
          if (!review && !initialReview) {
            setLoading(false);
          }
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reviewId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col items-center justify-center font-poppins">
        <div className="flex flex-col items-center gap-3">
          <Film className="w-8 h-8 text-[#ff5500] animate-pulse" />
          <span className="text-xs font-inter text-zinc-500">Loading film review...</span>
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
      
      {/* Top Header Navigation: fully transparent at top, solid site color (#07080a) as user scrolls down */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-colors duration-150"
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
          
          {/* Back Button (Only necessary button) */}
          <div className="flex items-center">
            <button
              onClick={onNavigateHome}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-inter transition-all group cursor-pointer ${
                navSolidProgress < 0.4
                  ? "bg-black/45 hover:bg-black/70 border border-white/20 hover:border-white/40 backdrop-blur-md text-white shadow-lg"
                  : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-zinc-300 hover:text-white"
              }`}
              title="Return to all reviews"
            >
              <ArrowLeft className="w-4 h-4 text-[#ff5500] group-hover:-translate-x-0.5 transition-transform" />
              <span>Reviews</span>
            </button>
          </div>

          {/* Right Action: Admin Indicator */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="px-2.5 py-1 rounded-md bg-[#ff5500]/20 text-[#ff7a29] border border-[#ff5500]/35 text-[10px] font-inter uppercase tracking-wider backdrop-blur-md shadow-sm">
                Admin Mode
              </span>
            )}
          </div>

        </div>
      </header>

      {/* Full-Bleed Film Backdrop Banner (Fills screen edge-to-edge, spacious & uncropped) */}
      <section className="relative w-full h-[55vh] sm:h-[62vh] md:h-[70vh] lg:h-[74vh] min-h-[420px] sm:min-h-[480px] lg:min-h-[560px] max-h-[760px] overflow-hidden bg-[#07080a] mt-0">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={`${review.title} still`}
            className="w-full h-full object-cover object-center filter contrast-[1.02] brightness-[0.98]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#0d1017] text-zinc-600">
            <Film className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-xs font-inter text-zinc-500">No backdrop available</span>
          </div>
        )}

        {/* Soft Lateral Edge Vignettes: Gentle feathering so edges dissolve naturally without obscuring subjects */}
        <div className="absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-[#07080a]/40 to-transparent pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-[#07080a]/40 to-transparent pointer-events-none" />

        {/* Cinematic Bottom Fade Mask: Clean dissolve into content area */}
        <div className="absolute inset-x-0 bottom-0 h-40 sm:h-52 md:h-64 bg-gradient-to-t from-[#07080a] via-[#07080a]/65 to-transparent pointer-events-none" />

        {/* Admin Change Backdrop Button */}
        {isAdmin && review.tmdbId && (
          <div className="absolute top-20 right-4 sm:right-6 lg:right-10 xl:right-14 z-20">
            <button
              onClick={() => setShowBackdropModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/80 hover:bg-[#ff5500] text-white hover:text-black border border-white/20 hover:border-[#ff5500] text-xs font-inter backdrop-blur-md transition-all shadow-xl cursor-pointer"
              title="Change review backdrop artwork from TMDB"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Change Backdrop</span>
            </button>
          </div>
        )}
      </section>

      {/* Main Content Area: Shifted upwards so the entire poster is visible immediately on load */}
      <main className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 -mt-28 sm:-mt-36 md:-mt-48 lg:-mt-52 xl:-mt-60 pb-20 flex-grow">
        
        {/* Full-width Responsive 3-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 items-start">
          
          {/* ======================================================== */}
          {/* LEFT SIDEBAR: Poster & Metadata (Sticky)                 */}
          {/* ======================================================== */}
          <div className="w-full lg:w-64 xl:w-72 flex-shrink-0 space-y-5 lg:sticky lg:top-20">
            
            {/* The Poster */}
            <div className="relative group">
              <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/[0.12] shadow-[0_25px_60px_rgba(0,0,0,0.85)] bg-[#12151c]">
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

              {/* Admin Change Poster Button */}
              {isAdmin && review.tmdbId && (
                <button
                  onClick={() => setShowPosterModal(true)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b0d12] hover:bg-[#ff5500] hover:text-black border border-white/[0.08] hover:border-[#ff5500] text-xs font-inter text-zinc-300 transition-all cursor-pointer shadow-md"
                  title="Change poster artwork from TMDB"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Change Poster</span>
                </button>
              )}
            </div>

            {/* Quick Metadata Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.06] space-y-3 text-xs text-zinc-400 font-inter shadow-xl">
              <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                <span className="text-zinc-500">Watched</span>
                <span className="text-zinc-200 font-medium">{review.watchedDate}</span>
              </div>

              {review.year && (
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
                  <span className="text-zinc-500">Year</span>
                  <span className="text-zinc-200 font-medium">{review.year}</span>
                </div>
              )}

              {review.director && (
                <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
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

          {/* ======================================================== */}
          {/* CENTER MAIN SECTION: Sticky Review Header & Critique     */}
          {/* ======================================================== */}
          <div className="flex-grow min-w-0 w-full space-y-5 pt-1 sm:pt-2 lg:pt-3">
            
            {/* Sticky Review Header: Movie Title, Year, Director, Rating, Byline & Date */}
            <div
              ref={headerRef}
              className="sticky top-16 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6"
            >
              {/* Top fill bridging to navbar */}
              <div
                className="absolute -top-16 inset-x-0 h-16 bg-[#07080a] pointer-events-none"
                style={{ opacity: headerOpacity }}
              />

              {/* Solid background mask matching page color */}
              <div
                className="absolute inset-0 bg-[#07080a] pointer-events-none"
                style={{ opacity: headerOpacity }}
              />

              {/* Feather-soft multi-stop bottom fade gradient (barely noticeable, optical dissolve) */}
              <div
                className="absolute -bottom-10 sm:-bottom-12 inset-x-0 h-10 sm:h-12 bg-gradient-to-b from-[#07080a] via-[#07080a]/75 via-[#07080a]/25 to-transparent pointer-events-none"
                style={{ opacity: headerOpacity }}
              />

              {/* Header Content with constant padding and smooth transitions */}
              <div className="relative z-10 py-3 space-y-3">
                {/* Movie Title & Year */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium font-poppins text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      {review.title}
                    </h1>
                    {review.year && (
                      <span className="text-xl sm:text-2xl md:text-3xl font-inter text-zinc-300 font-normal drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                        {review.year}
                      </span>
                    )}
                  </div>

                  {/* Directed by */}
                  <p className="text-sm sm:text-base md:text-lg text-zinc-200 font-normal drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                    Directed by <strong className="text-white font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{review.director}</strong>
                  </p>
                </div>

                {/* Star Rating & Favorite (Same position as older one) */}
                <div className="flex items-center gap-3 pt-1">
                  <StarRating
                    rating={review.rating}
                    readonly
                    size="md"
                    valueClassName="text-base sm:text-lg min-w-[3.5rem]"
                  />

                  {review.isFavorite && (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] border border-[#ff5500]/30 text-xs font-inter ml-2 shadow-sm">
                      <Heart className="w-3.5 h-3.5 fill-[#ff5500]" />
                      <span>Favorite</span>
                    </span>
                  )}
                </div>

                {/* Review by Vishakhan Pillai V P · Date */}
                <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-300 font-inter drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] pt-3 border-t border-white/[0.08]">
                  <span>Review by Vishakhan Pillai V P</span>
                  <span>{review.watchedDate}</span>
                </div>
              </div>
            </div>

            {/* The Review Critique Essay (Rich markdown typography) */}
            <div className="pt-2">
              <FormattedReviewText
                content={review.review}
                className="font-poppins text-justify selection:bg-[#ff5500] selection:text-black w-full"
              />
            </div>

          </div>

          {/* ======================================================== */}
          {/* RIGHT SIDEBAR: Cast & Crew Single Box with Filter Tabs   */}
          {/* ======================================================== */}
          {(castList.length > 0 || crewList.length > 0) && (
            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:sticky lg:top-20 mt-28 sm:mt-36 md:mt-48 lg:mt-52 xl:mt-60">
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.06] space-y-4 font-poppins shadow-xl">
                
                {/* Editorial Hairline Tabs: Cast / Crew */}
                <div className="flex items-center gap-7 pb-3 border-b border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setCreditsTab("cast")}
                    className={`relative pb-1 text-xs uppercase tracking-[0.2em] font-inter transition-colors cursor-pointer ${
                      creditsTab === "cast"
                        ? "text-white font-semibold"
                        : "text-zinc-500 hover:text-zinc-300 font-normal"
                    }`}
                  >
                    Cast
                    {creditsTab === "cast" && (
                      <span className="absolute -bottom-3 inset-x-0 h-[2px] bg-[#ff5500] rounded-full shadow-[0_0_8px_rgba(255,85,0,0.6)]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditsTab("crew")}
                    className={`relative pb-1 text-xs uppercase tracking-[0.2em] font-inter transition-colors cursor-pointer ${
                      creditsTab === "crew"
                        ? "text-white font-semibold"
                        : "text-zinc-500 hover:text-zinc-300 font-normal"
                    }`}
                  >
                    Crew
                    {creditsTab === "crew" && (
                      <span className="absolute -bottom-3 inset-x-0 h-[2px] bg-[#ff5500] rounded-full shadow-[0_0_8px_rgba(255,85,0,0.6)]" />
                    )}
                  </button>
                </div>

                {/* Cast List (when creditsTab === 'cast') */}
                {creditsTab === "cast" && castList.length > 0 && (
                  <div className="space-y-2">
                    {castList.slice(0, 10).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.1] shadow-sm">
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
                          <p className="text-xs font-semibold text-white truncate leading-tight">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 font-inter truncate leading-tight mt-0.5">
                            {member.character || "Actor"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Crew List (when creditsTab === 'crew') */}
                {creditsTab === "crew" && crewList.length > 0 && (
                  <div className="space-y-2">
                    {crewList.slice(0, 10).map((member, idx) => (
                      <div
                        key={`${member.id}-${idx}`}
                        className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.1] shadow-sm">
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
                          <p className="text-xs font-semibold text-white truncate leading-tight">
                            {member.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 font-inter truncate leading-tight mt-0.5">
                            {member.job}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-8 text-xs text-zinc-500 font-inter mt-20">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-zinc-400">The Retro Talks</span>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowAboutModal(true)}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>Return to All Reviews</span>
            </button>
          </div>
        </div>
      </footer>

      {/* About Modal */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* Poster Selector Modal */}
      {review.tmdbId && (
        <PosterSelectorModal
          movieId={review.tmdbId}
          movieTitle={review.title}
          currentPosterUrl={review.poster}
          isOpen={showPosterModal}
          onSelectPoster={async (newPosterUrl) => {
            if (onUpdatePoster) {
              await onUpdatePoster(review.id, newPosterUrl);
            }
            setReview((prev) => (prev ? { ...prev, poster: newPosterUrl } : null));
            setShowPosterModal(false);
          }}
          onClose={() => setShowPosterModal(false)}
        />
      )}

      {/* Backdrop Selector Modal */}
      {review.tmdbId && (
        <BackdropSelectorModal
          movieId={review.tmdbId}
          movieTitle={review.title}
          currentBackdropUrl={review.backdrop}
          isOpen={showBackdropModal}
          onSelectBackdrop={async (newBackdropUrl) => {
            if (onUpdateBackdrop) {
              await onUpdateBackdrop(review.id, newBackdropUrl);
            }
            setReview((prev) => (prev ? { ...prev, backdrop: newBackdropUrl } : null));
            setShowBackdropModal(false);
          }}
          onClose={() => setShowBackdropModal(false)}
        />
      )}

    </div>
  );
};
