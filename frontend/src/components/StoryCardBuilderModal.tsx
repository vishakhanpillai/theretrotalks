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
  Pipette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Italic,
} from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import type { Review } from "../types";
import { getBackdropUrl, getPosterUrl } from "../utils/images";
import { slugify } from "../utils/slugify";
import { PosterSelectorModal } from "./PosterSelectorModal";
import { BackdropSelectorModal } from "./BackdropSelectorModal";
import { FormattedReviewText } from "./FormattedReviewText";

interface StoryCardBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review;
}

type StoryTheme =
  | "cinematic"
  | "poster_hero"
  | "editorial"
  | "monolith"
  | "cinemascope"
  | "masthead";
type StudioMode = "summary" | "full_set";
type FooterHandleOption = "theretrotalks" | "personal" | "custom" | "hidden";
type BodyFont = "inter" | "poppins" | "playfair" | "cinzel" | "jetbrains";
type TitleFont = "poppins" | "cinzel" | "playfair" | "jetbrains" | "bebas";
type TextAlignment = "left" | "center" | "justify";
type CardMaterialStyle = "obsidian" | "matte" | "ambient";
type RatingDisplayFormat = "stars_metric" | "stars_minimal" | "director_index";

export interface PalettePreset {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  bgRgba: string;
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "orange",
    name: "Retro Orange",
    primary: "#ff5500",
    secondary: "#ff7a29",
    glow: "rgba(255, 85, 0, 0.4)",
    bgRgba: "rgba(255, 85, 0, 0.15)",
  },
  {
    id: "gold",
    name: "Monochrome Gold",
    primary: "#e5b869",
    secondary: "#f3cf8a",
    glow: "rgba(229, 184, 105, 0.4)",
    bgRgba: "rgba(229, 184, 105, 0.15)",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    primary: "#ff2a4b",
    secondary: "#ff5c75",
    glow: "rgba(255, 42, 75, 0.4)",
    bgRgba: "rgba(255, 42, 75, 0.15)",
  },
  {
    id: "cyan",
    name: "Cyber Cyan",
    primary: "#00e5ff",
    secondary: "#38efff",
    glow: "rgba(0, 229, 255, 0.4)",
    bgRgba: "rgba(0, 229, 255, 0.15)",
  },
  {
    id: "emerald",
    name: "Emerald Green",
    primary: "#00e676",
    secondary: "#33eb91",
    glow: "rgba(0, 230, 118, 0.4)",
    bgRgba: "rgba(0, 230, 118, 0.15)",
  },
];

/**
 * Convert 3 or 6 digit hex color to an rgba string with specified opacity
 */
const hexToRgba = (hex: string, alpha: number): string => {
  let cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(255, 85, 0, ${alpha})`;
};

/**
 * Split a full review into readable story slide chunks for 9:16 vertical cards.
 * Balances content across slides evenly so no slide is left with an orphan paragraph or empty space.
 */
const splitReviewIntoSlides = (
  text: string,
  density: "dense" | "standard" | "spacious" = "dense",
  hasSlide1Callout: boolean = false
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
  const slide1Max = hasSlide1Callout ? Math.max(400, maxChunk - 260) : maxChunk;

  // 2. If the review fits on 1 slide (with 5% tolerance), keep it on 1 slide
  if (trimmed.length <= slide1Max * 1.05) {
    return [trimmed];
  }

  // 3. Continuous text flow packing with paragraph preservation
  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const slides: string[] = [];
  let current = "";

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const p = paragraphs[pIdx];
    const targetChunk = slides.length === 0 ? slide1Max : maxChunk;
    const sep = current ? "\n\n" : "";
    const candidate = current ? current + sep + p : p;

    // A. If whole paragraph fits into current slide (with 3% tolerance), keep paragraph intact & flow text
    if (candidate.length <= targetChunk * 1.03) {
      current = candidate;
      continue;
    }

    // B. If current slide is already well-filled (>= 60% of capacity) and the paragraph fits on its own slide,
    // push current slide so the paragraph stays whole without being chopped in half.
    if (current.length >= targetChunk * 0.60 && p.length <= (slides.length + 1 === 0 ? slide1Max : maxChunk) * 1.03) {
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

      const currentLimit = slides.length === 0 ? slide1Max : maxChunk;
      const sSep = current ? (isFirstSent ? "\n\n" : " ") : "";
      const sCand = current ? current + sSep + s : s;

      if (sCand.length <= currentLimit) {
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

  // Initial standout quote extracted from review or blank
  const getInitialStandoutQuote = (text: string) => {
    if (!text) return "";
    const quoteMatch = text.match(/^>\s*(.+)$/m);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1].trim().replace(/\*\*|__|\*|_/g, "");
    }
    const quoteInvertedMatch = text.match(/"([^"]{15,140})"/);
    if (quoteInvertedMatch && quoteInvertedMatch[1]) {
      return quoteInvertedMatch[1].trim();
    }
    const clean = text
      .replace(/\*\*|__|\*|_|~~|\|\|/g, "")
      .replace(/^>+\s*/gm, "")
      .replace(/^#{1,6}\s+/gm, "")
      .trim();
    const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
    for (const s of sentences) {
      const trimmedSent = s.trim();
      if (trimmedSent.length >= 20 && trimmedSent.length <= 130) {
        return trimmedSent;
      }
    }
    return clean.slice(0, 110);
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

  // Styling & Toggles
  const [textDensity, setTextDensity] = useState<"dense" | "standard" | "spacious">("dense");
  const [rating, setRating] = useState<number>(review.rating);
  const [theme, setTheme] = useState<StoryTheme>("cinematic");
  const [headline, setHeadline] = useState<string>("Quick Reflection");
  const [showBadgeTag, setShowBadgeTag] = useState<boolean>(true);
  const [backdropDim, setBackdropDim] = useState<number>(65);
  const [backdropBlur, setBackdropBlur] = useState<number>(0);
  const [showPoster, setShowPoster] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [showGenres, setShowGenres] = useState<boolean>(true);

  // Editorial Customization Suite
  const [bodyFont, setBodyFont] = useState<BodyFont>("inter");
  const [titleFont, setTitleFont] = useState<TitleFont>("poppins");
  const [isReviewItalic, setIsReviewItalic] = useState<boolean>(true);
  const [quoteAlignment, setQuoteAlignment] = useState<TextAlignment>("left");
  const [materialStyle, setMaterialStyle] = useState<CardMaterialStyle>("obsidian");
  const [ratingFormat, setRatingFormat] = useState<RatingDisplayFormat>("stars_metric");
  const [showHairlineAccent, setShowHairlineAccent] = useState<boolean>(true);

  // 1. Palette Accent State (Retro Orange default, Cinematic presets, or Custom Picker)
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>("orange");
  const [customColorHex, setCustomColorHex] = useState<string>("#ff5500");

  const activePalette: PalettePreset = useMemo(() => {
    if (selectedPaletteId === "custom") {
      const formatted = customColorHex.startsWith("#") ? customColorHex : `#${customColorHex}`;
      const isComplete = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(formatted);
      const safeColor = isComplete ? formatted : "#ff5500";
      return {
        id: "custom",
        name: `Custom (${safeColor.toUpperCase()})`,
        primary: safeColor,
        secondary: safeColor,
        glow: hexToRgba(safeColor, 0.45),
        bgRgba: hexToRgba(safeColor, 0.15),
      };
    }
    return PALETTE_PRESETS.find((p) => p.id === selectedPaletteId) || PALETTE_PRESETS[0];
  }, [selectedPaletteId, customColorHex]);

  // 2. Custom Handle / Watermark State
  const [footerHandleOption, setFooterHandleOption] = useState<FooterHandleOption>("theretrotalks");
  const [customHandle, setCustomHandle] = useState<string>("@vishakhanpillai");

  const effectiveHandle = useMemo(() => {
    if (footerHandleOption === "hidden") return null;
    if (footerHandleOption === "theretrotalks") return "@theretrotalks";
    if (footerHandleOption === "personal") return "@vishakhanpillai";
    if (footerHandleOption === "custom") {
      const trimmed = customHandle.trim();
      if (!trimmed) return null;
      return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    }
    return "@theretrotalks";
  }, [footerHandleOption, customHandle]);

  // 3. Standout Quote Callout State (Slide 1 Hook)
  const [showStandoutQuote, setShowStandoutQuote] = useState<boolean>(false);
  const [standoutQuoteText, setStandoutQuoteText] = useState<string>("");

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
      setTextDensity("dense");
      setRating(review.rating);
      setTheme("cinematic");
      setHeadline("Quick Reflection");
      setShowBadgeTag(true);
      setBackdropDim(65);
      setBackdropBlur(0);
      setShowPoster(true);
      setShowWatermark(true);
      setShowGenres(true);
      setTitleFont("poppins");
      setBodyFont("inter");
      setIsReviewItalic(true);
      setQuoteAlignment("left");
      setMaterialStyle("obsidian");
      setRatingFormat("stars_metric");
      setShowHairlineAccent(true);
      setSelectedPaletteId("orange");
      setCustomColorHex("#ff5500");
      setFooterHandleOption("theretrotalks");
      setCustomHandle("@vishakhanpillai");
      setShowStandoutQuote(false);
      setStandoutQuoteText(getInitialStandoutQuote(review.review));
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

  const hasSlide1Callout = showStandoutQuote && Boolean(standoutQuoteText.trim());

  // Derived slide list for full review set based on selected text density
  const reviewSlides = useMemo(() => {
    return splitReviewIntoSlides(fullReviewText, textDensity, hasSlide1Callout);
  }, [fullReviewText, textDensity, hasSlide1Callout]);

  // Active clamped slide index
  const activeSlideIndex = Math.min(currentSlideIndex, Math.max(0, reviewSlides.length - 1));

  // Artwork change handlers (Isolated strictly to Story Studio exports)
  const handleSelectPoster = (newPosterUrl: string) => {
    setCurrentPoster(newPosterUrl);
    setShowPosterSelector(false);
  };

  const handleSelectBackdrop = (newBackdropUrl: string) => {
    setCurrentBackdrop(newBackdropUrl);
    setShowBackdropSelector(false);
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
  const hasFooterContent = Boolean(effectiveHandle) || (showGenres && Boolean(review.genres && review.genres.length > 0));

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
          style={{ fill: activePalette.primary, color: activePalette.primary }}
          className={`${sizeClass} shrink-0`}
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
            <Star
              style={{ fill: activePalette.primary, color: activePalette.primary }}
              className={`${sizeClass} max-w-none`}
            />
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

  const getTitleFontClass = () => {
    switch (titleFont) {
      case "cinzel":
        return "font-cinzel tracking-wider uppercase";
      case "playfair":
        return "font-playfair tracking-normal";
      case "jetbrains":
        return "font-jetbrains font-mono tracking-tight";
      case "bebas":
        return "font-bebas tracking-wider uppercase";
      case "poppins":
      default:
        return "font-poppins font-bold tracking-tight";
    }
  };

  const getQuoteFontClass = () => {
    let fontClass = "font-inter";
    if (bodyFont === "poppins") fontClass = "font-poppins";
    else if (bodyFont === "playfair") fontClass = "font-playfair";
    else if (bodyFont === "cinzel") fontClass = "font-cinzel";
    else if (bodyFont === "jetbrains") fontClass = "font-jetbrains font-mono";

    const italicClass = isReviewItalic ? "italic" : "not-italic";
    return `${fontClass} ${italicClass}`;
  };

  const getQuoteAlignClass = () => {
    switch (quoteAlignment) {
      case "center":
        return "text-center";
      case "justify":
        return "text-justify [text-align-last:left]";
      case "left":
      default:
        return "text-left";
    }
  };

  const getMaterialBoxClass = () => {
    switch (materialStyle) {
      case "matte":
        return "bg-[#090b0e] border border-white/[0.08] shadow-2xl";
      case "ambient":
        return "bg-transparent border-transparent shadow-none";
      case "obsidian":
      default:
        return "backdrop-blur-xl bg-black/60 border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.85)]";
    }
  };

  const renderCardRating = (
    sizeClass = "w-3.5 h-3.5",
    textClass = "text-[11px]",
    align: "center" | "start" | "end" = "center"
  ) => {
    if (ratingFormat === "director_index") {
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${
            align === "start" ? "self-start" : align === "end" ? "self-end" : "self-center"
          }`}
          style={{
            borderColor: "rgba(255, 255, 255, 0.12)",
            backgroundColor: "rgba(10, 12, 16, 0.75)",
          }}
        >
          <span
            className="font-mono text-[9.5px] uppercase tracking-widest font-semibold"
            style={{ color: activePalette.secondary }}
          >
            INDEX
          </span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span className="font-mono font-bold text-white text-[11px] tracking-wider">
            {formatStoryCardNumber(rating)}
            <span className="text-zinc-400 text-[9.5px] ml-0.5">/ 5.0</span>
          </span>
        </div>
      );
    }

    const itemsAlign = align === "start" ? "items-start" : align === "end" ? "items-end" : "items-center";

    return (
      <div className={`flex flex-col ${itemsAlign} justify-center gap-0.5 py-0.5`}>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((starIndex) =>
            renderStoryStar(starIndex, rating, sizeClass)
          )}
        </div>
        {ratingFormat === "stars_metric" && (
          <span
            className={`${textClass} font-mono font-semibold tracking-wider text-zinc-300 drop-shadow-sm`}
          >
            {formatStoryCardRating(rating)}
          </span>
        )}
      </div>
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
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: activePalette.primary,
                        boxShadow: `0 0 8px ${activePalette.primary}`,
                      }}
                    />
                    <span className="text-[9.5px] font-mono tracking-[0.28em] uppercase text-zinc-300 font-medium">
                      THE RETRO TALKS · ARCHIVE
                    </span>
                  </div>
                ) : (
                  <div />
                )}

                {studioMode === "full_set" ? null : (
                  showBadgeTag && headline.trim() ? (
                    <span
                      className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono uppercase tracking-wider"
                      style={{ color: activePalette.secondary }}
                    >
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
                        <h2 className={`text-xl font-bold text-white leading-tight drop-shadow-md ${getTitleFontClass()}`}>
                          {review.title}
                        </h2>
                        <p className="text-[11px] font-inter text-zinc-300">
                          {review.year && <span>{review.year} · </span>}
                          <span>{review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}</span>
                        </p>
                      </div>

                      {/* Rating Display */}
                      {renderCardRating("w-4 h-4", "text-[11px]", "center")}

                      {/* Summarized Review / Standout Quote */}
                      <div className="w-full px-2 py-1 text-center relative flex flex-col items-center">
                        {showStandoutQuote && standoutQuoteText.trim() ? (
                          <div
                            className={`w-full max-w-[310px] px-3.5 py-2.5 rounded-2xl ${getMaterialBoxClass()} border-l-[3px] text-left shadow-xl`}
                            style={{ borderColor: activePalette.primary }}
                          >
                            <div
                              className="flex items-center gap-1.5 mb-1 text-[9px] font-mono uppercase tracking-wider font-bold"
                              style={{ color: activePalette.secondary }}
                            >
                              <Quote className="w-3 h-3 shrink-0" />
                              <span>Standout Critique</span>
                            </div>
                            <p
                              className={`text-[13px] font-bold italic text-white leading-snug drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                            >
                              "{standoutQuoteText.trim()}"
                            </p>
                            {summaryReview && summaryReview !== standoutQuoteText && (
                              <p className={`text-[11.5px] text-zinc-300 mt-2 pt-2 border-t border-white/10 line-clamp-3 leading-relaxed ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                                {summaryReview}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-[13px] text-white/95 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] line-clamp-6 max-w-[310px] ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                          >
                            {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                          </p>
                        )}
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
                        <h2 className={`text-lg font-bold text-white leading-tight drop-shadow-md ${getTitleFontClass()}`}>
                          {review.title}
                        </h2>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <span className="text-[10px] font-inter text-zinc-300">
                            {review.year} · {review.director}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          {renderCardRating("w-3 h-3", "text-[10px]", "center")}
                        </div>
                      </div>

                      {/* Summarized Review / Standout Quote */}
                      <div className="w-full px-3 py-1.5 text-center flex flex-col items-center">
                        {showStandoutQuote && standoutQuoteText.trim() ? (
                          <div
                            className={`w-full max-w-[310px] px-3 py-2 rounded-2xl ${getMaterialBoxClass()} border-l-[3px] text-left shadow-xl`}
                            style={{ borderColor: activePalette.primary }}
                          >
                            <div
                              className="flex items-center gap-1.5 mb-1 text-[9px] font-mono uppercase tracking-wider font-bold"
                              style={{ color: activePalette.secondary }}
                            >
                              <Quote className="w-3 h-3 shrink-0" />
                              <span>Standout Critique</span>
                            </div>
                            <p
                              className={`text-[12.5px] font-bold italic text-white leading-snug drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                            >
                              "{standoutQuoteText.trim()}"
                            </p>
                            {summaryReview && summaryReview !== standoutQuoteText && (
                              <p className={`text-[11px] text-zinc-300 mt-1.5 pt-1.5 border-t border-white/10 line-clamp-2 leading-relaxed ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                                {summaryReview}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-xs text-zinc-100 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.98)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)] line-clamp-5 max-w-[310px] ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                          >
                            {summaryReview ? `“${summaryReview}”` : "Write your summarized thoughts in the studio..."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {theme === "editorial" && (
                    <div className="relative z-10 px-5 flex flex-col space-y-3.5 flex-1 justify-center text-left min-h-0 overflow-hidden pb-2">
                      {/* Top Poster + Info Row */}
                      <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${getMaterialBoxClass()}`}>
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
                          <h2 className={`text-base font-bold text-white truncate ${getTitleFontClass()}`}>
                            {review.title}
                          </h2>
                          <p className="text-[10px] font-inter text-zinc-400">
                            {review.year} · {review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}
                          </p>
                          <div className="mt-1.5">
                            {renderCardRating("w-3 h-3", "text-[10px]", "start")}
                          </div>
                        </div>
                      </div>

                      {/* Summarized Review / Standout Quote */}
                      <div
                        className="w-full pl-3.5 border-l-2 py-1 my-1"
                        style={{ borderColor: activePalette.primary }}
                      >
                        <div
                          className="text-[9px] font-mono uppercase tracking-widest mb-1.5 font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                          style={{ color: activePalette.secondary }}
                        >
                          {showStandoutQuote ? "Standout Critique" : "Editorial Review"}
                        </div>
                        {showStandoutQuote && standoutQuoteText.trim() ? (
                          <div className="space-y-1.5">
                            <p className={`text-[13.5px] font-bold italic text-white leading-snug drop-shadow-md ${getQuoteFontClass()}`}>
                              "{standoutQuoteText.trim()}"
                            </p>
                            {summaryReview && summaryReview !== standoutQuoteText && (
                              <p className="text-[11.5px] font-inter text-white/90 leading-relaxed italic line-clamp-3">
                                {summaryReview}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className={`text-[13px] text-white/95 leading-relaxed italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)] line-clamp-7 ${getQuoteFontClass()}`}>
                            {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PRESET 4: The Auteur Monolith (Gallery-Grade Museum Monograph) */}
                  {theme === "monolith" && (
                    <div className="relative z-10 px-6 flex flex-col items-center justify-between flex-1 min-h-0 overflow-hidden py-3 text-center">
                      {/* Floating Monolith Poster */}
                      {showPoster && displayPoster && (
                        <div className="relative w-28 sm:w-32 aspect-[2/3] shrink-0 overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/20">
                          <img
                            src={displayPoster}
                            alt={review.title}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Film Metadata & Title */}
                      <div className="space-y-1.5 my-1.5 max-w-[310px]">
                        <div className="text-[9px] font-mono tracking-[0.25em] uppercase text-zinc-400">
                          {review.year && <span>{review.year} — </span>}
                          <span>{review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}</span>
                        </div>

                        <h2 className={`text-xl font-bold text-white leading-tight drop-shadow-md ${getTitleFontClass()}`}>
                          {review.title}
                        </h2>

                        {showHairlineAccent && (
                          <div
                            className="w-8 h-[1.5px] mx-auto my-1.5 opacity-80"
                            style={{ backgroundColor: activePalette.primary }}
                          />
                        )}

                        {renderCardRating("w-3.5 h-3.5", "text-[10px]", "center")}
                      </div>

                      {/* Monograph Critique Card */}
                      <div className="w-full max-w-[315px] px-0.5">
                        {showStandoutQuote && standoutQuoteText.trim() ? (
                          <div
                            className={`p-3.5 rounded-2xl ${getMaterialBoxClass()} ${getQuoteAlignClass()}`}
                            style={{ borderTop: `2px solid ${activePalette.primary}` }}
                          >
                            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-400 mb-1.5 font-semibold">
                              CRITICAL REFLECTION
                            </div>
                            <p
                              className={`text-[13px] font-semibold text-white leading-snug drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                            >
                              "{standoutQuoteText.trim()}"
                            </p>
                            {summaryReview && summaryReview !== standoutQuoteText && (
                              <p className={`text-[11px] text-zinc-300 mt-2 pt-2 border-t border-white/[0.08] line-clamp-3 leading-relaxed ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                                {summaryReview}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-[12.5px] text-zinc-200 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] line-clamp-5 ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                          >
                            {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PRESET 5: Cinemascope 2.39:1 (Panavision Anamorphic Frame) */}
                  {theme === "cinemascope" && (
                    <div className="relative z-10 px-5 flex flex-col justify-between flex-1 min-h-0 overflow-hidden py-3">
                      {/* Anamorphic Frame with Viewfinder Corner Reticles */}
                      <div className="relative w-full aspect-[21/10] overflow-hidden rounded-xl border border-white/20 shadow-2xl bg-black shrink-0">
                        <img
                          src={(displayBackdrop || displayPoster) ?? undefined}
                          alt={review.title}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${backdropCropX}% ${backdropCropY}%`,
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

                        {/* Camera Viewfinder Crosshairs */}
                        <div className="absolute top-2 left-2 text-[10px] font-mono text-white/50 leading-none select-none">┌</div>
                        <div className="absolute top-2 right-2 text-[10px] font-mono text-white/50 leading-none select-none">┐</div>
                        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/50 leading-none select-none">└</div>
                        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-white/50 leading-none select-none">┘</div>

                        {/* Title & Metadata Overlay */}
                        <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[8.5px] font-mono tracking-[0.2em] uppercase text-zinc-300 block">
                              CINEMASCOPE · 2.39:1
                            </span>
                            <h2 className={`text-base font-bold text-white leading-tight truncate drop-shadow-lg ${getTitleFontClass()}`}>
                              {review.title}
                            </h2>
                          </div>
                          {review.year && (
                            <span className="text-[10px] font-mono font-bold text-white/90 bg-black/70 px-2 py-0.5 rounded border border-white/10 shrink-0">
                              {review.year}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Production Credits Bar */}
                      <div className="flex items-center justify-between py-1 border-b border-white/[0.08] text-[9.5px] font-mono text-zinc-400">
                        <span className="truncate max-w-[200px]">
                          {review.mediaType === "tv" ? "SERIES CREATOR" : "DIR"}: {review.director?.toUpperCase()}
                        </span>
                        <span className="shrink-0">{review.genres?.[0]?.toUpperCase() || "FEATURE"}</span>
                      </div>

                      {/* Director's Critique Deck */}
                      <div className={`p-3.5 rounded-2xl ${getMaterialBoxClass()} space-y-1.5`}>
                        <div className="flex items-center justify-between">
                          <div
                            className="text-[9px] font-mono uppercase tracking-[0.2em] font-semibold flex items-center gap-1.5"
                            style={{ color: activePalette.secondary }}
                          >
                            <span>AUTEUR CRITIQUE</span>
                          </div>
                          <div className="shrink-0">
                            {renderCardRating("w-3 h-3", "text-[10px]", "end")}
                          </div>
                        </div>

                        {showStandoutQuote && standoutQuoteText.trim() ? (
                          <div className="space-y-1.5 pt-0.5">
                            <p
                              className={`text-[13px] font-semibold text-white leading-snug drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                            >
                              "{standoutQuoteText.trim()}"
                            </p>
                            {summaryReview && summaryReview !== standoutQuoteText && (
                              <p className={`text-[11px] text-zinc-300 pt-1.5 border-t border-white/[0.07] line-clamp-3 leading-relaxed ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                                {summaryReview}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p
                            className={`text-[12.5px] text-zinc-200 leading-relaxed line-clamp-5 ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                          >
                            {summaryReview ? `"${summaryReview}"` : "Write your summarized thoughts in the studio..."}
                          </p>
                        )}
                      </div>

                      {/* Bottom Master Reel Stamp */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-0.5">
                        <span className="tracking-widest">35MM MASTER REEL</span>
                        <span style={{ color: activePalette.secondary }}>ARCHIVAL #{review.id}</span>
                      </div>
                    </div>
                  )}

                  {/* PRESET 6: Cahiers Masthead (Prestigious European Broadsheet) */}
                  {theme === "masthead" && (
                    <div className="relative z-10 px-5 flex flex-col justify-between flex-1 min-h-0 overflow-hidden py-3 text-left">
                      {/* Upper Broadsheet Masthead */}
                      <div className="space-y-1.5 border-b border-white/[0.12] pb-2">
                        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.25em] text-zinc-400">
                          <span>FILM COMMENTARY</span>
                          <span>ARCHIVE · {review.year || "2026"}</span>
                        </div>

                        <h2 className={`text-lg sm:text-xl font-bold text-white leading-tight tracking-tight ${getTitleFontClass()}`}>
                          {review.title}
                        </h2>

                        <div className="flex items-center justify-between text-[10px] font-inter text-zinc-300">
                          <span>
                            {review.mediaType === "tv" ? "Created by" : "A film by"}{" "}
                            <strong className="text-white font-medium">{review.director}</strong>
                          </span>
                          <div>{renderCardRating("w-3 h-3", "text-[10px]", "end")}</div>
                        </div>
                      </div>

                      {/* Middle Deck: Poster & Key Verdict */}
                      <div className="flex items-center gap-3 my-1.5">
                        {showPoster && displayPoster && (
                          <div className="relative w-18 aspect-[2/3] shrink-0 overflow-hidden shadow-2xl border border-white/20">
                            <img
                              src={displayPoster}
                              alt={review.title}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div
                            className="text-[9px] font-mono uppercase tracking-widest font-semibold mb-1"
                            style={{ color: activePalette.secondary }}
                          >
                            THE VERDICT
                          </div>
                          <p
                            className={`text-[12.5px] font-semibold text-white leading-snug drop-shadow-md line-clamp-4 ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                          >
                            "{showStandoutQuote && standoutQuoteText.trim()
                              ? standoutQuoteText.trim()
                              : (summaryReview || "Write your summarized thoughts in the studio...")}"
                          </p>
                        </div>
                      </div>

                      {/* Lower Broadsheet Analysis Box */}
                      <div
                        className={`p-3 rounded-2xl ${getMaterialBoxClass()} border-l-2`}
                        style={{ borderLeftColor: activePalette.primary }}
                      >
                        <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 mb-1 font-semibold">
                          CRITIQUE EXCERPT
                        </div>
                        <p className={`text-[11.5px] text-zinc-200 leading-relaxed line-clamp-4 ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                          {summaryReview || "No extended review logged."}
                        </p>
                      </div>

                      {/* Bottom Masthead Stamp */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-1 border-t border-white/[0.08]">
                        <span>THE RETRO TALKS ARCHIVES</span>
                        <span>CURATED SELECTION</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* -------------------- MODE 2: FULL REVIEW STORY SET -------------------- */}
              {studioMode === "full_set" && (
                <div className="relative z-10 px-4 flex flex-col flex-1 min-h-0 overflow-hidden pt-1 pb-2">
                  {/* Slide Top Left-Aligned Header: Title, Year, Director & Star Rating */}
                  <div className="text-left space-y-1 pb-2 border-b border-white/[0.1] shrink-0">
                    <h2 className={`text-base sm:text-lg font-bold text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${getTitleFontClass()}`}>
                      {review.title}
                    </h2>

                    <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                      {(review.year || review.director) && (
                        <span className="text-[10px] sm:text-[10.5px] font-inter text-zinc-300 drop-shadow-sm font-normal">
                          {review.year && `${review.year}`}
                          {review.year && review.director && ` · `}
                          {review.director && `${review.mediaType === "tv" ? "Created by" : "Dir."} ${review.director}`}
                        </span>
                      )}

                      {/* Star Rating / Director Index */}
                      <div>
                        {renderCardRating("w-3 h-3", "text-[10px]", "end")}
                      </div>
                    </div>

                    {showHairlineAccent && (
                      <div
                        className="w-10 h-[1.5px] mt-1 opacity-85"
                        style={{ backgroundColor: activePalette.primary }}
                      />
                    )}
                  </div>

                  {/* Standout Quote Callout on Slide 1 */}
                  {showStandoutQuote && activeSlideIndex === 0 && standoutQuoteText.trim() && (
                    <div
                      className={`my-2 p-3 rounded-2xl border-l-[3px] shadow-lg relative overflow-hidden shrink-0 ${getMaterialBoxClass()}`}
                      style={{ borderColor: activePalette.primary }}
                    >
                      <div className="flex items-start gap-2.5">
                        <Quote
                          className="w-4 h-4 shrink-0 mt-0.5 opacity-90"
                          style={{ color: activePalette.primary }}
                        />
                        <p className={`text-[13px] sm:text-[13.5px] font-bold text-white leading-snug tracking-tight drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                          "{standoutQuoteText.trim()}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* The rest of the card filled with the logged review */}
                  <div className={`flex-1 pt-2 pb-1 overflow-hidden flex flex-col min-h-0 justify-start rounded-xl p-3 my-1 ${getMaterialBoxClass()}`}>
                    <FormattedReviewText
                      content={reviewSlides[activeSlideIndex] || "No review content."}
                      variant="story"
                      density={textDensity}
                      revealSpoilers={true}
                      fontClassName={bodyFont === "jetbrains" ? "font-jetbrains font-mono" : bodyFont === "poppins" ? "font-poppins" : bodyFont === "playfair" ? "font-playfair" : bodyFont === "cinzel" ? "font-cinzel" : "font-inter"}
                      isItalic={isReviewItalic}
                      textAlign={quoteAlignment}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* -------------------- CARD BOTTOM FOOTER -------------------- */}
              {hasFooterContent ? (
                <div className="relative z-10 px-5 pb-6 pt-2.5 flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0">
                  {effectiveHandle ? (
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3 h-3" style={{ color: activePalette.primary }} />
                      <span className="text-[9.5px] font-inter text-zinc-300 tracking-wider font-semibold">
                        {effectiveHandle}
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
                      <span>Reset Framing</span>
                    </button>

                    <span className="text-[10px] font-mono text-zinc-400 italic">
                      ✨ Story Card Only · Isolated from site
                    </span>
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

            {/* Standout Quote Callout (Optional Slide 1 Critique Hook) */}
            <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Standout Quote Callout (Slide 1 Hook)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-inter text-zinc-400 hover:text-white">
                  <input
                    type="checkbox"
                    checked={showStandoutQuote}
                    onChange={(e) => setShowStandoutQuote(e.target.checked)}
                    className="accent-[#ff5500] w-3 h-3 cursor-pointer"
                  />
                  <span className={showStandoutQuote ? "text-white font-medium" : ""}>
                    {showStandoutQuote ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              {showStandoutQuote && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px] font-inter text-zinc-400">
                    <span>Feature a punchy one-liner or critique hook in bold editorial typography</span>
                    <button
                      type="button"
                      onClick={() => setStandoutQuoteText(getInitialStandoutQuote(review.review))}
                      className="text-[#ff7a29] hover:underline cursor-pointer font-medium"
                      title="Auto-extract punchy sentence from review"
                    >
                      Auto-Extract
                    </button>
                  </div>
                  <input
                    type="text"
                    value={standoutQuoteText}
                    onChange={(e) => setStandoutQuoteText(e.target.value)}
                    placeholder="e.g. A haunting, masterclass in neo-noir atmosphere..."
                    className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl px-3 py-2 text-xs font-poppins text-white outline-none transition-all placeholder-zinc-600"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span>Displays on Slide 1</span>
                    <span className={standoutQuoteText.length > 130 ? "text-amber-400 font-bold" : ""}>
                      {standoutQuoteText.length} chars
                    </span>
                  </div>
                </div>
              )}
            </div>

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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-[#ff5500]" />
                    <span>Card Layout Presets (6 Styles)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {theme === "cinematic" && "Cinematic Glass"}
                    {theme === "poster_hero" && "Poster Hero"}
                    {theme === "editorial" && "Editorial Journal"}
                    {theme === "monolith" && "Auteur Monolith"}
                    {theme === "cinemascope" && "Cinemascope 2.39:1"}
                    {theme === "masthead" && "Cahiers Masthead"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "cinematic", title: "Cinematic Glass", desc: "Balanced floating poster & review quote" },
                    { id: "poster_hero", title: "Poster Hero", desc: "Large hero poster with floating quote" },
                    { id: "editorial", title: "Editorial Journal", desc: "Compact poster with editorial column" },
                    { id: "monolith", title: "Auteur Monolith", desc: "Museum monograph with pristine Swiss hierarchy" },
                    { id: "cinemascope", title: "Cinemascope 2.39:1", desc: "Anamorphic letterbox with director critique deck" },
                    { id: "masthead", title: "Cahiers Masthead", desc: "Prestigious European film broadsheet masthead" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const nextTheme = t.id as StoryTheme;
                        setTheme(nextTheme);
                        if (nextTheme === "poster_hero") {
                          setQuoteAlignment("center");
                        } else {
                          setQuoteAlignment("left");
                        }
                        if (nextTheme === "editorial" || nextTheme === "masthead") {
                          setTitleFont("cinzel");
                          setBodyFont("playfair");
                        } else if (nextTheme === "monolith") {
                          setTitleFont("cinzel");
                          setBodyFont("inter");
                        } else {
                          setTitleFont("poppins");
                          setBodyFont("inter");
                        }
                      }}
                      className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        theme === t.id
                          ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_16px_rgba(255,85,0,0.25)]"
                          : "bg-[#0c0f16] border-white/[0.07] hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-bold font-poppins text-white flex items-center justify-between">
                        <span>{t.title}</span>
                        {theme === t.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] shadow-[0_0_6px_#ff5500]" />
                        )}
                      </div>
                      <div className="text-[10px] font-inter text-zinc-400 mt-1 leading-snug">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Typography & Directorial Aesthetics Suite (Applies to both Summary and Full Set) */}
            <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Typography & Directorial Aesthetics</span>
                </div>
                <span className="text-[10px] font-mono text-[#ff7a29] font-bold">Both Modes</span>
              </div>

              {/* Review Font & Italics Control Bar */}
              <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-inter text-zinc-300 font-medium">
                    Review / Critique Typography
                  </label>
                  {/* Italics Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsReviewItalic((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-inter border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isReviewItalic
                        ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                        : "bg-white/[0.04] border-white/[0.1] text-zinc-300 hover:text-white"
                    }`}
                    title="Toggle italic style for the review text"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>Italics: {isReviewItalic ? "ON" : "OFF"}</span>
                  </button>
                </div>

                {/* Body Font Family Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-0.5">
                  {[
                    { id: "inter", label: "Inter", desc: "Modern Sans", fontCls: "font-inter" },
                    { id: "poppins", label: "Poppins", desc: "Clean Geo", fontCls: "font-poppins" },
                    { id: "playfair", label: "Playfair", desc: "Editorial Serif", fontCls: "font-playfair" },
                    { id: "cinzel", label: "Cinzel", desc: "Classic Roman", fontCls: "font-cinzel" },
                    { id: "jetbrains", label: "JetBrains", desc: "Typewriter Script", fontCls: "font-jetbrains font-mono" },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setBodyFont(font.id as BodyFont)}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        bodyFont === font.id
                          ? "bg-[#ff5500]/20 border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.2)]"
                          : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                      }`}
                    >
                      <div className={`text-xs font-bold text-white ${font.fontCls}`}>{font.label}</div>
                      <div className="text-[9px] font-mono text-zinc-400 mt-0.5 leading-tight">{font.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Font Family Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-inter text-zinc-300 font-medium">Film Title Typography</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: "poppins", label: "Poppins", desc: "Bold Modern", fontCls: "font-poppins font-bold" },
                    { id: "cinzel", label: "Cinzel", desc: "Auteur Roman", fontCls: "font-cinzel font-bold" },
                    { id: "playfair", label: "Playfair", desc: "Serif Classic", fontCls: "font-playfair font-bold" },
                    { id: "bebas", label: "Bebas Neue", desc: "Tall Display", fontCls: "font-bebas text-sm font-normal" },
                    { id: "jetbrains", label: "JetBrains", desc: "Production Script", fontCls: "font-jetbrains font-mono text-[11px]" },
                  ].map((titleF) => (
                    <button
                      key={titleF.id}
                      type="button"
                      onClick={() => setTitleFont(titleF.id as TitleFont)}
                      className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                        titleFont === titleF.id
                          ? "bg-[#ff5500]/20 border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.2)]"
                          : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                      }`}
                    >
                      <div className={`text-xs text-white truncate ${titleF.fontCls}`}>{titleF.label}</div>
                      <div className="text-[9px] font-mono text-zinc-400 mt-0.5 leading-tight">{titleF.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment, Material Finish, and Rating Presentation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Text Alignment */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-inter text-zinc-300">Text Alignment</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "left", label: "Left", icon: AlignLeft },
                      { id: "center", label: "Center", icon: AlignCenter },
                      { id: "justify", label: "Justify", icon: AlignJustify },
                    ].map((align) => {
                      const IconComp = align.icon;
                      return (
                        <button
                          key={align.id}
                          type="button"
                          onClick={() => setQuoteAlignment(align.id as TextAlignment)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-inter border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            quoteAlignment === align.id
                              ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                              : "bg-white/[0.02] border-white/[0.07] text-zinc-300 hover:text-white"
                          }`}
                        >
                          <IconComp className="w-3 h-3" />
                          <span>{align.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card Material Finish */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-inter text-zinc-300">Material Finish</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "obsidian", label: "Obsidian" },
                      { id: "matte", label: "Matte" },
                      { id: "ambient", label: "Ambient" },
                    ].map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setMaterialStyle(mat.id as CardMaterialStyle)}
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-inter border transition-all cursor-pointer text-center ${
                          materialStyle === mat.id
                            ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                            : "bg-white/[0.02] border-white/[0.07] text-zinc-300 hover:text-white"
                        }`}
                      >
                        {mat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rating Metric Presentation */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-inter text-zinc-300">Rating Metric Presentation</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "stars_metric", label: "Stars + Index", desc: "★★★★☆ 4.5/5" },
                    { id: "stars_minimal", label: "Minimalist Stars", desc: "★★★★☆" },
                    { id: "director_index", label: "Director Index", desc: "INDEX · 4.5 / 5" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setRatingFormat(fmt.id as RatingDisplayFormat)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        ratingFormat === fmt.id
                          ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_12px_rgba(255,85,0,0.25)]"
                          : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-bold text-white">{fmt.label}</div>
                      <div className="text-[9.5px] font-mono text-zinc-400 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Swiss Hairline Rule Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-inter text-zinc-300">
                <span>Director's Hairline Accent</span>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={showHairlineAccent}
                    onChange={(e) => setShowHairlineAccent(e.target.checked)}
                    className="accent-[#ff5500] w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-mono text-zinc-400">
                    {showHairlineAccent ? "Enabled" : "Hidden"}
                  </span>
                </label>
              </div>
            </div>

            {/* 6. Palette Accent Switcher */}
            <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Palette Accent (Story Tone)</span>
                </label>
                <span className="text-[10px] font-mono font-bold" style={{ color: activePalette.secondary }}>
                  {activePalette.name}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PALETTE_PRESETS.map((p) => {
                  const isSelected = p.id === activePalette.id && selectedPaletteId !== "custom";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPaletteId(p.id)}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white/[0.08] shadow-sm"
                          : "bg-white/[0.02] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.05]"
                      }`}
                      style={isSelected ? { borderColor: p.primary, boxShadow: `0 0 12px ${p.glow}` } : {}}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: p.primary, boxShadow: `0 0 6px ${p.primary}` }}
                      />
                      <span className="text-[10.5px] font-poppins text-zinc-200 truncate font-medium">
                        {p.name.replace(/(Retro |Monochrome |Cyber )/, "")}
                      </span>
                    </button>
                  );
                })}

                {/* Custom Color Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPaletteId("custom")}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedPaletteId === "custom"
                      ? "bg-white/[0.08] shadow-sm"
                      : "bg-white/[0.02] border-white/[0.07] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                  style={
                    selectedPaletteId === "custom"
                      ? { borderColor: activePalette.primary, boxShadow: `0 0 12px ${activePalette.glow}` }
                      : {}
                  }
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{
                      backgroundColor: selectedPaletteId === "custom" ? activePalette.primary : "#a855f7",
                      boxShadow: selectedPaletteId === "custom" ? `0 0 6px ${activePalette.primary}` : "none",
                    }}
                  />
                  <span className="text-[10.5px] font-poppins text-zinc-200 truncate font-medium">
                    Custom...
                  </span>
                </button>
              </div>

              {/* Custom Color Picker & Hex Input Drawer */}
              {selectedPaletteId === "custom" && (
                <div className="p-3 rounded-xl bg-[#08090d] border border-white/10 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Visual Color Picker (Clickable swatch + native browser picker) */}
                      <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/25 shrink-0 cursor-pointer shadow-md group">
                        <div
                          className="w-full h-full flex items-center justify-center transition-transform group-hover:scale-105"
                          style={{ backgroundColor: activePalette.primary }}
                        >
                          <Pipette className="w-4 h-4 text-white drop-shadow" />
                        </div>
                        <input
                          type="color"
                          value={customColorHex.startsWith("#") && customColorHex.length === 7 ? customColorHex : "#ff5500"}
                          onChange={(e) => {
                            setCustomColorHex(e.target.value);
                            setSelectedPaletteId("custom");
                          }}
                          className="absolute -inset-2 w-16 h-16 opacity-0 cursor-pointer"
                          title="Click to open visual color picker"
                        />
                      </div>

                      {/* HEX Text Input */}
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-mono text-zinc-400">CUSTOM HEX COLOR</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customColorHex}
                            onChange={(e) => {
                              let val = e.target.value.trim();
                              if (!val.startsWith("#") && val.length > 0) val = `#${val}`;
                              setCustomColorHex(val);
                              setSelectedPaletteId("custom");
                            }}
                            placeholder="#ff5500"
                            maxLength={7}
                            className="bg-[#050608] border border-white/15 focus:border-[#ff5500] rounded-lg px-2.5 py-1 text-xs font-mono text-white outline-none w-24 uppercase"
                          />
                          <span className="text-[10px] font-inter text-zinc-500">Pick color or paste hex</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Tone Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] self-start sm:self-auto">
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm"
                        style={{ backgroundColor: activePalette.primary, boxShadow: `0 0 8px ${activePalette.primary}` }}
                      />
                      <span className="text-[11px] font-mono font-bold text-white uppercase">{activePalette.primary}</span>
                    </div>
                  </div>

                  {/* Cinematic Color Ideas */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06] overflow-x-auto scrollbar-none">
                    <span className="text-[10px] font-mono text-zinc-500 mr-1 shrink-0">Try:</span>
                    {[
                      { name: "Purple", hex: "#a855f7" },
                      { name: "Violet", hex: "#7c3aed" },
                      { name: "Pink", hex: "#f43f5e" },
                      { name: "Amber", hex: "#f59e0b" },
                      { name: "Sky", hex: "#38bdf8" },
                      { name: "Lime", hex: "#84cc16" },
                    ].map((sug) => (
                      <button
                        key={sug.hex}
                        type="button"
                        onClick={() => {
                          setCustomColorHex(sug.hex);
                          setSelectedPaletteId("custom");
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-zinc-300 transition-colors shrink-0 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sug.hex }} />
                        <span>{sug.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 6. Footer Watermark & Instagram Handle Selector */}
            <div className="p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Footer Watermark / Handle</span>
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  {effectiveHandle || "Hidden"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "theretrotalks", label: "@theretrotalks" },
                  { id: "personal", label: "@vishakhanpillai" },
                  { id: "custom", label: "Custom Handle" },
                  { id: "hidden", label: "Off (Hidden)" },
                ].map((h) => {
                  const isSelected = footerHandleOption === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setFooterHandleOption(h.id as FooterHandleOption)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-inter transition-all cursor-pointer border text-center ${
                        isSelected
                          ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-[0_0_12px_rgba(255,85,0,0.35)]"
                          : "bg-white/[0.03] text-zinc-400 hover:text-white border-white/[0.07]"
                      }`}
                    >
                      {h.label}
                    </button>
                  );
                })}
              </div>

              {footerHandleOption === "custom" && (
                <div className="pt-1 space-y-1 animate-in fade-in duration-200">
                  <input
                    type="text"
                    value={customHandle}
                    onChange={(e) => setCustomHandle(e.target.value)}
                    placeholder="@yourhandle or theretrotalks.com"
                    className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl px-3 py-1.5 text-xs font-inter text-white outline-none"
                  />
                </div>
              )}
            </div>

            {/* 7. Backdrop Ambiance Controls */}
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
          mediaType={review.mediaType}
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
          mediaType={review.mediaType}
          currentBackdropUrl={currentBackdrop}
          isOpen={showBackdropSelector}
          onClose={() => setShowBackdropSelector(false)}
          onSelectBackdrop={handleSelectBackdrop}
        />
      )}
    </div>
  );
};
