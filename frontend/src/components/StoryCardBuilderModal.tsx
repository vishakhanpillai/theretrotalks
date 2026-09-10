import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Image as ImageIcon,
  Crop,
  Layers,
  ChevronLeft,
  ChevronRight,
  Archive,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import type { Review, BackdropFraming } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { slugify } from "../utils/slugify";
import { PosterSelectorModal } from "./PosterSelectorModal";
import { BackdropSelectorModal } from "./BackdropSelectorModal";
import { FormattedReviewText } from "./FormattedReviewText";

interface StoryCardBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
  onUpdatePoster?: (reviewId: string | number, newPosterUrl: string) => Promise<void> | void;
  onUpdateBackdrop?: (reviewId: string | number, newBackdropUrl: string) => Promise<void> | void;
  onUpdateBackdropFraming?: (reviewId: string | number, newFraming: BackdropFraming) => Promise<void> | void;
}

type StoryTheme = "cinematic" | "poster_hero" | "editorial";
type StudioMode = "summary" | "full_set";

/**
 * Split a full review into readable story slide chunks for 9:16 vertical cards.
 * Balances content across slides evenly so no slide is left with an orphan paragraph or empty space.
 */
const splitReviewIntoSlides = (
  text: string,
  density: "dense" | "standard" | "spacious" = "dense"
): string[] => {
  if (!text) return [""];

  // 1. If user used explicit --- slide dividers, respect them exactly
  if (text.includes("---")) {
    const manualParts = text
      .split(/\n\s*---\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (manualParts.length > 0) return manualParts;
  }

  const trimmed = text.trim();
  const maxChunk = density === "dense" ? 1350 : density === "spacious" ? 800 : 1050;

  // 2. If the review fits on 1 slide (with 5% tolerance), keep it on 1 slide
  if (trimmed.length <= maxChunk * 1.05) {
    return [trimmed];
  }

  // 3. Continuous text flow packing with paragraph preservation
  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const slides: string[] = [];
  let current = "";

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const p = paragraphs[pIdx];
    const sep = current ? "\n\n" : "";
    const candidate = current ? current + sep + p : p;

    // A. If whole paragraph fits into current slide (with 3% tolerance), keep paragraph intact & flow text
    if (candidate.length <= maxChunk * 1.03) {
      current = candidate;
      continue;
    }

    // B. If current slide is already well-filled (>= 60% of capacity) and the paragraph fits on its own slide,
    // push current slide so the paragraph stays whole without being chopped in half.
    if (current.length >= maxChunk * 0.60 && p.length <= maxChunk * 1.03) {
      slides.push(current.trim());
      current = p;
      continue;
    }

    // C. Otherwise, current slide still has room below, or the paragraph is huge:
    // Flow sentences from p into current slide to fill up the available space!
    const sents = p.match(/[^.!?]+[.!?]+(\s+|$)|[^\n]+/g) || [p];
    let isFirstSent = true;

    for (let sIdx = 0; sIdx < sents.length; sIdx++) {
      const s = sents[sIdx].trim();
      if (!s) continue;

      const sSep = current ? (isFirstSent ? "\n\n" : " ") : "";
      const sCand = current ? current + sSep + s : s;

      if (sCand.length <= maxChunk) {
        current = sCand;
        isFirstSent = false;
      } else {
        if (current.trim()) {
          slides.push(current.trim());
        }
        current = s;
        isFirstSent = false;
      }
    }
  }

  if (current.trim()) {
    slides.push(current.trim());
  }

  return slides.length > 0 ? slides : [trimmed];
};

export const StoryCardBuilderModal: React.FC<StoryCardBuilderModalProps> = ({
  isOpen,
  onClose,
  review,
  onUpdatePoster,
  onUpdateBackdrop,
  onUpdateBackdropFraming,
}) => {
  // Initial summary extracted from review or blank
  const getInitialSummary = (text: string) => {
    if (!text) return "";
    const clean = text
      .replace(/\*\*|__|\*|_|~~|\|\|/g, "")
      .replace(/^>+\s*/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .trim();
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

  // Studio Mode: "summary" (Single 9:16 Story Card) or "full_set" (Multi-Slide Full Review Story Set)
  const [studioMode, setStudioMode] = useState<StudioMode>("summary");

  // Summary review text (for Quick Story Card)
  const [summaryReview, setSummaryReview] = useState<string>("");

  // Full review text & slide index (for Full Review Story Set)
  const [fullReviewText, setFullReviewText] = useState<string>(review.review || "");
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Active Artwork
  const [currentPoster, setCurrentPoster] = useState<string | null>(review.poster);
  const [currentBackdrop, setCurrentBackdrop] = useState<string | null>(review.backdrop);
  const [showPosterSelector, setShowPosterSelector] = useState<boolean>(false);
  const [showBackdropSelector, setShowBackdropSelector] = useState<boolean>(false);

  // Backdrop Crop & Framing State
  const [backdropCropX, setBackdropCropX] = useState<number>(review.backdropFraming?.x ?? 50);
  const [backdropCropY, setBackdropCropY] = useState<number>(review.backdropFraming?.y ?? 0);
  const [backdropZoom, setBackdropZoom] = useState<number>(review.backdropFraming?.zoom ?? 100);
  const [isCroppingBackdrop, setIsCroppingBackdrop] = useState<boolean>(false);
  const [isSavingFraming, setIsSavingFraming] = useState<boolean>(false);
  const [framingSavedSuccess, setFramingSavedSuccess] = useState<boolean>(false);

  // Styling & Toggles
  const [textDensity, setTextDensity] = useState<"dense" | "standard" | "spacious">("dense");
  const [rating, setRating] = useState<number>(review.rating);
  const [theme, setTheme] = useState<StoryTheme>("cinematic");
  const [headline, setHeadline] = useState<string>("Quick Reflection");
  const [showBadgeTag, setShowBadgeTag] = useState<boolean>(true);
  const [showFooterBrand, setShowFooterBrand] = useState<boolean>(true);
  const [backdropDim, setBackdropDim] = useState<number>(65);
  const [backdropBlur, setBackdropBlur] = useState<number>(0);
  const [showPoster, setShowPoster] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [showGenres, setShowGenres] = useState<boolean>(true);

  // High-res preloaded image URLs (as base64 data URLs to eliminate CORS export blocks)
  const [posterDataUrl, setPosterDataUrl] = useState<string>("");
  const [backdropDataUrl, setBackdropDataUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>("");
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Drag-to-reposition logic for Backdrop Crop Mode
  const isDraggingBackdrop = useRef(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number }>({
    clientX: 0,
    clientY: 0,
    startX: 50,
    startY: 0,
  });

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (!isCroppingBackdrop) return;
    e.preventDefault();
    isDraggingBackdrop.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: backdropCropX,
      startY: backdropCropY,
    };
  };

  const handleBackdropMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingBackdrop.current || !cardRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;
    const cardWidth = cardRef.current.clientWidth || 360;
    const cardHeight = cardRef.current.clientHeight || 640;

    const newX = Math.min(100, Math.max(0, Math.round(dragStartRef.current.startX - (deltaX / cardWidth) * 100)));
    const newY = Math.min(100, Math.max(0, Math.round(dragStartRef.current.startY - (deltaY / cardHeight) * 100)));

    setBackdropCropX(newX);
    setBackdropCropY(newY);
  }, []);

  const handleBackdropMouseUp = useCallback(() => {
    isDraggingBackdrop.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleBackdropMouseMove);
    window.addEventListener("mouseup", handleBackdropMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleBackdropMouseMove);
      window.removeEventListener("mouseup", handleBackdropMouseUp);
    };
  }, [handleBackdropMouseMove, handleBackdropMouseUp]);

  const handleBackdropTouchStart = (e: React.TouchEvent) => {
    if (!isCroppingBackdrop || e.touches.length !== 1) return;
    isDraggingBackdrop.current = true;
    dragStartRef.current = {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      startX: backdropCropX,
      startY: backdropCropY,
    };
  };

  const handleBackdropTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingBackdrop.current || !cardRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStartRef.current.clientX;
    const deltaY = e.touches[0].clientY - dragStartRef.current.clientY;
    const cardWidth = cardRef.current.clientWidth || 360;
    const cardHeight = cardRef.current.clientHeight || 640;

    const newX = Math.min(100, Math.max(0, Math.round(dragStartRef.current.startX - (deltaX / cardWidth) * 100)));
    const newY = Math.min(100, Math.max(0, Math.round(dragStartRef.current.startY - (deltaY / cardHeight) * 100)));

    setBackdropCropX(newX);
    setBackdropCropY(newY);
  };

  const handleBackdropTouchEnd = () => {
    isDraggingBackdrop.current = false;
  };

  const handleSaveFraming = async () => {
    if (!onUpdateBackdropFraming) return;
    setIsSavingFraming(true);
    try {
      const newFraming: BackdropFraming = {
        y: backdropCropY,
        x: backdropCropX,
        height: review.backdropFraming?.height ?? 70,
        zoom: backdropZoom,
      };
      await onUpdateBackdropFraming(review.id, newFraming);
      setFramingSavedSuccess(true);
      setTimeout(() => setFramingSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to save backdrop framing:", err);
    } finally {
      setIsSavingFraming(false);
    }
  };

  // Initialize summary, text and rating when modal opens
  useEffect(() => {
    if (isOpen) {
      setSummaryReview(getInitialSummary(review.review));
      setFullReviewText(review.review || "");
      setCurrentSlideIndex(0);
      setStudioMode("summary");
      setCurrentPoster(review.poster);
      setCurrentBackdrop(review.backdrop);
      setBackdropCropX(review.backdropFraming?.x ?? 50);
      setBackdropCropY(review.backdropFraming?.y ?? 0);
      setBackdropZoom(review.backdropFraming?.zoom ?? 100);
      setIsCroppingBackdrop(false);
      setIsSavingFraming(false);
      setFramingSavedSuccess(false);
      setTextDensity("dense");
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
      setExportProgress("");
    }
  }, [isOpen, review.id]);

  // Preload poster and backdrop through proxy as base64 for instant, lossless export
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const rawPoster = getPosterUrl(currentPoster, "w500");
    const rawBackdrop = getBackdropUrl(currentBackdrop, "original");

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
    } else {
      setPosterDataUrl("");
    }

    if (rawBackdrop) {
      fetchAsDataUrl(rawBackdrop).then((data) => {
        if (isMounted) setBackdropDataUrl(data);
      });
    } else {
      setBackdropDataUrl("");
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentPoster, currentBackdrop]);

  // Derived slide list for full review set based on selected text density
  const reviewSlides = useMemo(() => {
    return splitReviewIntoSlides(fullReviewText, textDensity);
  }, [fullReviewText, textDensity]);

  // Active clamped slide index
  const activeSlideIndex = Math.min(currentSlideIndex, Math.max(0, reviewSlides.length - 1));

  // Artwork change handlers
  const handleSelectPoster = async (newPosterUrl: string) => {
    setCurrentPoster(newPosterUrl);
    setShowPosterSelector(false);
    if (onUpdatePoster) {
      await onUpdatePoster(review.id, newPosterUrl);
    }
  };

  const handleSelectBackdrop = async (newBackdropUrl: string) => {
    setCurrentBackdrop(newBackdropUrl);
    setShowBackdropSelector(false);
    if (onUpdateBackdrop) {
      await onUpdateBackdrop(review.id, newBackdropUrl);
    }
  };

  // Export single displayed 1080x1920 PNG
  const handleDownloadSingle = async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    setExportProgress("Exporting 1080×1920 PNG...");

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        quality: 0.98,
      });

      const suffix =
        studioMode === "full_set"
          ? `-story-part-${activeSlideIndex + 1}-of-${reviewSlides.length}`
          : "";
      const filename = `retro-talks-${slugify(review.title) || "story"}${suffix}-1080x1920.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating story card image:", err);
      alert("Could not generate image. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Export entire multi-slide story set as a ZIP archive
  const handleDownloadZip = async () => {
    if (!cardRef.current || isExporting || reviewSlides.length === 0) return;
    setIsExporting(true);
    setExportProgress(`Preparing ${reviewSlides.length} story slides...`);

    const originalIndex = currentSlideIndex;

    try {
      const zip = new JSZip();

      for (let i = 0; i < reviewSlides.length; i++) {
        setCurrentSlideIndex(i);
        setExportProgress(`Rendering slide ${i + 1} of ${reviewSlides.length}...`);
        // Allow DOM to update and paint slide i
        await new Promise((resolve) => setTimeout(resolve, 140));

        if (!cardRef.current) continue;
        const dataUrl = await toPng(cardRef.current, {
          pixelRatio: 3,
          cacheBust: true,
          quality: 0.98,
        });

        const base64Data = dataUrl.split(",")[1];
        const filename = `${slugify(review.title)}-story-part-${i + 1}-of-${reviewSlides.length}.png`;
        zip.file(filename, base64Data, { base64: true });
      }

      setExportProgress("Building ZIP archive...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const filename = `retro-talks-${slugify(review.title)}-story-review-set.zip`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Error creating ZIP of story set:", err);
      alert("Could not generate ZIP. Please try again.");
    } finally {
      setCurrentSlideIndex(originalIndex);
      setIsExporting(false);
      setExportProgress("");
    }
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryReview);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  if (!isOpen) return null;

  // Formatting helpers
  const displayBackdrop = backdropDataUrl || getBackdropUrl(currentBackdrop, "original");
  const displayPoster = posterDataUrl || getPosterUrl(currentPoster, "w500");
  const hasFooterContent = showFooterBrand || (showGenres && Boolean(review.genres && review.genres.length > 0));

  // Story card numeric rating formatter (uses standard numbers e.g. 5/5 or 4.5/5)
  const formatStoryCardRating = (val: number): string => {
    return Number.isInteger(val) ? `${val}/5` : `${val.toFixed(1)}/5`;
  };

  const formatStoryCardNumber = (val: number): string => {
    return Number.isInteger(val) ? `${val}` : `${val.toFixed(1)}`;
  };

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
                  Instagram Story Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-semibold uppercase">
                  9:16 · 1080×1920
                </span>
              </div>
              <p className="text-xs font-inter text-zinc-400 truncate max-w-sm sm:max-w-md">
                Create story cards and multi-part review slides for {review.title}
              </p>
            </div>
          </div>

          {/* Center Mode Switcher */}
          <div className="hidden md:flex items-center bg-[#07080a] p-1 rounded-2xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setStudioMode("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-poppins transition-all cursor-pointer ${
                studioMode === "summary"
                  ? "bg-[#ff5500] text-black font-bold shadow-[0_0_15px_rgba(255,85,0,0.35)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Story Card</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode("full_set")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-poppins transition-all cursor-pointer ${
                studioMode === "full_set"
                  ? "bg-[#ff5500] text-black font-bold shadow-[0_0_15px_rgba(255,85,0,0.35)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Review Set ({reviewSlides.length})</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {studioMode === "full_set" ? (
              <>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isExporting || reviewSlides.length === 0}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
                  title="Download all generated story slides zipped together"
                >
                  <Archive className="w-4 h-4" />
                  <span>
                    {isExporting ? exportProgress || "Generating ZIP..." : `Download All (${reviewSlides.length} ZIP)`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSingle}
                  disabled={isExporting}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-inter text-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Download only the currently previewed story slide"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Slide {activeSlideIndex + 1} PNG</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDownloadSingle}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? exportProgress || "Exporting..." : "Download Story PNG"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-[#ff5500] hover:text-black border border-white/10 text-zinc-400 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Mode Switcher (Visible on small screens) */}
        <div className="flex md:hidden items-center justify-center p-2 border-b border-white/[0.08] bg-[#07080a]">
          <div className="flex items-center bg-[#0c0f16] p-1 rounded-xl border border-white/[0.08] w-full max-w-sm">
            <button
              type="button"
              onClick={() => setStudioMode("summary")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-poppins transition-all ${
                studioMode === "summary"
                  ? "bg-[#ff5500] text-black font-bold"
                  : "text-zinc-400"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Card</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode("full_set")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-poppins transition-all ${
                studioMode === "full_set"
                  ? "bg-[#ff5500] text-black font-bold"
                  : "text-zinc-400"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Set ({reviewSlides.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Content: Dual Column Workspace */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden">
          
          {/* Left Column: Live 9:16 Story Card Viewport */}
          <div className="lg:w-[460px] xl:w-[500px] flex-shrink-0 bg-[#050608] p-4 sm:p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-white/[0.08] relative overflow-hidden">
            
            {/* Top Preview Controls / Slide Navigator */}
            {studioMode === "full_set" ? (
              <div className="flex items-center justify-between w-[360px] mb-2 px-1">
                <button
                  type="button"
                  disabled={activeSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-poppins text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] scrollbar-none px-1">
                  {reviewSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-6 h-6 rounded-md text-[11px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                        activeSlideIndex === idx
                          ? "bg-[#ff5500] text-black shadow-[0_0_10px_rgba(255,85,0,0.5)]"
                          : "bg-white/[0.05] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={activeSlideIndex >= reviewSlides.length - 1}
                  onClick={() => setCurrentSlideIndex((prev) => Math.min(reviewSlides.length - 1, prev + 1))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-poppins text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
                <span>Live 9:16 Preview (1080×1920 Output)</span>
              </div>
            )}

            {/* THE INSTAGRAM STORY CANVAS (Strict 9:16 Aspect Ratio: 360 x 640 displayed, exports at 3x: 1080 x 1920) */}
            <div
              ref={cardRef}
              style={{ width: "360px", height: "640px" }}
              onMouseDown={handleBackdropMouseDown}
              onTouchStart={handleBackdropTouchStart}
              onTouchMove={handleBackdropTouchMove}
              onTouchEnd={handleBackdropTouchEnd}
              className={`relative rounded-none overflow-hidden bg-[#07080a] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(255,85,0,0.15)] border flex flex-col justify-between select-none ${
                isCroppingBackdrop
                  ? "cursor-move border-[#ff5500] ring-2 ring-[#ff5500]/50"
                  : "border-white/[0.12]"
              }`}
            >
              {/* Full Bleed Backdrop Image Background */}
              {displayBackdrop && (() => {
                const z = Math.max(30, backdropZoom) / 100;
                const aspect = 16 / 9;
                const imgW = 640 * aspect * z;
                const imgH = 640 * z;

                let left = 0;
                if (imgW > 360) {
                  left = - (backdropCropX / 100) * (imgW - 360);
                } else {
                  left = (360 - imgW) / 2;
                }

                let top = 0;
                if (imgH > 640) {
                  top = - (backdropCropY / 100) * (imgH - 640);
                } else {
                  top = (backdropCropY / 100) * (640 - imgH);
                }

                return (
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {/* Ambient blurred backdrop background (ensures beautiful ambient glow when backdrop is scaled to show full width) */}
                    <img
                      src={displayBackdrop}
                      alt=""
                      aria-hidden="true"
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none filter blur-2xl opacity-40 scale-110"
                    />

                    {/* Sharp, framed backdrop image (fully controllable from 100% full image to any zoom/crop) */}
                    <img
                      src={displayBackdrop}
                      alt={review.title}
                      crossOrigin="anonymous"
                      style={{
                        position: "absolute",
                        width: `${imgW}px`,
                        height: `${imgH}px`,
                        left: `${left}px`,
                        top: `${top}px`,
                        maxWidth: "none",
                        maxHeight: "none",
                        filter: backdropBlur > 0 ? `blur(${backdropBlur}px)` : "none",
                      }}
                      className="select-none pointer-events-none"
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
                );
              })()}

              {/* Crop Mode Interactive Overlay & Rule of Thirds Guide */}
              {isCroppingBackdrop && (
                <div className="absolute inset-0 z-20 pointer-events-none">
                  {/* Rule of Thirds Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div />
                  </div>

                  {/* Top Floating Guide Pill */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 border border-[#ff5500] text-[#ff7a29] text-[10px] font-mono font-bold rounded-full shadow-2xl flex items-center gap-1.5 animate-pulse whitespace-nowrap">
                    <Crop className="w-3 h-3 text-[#ff5500]" />
                    <span>Drag card to pan backdrop</span>
                  </div>

                  {/* Bottom Stats Pill */}
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black/85 border border-white/20 text-white text-[9px] font-mono rounded-full whitespace-nowrap">
                    X: {backdropCropX}% · Y: {backdropCropY}% · {backdropZoom <= 35 ? "Full Image" : `Zoom: ${(backdropZoom / 100).toFixed(2)}x`}
                  </div>
                </div>
              )}

              {/* -------------------- CARD TOP HEADER -------------------- */}
              <div className="relative z-10 px-5 pt-14 pb-2 flex items-center justify-between shrink-0">
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

                {studioMode === "full_set" ? null : (
                  showBadgeTag && headline.trim() ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono text-[#ff7a29] uppercase tracking-wider">
                      {headline}
                    </span>
                  ) : (
                    <div />
                  )
                )}
              </div>

              {/* -------------------- MODE 1: QUICK STORY CARD -------------------- */}
              {studioMode === "summary" && (
                <>
                  {theme === "cinematic" && (
                    <div className="relative z-10 px-5 flex flex-col items-center text-center space-y-3 flex-1 justify-center min-h-0 overflow-hidden pb-2">
                      {/* Floating Poster */}
                      {showPoster && displayPoster && (
                        <div className="relative w-28 aspect-[2/3] rounded-none overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(255,85,0,0.2)] border border-white/20">
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

                      {/* Rating Stars & Text Rating */}
                      <div className="flex flex-col items-center justify-center gap-1 py-0.5">
                        <div className="flex items-center justify-center gap-1">
                          {[0, 1, 2, 3, 4].map((starIndex) =>
                            renderStoryStar(starIndex, rating, "w-4 h-4")
                          )}
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#ff7a29] tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                          {formatStoryCardRating(rating)}
                        </span>
                      </div>

                      {/* Summarized Review (Floating Pull-Quote - No Box) */}
                      <div className="w-full px-2 py-1 text-center relative flex flex-col items-center">
                        <p className="text-[13px] font-inter italic text-white/95 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] line-clamp-6 max-w-[310px]">
                          {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {theme === "poster_hero" && (
                    <div className="relative z-10 px-5 flex flex-col items-center text-center space-y-3 flex-1 justify-center min-h-0 overflow-hidden pb-2">
                      {/* Larger Poster Hero */}
                      {showPoster && displayPoster && (
                        <div className="relative w-36 aspect-[2/3] rounded-none overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_30px_rgba(255,85,0,0.3)] border-2 border-white/25">
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
                        <div className="flex flex-col items-center justify-center gap-1 mt-1.5">
                          <div className="flex items-center justify-center gap-1">
                            {[0, 1, 2, 3, 4].map((starIndex) =>
                              renderStoryStar(starIndex, rating, "w-3 h-3")
                            )}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#ff7a29] tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                            {formatStoryCardRating(rating)}
                          </span>
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
                    <div className="relative z-10 px-5 flex flex-col space-y-3.5 flex-1 justify-center text-left min-h-0 overflow-hidden pb-2">
                      {/* Top Poster + Info Row */}
                      <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/15 p-2.5 rounded-2xl">
                        {showPoster && displayPoster && (
                          <div className="relative w-14 aspect-[2/3] rounded-none overflow-hidden flex-shrink-0 border border-white/20">
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
                          <div className="flex flex-col items-start gap-1 mt-1.5">
                            <div className="flex items-center gap-1">
                              {[0, 1, 2, 3, 4].map((s) =>
                                renderStoryStar(s, rating, "w-3 h-3")
                              )}
                            </div>
                            <span className="text-[10px] font-mono font-bold text-[#ff7a29] tracking-wider drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
                              {formatStoryCardRating(rating)}
                            </span>
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
                </>
              )}

              {/* -------------------- MODE 2: FULL REVIEW STORY SET -------------------- */}
              {studioMode === "full_set" && (
                <div className="relative z-10 px-4 flex flex-col flex-1 min-h-0 overflow-hidden pt-1 pb-2">
                  {/* Slide Top Left-Aligned Header: Title, Year, Director & Star Rating */}
                  <div className="text-left space-y-0.5 pb-1.5 border-b border-white/[0.1] shrink-0">
                    <h2 className="text-base sm:text-lg font-bold font-poppins text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                      {review.title}
                    </h2>

                    <div className="flex items-center gap-2 text-[10px] sm:text-[10.5px] font-poppins text-zinc-300 drop-shadow-sm flex-wrap pt-0.5">
                      {(review.year || review.director) && (
                        <span className="font-normal text-zinc-300">
                          {review.year && `${review.year}`}
                          {review.year && review.director && ` · `}
                          {review.director && `Dir. ${review.director}`}
                        </span>
                      )}

                      {(review.year || review.director) && (
                        <span className="text-white/30 text-[10px]">|</span>
                      )}

                      {/* Star Rating & Number next to Year & Director */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {[0, 1, 2, 3, 4].map((starIndex) =>
                            renderStoryStar(starIndex, rating, "w-3 h-3")
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#ff7a29] tracking-wider drop-shadow-sm">
                          {formatStoryCardRating(rating)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* The rest of the card filled with the logged review (rich formatted markdown & justified text) */}
                  <div className="flex-1 pt-2 pb-1 overflow-hidden flex flex-col min-h-0 justify-start">
                    <FormattedReviewText
                      content={reviewSlides[activeSlideIndex] || "No review content."}
                      variant="story"
                      density={textDensity}
                      revealSpoilers={true}
                      className="w-full text-justify font-poppins [text-align-last:left]"
                    />
                  </div>
                </div>
              )}

              {/* -------------------- CARD BOTTOM FOOTER -------------------- */}
              {hasFooterContent ? (
                <div className="relative z-10 px-5 pb-6 pt-2.5 flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0">
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
              ) : (
                <div className="pb-6 shrink-0" />
              )}
            </div>
          </div>

          {/* Right Column: Customization Controls Panel */}
          <div className="flex-grow p-6 overflow-y-auto space-y-6">
            
            {/* 1. Artwork & Imagery Switchers (Change Poster & Backdrop) */}
            <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3">
              <div className="text-xs font-semibold font-poppins text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#ff5500]" />
                  Artwork & Visual Media
                </span>
                {review.tmdbId && (
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    TMDB Connected
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Change Poster */}
                <button
                  type="button"
                  onClick={() => setShowPosterSelector(true)}
                  disabled={!review.tmdbId}
                  className="flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-inter text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center"
                  title={!review.tmdbId ? "TMDB ID required for alternate artwork" : "Select alternate official posters from TMDB"}
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span className="text-[11px] font-medium">Poster</span>
                </button>

                {/* Change Backdrop */}
                <button
                  type="button"
                  onClick={() => setShowBackdropSelector(true)}
                  disabled={!review.tmdbId}
                  className="flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-inter text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center"
                  title={!review.tmdbId ? "TMDB ID required for alternate artwork" : "Select alternate official backdrops from TMDB"}
                >
                  <Layers className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span className="text-[11px] font-medium">Backdrop</span>
                </button>

                {/* Crop Backdrop */}
                <button
                  type="button"
                  onClick={() => setIsCroppingBackdrop((prev) => !prev)}
                  className={`flex flex-col items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-inter transition-all cursor-pointer text-center border ${
                    isCroppingBackdrop
                      ? "bg-[#ff5500]/20 text-[#ff7a29] border-[#ff5500] shadow-[0_0_12px_rgba(255,85,0,0.35)]"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-zinc-200 hover:text-white"
                  }`}
                  title="Crop & reposition backdrop for story card (Pan & Zoom)"
                >
                  <Crop className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span className="text-[11px] font-medium">
                    {isCroppingBackdrop ? "Done Crop" : "Crop"}
                  </span>
                </button>
              </div>

              {/* Collapsible Backdrop Crop & Positioning Controls */}
              {isCroppingBackdrop && (
                <div className="mt-3 p-3.5 rounded-xl bg-[#08090d] border border-[#ff5500]/30 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-xs font-poppins font-semibold text-white">
                      <Crop className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Backdrop Framing & Crop</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#ff7a29]">Drag card or use sliders</span>
                  </div>

                  {/* Horizontal Pan (X Offset) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-inter">
                      <span className="text-zinc-300">Horizontal Pan (X)</span>
                      <span className="font-mono text-[#ff7a29] font-bold">{backdropCropX}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={backdropCropX}
                      onChange={(e) => setBackdropCropX(Number(e.target.value))}
                      className="w-full accent-[#ff5500] cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[
                        { label: "Left", val: 0 },
                        { label: "Center", val: 50 },
                        { label: "Right", val: 100 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setBackdropCropX(preset.val)}
                          className={`flex-1 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                            backdropCropX === preset.val
                              ? "bg-[#ff5500]/20 text-[#ff7a29] border-[#ff5500]"
                              : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vertical Position (Y Offset) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-inter">
                      <span className="text-zinc-300">Vertical Position (Y)</span>
                      <span className="font-mono text-[#ff7a29] font-bold">{backdropCropY}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={backdropCropY}
                      onChange={(e) => setBackdropCropY(Number(e.target.value))}
                      className="w-full accent-[#ff5500] cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[
                        { label: "Top", val: 0 },
                        { label: "Center", val: 50 },
                        { label: "Bottom", val: 100 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setBackdropCropY(preset.val)}
                          className={`flex-1 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                            backdropCropY === preset.val
                              ? "bg-[#ff5500]/20 text-[#ff7a29] border-[#ff5500]"
                              : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zoom / Scale */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-inter">
                      <span className="text-zinc-300">Scale / Zoom</span>
                      <span className="font-mono text-[#ff7a29] font-bold">
                        {backdropZoom <= 35
                          ? "Full Image (100% visible)"
                          : backdropZoom < 100
                          ? `${(backdropZoom / 100).toFixed(2)}x (Wide)`
                          : `${(backdropZoom / 100).toFixed(2)}x (Fill Card)`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={32}
                      max={200}
                      step={2}
                      value={backdropZoom}
                      onChange={(e) => setBackdropZoom(Number(e.target.value))}
                      className="w-full accent-[#ff5500] cursor-pointer"
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[
                        { label: "Full Image", val: 32 },
                        { label: "Wide", val: 65 },
                        { label: "Fill Card", val: 100 },
                        { label: "1.5x", val: 150 },
                        { label: "2.0x", val: 200 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setBackdropZoom(preset.val)}
                          className={`flex-1 py-1 rounded-md text-[10px] font-mono border transition-all cursor-pointer ${
                            (preset.val === 32 && backdropZoom <= 35) || (preset.val !== 32 && Math.abs(backdropZoom - preset.val) <= 5)
                              ? "bg-[#ff5500]/20 text-[#ff7a29] border-[#ff5500]"
                              : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-white"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons: Reset & Save to Review */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        setBackdropCropX(50);
                        setBackdropCropY(review.backdropFraming?.y ?? 0);
                        setBackdropZoom(review.backdropFraming?.zoom ?? 100);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-inter text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>

                    {onUpdateBackdropFraming && (
                      <button
                        type="button"
                        onClick={handleSaveFraming}
                        disabled={isSavingFraming}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff5500] hover:bg-[#ff7a29] text-black text-[11px] font-poppins font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        {framingSavedSuccess ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Saved!</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>{isSavingFraming ? "Saving..." : "Save Framing"}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Text Editor Section (Switches according to active mode) */}
            {studioMode === "summary" ? (
              /* Summarized Review Editor */
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
                  rows={4}
                  className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-2xl p-4 text-xs font-inter text-zinc-200 leading-relaxed outline-none transition-all placeholder-zinc-600 resize-none"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>Recommended: 120 - 240 characters</span>
                  <span className={summaryReview.length > 260 ? "text-amber-400 font-bold" : ""}>
                    {summaryReview.length} chars
                  </span>
                </div>
              </div>
            ) : (
              /* Full Logged Review Editor & Slide Generator */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#ff5500]" />
                    Full Logged Review (Story Set Generator)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-bold">
                      {reviewSlides.length} Story Slides
                    </span>
                    <button
                      type="button"
                      onClick={() => setFullReviewText(review.review || "")}
                      className="flex items-center gap-1 text-[11px] font-inter text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Reset text to original logged review"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                <textarea
                  value={fullReviewText}
                  onChange={(e) => setFullReviewText(e.target.value)}
                  placeholder="Enter your complete logged review..."
                  rows={6}
                  className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-2xl p-4 text-xs font-poppins text-zinc-200 leading-relaxed outline-none transition-all placeholder-zinc-600 resize-none"
                />

                <div className="flex items-center justify-between text-[11px] font-inter text-zinc-400">
                  <span>Supports **bold**, *italic*, &gt; quote · <code className="text-[#ff7a29] font-mono">---</code> forces slide breaks</span>
                  <span className="font-mono text-zinc-500">{fullReviewText.length} chars</span>
                </div>

                {/* Density / Word Capacity Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#050608] border border-white/[0.08]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-poppins font-medium text-white">Card Word Capacity:</span>
                    <span className="text-[10px] font-mono text-[#ff7a29]">
                      {textDensity === "dense"
                        ? "~1,350 chars / card (Max Words)"
                        : textDensity === "standard"
                        ? "~1,050 chars / card"
                        : "~800 chars / card"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[
                      { key: "dense", label: "Max Words" },
                      { key: "standard", label: "Standard" },
                      { key: "spacious", label: "Spacious" },
                    ].map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setTextDensity(d.key as any)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                          textDensity === d.key
                            ? "bg-[#ff5500] text-black font-bold shadow-[0_0_10px_rgba(255,85,0,0.3)]"
                            : "bg-white/[0.04] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Rating & Headline Adjuster */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Rating adjustment with 0.5 stars included */}
              <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-2.5">
                <label className="text-xs font-semibold font-poppins text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#ff5500]" />
                    Story Card Rating
                  </span>
                  <span className="text-[#ff7a29] font-mono font-bold">
                    {formatStoryCardNumber(rating)} / 5
                  </span>
                </label>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((num) => (
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
                      {formatStoryCardNumber(num)}★
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline Badge (Used in Quick Story Card mode) */}
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

            {/* 4. Layout Presets (For Summary Mode) */}
            {studioMode === "summary" && (
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
            )}

            {/* 5. Backdrop Ambiance Controls */}
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
                {studioMode === "summary" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPoster}
                      onChange={(e) => setShowPoster(e.target.checked)}
                      className="accent-[#ff5500] w-3.5 h-3.5"
                    />
                    <span>Show Poster</span>
                  </label>
                )}

                {studioMode === "summary" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBadgeTag}
                      onChange={(e) => setShowBadgeTag(e.target.checked)}
                      className="accent-[#ff5500] w-3.5 h-3.5"
                    />
                    <span>Badge Tag</span>
                  </label>
                )}

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

            {/* 6. Export Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#ff5500]/10 via-[#ff5500]/5 to-transparent border border-[#ff5500]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold font-poppins text-white">
                  {studioMode === "full_set"
                    ? `Ready to Export Story Set (${reviewSlides.length} Images)?`
                    : "Ready to Post on Instagram?"}
                </h4>
                <p className="text-[11px] font-inter text-zinc-300 mt-0.5">
                  {studioMode === "full_set"
                    ? "Generates high-resolution 1080×1920 PNG images of all review slides and downloads them in a single ZIP."
                    : "Exports a crystal-clear 1080×1920 PNG file formatted to Instagram Story dimensions."}
                </p>
              </div>

              {studioMode === "full_set" ? (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isExporting || reviewSlides.length === 0}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  <Archive className="w-4 h-4" />
                  <span>{isExporting ? exportProgress || "Generating ZIP..." : "Download Full Set (ZIP)"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownloadSingle}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? exportProgress || "Exporting..." : "Download Story PNG"}</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* TMDB Alternate Poster Selector Modal */}
      {showPosterSelector && review.tmdbId && (
        <PosterSelectorModal
          movieId={review.tmdbId}
          movieTitle={review.title}
          currentPosterUrl={currentPoster}
          isOpen={showPosterSelector}
          onClose={() => setShowPosterSelector(false)}
          onSelectPoster={handleSelectPoster}
        />
      )}

      {/* TMDB Alternate Backdrop Selector Modal */}
      {showBackdropSelector && review.tmdbId && (
        <BackdropSelectorModal
          movieId={review.tmdbId}
          movieTitle={review.title}
          currentBackdropUrl={currentBackdrop}
          isOpen={showBackdropSelector}
          onClose={() => setShowBackdropSelector(false)}
          onSelectBackdrop={handleSelectBackdrop}
        />
      )}
    </div>
  );
};
