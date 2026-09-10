import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Download,
  Star,
  Film,
  Check,
  Quote,
  Copy,
  Layout,
  Palette,
} from "lucide-react";
import { toPng } from "html-to-image";
import type { Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { slugify } from "../utils/slugify";
import { formatRating } from "../utils/formatRating";

interface StoryCardBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
}

type StoryTheme = "cinematic" | "poster_hero" | "editorial";

export const StoryCardBuilderModal: React.FC<StoryCardBuilderModalProps> = ({
  isOpen,
  onClose,
  review,
}) => {
  // Initial summary extracted from review or blank
  const getInitialSummary = (text: string) => {
    if (!text) return "";
    // Clean markdown
    const clean = text
      .replace(/\*\*|__|\*|_|~~|\|\|/g, "")
      .replace(/^>+\s*/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .trim();
    // Get first 1-2 punchy sentences (up to ~240 chars)
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    let draft = "";
    for (const s of sentences) {
      if ((draft + s).length <= 260) {
        draft += (draft ? " " : "") + s.trim();
      } else {
        break;
      }
    }
    return draft || clean.slice(0, 240);
  };

  const [summaryReview, setSummaryReview] = useState<string>("");
  const [rating, setRating] = useState<number>(review.rating);
  const [theme, setTheme] = useState<StoryTheme>("cinematic");
  const [headline, setHeadline] = useState<string>("Quick Reflection");
  const [showBadgeTag, setShowBadgeTag] = useState<boolean>(true);
  const [showFooterBrand, setShowFooterBrand] = useState<boolean>(true);
  const [backdropDim, setBackdropDim] = useState<number>(65); // 0 to 90% opacity of dark overlay
  const [backdropBlur, setBackdropBlur] = useState<number>(0); // blur px
  const [showPoster, setShowPoster] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [showGenres, setShowGenres] = useState<boolean>(true);

  // High-res preloaded image URLs (as base64 data URLs to eliminate CORS export blocks)
  const [posterDataUrl, setPosterDataUrl] = useState<string>("");
  const [backdropDataUrl, setBackdropDataUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Initialize summary and rating when modal opens
  useEffect(() => {
    if (isOpen) {
      setSummaryReview(getInitialSummary(review.review));
      setRating(review.rating);
      setTheme("cinematic");
      setHeadline("Quick Reflection");
      setShowBadgeTag(true);
      setShowFooterBrand(true);
      setBackdropDim(65);
      setBackdropBlur(0);
      setShowPoster(true);
      setShowWatermark(true);
      setShowGenres(true);
      setIsExporting(false);
    }
  }, [isOpen, review]);

  // Preload poster and backdrop through proxy as base64 for instant, lossless export
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const rawPoster = getPosterUrl(review.poster, "w500");
    const rawBackdrop = getBackdropUrl(review.backdrop, "original");

    const fetchAsDataUrl = async (url: string | null): Promise<string> => {
      if (!url) return "";
      try {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) return url;
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(url);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return url;
      }
    };

    if (rawPoster) {
      fetchAsDataUrl(rawPoster).then((data) => {
        if (isMounted) setPosterDataUrl(data);
      });
    }

    if (rawBackdrop) {
      fetchAsDataUrl(rawBackdrop).then((data) => {
        if (isMounted) setBackdropDataUrl(data);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, review]);

  // Export to 1080x1920 PNG
  const handleDownload = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);

    try {
      // 360px * 3 = 1080px width, 640px * 3 = 1920px height
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        quality: 0.98,
      });

      const filename = `retro-talks-${slugify(review.title) || "story"}-1080x1920.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating story card image:", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryReview);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  if (!isOpen) return null;

  // Formatting helpers
  const displayBackdrop = backdropDataUrl || getBackdropUrl(review.backdrop, "original");
  const displayPoster = posterDataUrl || getPosterUrl(review.poster, "w500");

  // Render true half-star with 50% clipping or full/empty star
  const renderStoryStar = (
    starIndex: number,
    currentRating: number,
    sizeClass = "w-3.5 h-3.5"
  ) => {
    const fullValue = starIndex + 1;
    const halfValue = starIndex + 0.5;
    const isFull = currentRating >= fullValue;
    const isHalf = !isFull && currentRating >= halfValue;

    if (isFull) {
      return (
        <Star
          key={starIndex}
          className={`${sizeClass} fill-[#ff5500] text-[#ff5500] shrink-0`}
        />
      );
    }
    if (isHalf) {
      return (
        <div
          key={starIndex}
          className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass}`}
        >
          {/* Background empty star */}
          <Star className={`${sizeClass} fill-white/10 text-white/20`} />
          {/* Left half filled with precision 50% width clip */}
          <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden pointer-events-none">
            <Star className={`${sizeClass} fill-[#ff5500] text-[#ff5500] max-w-none`} />
          </div>
        </div>
      );
    }
    return (
      <Star
        key={starIndex}
        className={`${sizeClass} fill-white/10 text-white/20 shrink-0`}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-6xl bg-[#090b0e] border border-white/[0.12] rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(255,85,0,0.15)] flex flex-col max-h-[96vh]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0f16]/90 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-poppins text-white">
                  Instagram Story Card Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-semibold uppercase">
                  9:16 · 1080×1920
                </span>
              </div>
              <p className="text-xs font-inter text-zinc-400 truncate max-w-md">
                Compose custom summary reviews and export high-res Instagram stories for {review.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Exporting 1080×1920..." : "Download Story PNG"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-[#ff5500] hover:text-black border border-white/10 text-zinc-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content: Dual Column Workspace */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
          
          {/* Left Column: Live 9:16 Story Card Viewport */}
          <div className="lg:w-[460px] xl:w-[500px] flex-shrink-0 bg-[#050608] p-4 sm:p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/[0.08] relative overflow-hidden">
            <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
              <span>Live 9:16 Preview (1080×1920 Output)</span>
            </div>

            {/* THE INSTAGRAM STORY CANVAS (Strict 9:16 Aspect Ratio: 360 x 640 displayed, exports at 3x: 1080 x 1920) */}
            <div
              ref={cardRef}
              style={{ width: "360px", height: "640px" }}
              className="relative rounded-[28px] overflow-hidden bg-[#07080a] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(255,85,0,0.15)] border border-white/[0.12] flex flex-col justify-between select-none"
            >
              {/* Full Bleed Backdrop Image Background */}
              {displayBackdrop && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                  <img
                    src={displayBackdrop}
                    alt={review.title}
                    crossOrigin="anonymous"
                    style={{
                      objectPosition: `center ${review.backdropFraming?.y ?? 0}%`,
                      filter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : "none",
                    }}
                    className="w-full h-full object-cover object-top scale-105"
                  />
                  {/* Backdrop Tint / Dimmer */}
                  <div
                    style={{ backgroundColor: `rgba(7, 8, 10, ${backdropDim / 100})` }}
                    className="absolute inset-0"
                  />
                  {/* Ambient cinema gradients */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07080a] via-[#07080a]/60 to-[#07080a]/40" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#07080a]/80 via-transparent to-[#07080a]" />
                </div>
              )}

              {/* -------------------- CARD CONTENT -------------------- */}

              {/* Top Header Watermark */}
              <div className="relative z-10 px-5 pt-5 pb-2 flex items-center justify-between">
                {showWatermark ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ff5500] shadow-[0_0_8px_#ff5500]" />
                    <span className="text-[11px] font-poppins font-semibold uppercase tracking-[0.2em] text-white/90">
                      The Retro Talks
                    </span>
                  </div>
                ) : (
                  <div />
                )}

                {showBadgeTag && headline.trim() ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono text-[#ff7a29] uppercase tracking-wider">
                    {headline}
                  </span>
                ) : (
                  <div />
                )}
              </div>

              {/* Center Content based on selected Theme */}
              {theme === "cinematic" && (
                <div className="relative z-10 px-5 flex flex-col items-center text-center space-y-3 flex-grow justify-center">
                  {/* Floating Poster */}
                  {showPoster && displayPoster && (
                    <div className="relative w-28 aspect-[2/3] rounded-xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(255,85,0,0.2)] border border-white/20">
                      <img
                        src={displayPoster}
                        alt={review.title}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Movie Title & Details */}
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold font-poppins text-white leading-tight drop-shadow-md">
                      {review.title}
                    </h2>
                    <p className="text-[11px] font-inter text-zinc-300">
                      {review.year && <span>{review.year} · </span>}
                      <span>Dir. {review.director}</span>
                    </p>
                  </div>

                  {/* Rating Stars (Stars Only) */}
                  <div className="flex items-center justify-center gap-1 py-0.5">
                    {[0, 1, 2, 3, 4].map((starIndex) =>
                      renderStoryStar(starIndex, rating, "w-4 h-4")
                    )}
                  </div>

                  {/* Summarized Review (Floating Pull-Quote - No Box) */}
                  <div className="w-full px-2 py-2 text-center relative flex flex-col items-center">
                    <Quote className="w-5 h-5 text-[#ff5500] opacity-85 mb-1.5 rotate-180 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]" />
                    <p className="text-[13px] font-inter italic text-white/95 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] line-clamp-6 max-w-[310px]">
                      {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                    </p>
                  </div>
                </div>
              )}

              {theme === "poster_hero" && (
                <div className="relative z-10 px-5 flex flex-col items-center text-center space-y-3.5 flex-grow justify-center">
                  {/* Larger Poster Hero */}
                  {showPoster && displayPoster && (
                    <div className="relative w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_30px_rgba(255,85,0,0.3)] border-2 border-white/25">
                      <img
                        src={displayPoster}
                        alt={review.title}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <h2 className="text-lg font-bold font-poppins text-white leading-tight drop-shadow-md">
                      {review.title}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-[10px] font-inter text-zinc-300">
                        {review.year} · {review.director}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      {[0, 1, 2, 3, 4].map((starIndex) =>
                        renderStoryStar(starIndex, rating, "w-3 h-3")
                      )}
                    </div>
                  </div>

                  {/* Summarized Review (Floating Quote - No Box) */}
                  <div className="w-full px-3 py-1.5 text-center flex flex-col items-center">
                    <p className="text-xs font-inter italic text-zinc-100 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.98)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)] line-clamp-5 max-w-[310px]">
                      {summaryReview ? `“${summaryReview}”` : "Write your summarized thoughts in the studio..."}
                    </p>
                  </div>
                </div>
              )}

              {theme === "editorial" && (
                <div className="relative z-10 px-5 flex flex-col space-y-3.5 flex-grow justify-center text-left">
                  {/* Top Poster + Info Row */}
                  <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/15 p-2.5 rounded-2xl">
                    {showPoster && displayPoster && (
                      <div className="relative w-14 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
                        <img
                          src={displayPoster}
                          alt={review.title}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-grow min-w-0">
                      <h2 className="text-base font-bold font-poppins text-white truncate">
                        {review.title}
                      </h2>
                      <p className="text-[10px] font-inter text-zinc-400">
                        {review.year} · Dir. {review.director}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[0, 1, 2, 3, 4].map((s) =>
                          renderStoryStar(s, rating, "w-3 h-3")
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summarized Review (Editorial Column Accent - No Box) */}
                  <div className="w-full pl-3.5 border-l-2 border-[#ff5500] py-1 my-1">
                    <div className="text-[9px] font-mono text-[#ff7a29] uppercase tracking-widest mb-1.5 font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                      Editorial Review
                    </div>
                    <p className="text-[13px] font-inter text-white/95 leading-relaxed italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] line-clamp-7">
                      {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Footer */}
              <div className="relative z-10 px-5 pb-5 pt-2 flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-md">
                {showFooterBrand ? (
                  <div className="flex items-center gap-1.5">
                    <Film className="w-3 h-3 text-[#ff5500]" />
                    <span className="text-[9px] font-inter text-zinc-400 tracking-wider uppercase font-medium">
                      theretrotalks.com
                    </span>
                  </div>
                ) : (
                  <div />
                )}

                {showGenres && review.genres && review.genres.length > 0 && (
                  <span className="text-[9px] font-mono text-zinc-400">
                    {review.genres.slice(0, 2).join(" · ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls Panel */}
          <div className="flex-grow p-6 overflow-y-auto space-y-6">
            
            {/* 1. Summarized Review Editor (Core requirement) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-[#ff5500]" />
                  Summarized Review (Story Text)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSummaryReview(getInitialSummary(review.review))}
                    className="text-[11px] font-inter text-[#ff7a29] hover:underline cursor-pointer"
                    title="Auto-extract punchy summary from the full review"
                  >
                    Auto-Extract Excerpt
                  </button>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="p-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy summary text"
                  >
                    {copiedNotification ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <textarea
                value={summaryReview}
                onChange={(e) => setSummaryReview(e.target.value)}
                placeholder="Write your personal summarized review for Instagram story..."
                rows={5}
                className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-2xl p-4 text-xs font-inter text-zinc-200 leading-relaxed outline-none transition-all placeholder-zinc-600 resize-none"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>Recommended: 120 - 240 characters</span>
                <span className={summaryReview.length > 260 ? "text-amber-400 font-bold" : ""}>
                  {summaryReview.length} chars
                </span>
              </div>
            </div>

            {/* 2. Rating & Headline Adjuster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Rating adjustment */}
              <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-2.5">
                <label className="text-xs font-semibold font-poppins text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#ff5500]" />
                    Story Card Rating
                  </span>
                  <span className="text-[#ff7a29] font-mono font-bold">
                    {formatRating(rating)} / 5
                  </span>
                </label>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-inter font-bold transition-all cursor-pointer border shrink-0 ${
                        Math.abs(rating - num) < 0.01
                          ? "bg-[#ff5500] text-black border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.4)]"
                          : "bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]"
                      }`}
                    >
                      {formatRating(num)}★
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline Badge */}
              <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                    <span>Badge Tag</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-inter text-zinc-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={showBadgeTag}
                      onChange={(e) => setShowBadgeTag(e.target.checked)}
                      className="accent-[#ff5500] w-3 h-3"
                    />
                    <span>Show Badge</span>
                  </label>
                </div>
                <input
                  type="text"
                  disabled={!showBadgeTag}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Quick Reflection, Verdict..."
                  className={`w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl px-3 py-1.5 text-xs font-inter text-white outline-none transition-opacity ${
                    !showBadgeTag ? "opacity-35 cursor-not-allowed" : ""
                  }`}
                />
              </div>

            </div>

            {/* 3. Theme & Layout Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-[#ff5500]" />
                Card Layout Preset
              </label>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "cinematic", title: "Cinematic Glass", desc: "Balanced floating poster & review quote" },
                  { id: "poster_hero", title: "Poster Hero", desc: "Large hero poster with floating quote" },
                  { id: "editorial", title: "Editorial Journal", desc: "Compact poster with editorial column" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id as StoryTheme)}
                    className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      theme === t.id
                        ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_20px_rgba(255,85,0,0.25)]"
                        : "bg-[#0c0f16] border-white/[0.07] hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold font-poppins text-white">{t.title}</div>
                    <div className="text-[10px] font-inter text-zinc-400 mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Backdrop Ambiance Controls */}
            <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-4">
              <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#ff5500]" />
                Backdrop Ambiance & Visibility
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Backdrop Dim */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-inter text-zinc-400">
                    <span>Backdrop Darken (Contrast)</span>
                    <span className="font-mono text-[#ff7a29]">{backdropDim}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    value={backdropDim}
                    onChange={(e) => setBackdropDim(Number(e.target.value))}
                    className="w-full accent-[#ff5500] cursor-pointer bg-zinc-800 h-1.5 rounded-lg"
                  />
                </div>

                {/* Backdrop Blur */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-inter text-zinc-400">
                    <span>Backdrop Soft Blur</span>
                    <span className="font-mono text-[#ff7a29]">{backdropBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={backdropBlur}
                    onChange={(e) => setBackdropBlur(Number(e.target.value))}
                    className="w-full accent-[#ff5500] cursor-pointer bg-zinc-800 h-1.5 rounded-lg"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-white/[0.05] text-xs font-inter text-zinc-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPoster}
                    onChange={(e) => setShowPoster(e.target.checked)}
                    className="accent-[#ff5500] w-3.5 h-3.5"
                  />
                  <span>Show Poster</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBadgeTag}
                    onChange={(e) => setShowBadgeTag(e.target.checked)}
                    className="accent-[#ff5500] w-3.5 h-3.5"
                  />
                  <span>Badge Tag</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showFooterBrand}
                    onChange={(e) => setShowFooterBrand(e.target.checked)}
                    className="accent-[#ff5500] w-3.5 h-3.5"
                  />
                  <span>theretrotalks.com</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="accent-[#ff5500] w-3.5 h-3.5"
                  />
                  <span>Top Logo</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGenres}
                    onChange={(e) => setShowGenres(e.target.checked)}
                    className="accent-[#ff5500] w-3.5 h-3.5"
                  />
                  <span>Genres</span>
                </label>
              </div>
            </div>

            {/* 5. Download Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ff5500]/10 via-[#ff5500]/5 to-transparent border border-[#ff5500]/25 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold font-poppins text-white">
                  Ready to Post on Instagram?
                </h4>
                <p className="text-[11px] font-inter text-zinc-300 mt-0.5">
                  Exports a crystal-clear 1080×1920 PNG file formatted to Instagram Story dimensions.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? "Exporting..." : "Download PNG"}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
