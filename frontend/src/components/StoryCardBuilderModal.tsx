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
  SlidersHorizontal,
  Eye,
  LayoutGrid,
} from "lucide-react";
import { toPng } from "html-to-image";
import JSZip from "jszip";
import type { Review } from "../types";
import { getBackdropUrl, getPosterUrl, toProxyUrl } from "../utils/images";
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
  | "editorial";
type StudioMode = "summary" | "rating" | "full_set";
type FooterHandleOption = "theretrotalks" | "personal" | "custom" | "hidden";
type BodyFont = "inter" | "poppins";
type TitleFont = "poppins" | "inter";
type TitleWeight = "normal" | "medium" | "semibold";
type TitleSize = "sm" | "base" | "lg" | "xl" | "2xl";
type TextAlignment = "left" | "center" | "justify";
type RatingDisplayFormat = "stars_metric" | "stars_minimal";
type StudioTab = "presets" | "typography" | "artwork" | "spacing" | "branding";
type MobileViewMode = "split" | "preview" | "controls";

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
interface DynamicSlideOptions {
  density?: "dense" | "standard" | "spacious";
  hasTopLogo?: boolean;
  hasHeadlineBadge?: boolean;
  title?: string;
  titleSize?: "sm" | "base" | "lg" | "xl" | "2xl";
  hasSlide1Callout?: boolean;
  standoutQuote?: string;
  hasFooter?: boolean;
  cardPaddingX?: number;
  topBarPaddingY?: number;
  footerPaddingY?: number;
  headerGapY?: number;
  customFontSize?: number | null;
  customLineHeight?: number | null;
}

/**
 * Break long sentences into natural, reader-friendly clause segments so text
 * can seamlessly flow right to the bottom line of the story card without stranding empty lines.
 */
const splitIntoSegments = (paragraph: string): string[] => {
  const sentenceRegex = /[^.!?]+(?:[.!?]+(?:\s+|$)|$)/g;
  const rawSentences = paragraph.match(sentenceRegex) || [paragraph];
  const segments: string[] = [];

  for (const rawSent of rawSentences) {
    const sent = rawSent.trim();
    if (!sent) continue;

    // Short or medium sentences stay intact
    if (sent.length <= 110) {
      segments.push(sent);
      continue;
    }

    // Long sentences break naturally at clauses (commas, semicolons, em-dashes, conjunctions)
    const clauseParts = sent.split(/(?<=[;,—–]|\b(?:and|but|while|although|because)\b)\s+/);
    let buffer = "";
    for (const part of clauseParts) {
      if (!buffer) {
        buffer = part;
      } else if ((buffer + " " + part).length <= 95) {
        buffer += " " + part;
      } else {
        segments.push(buffer.trim());
        buffer = part;
      }
    }
    if (buffer.trim()) {
      segments.push(buffer.trim());
    }
  }

  return segments;
};

/**
 * Dynamically computes the exact character capacity for a 360x640 story slide based on
 * the active presence and dimensions of top bar logo, badge, title wrapping, standout quote callout,
 * footer handle/genres, chosen typographic density, and custom manual insets/typography.
 */
const calculateDynamicCapacity = (
  options: DynamicSlideOptions,
  isSlide1: boolean
): number => {
  const {
    density = "dense",
    hasTopLogo = true,
    hasHeadlineBadge = true,
    title = "",
    titleSize = "lg",
    hasSlide1Callout = false,
    standoutQuote = "",
    hasFooter = true,
    cardPaddingX = 16,
    topBarPaddingY = 28,
    footerPaddingY = 16,
    headerGapY = 6,
    customFontSize = null,
    customLineHeight = null,
  } = options;

  let availableHeight = 640;

  // 1. Top Bar (Logo watermark & badge tag)
  if (hasTopLogo || hasHeadlineBadge) {
    availableHeight -= (topBarPaddingY + 20); // top padding + content (16px) + bottom spacing
  } else {
    availableHeight -= Math.max(10, Math.floor(topBarPaddingY / 2));
  }

  // 2. Title & Metadata Header
  const charsPerLineMap: Record<string, number> = {
    sm: 32,
    base: 28,
    lg: 24,
    xl: 20,
    "2xl": 17,
  };
  const tCpl = charsPerLineMap[titleSize] || 24;
  const titleLines = Math.max(1, Math.ceil((title.length || 10) / tCpl));
  const titleHeightPerLine =
    titleSize === "2xl" ? 28 : titleSize === "xl" ? 25 : 22;
  const titleHeaderHeight = titleLines * titleHeightPerLine + 24;
  availableHeight -= (titleHeaderHeight + headerGapY);

  // 3. Slide 1 Callout Quote (if active on slide 1)
  if (isSlide1 && hasSlide1Callout && standoutQuote.trim()) {
    const qLines = Math.max(1, Math.ceil(standoutQuote.trim().length / 40));
    const calloutHeight = qLines * 17 + 28;
    availableHeight -= calloutHeight;
  }

  // 4. Footer (Handle watermark and/or genres)
  if (hasFooter) {
    availableHeight -= (footerPaddingY + 22);
  } else {
    availableHeight -= 12;
  }

  // Safe inner container padding
  availableHeight -= 6;

  // 5. Typography metrics per density & custom overrides
  const defaultMetrics = {
    dense: { fontSize: 11, lineHeight: 16.7 },
    standard: { fontSize: 12, lineHeight: 19.0 },
    spacious: { fontSize: 13, lineHeight: 21.6 },
  }[density] || { fontSize: 11, lineHeight: 16.7 };

  const effFontSize = customFontSize || defaultMetrics.fontSize;
  const effLineHeight = customLineHeight
    ? effFontSize * customLineHeight
    : defaultMetrics.lineHeight * (effFontSize / defaultMetrics.fontSize);

  // Container width based on cardPaddingX
  const containerWidth = Math.max(260, 360 - 2 * cardPaddingX);
  const avgCharWidth = effFontSize * 0.56;
  const charsPerLine = Math.max(25, Math.floor(containerWidth / avgCharWidth));

  const usableLines = Math.max(8, Math.floor(availableHeight / effLineHeight));
  return usableLines * charsPerLine;
};

/**
 * Split a full review into seamless, balanced story slides for 9:16 vertical cards.
 * Calibrated across all 3 card word capacity frameworks (Max Words, Standard, Spacious)
 * so every card is fully utilized right down to the footer with zero awkward bottom voids.
 */
const splitReviewIntoSlides = (
  text: string,
  options: DynamicSlideOptions = {}
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

  // Normalize text: uniform newlines, clean whitespace-only lines, and collapse 3+ newlines
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const normalCap = calculateDynamicCapacity(options, false);
  const slide1Cap = calculateDynamicCapacity(options, true);

  if (clean.length <= slide1Cap) {
    return [clean];
  }

  // Calculate ideal slide count so slides are fully packed and uniform
  const minSlides = Math.max(2, Math.ceil(clean.length / normalCap));
  const avgTarget = Math.ceil(clean.length / minSlides);
  const isHighFullness = avgTarget >= normalCap * 0.85;

  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.replace(/([^\s])\n([^\s])/g, "$1 $2").trim())
    .filter(Boolean);

  const slides: string[] = [];
  let currentSlide = "";

  const getCurrentLimit = () => {
    const isSlide1 = slides.length === 0;
    const physicalCap = calculateDynamicCapacity(options, isSlide1);
    const remainingTextLen = clean.length - slides.reduce((acc, s) => acc + s.length, 0);
    const slidesRemaining = minSlides - slides.length;

    // On the final intended slide, allow up to physicalCap * 1.10 to absorb remaining text cleanly
    if (slidesRemaining <= 1) {
      return physicalCap * 1.10;
    }

    if (!isHighFullness) {
      return physicalCap;
    }

    const currentSlideTarget = Math.ceil(remainingTextLen / slidesRemaining);
    // Allow slide to fill comfortably between currentSlideTarget and physicalCap
    return Math.min(physicalCap, Math.max(currentSlideTarget + 30, Math.floor(physicalCap * 0.94)));
  };

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const p = paragraphs[pIdx];
    const limit = getCurrentLimit();
    const gapWeight = currentSlide ? 25 : 0;
    const candidate = currentSlide ? currentSlide + "\n\n" + p : p;

    // A. If whole paragraph fits into current slide, append it!
    if (candidate.length + gapWeight <= limit) {
      currentSlide = candidate;
      continue;
    }

    // B. The paragraph does not fit completely.
    // Break into natural segments (sentences and clauses) to fill up the card cleanly
    const segments = splitIntoSegments(p);
    let pHead = "";
    let sIdx = 0;

    for (; sIdx < segments.length; sIdx++) {
      const seg = segments[sIdx];
      const sCandidate = pHead ? pHead + " " + seg : seg;
      const totalCandidate = currentSlide ? currentSlide + "\n\n" + sCandidate : sCandidate;

      if (totalCandidate.length + gapWeight <= limit) {
        pHead = sCandidate;
      } else {
        break;
      }
    }

    if (pHead) {
      currentSlide = currentSlide ? currentSlide + "\n\n" + pHead : pHead;
      slides.push(currentSlide.trim());
      currentSlide = "";

      const remainingSegments = segments.slice(sIdx);
      if (remainingSegments.length > 0) {
        currentSlide = remainingSegments.join(" ").trim();
      }
    } else {
      if (currentSlide) {
        slides.push(currentSlide.trim());
      }
      currentSlide = p;
    }
  }

  if (currentSlide.trim()) {
    // If the remaining text is very small and we already reached minSlides,
    // merge into previous slide instead of creating an orphan slide!
    if (slides.length >= minSlides && currentSlide.trim().length < normalCap * 0.2) {
      slides[slides.length - 1] = (slides[slides.length - 1] + "\n\n" + currentSlide.trim()).trim();
    } else {
      slides.push(currentSlide.trim());
    }
  }

  return slides.length > 0 ? slides : [clean];
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
  const [titleWeight, setTitleWeight] = useState<TitleWeight>("semibold");
  const [titleSize, setTitleSize] = useState<TitleSize>("lg");
  const [isReviewItalic, setIsReviewItalic] = useState<boolean>(true);
  const [quoteAlignment, setQuoteAlignment] = useState<TextAlignment>("left");
  const [verticalAlignment, setVerticalAlignment] = useState<"auto" | "top" | "center">("auto");
  const [ratingFormat, setRatingFormat] = useState<RatingDisplayFormat>("stars_metric");
  const [showHairlineAccent, setShowHairlineAccent] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<StudioTab>("presets");
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>("split");

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

  // 4. Manual Layout & Spacing Engine State (Full User Control)
  const [cardPaddingX, setCardPaddingX] = useState<number>(16);
  const [topBarPaddingY, setTopBarPaddingY] = useState<number>(28);
  const [footerPaddingY, setFooterPaddingY] = useState<number>(16);
  const [headerGapY, setHeaderGapY] = useState<number>(6);

  // Typography Fine-Tuning Overrides
  const [customFontSize, setCustomFontSize] = useState<number | null>(null);
  const [customLineHeight, setCustomLineHeight] = useState<number | null>(null);
  const [customParagraphSpacing, setCustomParagraphSpacing] = useState<number | null>(null);

  // Element Sizing & Scale Overrides
  const [posterScale, setPosterScale] = useState<number>(100);
  const [titleScale, setTitleScale] = useState<number>(100);
  const [starRatingScale, setStarRatingScale] = useState<number>(100);
  const [contentShiftY, setContentShiftY] = useState<number>(0);
  const [summaryFontSize, setSummaryFontSize] = useState<number | null>(null);
  const [imageBorderMode, setImageBorderMode] = useState<"website" | "none" | "subtle" | "accent">("website");

  const getImageBorderClass = () => {
    if (imageBorderMode === "none") return "border border-transparent";
    if (imageBorderMode === "subtle") return "border border-white/20";
    if (imageBorderMode === "accent") return "border border-[#ff5500]/50";
    return "border border-[#07080a]"; // same color as website
  };

  const getCardBorderClass = () => {
    if (isCroppingBackdrop) return "cursor-move border-2 border-[#ff5500] ring-2 ring-[#ff5500]/50";
    if (imageBorderMode === "none") return "border border-transparent";
    if (imageBorderMode === "subtle") return "border border-white/10";
    if (imageBorderMode === "accent") return "border border-[#ff5500]/40";
    return "border border-[#07080a]"; // same color as website
  };

  const handleResetManualLayout = () => {
    setCardPaddingX(16);
    setTopBarPaddingY(studioMode === "summary" ? 44 : studioMode === "rating" ? 44 : 28);
    setFooterPaddingY(16);
    setHeaderGapY(6);
    setCustomFontSize(null);
    setCustomLineHeight(null);
    setCustomParagraphSpacing(null);
    setPosterScale(100);
    setTitleScale(100);
    setStarRatingScale(100);
    setContentShiftY(0);
    setSummaryFontSize(null);
    setImageBorderMode("website");
  };

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
      setTitleWeight("semibold");
      setTitleSize("lg");
      setBodyFont("inter");
      setIsReviewItalic(true);
      setQuoteAlignment("left");
      setVerticalAlignment("auto");
      setRatingFormat("stars_metric");
      setShowHairlineAccent(true);
      setSelectedPaletteId("orange");
      setCustomColorHex("#ff5500");
      setFooterHandleOption("theretrotalks");
      setCustomHandle("@vishakhanpillai");
      setShowStandoutQuote(false);
      setStandoutQuoteText(getInitialStandoutQuote(review.review));
      setCardPaddingX(16);
      setTopBarPaddingY(28);
      setFooterPaddingY(16);
      setHeaderGapY(6);
      setCustomFontSize(null);
      setCustomLineHeight(null);
      setCustomParagraphSpacing(null);
      setPosterScale(100);
      setTitleScale(100);
      setStarRatingScale(100);
      setContentShiftY(0);
      setSummaryFontSize(null);
      setImageBorderMode("website");
      setActiveTab("presets");
      setMobileViewMode("split");
      setIsExporting(false);
      setExportProgress("");
    }
  }, [isOpen, review.id]);

  const fetchAsDataUrl = useCallback(async (url: string | null): Promise<string> => {
    if (!url) return "";
    const proxyUrl = toProxyUrl(url);
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) return proxyUrl;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(proxyUrl);
        reader.readAsDataURL(blob);
      });
    } catch {
      return proxyUrl;
    }
  }, []);

  // Preload poster and backdrop through proxy as base64 for instant, lossless export
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const rawPoster = getPosterUrl(currentPoster, "w500");
    const rawBackdrop = getBackdropUrl(currentBackdrop, "original");

    setPosterDataUrl("");
    setBackdropDataUrl("");

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
  }, [isOpen, currentPoster, currentBackdrop, fetchAsDataUrl]);

  const hasSlide1Callout = showStandoutQuote && Boolean(standoutQuoteText.trim());
  const hasFooter = Boolean(effectiveHandle) || (showGenres && Boolean(review.genres && review.genres.length > 0));
  const hasTopLogo = showWatermark;
  const hasHeadlineBadge = showBadgeTag && Boolean(headline.trim());

  // Derived slide list for full review set dynamically adjusted to all active card elements
  const reviewSlides = useMemo(() => {
    return splitReviewIntoSlides(fullReviewText, {
      density: textDensity,
      hasTopLogo,
      hasHeadlineBadge,
      title: review.title || "",
      titleSize,
      hasSlide1Callout,
      standoutQuote: standoutQuoteText,
      hasFooter,
      cardPaddingX,
      topBarPaddingY,
      footerPaddingY,
      headerGapY,
      customFontSize,
      customLineHeight,
    });
  }, [
    fullReviewText,
    textDensity,
    hasTopLogo,
    hasHeadlineBadge,
    review.title,
    titleSize,
    hasSlide1Callout,
    standoutQuoteText,
    hasFooter,
    cardPaddingX,
    topBarPaddingY,
    footerPaddingY,
    headerGapY,
    customFontSize,
    customLineHeight,
  ]);

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
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Ensure base64 image data URLs are loaded before snapshotting
      const rawPoster = getPosterUrl(currentPoster, "w500");
      const rawBackdrop = getBackdropUrl(currentBackdrop, "original");
      if (!backdropDataUrl && rawBackdrop) {
        const data = await fetchAsDataUrl(rawBackdrop);
        if (data) setBackdropDataUrl(data);
      }
      if (!posterDataUrl && rawPoster) {
        const data = await fetchAsDataUrl(rawPoster);
        if (data) setPosterDataUrl(data);
      }

      const dataUrl = await toPng(cardRef.current, {
        width: 360,
        height: 640,
        pixelRatio: 3,
        cacheBust: false,
        quality: 0.98,
        style: {
          transform: "none",
          transformOrigin: "top left",
          margin: "0",
        },
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
      // Ensure base64 image data URLs are loaded before snapshotting slides
      const rawPoster = getPosterUrl(currentPoster, "w500");
      const rawBackdrop = getBackdropUrl(currentBackdrop, "original");
      if (!backdropDataUrl && rawBackdrop) {
        const data = await fetchAsDataUrl(rawBackdrop);
        if (data) setBackdropDataUrl(data);
      }
      if (!posterDataUrl && rawPoster) {
        const data = await fetchAsDataUrl(rawPoster);
        if (data) setPosterDataUrl(data);
      }

      const zip = new JSZip();

      for (let i = 0; i < reviewSlides.length; i++) {
        setCurrentSlideIndex(i);
        setExportProgress(`Rendering slide ${i + 1} of ${reviewSlides.length}...`);
        // Allow DOM to update and paint slide i
        await new Promise((resolve) => setTimeout(resolve, 200));

        if (!cardRef.current) continue;
        if (document.fonts) {
          await document.fonts.ready;
        }

        const dataUrl = await toPng(cardRef.current, {
          width: 360,
          height: 640,
          pixelRatio: 3,
          cacheBust: false,
          quality: 0.98,
          style: {
            transform: "none",
            transformOrigin: "top left",
            margin: "0",
          },
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

  // Formatting helpers (ensuring all remote images default to CORS-safe proxy to avoid canvas tainting)
  const rawBackdrop = getBackdropUrl(currentBackdrop, "original");
  const rawPoster = getPosterUrl(currentPoster, "w500");
  const displayBackdrop = backdropDataUrl || (rawBackdrop ? toProxyUrl(rawBackdrop) : "");
  const displayPoster = posterDataUrl || (rawPoster ? toProxyUrl(rawPoster) : "");
  const hasFooterContent = hasFooter;
  const hasReviewContent = Boolean(
    (showStandoutQuote && standoutQuoteText.trim()) ||
    (summaryReview && summaryReview.trim())
  );

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

  const getTitleWeightClass = () => {
    switch (titleWeight) {
      case "normal":
        return "font-normal";
      case "medium":
        return "font-medium";
      case "semibold":
      default:
        return "font-semibold";
    }
  };

  const getTitleSizeClass = () => {
    switch (titleSize) {
      case "sm":
        return "text-sm";
      case "base":
        return "text-base";
      case "lg":
        return "text-lg";
      case "xl":
        return "text-xl";
      case "2xl":
        return "text-2xl";
      default:
        return "text-lg";
    }
  };

  const getTitleStyle = (): React.CSSProperties => {
    if (titleScale === 100) return {};
    const basePxMap: Record<TitleSize, number> = {
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      "2xl": 24,
    };
    const basePx = basePxMap[titleSize] || 18;
    const scaledPx = Math.round(basePx * (titleScale / 100));
    return {
      fontSize: `${scaledPx}px`,
      lineHeight: "1.2",
    };
  };

  const getTitleFontClass = () => {
    const weightClass = getTitleWeightClass();
    switch (titleFont) {
      case "inter":
        return `font-inter tracking-tight ${weightClass}`;
      case "poppins":
      default:
        return `font-poppins tracking-tight ${weightClass}`;
    }
  };

  const getQuoteFontClass = () => {
    const fontClass = bodyFont === "poppins" ? "font-poppins" : "font-inter";
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
    return "backdrop-blur-xl bg-black/60 border border-white/[0.09] shadow-[0_20px_50px_rgba(0,0,0,0.85)]";
  };

  const renderCardRating = (
    sizeClass = "w-3.5 h-3.5",
    textClass = "text-[11px]",
    align: "center" | "start" | "end" = "center"
  ) => {
    const scaleStyle: React.CSSProperties =
      starRatingScale !== 100
        ? {
            transform: `scale(${starRatingScale / 100})`,
            transformOrigin: align === "start" ? "left center" : align === "end" ? "right center" : "center",
          }
        : {};

    const itemsAlign = align === "start" ? "items-start" : align === "end" ? "items-end" : "items-center";

    return (
      <div style={scaleStyle} className={`flex flex-col ${itemsAlign} justify-center gap-0.5 py-0.5`}>
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((starIndex) =>
            renderStoryStar(starIndex, rating, sizeClass)
          )}
        </div>
        {ratingFormat === "stars_metric" && (
          <span
            className={`${textClass} font-poppins font-semibold tracking-wider drop-shadow-sm pt-0.5`}
            style={{ color: activePalette.secondary }}
          >
            {formatStoryCardRating(rating)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-0 sm:p-3 md:p-5 bg-black/90 backdrop-blur-2xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-[1540px] h-[100dvh] sm:h-[95vh] max-h-none sm:max-h-[96vh] bg-[#090b0e] border sm:border border-white/[0.12] rounded-none sm:rounded-3xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.98),0_0_60px_rgba(255,85,0,0.12)] flex flex-col">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.08] bg-[#0c0f16]/95 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30 flex-shrink-0 shadow-[0_0_12px_rgba(255,85,0,0.25)]">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-poppins text-white truncate">
                  Story Studio
                </h3>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#ff5500]/25">
                  9:16 · 1080×1920 UHD
                </span>
                <span className="hidden xl:inline-block px-2.5 py-0.5 rounded-full bg-white/[0.05] text-zinc-300 text-[10px] font-mono border border-white/10 truncate max-w-[240px]">
                  {review.title}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-inter text-zinc-400 truncate max-w-[180px] sm:max-w-md">
                Cinema social card studio · {theme === "cinematic" ? "Cinematic Glass" : theme === "poster_hero" ? "Poster Hero" : "Editorial Journal"}
              </p>
            </div>
          </div>

          {/* Center Mode Switcher */}
          <div className="hidden md:flex items-center bg-[#07080a] p-1 rounded-2xl border border-white/[0.08] shadow-inner">
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
              <span>Review Summary</span>
            </button>

            <button
              type="button"
              onClick={() => setStudioMode("rating")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-poppins transition-all cursor-pointer ${
                studioMode === "rating"
                  ? "bg-[#ff5500] text-black font-bold shadow-[0_0_15px_rgba(255,85,0,0.35)]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Rating Only</span>
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {studioMode === "full_set" ? (
              <>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isExporting || reviewSlides.length === 0}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
                  title="Download all generated story slides zipped together"
                >
                  <Archive className="w-4 h-4" />
                  <span>
                    {isExporting ? (
                      exportProgress || "ZIP..."
                    ) : (
                      <>
                        <span className="hidden sm:inline">Export </span>ZIP ({reviewSlides.length})
                      </>
                    )}
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
                className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExporting ? (
                    exportProgress || "Exporting..."
                  ) : (
                    <>
                      <span className="hidden sm:inline">Download </span>PNG
                    </>
                  )}
                </span>
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

        {/* Mobile Control Ribbon (Visible on small screens: Mode Switcher + Mobile View Switcher) */}
        <div className="flex lg:hidden items-center justify-between px-3 py-1.5 border-b border-white/[0.08] bg-[#07080a] gap-2 flex-shrink-0">
          {/* Format Selector */}
          <div className="flex items-center bg-[#0c0f16] p-0.5 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setStudioMode("summary")}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                studioMode === "summary"
                  ? "bg-[#ff5500] text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Summary
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("rating")}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                studioMode === "rating"
                  ? "bg-[#ff5500] text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Rating
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("full_set")}
              className={`px-2 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                studioMode === "full_set"
                  ? "bg-[#ff5500] text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Full Set
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-[#0c0f16] p-0.5 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setMobileViewMode("split")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                mobileViewMode === "split"
                  ? "bg-white/[0.15] text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Split View: Miniature Card + Controls"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode("preview")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                mobileViewMode === "preview"
                  ? "bg-white/[0.15] text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Full Card Preview"
            >
              <Eye className="w-3 h-3" />
              <span>Card</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode("controls")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-poppins transition-all cursor-pointer ${
                mobileViewMode === "controls"
                  ? "bg-white/[0.15] text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title="Full Controls View"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Modal Content: Dual Column Workspace */}
        <div className="flex flex-col lg:flex-row flex-grow overflow-hidden min-h-0">
          
          {/* Left Column: Live 9:16 Story Card Viewport & Cinema Stage */}
          <div
            className={`w-full flex-shrink-0 bg-[#060709] border-b lg:border-b-0 lg:border-r border-white/[0.08] relative overflow-hidden transition-all duration-200 ${
              mobileViewMode === "split"
                ? "h-[33vh] sm:h-[36vh] max-h-[280px] p-2 flex flex-col items-center justify-center lg:h-auto lg:max-h-none lg:w-[480px] xl:w-[540px] 2xl:w-[580px] lg:p-6 lg:justify-between"
                : mobileViewMode === "preview"
                ? "flex-1 min-h-0 p-3 sm:p-5 flex flex-col items-center justify-between lg:w-[480px] xl:w-[540px] 2xl:w-[580px] lg:p-6"
                : "absolute opacity-0 pointer-events-none -left-[9999px] lg:static lg:opacity-100 lg:pointer-events-auto lg:left-0 lg:w-[480px] xl:w-[540px] 2xl:w-[580px] lg:p-6 lg:flex lg:flex-col lg:items-center lg:justify-between"
            }`}
          >
            {/* Ambient Lighting & Glow */}
            <div
              className="absolute inset-0 pointer-events-none transition-all duration-700 opacity-25 blur-3xl"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${activePalette.glow}, transparent 75%)`,
              }}
            />

            {/* Split Mode Tap-to-Expand Badge (Mobile only) */}
            {mobileViewMode === "split" && (
              <button
                type="button"
                onClick={() => setMobileViewMode("preview")}
                className="lg:hidden absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 hover:bg-[#ff5500] hover:text-black border border-white/20 text-zinc-300 text-[10px] font-mono backdrop-blur-md shadow-lg transition-all cursor-pointer"
                title="Expand to Full Card Preview"
              >
                <Eye className="w-2.5 h-2.5 text-[#ff5500]" />
                <span>Expand</span>
              </button>
            )}

            {/* Top Preview Controls / Slide Navigator */}
            {studioMode === "full_set" ? (
              <div className={`flex items-center justify-between w-full max-w-[380px] px-1 z-10 ${mobileViewMode === "split" ? "mb-1 scale-90 sm:scale-100 origin-top" : "mb-2"}`}>
                <button
                  type="button"
                  disabled={activeSlideIndex === 0}
                  onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-poppins text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[220px] scrollbar-none px-1">
                  {reviewSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                        activeSlideIndex === idx
                          ? "bg-[#ff5500] text-black shadow-[0_0_12px_rgba(255,85,0,0.5)] scale-105"
                          : "bg-white/[0.05] text-zinc-400 hover:text-white border border-white/5"
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
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-poppins text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className={`z-10 text-[11px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] ${mobileViewMode === "split" ? "mb-1 scale-90 sm:scale-100 origin-top" : "mb-2"}`}>
                <span className="w-2 h-2 rounded-full shadow-[0_0_6px_#ff5500]" style={{ backgroundColor: activePalette.primary }} />
                <span>Live Canvas · 1080×1920 (9:16 UHD)</span>
              </div>
            )}

            {/* THE INSTAGRAM STORY CANVAS (Strict 9:16 Aspect Ratio: 360 x 640 displayed, exports at 3x: 1080 x 1920) */}
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden py-1 z-10">
              <div
                onClick={() => {
                  if (!isCroppingBackdrop && typeof window !== "undefined" && window.innerWidth < 1024 && mobileViewMode === "split") {
                    setMobileViewMode("preview");
                  }
                }}
                className={`transform origin-center flex-shrink-0 transition-transform duration-200 ${
                  mobileViewMode === "split"
                    ? "scale-[0.36] min-[380px]:scale-[0.40] min-[420px]:scale-[0.44] cursor-pointer lg:scale-[0.76] xl:scale-100 lg:cursor-default"
                    : "scale-[0.72] min-[360px]:scale-[0.78] min-[410px]:scale-[0.84] sm:scale-[0.88] xl:scale-100"
                }`}
              >
                <div
                  ref={cardRef}
                  style={{ width: "360px", height: "640px" }}
                  onMouseDown={handleBackdropMouseDown}
                  onTouchStart={handleBackdropTouchStart}
                  onTouchMove={handleBackdropTouchMove}
                  onTouchEnd={handleBackdropTouchEnd}
                  className={`relative rounded-none overflow-hidden bg-[#07080a] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(255,85,0,0.15)] flex flex-col justify-between select-none ${getCardBorderClass()}`}
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

              {/* -------------------- CARD TOP HEADER (Overlay in Rating Mode) -------------------- */}
              {studioMode === "rating" && (
                <div
                  style={{
                    paddingLeft: `${cardPaddingX}px`,
                    paddingRight: `${cardPaddingX}px`,
                    paddingTop: `${topBarPaddingY}px`,
                  }}
                  className="absolute top-0 inset-x-0 z-20 pb-2 flex items-center justify-between pointer-events-none"
                >
                  {showWatermark ? (
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: activePalette.primary,
                          boxShadow: `0 0 8px ${activePalette.primary}`,
                        }}
                      />
                      <span className="text-[9.5px] font-poppins tracking-[0.22em] uppercase text-zinc-300 font-semibold">
                        THE RETRO TALKS
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {showBadgeTag && headline.trim() ? (
                    <span
                      className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono uppercase tracking-wider pointer-events-auto"
                      style={{ color: activePalette.secondary }}
                    >
                      {headline}
                    </span>
                  ) : (
                    <div />
                  )}
                </div>
              )}

              {/* -------------------- CARD TOP HEADER (Flex in Summary & Full Set Modes) -------------------- */}
              {studioMode !== "rating" && (
                <div
                  style={{
                    paddingLeft: `${cardPaddingX}px`,
                    paddingRight: `${cardPaddingX}px`,
                    paddingTop: `${topBarPaddingY}px`,
                  }}
                  className="relative z-10 pb-1 flex items-center justify-between shrink-0"
                >
                  {showWatermark ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: activePalette.primary,
                          boxShadow: `0 0 8px ${activePalette.primary}`,
                        }}
                      />
                      <span className="text-[9.5px] font-poppins tracking-[0.22em] uppercase text-zinc-300 font-semibold">
                        THE RETRO TALKS
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {showBadgeTag && headline.trim() ? (
                    <span
                      className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono uppercase tracking-wider"
                      style={{ color: activePalette.secondary }}
                    >
                      {headline}
                    </span>
                  ) : (
                    <div />
                  )}
                </div>
              )}

              {/* -------------------- MODE 1: RATING ONLY (Centered Immutable Core Block) -------------------- */}
              {studioMode === "rating" && (
                <div
                  style={{
                    paddingLeft: `${cardPaddingX}px`,
                    paddingRight: `${cardPaddingX}px`,
                    transform: contentShiftY !== 0 ? `translateY(${contentShiftY}px)` : undefined,
                  }}
                  className="relative z-10 w-full h-full flex flex-col items-center justify-center min-h-0 overflow-hidden"
                >
                  {/* PRESET 1: The Cinematic Minimalist */}
                  {theme === "cinematic" && (
                    <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto shrink-0">
                      {/* Floating Poster (Enlarged) */}
                      {showPoster && displayPoster && (
                        <div
                          style={{
                            transform: posterScale !== 100 ? `scale(${posterScale / 100})` : undefined,
                            transformOrigin: "center",
                          }}
                          className={`relative w-32 aspect-[2/3] rounded-none overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_25px_rgba(255,85,0,0.25)] ${getImageBorderClass()} shrink-0 my-0.5`}
                        >
                          <img
                            src={displayPoster}
                            alt={review.title}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Movie Title & Details (Added spacing from poster) */}
                      <div className="space-y-1 max-w-[300px] mt-2">
                        <h2
                          style={getTitleStyle()}
                          className={`text-white leading-tight drop-shadow-md ${getTitleSizeClass()} ${getTitleFontClass()}`}
                        >
                          {review.title}
                        </h2>
                        <p className="text-[11px] font-inter text-zinc-300">
                          {review.year && <span>{review.year} · </span>}
                          <span>{review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}</span>
                        </p>
                      </div>

                      {/* Rating Display */}
                      {renderCardRating("w-4 h-4", "text-[11px]", "center")}
                    </div>
                  )}

                  {/* PRESET 2: Poster Hero */}
                  {theme === "poster_hero" && (
                    <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto shrink-0">
                      {/* Poster Hero (Enlarged) */}
                      {showPoster && displayPoster && (
                        <div
                          style={{
                            transform: posterScale !== 100 ? `scale(${posterScale / 100})` : undefined,
                            transformOrigin: "center",
                          }}
                          className={`relative w-36 aspect-[2/3] rounded-none overflow-hidden shadow-[0_25px_50px_rgba(0,0,0,0.98),0_0_30px_rgba(255,85,0,0.3)] ${getImageBorderClass()} shrink-0 my-0.5`}
                        >
                          <img
                            src={displayPoster}
                            alt={review.title}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-1 max-w-[300px] mt-2">
                        <h2
                          style={getTitleStyle()}
                          className={`text-white leading-tight drop-shadow-md ${getTitleSizeClass()} ${getTitleFontClass()}`}
                        >
                          {review.title}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[10.5px] font-inter text-zinc-300">
                            {review.year && `${review.year} · `}{review.director}
                          </span>
                        </div>
                        <div className="mt-0.5">
                          {renderCardRating("w-4 h-4", "text-xs", "center")}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRESET 3: Editorial Monograph */}
                  {theme === "editorial" && (
                    <div className="flex flex-col items-center justify-center text-center space-y-3 my-auto shrink-0">
                      {showPoster && displayPoster && (
                        <div
                          style={{
                            transform: posterScale !== 100 ? `scale(${posterScale / 100})` : undefined,
                            transformOrigin: "center",
                          }}
                          className={`relative w-32 aspect-[2/3] rounded-none overflow-hidden shadow-2xl ${getImageBorderClass()} shrink-0 my-0.5`}
                        >
                          <img
                            src={displayPoster}
                            alt={review.title}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-1 max-w-[300px] mt-2">
                        <h2
                          style={getTitleStyle()}
                          className={`text-white leading-tight drop-shadow-md ${getTitleSizeClass()} ${getTitleFontClass()}`}
                        >
                          {review.title}
                        </h2>
                        <p className="text-[11px] font-inter text-zinc-400">
                          {review.year && `${review.year} · `}{review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}
                        </p>
                      </div>

                      {renderCardRating("w-4 h-4", "text-[11px]", "center")}
                    </div>
                  )}
                </div>
              )}

              {/* -------------------- MODE 2: REVIEW SUMMARY (Editorial Flow with Review Box) -------------------- */}
              {studioMode === "summary" && (
                <>
                  {/* PRESET 1: The Cinematic Minimalist */}
                  {theme === "cinematic" && (
                    <div
                      style={{
                        paddingLeft: `${cardPaddingX}px`,
                        paddingRight: `${cardPaddingX}px`,
                        transform: contentShiftY !== 0 ? `translateY(${contentShiftY}px)` : undefined,
                      }}
                      className="relative z-10 flex flex-col items-center text-center space-y-3 flex-1 justify-center min-h-0 overflow-hidden pb-2"
                    >
                      {/* Floating Poster */}
                      {showPoster && displayPoster && (
                        <div
                          style={{
                            transform: posterScale !== 100 ? `scale(${posterScale / 100})` : undefined,
                            transformOrigin: "center",
                          }}
                          className={`relative w-28 aspect-[2/3] rounded-none overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(255,85,0,0.2)] ${getImageBorderClass()} shrink-0`}
                        >
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
                        <h2
                          style={getTitleStyle()}
                          className={`text-white leading-tight drop-shadow-md ${getTitleSizeClass()} ${getTitleFontClass()}`}
                        >
                          {review.title}
                        </h2>
                        <p className="text-[11px] font-inter text-zinc-300">
                          {review.year && <span>{review.year} · </span>}
                          <span>{review.mediaType === "tv" ? "Created by" : "Dir."} {review.director}</span>
                        </p>
                      </div>

                      {/* Rating Display */}
                      {renderCardRating("w-4 h-4", "text-[11px]", "center")}

                      {/* Summarized Review / Standout Critique */}
                      {hasReviewContent && (
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
                                style={{
                                  fontSize: summaryFontSize ? `${summaryFontSize}px` : undefined,
                                }}
                                className={`text-[13px] font-bold italic text-white leading-snug drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                              >
                                "{standoutQuoteText.trim()}"
                              </p>
                              {summaryReview && summaryReview !== standoutQuoteText && (
                                <p
                                  style={{
                                    fontSize: summaryFontSize ? `${Math.max(10, summaryFontSize - 1.5)}px` : undefined,
                                  }}
                                  className={`text-[11.5px] text-zinc-300 mt-2 pt-2 border-t border-white/10 line-clamp-3 leading-relaxed ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                                >
                                  {summaryReview}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p
                              style={{
                                fontSize: summaryFontSize ? `${summaryFontSize}px` : undefined,
                              }}
                              className={`text-[13px] text-white/95 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] line-clamp-6 max-w-[310px] ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                            >
                              "{summaryReview}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PRESET 2: Poster Hero */}
                  {theme === "poster_hero" && (
                    <div
                      style={{
                        paddingLeft: `${cardPaddingX}px`,
                        paddingRight: `${cardPaddingX}px`,
                        transform: contentShiftY !== 0 ? `translateY(${contentShiftY}px)` : undefined,
                      }}
                      className="relative z-10 flex flex-col items-center text-center space-y-3 flex-1 justify-center min-h-0 overflow-hidden pb-2"
                    >
                      {/* Poster Hero */}
                      {showPoster && displayPoster && (
                        <div
                          style={{
                            transform: posterScale !== 100 ? `scale(${posterScale / 100})` : undefined,
                            transformOrigin: "center",
                          }}
                          className={`relative w-36 aspect-[2/3] rounded-none overflow-hidden shadow-[0_20px_45px_rgba(0,0,0,0.95),0_0_30px_rgba(255,85,0,0.3)] ${getImageBorderClass()} shrink-0`}
                        >
                          <img
                            src={displayPoster}
                            alt={review.title}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <h2
                          style={getTitleStyle()}
                          className={`text-white leading-tight drop-shadow-md ${getTitleSizeClass()} ${getTitleFontClass()}`}
                        >
                          {review.title}
                        </h2>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[10.5px] font-inter text-zinc-300">
                            {review.year && `${review.year} · `}{review.director}
                          </span>
                        </div>
                        <div className="mt-1">
                          {renderCardRating("w-3 h-3", "text-[10px]", "center")}
                        </div>
                      </div>

                      {/* Summarized Review / Standout Critique */}
                      {hasReviewContent && (
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
                                style={{
                                  fontSize: summaryFontSize ? `${summaryFontSize}px` : undefined,
                                }}
                                className={`text-[12.5px] font-bold italic text-white leading-snug drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                              >
                                "{standoutQuoteText.trim()}"
                              </p>
                              {summaryReview && summaryReview !== standoutQuoteText && (
                                <p
                                  style={{
                                    fontSize: summaryFontSize ? `${Math.max(10, summaryFontSize - 1.5)}px` : undefined,
                                  }}
                                  className={`text-[11px] text-zinc-300 mt-1.5 pt-1.5 border-t border-white/10 line-clamp-2 leading-relaxed ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                                >
                                  {summaryReview}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p
                              style={{
                                fontSize: summaryFontSize ? `${summaryFontSize}px` : undefined,
                              }}
                              className={`text-xs text-zinc-100 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.98)] drop-shadow-[0_4px_20px_rgba(0,0,0,0.85)] line-clamp-5 max-w-[310px] ${getQuoteFontClass()} ${getQuoteAlignClass()}`}
                            >
                              “{summaryReview}”
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PRESET 3: Editorial Monograph */}
                  {theme === "editorial" && (
                    <div
                      style={{
                        paddingLeft: `${cardPaddingX}px`,
                        paddingRight: `${cardPaddingX}px`,
                        transform: contentShiftY !== 0 ? `translateY(${contentShiftY}px)` : undefined,
                      }}
                      className="relative z-10 flex flex-col space-y-3.5 flex-1 justify-center text-left min-h-0 overflow-hidden pb-2"
                    >
                      {/* Top Poster + Info Row */}
                      <div className={`flex items-center gap-3 p-2.5 rounded-2xl ${getMaterialBoxClass()}`}>
                        {showPoster && displayPoster && (
                          <div
                            style={{
                              transform: posterScale !== 100 ? `scale(${posterScale / 100})` : undefined,
                              transformOrigin: "center",
                            }}
                            className={`relative w-14 aspect-[2/3] rounded-none overflow-hidden flex-shrink-0 ${getImageBorderClass()}`}
                          >
                            <img
                              src={displayPoster}
                              alt={review.title}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <h2
                            style={getTitleStyle()}
                            className={`text-white truncate ${getTitleSizeClass()} ${getTitleFontClass()}`}
                          >
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

                      {/* Editorial Review Body */}
                      {hasReviewContent && (
                        <div
                          className="pl-3.5 border-l-2 py-1 space-y-1.5"
                          style={{ borderColor: activePalette.primary }}
                        >
                          {showStandoutQuote && standoutQuoteText.trim() ? (
                            <div className="space-y-1.5">
                              <p
                                style={{
                                  fontSize: summaryFontSize ? `${summaryFontSize}px` : undefined,
                                }}
                                className={`text-[13.5px] font-bold italic text-white leading-snug drop-shadow-md ${getQuoteFontClass()}`}
                              >
                                "{standoutQuoteText.trim()}"
                              </p>
                              {summaryReview && summaryReview !== standoutQuoteText && (
                                <p
                                  style={{
                                    fontSize: summaryFontSize ? `${Math.max(10, summaryFontSize - 1.5)}px` : undefined,
                                  }}
                                  className="text-[11.5px] font-inter text-white/90 leading-relaxed italic line-clamp-3"
                                >
                                  {summaryReview}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p
                              style={{
                                fontSize: summaryFontSize ? `${summaryFontSize}px` : undefined,
                              }}
                              className={`text-[13px] text-white/95 leading-relaxed italic drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] line-clamp-6 ${getQuoteFontClass()}`}
                            >
                              "{summaryReview}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* -------------------- MODE 3: FULL REVIEW STORY SET -------------------- */}
              {studioMode === "full_set" && (
                <div
                  style={{
                    paddingLeft: `${cardPaddingX}px`,
                    paddingRight: `${cardPaddingX}px`,
                  }}
                  className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden pt-0 pb-1"
                >
                  {/* Slide Top Left-Aligned Header: Title, Year, Director & Star Rating */}
                  <div
                    style={{
                      marginBottom: `${headerGapY}px`,
                    }}
                    className="text-left space-y-0.5 pb-1.5 border-b border-white/[0.1] shrink-0"
                  >
                    <h2
                      style={getTitleStyle()}
                      className={`text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${getTitleSizeClass()} ${getTitleFontClass()}`}
                    >
                      {review.title}
                    </h2>

                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {(review.year || review.director) && (
                        <span className="text-[10px] font-inter text-zinc-300 drop-shadow-sm font-normal">
                          {review.year && `${review.year}`}
                          {review.year && review.director && ` · `}
                          {review.director && `${review.mediaType === "tv" ? "Created by" : "Dir."} ${review.director}`}
                        </span>
                      )}

                      {(review.year || review.director) && (
                        <span className="text-zinc-600 font-light text-[10px] select-none">|</span>
                      )}

                      {/* Star Rating & Numbered Rating Inline */}
                      <div
                        style={{
                          transform: starRatingScale !== 100 ? `scale(${starRatingScale / 100})` : undefined,
                          transformOrigin: "left center",
                        }}
                        className="inline-flex items-center gap-1.5"
                      >
                        <div className="flex items-center gap-0.5">
                          {[0, 1, 2, 3, 4].map((starIndex) =>
                            renderStoryStar(starIndex, rating, "w-3 h-3")
                          )}
                        </div>
                        {ratingFormat === "stars_metric" && (
                          <span
                            className="text-[10px] font-poppins font-semibold tracking-wider drop-shadow-sm leading-none translate-y-[1px]"
                            style={{ color: activePalette.secondary }}
                          >
                            {formatStoryCardRating(rating)}
                          </span>
                        )}
                      </div>
                    </div>

                    {showHairlineAccent && (
                      <div
                        className="w-8 h-[1.5px] mt-0.5 opacity-80"
                        style={{ backgroundColor: activePalette.primary }}
                      />
                    )}
                  </div>

                  {/* Standout Quote Callout on Slide 1 */}
                  {showStandoutQuote && activeSlideIndex === 0 && standoutQuoteText.trim() && (
                    <div
                      className="my-1.5 p-2 rounded-xl border-l-[3px] shadow-lg relative overflow-hidden shrink-0 bg-black/40 border border-white/10"
                      style={{ borderLeftColor: activePalette.primary }}
                    >
                      <div className="flex items-start gap-2">
                        <Quote
                          className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-90"
                          style={{ color: activePalette.primary }}
                        />
                        <p className={`text-[12px] font-bold text-white leading-snug tracking-tight drop-shadow-md ${getQuoteFontClass()} ${getQuoteAlignClass()}`}>
                          "{standoutQuoteText.trim()}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* The rest of the card filled with the logged review across the max width */}
                  {(() => {
                    const currentSlideText = reviewSlides[activeSlideIndex] || "";
                    const slideCap = calculateDynamicCapacity(
                      {
                        density: textDensity,
                        hasTopLogo,
                        hasHeadlineBadge,
                        title: review.title,
                        titleSize,
                        hasSlide1Callout,
                        standoutQuote: standoutQuoteText,
                        hasFooter,
                        cardPaddingX,
                        topBarPaddingY,
                        footerPaddingY,
                        headerGapY,
                        customFontSize,
                        customLineHeight,
                      },
                      activeSlideIndex === 0
                    );
                    const isSlideCompact = currentSlideText.length < slideCap * 0.72;
                    const effectiveVerticalJustify =
                      verticalAlignment === "center"
                        ? "justify-center"
                        : verticalAlignment === "top"
                        ? "justify-start"
                        : isSlideCompact
                        ? "justify-center"
                        : "justify-start";

                    return (
                      <div
                        style={{
                          transform: contentShiftY !== 0 ? `translateY(${contentShiftY}px)` : undefined,
                        }}
                        className={`flex-1 pt-1 pb-0.5 overflow-hidden flex flex-col min-h-0 ${effectiveVerticalJustify} w-full`}
                      >
                        <FormattedReviewText
                          content={currentSlideText || "No review content."}
                          variant="story"
                          density={textDensity}
                          revealSpoilers={true}
                          fontClassName={bodyFont === "poppins" ? "font-poppins" : "font-inter"}
                          isItalic={isReviewItalic}
                          textAlign={quoteAlignment}
                          customFontSize={customFontSize}
                          customLineHeight={customLineHeight}
                          customParagraphSpacing={customParagraphSpacing}
                          className="w-full"
                        />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* -------------------- CARD BOTTOM FOOTER (Overlay in Rating Mode) -------------------- */}
              {studioMode === "rating" && hasFooterContent && (
                <div
                  style={{
                    paddingLeft: `${cardPaddingX}px`,
                    paddingRight: `${cardPaddingX}px`,
                    paddingBottom: `${footerPaddingY}px`,
                  }}
                  className="absolute bottom-0 inset-x-0 z-20 pt-2 flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-md pointer-events-none"
                >
                  {effectiveHandle ? (
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <Film className="w-3 h-3" style={{ color: activePalette.primary }} />
                      <span className="text-[9.5px] font-inter text-zinc-300 tracking-wider font-semibold">
                        {effectiveHandle}
                      </span>
                    </div>
                  ) : (
                    <div />
                  )}

                  {showGenres && review.genres && review.genres.length > 0 && (
                    <span className="text-[9px] font-mono text-zinc-400 pointer-events-auto">
                      {review.genres.slice(0, 2).join(" · ")}
                    </span>
                  )}
                </div>
              )}

              {/* -------------------- CARD BOTTOM FOOTER (Flex in Summary & Full Set Modes) -------------------- */}
              {studioMode !== "rating" && (
                hasFooterContent ? (
                  <div
                    style={{
                      paddingLeft: `${cardPaddingX}px`,
                      paddingRight: `${cardPaddingX}px`,
                      paddingBottom: `${footerPaddingY}px`,
                    }}
                    className="relative z-10 pt-1.5 flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-md shrink-0"
                  >
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
                    <div style={{ paddingBottom: `${footerPaddingY}px` }} className="shrink-0" />
                )
              )}
            </div>
              </div>
            </div>

            {/* Mobile-Only Action Bar at Bottom of Full Card Preview */}
            {mobileViewMode === "preview" && (
              <div className="lg:hidden w-full flex items-center justify-between gap-2 pt-2 px-1 z-20 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileViewMode("split")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white font-poppins text-xs font-semibold transition-all cursor-pointer shadow-md"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Edit Settings</span>
                </button>
                {studioMode === "full_set" ? (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isExporting || reviewSlides.length === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins text-xs font-bold shadow-[0_0_15px_rgba(255,85,0,0.35)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isExporting ? exportProgress || "ZIP..." : `Export ZIP (${reviewSlides.length})`}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownloadSingle}
                    disabled={isExporting}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins text-xs font-bold shadow-[0_0_15px_rgba(255,85,0,0.35)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? exportProgress || "Export..." : "Download PNG"}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Customization Controls Panel */}
          <div className={`${mobileViewMode === "preview" ? "hidden lg:flex" : "flex"} w-full lg:flex-1 flex-col min-h-0 bg-[#080a0f] overflow-hidden`}>
            
            {/* Studio Navigation Tab Bar (Sticky at top of right panel) */}
            <div className="flex-shrink-0 px-3 sm:px-6 pt-3 sm:pt-4 pb-2.5 sm:pb-3 border-b border-white/[0.08] bg-[#080a0f]/95 backdrop-blur-xl z-20">
              <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[#0c0f16] border border-white/[0.08] overflow-x-auto scrollbar-none">
                {[
                  { id: "presets", label: "Presets", shortLabel: "Presets", icon: Layout },
                  { id: "typography", label: "Typography", shortLabel: "Type", icon: Type },
                  { id: "artwork", label: "Artwork", shortLabel: "Artwork", icon: ImageIcon },
                  { id: "spacing", label: "Fine Spacing", shortLabel: "Spacing", icon: SlidersHorizontal },
                  { id: "branding", label: "Branding & Export", shortLabel: "Branding", icon: Sparkles },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as StudioTab)}
                      className={`flex-1 min-w-[68px] sm:min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-poppins font-semibold transition-all cursor-pointer select-none ${
                        isActive
                          ? "bg-[#ff5500] text-black shadow-[0_0_16px_rgba(255,85,0,0.4)]"
                          : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate sm:hidden">{tab.shortLabel}</span>
                      <span className="truncate hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Tab Panel Container */}
            <div className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto space-y-6">

              {/* ========================================================================= */}
              {/* TAB 1: PRESETS & MODE                                                    */}
              {/* ========================================================================= */}
              {activeTab === "presets" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Mode Switcher */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold font-poppins text-white flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                        <span>Story Card Format Mode</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#ff7a29] uppercase font-semibold">
                        {studioMode === "summary" ? "Review Summary" : studioMode === "rating" ? "Rating Only" : "Full Story Set"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setStudioMode("summary")}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          studioMode === "summary"
                            ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_14px_rgba(255,85,0,0.25)]"
                            : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-poppins text-white">Summary</span>
                          <Sparkles className={`w-3.5 h-3.5 ${studioMode === "summary" ? "text-[#ff5500]" : "text-zinc-500"}`} />
                        </div>
                        <p className="text-[10px] font-inter text-zinc-400 mt-1 leading-snug">
                          Single 9:16 card with poster, title, rating & editorial summary
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudioMode("rating")}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          studioMode === "rating"
                            ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_14px_rgba(255,85,0,0.25)]"
                            : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-poppins text-white">Rating Only</span>
                          <Star className={`w-3.5 h-3.5 ${studioMode === "rating" ? "text-[#ff5500]" : "text-zinc-500"}`} />
                        </div>
                        <p className="text-[10px] font-inter text-zinc-400 mt-1 leading-snug">
                          Dead-centered poster, title, director and star rating
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudioMode("full_set")}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          studioMode === "full_set"
                            ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_14px_rgba(255,85,0,0.25)]"
                            : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-poppins text-white">Full Review Set</span>
                          <Layers className={`w-3.5 h-3.5 ${studioMode === "full_set" ? "text-[#ff5500]" : "text-zinc-500"}`} />
                        </div>
                        <p className="text-[10px] font-inter text-zinc-400 mt-1 leading-snug">
                          Multi-slide story generator ({reviewSlides.length} slides)
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Layout Presets (For Summary & Rating Modes) */}
                  {studioMode !== "full_set" && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold font-poppins text-white flex items-center gap-2">
                          <Layout className="w-3.5 h-3.5 text-[#ff5500]" />
                          <span>Card Layout Presets (3 Styles)</span>
                        </label>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {theme === "cinematic" && "Cinematic Glass"}
                          {theme === "poster_hero" && "Poster Hero"}
                          {theme === "editorial" && "Editorial Journal"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          { id: "cinematic", title: "Cinematic Glass", desc: "Balanced floating poster & review quote" },
                          { id: "poster_hero", title: "Poster Hero", desc: "Large hero poster with floating quote" },
                          { id: "editorial", title: "Editorial Journal", desc: "Compact poster with editorial column" },
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
                              if (nextTheme === "editorial") {
                                setTitleFont("inter");
                                setBodyFont("inter");
                              } else {
                                setTitleFont("poppins");
                                setBodyFont("inter");
                              }
                            }}
                            className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                              theme === t.id
                                ? "bg-[#ff5500]/15 border-[#ff5500] shadow-[0_0_16px_rgba(255,85,0,0.25)]"
                                : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                            }`}
                          >
                            <div className="text-xs font-bold font-poppins text-white flex items-center justify-between">
                              <span>{t.title}</span>
                              {theme === t.id && (
                                <span className="w-2 h-2 rounded-full bg-[#ff5500] shadow-[0_0_6px_#ff5500]" />
                              )}
                            </div>
                            <div className="text-[10.5px] font-inter text-zinc-400 mt-1 leading-snug">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standout Quote Callout (Slide 1 Hook) */}
                  {studioMode !== "rating" && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold font-poppins text-white flex items-center gap-2">
                          <Quote className="w-3.5 h-3.5 text-[#ff5500]" />
                          <span>Standout Quote Callout (Slide 1 Hook)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-inter text-zinc-400 hover:text-white">
                          <input
                            type="checkbox"
                            checked={showStandoutQuote}
                            onChange={(e) => setShowStandoutQuote(e.target.checked)}
                            className="accent-[#ff5500] w-3.5 h-3.5 cursor-pointer"
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
                            className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl px-3.5 py-2.5 text-xs font-poppins text-white outline-none transition-all placeholder-zinc-600"
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
                  )}

                  {/* Rating & Headline Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Story Card Rating */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3 shadow-lg">
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

                    {/* Headline Badge */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-2.5 shadow-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                          <span>Badge Tag</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-inter text-zinc-400 hover:text-white">
                          <input
                            type="checkbox"
                            checked={showBadgeTag}
                            onChange={(e) => setShowBadgeTag(e.target.checked)}
                            className="accent-[#ff5500] w-3.5 h-3.5"
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
                        className={`w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl px-3 py-2 text-xs font-inter text-white outline-none transition-opacity ${
                          !showBadgeTag ? "opacity-35 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: TYPOGRAPHY & EDITORIAL                                            */}
              {/* ========================================================================= */}
              {activeTab === "typography" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Review Text / Prose Editor */}
                  {studioMode === "rating" ? (
                    <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-[#ff5500]" />
                          <span>Rating Only Mode</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-semibold uppercase">
                          Centered Monograph
                        </span>
                      </div>
                      <p className="text-xs font-inter text-zinc-400 leading-relaxed">
                        Ultra-clean, dead-centered layout focusing strictly on the poster, title, director/year, and star rating. No review body prose is rendered in this mode.
                      </p>
                      <div className="flex items-center gap-2 pt-1 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => setStudioMode("summary")}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-inter text-zinc-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer text-center"
                        >
                          Switch to Review Summary
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudioMode("full_set")}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-inter text-zinc-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer text-center"
                        >
                          Switch to Full Review Set
                        </button>
                      </div>
                    </div>
                  ) : studioMode === "summary" ? (
                    <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                          <Quote className="w-3.5 h-3.5 text-[#ff5500]" />
                          <span>Summarized Review (Story Text)</span>
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
                            className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy summary text"
                          >
                            {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={summaryReview}
                        onChange={(e) => setSummaryReview(e.target.value)}
                        placeholder="Write your personal summarized review for Instagram story..."
                        rows={4}
                        className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl p-3.5 text-xs font-inter text-zinc-200 leading-relaxed outline-none transition-all placeholder-zinc-600 resize-none"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>Recommended: 120 - 240 characters</span>
                        <span className={summaryReview.length > 260 ? "text-amber-400 font-bold" : ""}>
                          {summaryReview.length} chars
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#ff5500]" />
                          <span>Full Logged Review (Story Set Generator)</span>
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
                        className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl p-3.5 text-xs font-poppins text-zinc-200 leading-relaxed outline-none transition-all placeholder-zinc-600 resize-none"
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
                              ? "~1,550 chars / card (Max Words)"
                              : textDensity === "standard"
                              ? "~1,220 chars / card"
                              : "~940 chars / card"}
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

                  {/* Typography Suite Card */}
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-[#ff5500]" />
                        <span>Directorial Typography Suite</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#ff7a29] font-bold">Inter & Poppins</span>
                    </div>

                    {/* Review Font & Italics Control Bar */}
                    <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-inter text-zinc-300 font-medium">
                          Review / Critique Typography
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsReviewItalic((prev) => !prev)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-inter border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isReviewItalic
                              ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                              : "bg-white/[0.04] border-white/[0.1] text-zinc-300 hover:text-white"
                          }`}
                        >
                          <Italic className="w-3.5 h-3.5" />
                          <span>Italics: {isReviewItalic ? "ON" : "OFF"}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        {[
                          { id: "inter", label: "Inter", desc: "Modern Sans", fontCls: "font-inter" },
                          { id: "poppins", label: "Poppins", desc: "Clean Geo", fontCls: "font-poppins" },
                        ].map((font) => (
                          <button
                            key={font.id}
                            type="button"
                            onClick={() => setBodyFont(font.id as BodyFont)}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              bodyFont === font.id
                                ? "bg-[#ff5500]/20 border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.2)]"
                                : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                            }`}
                          >
                            <div className={`text-xs font-bold text-white ${font.fontCls}`}>{font.label}</div>
                            <div className="text-[9.5px] font-mono text-zinc-400 mt-0.5 leading-tight">{font.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title Font Family Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-inter text-zinc-300 font-medium">Film Title Typography</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: "poppins", label: "Poppins", desc: "Clean Geo Sans", fontCls: "font-poppins font-bold" },
                          { id: "inter", label: "Inter", desc: "Modern Swiss Sans", fontCls: "font-inter font-bold" },
                        ].map((titleF) => (
                          <button
                            key={titleF.id}
                            type="button"
                            onClick={() => setTitleFont(titleF.id as TitleFont)}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              titleFont === titleF.id
                                ? "bg-[#ff5500]/20 border-[#ff5500] shadow-[0_0_10px_rgba(255,85,0,0.2)]"
                                : "bg-white/[0.02] border-white/[0.07] hover:border-white/20"
                            }`}
                          >
                            <div className={`text-xs text-white truncate ${titleF.fontCls}`}>{titleF.label}</div>
                            <div className="text-[9.5px] font-mono text-zinc-400 mt-0.5 leading-tight">{titleF.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title Weight (Capped at 600) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-inter text-zinc-300 font-medium">Film Title Weight</label>
                        <span className="text-[9.5px] font-mono text-zinc-400 capitalize">{titleWeight} (Max 600)</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "normal", label: "400", sub: "Regular", weightCls: "font-normal" },
                          { id: "medium", label: "500", sub: "Medium", weightCls: "font-medium" },
                          { id: "semibold", label: "600", sub: "Semi", weightCls: "font-semibold" },
                        ].map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setTitleWeight(w.id as TitleWeight)}
                            className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                              titleWeight === w.id
                                ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                                : "bg-white/[0.02] border-white/[0.07] text-zinc-300 hover:text-white hover:border-white/20"
                            }`}
                          >
                            <div className={`text-xs ${w.weightCls}`}>{w.label}</div>
                            <div className="text-[9px] font-inter opacity-75">{w.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title Font Size */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-inter text-zinc-300 font-medium">Film Title Size</label>
                        <span className="text-[9.5px] font-mono text-zinc-400 uppercase">{titleSize}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { id: "sm", label: "S", sub: "Small" },
                          { id: "base", label: "M", sub: "Regular" },
                          { id: "lg", label: "L", sub: "Medium" },
                          { id: "xl", label: "XL", sub: "Large" },
                          { id: "2xl", label: "2XL", sub: "Display" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setTitleSize(s.id as TitleSize)}
                            className={`py-2 px-1 rounded-xl text-center border transition-all cursor-pointer ${
                              titleSize === s.id
                                ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                                : "bg-white/[0.02] border-white/[0.07] text-zinc-300 hover:text-white hover:border-white/20"
                            }`}
                          >
                            <div className="text-xs font-mono font-bold">{s.label}</div>
                            <div className="text-[9px] font-inter opacity-75">{s.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-inter text-zinc-300 font-medium">Text Alignment</label>
                      <div className="grid grid-cols-3 gap-1.5">
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
                              className={`py-2 px-2 rounded-xl text-xs font-inter border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                quoteAlignment === align.id
                                  ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                                  : "bg-white/[0.02] border-white/[0.07] text-zinc-300 hover:text-white"
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span>{align.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Vertical Text Distribution */}
                    <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-inter text-zinc-300 font-medium">Vertical Text Distribution</label>
                        <span className="text-[9.5px] font-mono text-[#ff7a29] uppercase">
                          {verticalAlignment === "auto" ? "Smart Fit (Auto)" : verticalAlignment}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "auto", label: "Smart Fit", desc: "Adaptive fill & auto-center" },
                          { id: "top", label: "Top Anchored", desc: "Pinned directly to header" },
                          { id: "center", label: "Dead Center", desc: "Balanced vertical monograph" },
                        ].map((valign) => (
                          <button
                            key={valign.id}
                            type="button"
                            onClick={() => setVerticalAlignment(valign.id as any)}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              verticalAlignment === valign.id
                                ? "bg-[#ff5500] text-black border-[#ff5500] font-bold shadow-sm"
                                : "bg-white/[0.02] border-white/[0.07] text-zinc-300 hover:text-white hover:border-white/20"
                            }`}
                          >
                            <div className="text-xs font-semibold">{valign.label}</div>
                            <div className={`text-[9.5px] leading-tight mt-0.5 ${verticalAlignment === valign.id ? "text-black/80 font-medium" : "text-zinc-500 font-mono"}`}>
                              {valign.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rating Metric Presentation (Strictly Stars + Index and Minimalist Stars) */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-inter text-zinc-300 font-medium">Rating Metric Presentation</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "stars_metric", label: "Stars + Index", desc: "★★★★☆ 4.5/5" },
                          { id: "stars_minimal", label: "Minimalist Stars", desc: "★★★★☆" },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setRatingFormat(fmt.id as RatingDisplayFormat)}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
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
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: ARTWORK & VISUAL MEDIA                                            */}
              {/* ========================================================================= */}
              {activeTab === "artwork" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Artwork & Imagery Switchers */}
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
                    <div className="text-xs font-semibold font-poppins text-white flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-[#ff5500]" />
                        Artwork & Visual Media
                      </span>
                      {review.tmdbId ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                          TMDB Connected
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">
                          Local Artwork
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Change Poster */}
                      <button
                        type="button"
                        onClick={() => setShowPosterSelector(true)}
                        disabled={!review.tmdbId}
                        className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-inter text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center"
                        title={!review.tmdbId ? "TMDB ID required for alternate artwork" : "Select alternate official posters from TMDB"}
                      >
                        <ImageIcon className="w-4 h-4 text-[#ff5500]" />
                        <span className="text-[11px] font-medium">Poster</span>
                      </button>

                      {/* Change Backdrop */}
                      <button
                        type="button"
                        onClick={() => setShowBackdropSelector(true)}
                        disabled={!review.tmdbId}
                        className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-inter text-zinc-200 hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-center"
                        title={!review.tmdbId ? "TMDB ID required for alternate artwork" : "Select alternate official backdrops from TMDB"}
                      >
                        <Layers className="w-4 h-4 text-[#ff5500]" />
                        <span className="text-[11px] font-medium">Backdrop</span>
                      </button>

                      {/* Crop Backdrop */}
                      <button
                        type="button"
                        onClick={() => setIsCroppingBackdrop((prev) => !prev)}
                        className={`flex flex-col items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-xs font-inter transition-all cursor-pointer text-center border ${
                          isCroppingBackdrop
                            ? "bg-[#ff5500]/20 text-[#ff7a29] border-[#ff5500] shadow-[0_0_12px_rgba(255,85,0,0.35)]"
                            : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-zinc-200 hover:text-white"
                        }`}
                        title="Crop & reposition backdrop for story card (Pan & Zoom)"
                      >
                        <Crop className="w-4 h-4 text-[#ff5500]" />
                        <span className="text-[11px] font-medium">
                          {isCroppingBackdrop ? "Done Crop" : "Crop"}
                        </span>
                      </button>
                    </div>

                    {/* Collapsible Backdrop Crop & Positioning Controls */}
                    {isCroppingBackdrop && (
                      <div className="mt-3 p-4 rounded-xl bg-[#08090d] border border-[#ff5500]/30 space-y-4 animate-in fade-in duration-200">
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

                        {/* Action Buttons: Reset Framing */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => {
                              setBackdropCropX(50);
                              setBackdropCropY(review.backdropFraming?.y ?? 0);
                              setBackdropZoom(review.backdropFraming?.zoom ?? 100);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-inter text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-[#ff5500]" />
                            <span>Reset Framing</span>
                          </button>

                          <span className="text-[10px] font-mono text-zinc-400 italic">
                            ✨ Story Card Only · Isolated from site
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Backdrop Ambiance Controls */}
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-4 shadow-lg">
                    <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Backdrop Ambiance & Lighting</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Backdrop Dim */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                          <span>Backdrop Darken (Contrast)</span>
                          <span className="font-mono text-[#ff7a29] font-bold">{backdropDim}%</span>
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
                        <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                          <span>Backdrop Soft Blur</span>
                          <span className="font-mono text-[#ff7a29] font-bold">{backdropBlur}px</span>
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
                  </div>

                  {/* Palette Accent Switcher */}
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
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
                      <div className="p-3.5 rounded-xl bg-[#08090d] border border-white/10 space-y-3 animate-in fade-in duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Visual Color Picker */}
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

                        {/* Cinematic Color Suggestions */}
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

                  {/* Element Visibility Toggles */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3 shadow-lg">
                    <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                      <span>Card Elements Visibility</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-inter text-zinc-300">
                      {studioMode !== "full_set" && (
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                          <input
                            type="checkbox"
                            checked={showPoster}
                            onChange={(e) => setShowPoster(e.target.checked)}
                            className="accent-[#ff5500] w-3.5 h-3.5"
                          />
                          <span>Show Poster</span>
                        </label>
                      )}

                      {studioMode !== "full_set" && (
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                          <input
                            type="checkbox"
                            checked={showBadgeTag}
                            onChange={(e) => setShowBadgeTag(e.target.checked)}
                            className="accent-[#ff5500] w-3.5 h-3.5"
                          />
                          <span>Badge Tag</span>
                        </label>
                      )}

                      <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                        <input
                          type="checkbox"
                          checked={showWatermark}
                          onChange={(e) => setShowWatermark(e.target.checked)}
                          className="accent-[#ff5500] w-3.5 h-3.5"
                        />
                        <span>Top Logo</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer hover:text-white">
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
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: MANUAL SPACING & ELEMENT ENGINE                                   */}
              {/* ========================================================================= */}
              {activeTab === "spacing" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-[#ff5500]/30 space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 text-[#ff7a29]">
                          <SlidersHorizontal className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold font-poppins text-white flex items-center gap-2">
                            <span>Manual Spacing & Element Engine</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-[#ff5500]/20 text-[#ff7a29] text-[8.5px] font-mono font-bold tracking-wider uppercase">
                              Full Control
                            </span>
                          </h4>
                          <p className="text-[10px] font-inter text-zinc-400">
                            Pixel-level control over insets, typography scale, element sizing, and vertical balance
                          </p>
                        </div>
                      </div>

                      {/* Reset Adjustments Button */}
                      <button
                        type="button"
                        onClick={handleResetManualLayout}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10.5px] font-inter text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
                        title="Reset all spacing, sizing, and typography overrides to balanced defaults"
                      >
                        <RotateCcw className="w-3 h-3 text-[#ff5500]" />
                        <span>Reset</span>
                      </button>
                    </div>

                    {/* 1. Card Insets & Margins (Padding) */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                      <div className="text-[11px] font-poppins font-semibold text-zinc-200 flex items-center justify-between">
                        <span>Card Insets & Spacing</span>
                        <span className="text-[9.5px] font-mono text-zinc-400">Geometry</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Horizontal Inset (Padding X) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Side Inset (Padding X)</span>
                            <span className="font-mono text-[#ff7a29] font-bold">{cardPaddingX}px</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="32"
                            step="1"
                            value={cardPaddingX}
                            onChange={(e) => setCardPaddingX(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>8px (Max Width)</span>
                            <span>16px (Default)</span>
                            <span>32px (Spacious)</span>
                          </div>
                        </div>

                        {/* Top Bar Inset (Padding Y) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Top Header Inset</span>
                            <span className="font-mono text-[#ff7a29] font-bold">{topBarPaddingY}px</span>
                          </div>
                          <input
                            type="range"
                            min="8"
                            max="56"
                            step="2"
                            value={topBarPaddingY}
                            onChange={(e) => setTopBarPaddingY(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>8px (Compact)</span>
                            <span>28px (Default)</span>
                            <span>56px (Safe Area)</span>
                          </div>
                        </div>

                        {/* Footer Inset (Padding Y) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Bottom Footer Inset</span>
                            <span className="font-mono text-[#ff7a29] font-bold">{footerPaddingY}px</span>
                          </div>
                          <input
                            type="range"
                            min="6"
                            max="36"
                            step="2"
                            value={footerPaddingY}
                            onChange={(e) => setFooterPaddingY(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>6px</span>
                            <span>16px (Default)</span>
                            <span>36px</span>
                          </div>
                        </div>

                        {/* Header Gap (Between Title and Content) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Header to Content Gap</span>
                            <span className="font-mono text-[#ff7a29] font-bold">{headerGapY}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="24"
                            step="1"
                            value={headerGapY}
                            onChange={(e) => setHeaderGapY(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>0px (Flush)</span>
                            <span>6px (Default)</span>
                            <span>24px (Open)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Review Body Typography Calibration (Slide Text) */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                      <div className="text-[11px] font-poppins font-semibold text-zinc-200 flex items-center justify-between">
                        <span>Typography Calibration</span>
                        <span className="text-[9.5px] font-mono text-zinc-400">Prose Engine</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Custom Font Size */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Font Size</span>
                            <span className="font-mono text-[#ff7a29] font-bold">
                              {customFontSize ? `${customFontSize}px` : `Auto (${textDensity === "dense" ? "11" : textDensity === "standard" ? "12" : "13"}px)`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="9.5"
                            max="16.0"
                            step="0.5"
                            value={customFontSize ?? (textDensity === "dense" ? 11 : textDensity === "standard" ? 12 : 13)}
                            onChange={(e) => setCustomFontSize(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>9.5px</span>
                            <button
                              type="button"
                              onClick={() => setCustomFontSize(null)}
                              className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                            >
                              Auto
                            </button>
                            <span>16px</span>
                          </div>
                        </div>

                        {/* Custom Line Height */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Line Leading</span>
                            <span className="font-mono text-[#ff7a29] font-bold">
                              {customLineHeight ? `${customLineHeight.toFixed(2)}x` : `Auto (${textDensity === "dense" ? "1.52" : textDensity === "standard" ? "1.58" : "1.66"}x)`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1.25"
                            max="2.10"
                            step="0.05"
                            value={customLineHeight ?? (textDensity === "dense" ? 1.52 : textDensity === "standard" ? 1.58 : 1.66)}
                            onChange={(e) => setCustomLineHeight(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>1.25x</span>
                            <button
                              type="button"
                              onClick={() => setCustomLineHeight(null)}
                              className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                            >
                              Auto
                            </button>
                            <span>2.10x</span>
                          </div>
                        </div>

                        {/* Custom Paragraph Spacing */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Paragraph Spacing</span>
                            <span className="font-mono text-[#ff7a29] font-bold">
                              {customParagraphSpacing !== null ? `${customParagraphSpacing}px` : `Auto (${textDensity === "dense" ? "10" : textDensity === "standard" ? "12" : "14"}px)`}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="28"
                            step="1"
                            value={customParagraphSpacing ?? (textDensity === "dense" ? 10 : textDensity === "standard" ? 12 : 14)}
                            onChange={(e) => setCustomParagraphSpacing(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>2px (Tight)</span>
                            <button
                              type="button"
                              onClick={() => setCustomParagraphSpacing(null)}
                              className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                            >
                              Auto
                            </button>
                            <span>28px (Loose)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Element Sizing & Scale */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                      <div className="text-[11px] font-poppins font-semibold text-zinc-200 flex items-center justify-between">
                        <span>Element Sizing & Scale</span>
                        <span className="text-[9.5px] font-mono text-zinc-400">Scale Factors</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* Film Title Scale */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Film Title Scale</span>
                            <span className="font-mono text-[#ff7a29] font-bold">{titleScale}%</span>
                          </div>
                          <input
                            type="range"
                            min="75"
                            max="140"
                            step="5"
                            value={titleScale}
                            onChange={(e) => setTitleScale(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>75%</span>
                            <span>100% (Normal)</span>
                            <span>140%</span>
                          </div>
                        </div>

                        {/* Star Rating Scale */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Star Rating Scale</span>
                            <span className="font-mono text-[#ff7a29] font-bold">{starRatingScale}%</span>
                          </div>
                          <input
                            type="range"
                            min="75"
                            max="140"
                            step="5"
                            value={starRatingScale}
                            onChange={(e) => setStarRatingScale(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>75%</span>
                            <span>100% (Normal)</span>
                            <span>140%</span>
                          </div>
                        </div>

                        {/* Poster Scale / Shift */}
                        {studioMode !== "full_set" ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                              <span>Poster Scale</span>
                              <span className="font-mono text-[#ff7a29] font-bold">{posterScale}%</span>
                            </div>
                            <input
                              type="range"
                              min="70"
                              max="150"
                              step="5"
                              value={posterScale}
                              onChange={(e) => setPosterScale(Number(e.target.value))}
                              className="w-full accent-[#ff5500] cursor-pointer"
                            />
                            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                              <span>70%</span>
                              <span>100% (Normal)</span>
                              <span>150%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                              <span>Content Vertical Shift</span>
                              <span className="font-mono text-[#ff7a29] font-bold">
                                {contentShiftY > 0 ? `+${contentShiftY}` : contentShiftY}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="-40"
                              max="40"
                              step="1"
                              value={contentShiftY}
                              onChange={(e) => setContentShiftY(Number(e.target.value))}
                              className="w-full accent-[#ff5500] cursor-pointer"
                            />
                            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                              <span>-40px (Up)</span>
                              <button
                                type="button"
                                onClick={() => setContentShiftY(0)}
                                className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                              >
                                0 (Center)
                              </button>
                              <span>+40px (Down)</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Summary Mode Additions */}
                      {studioMode === "summary" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/[0.06]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                              <span>Summary Critique Font Size</span>
                              <span className="font-mono text-[#ff7a29] font-bold">
                                {summaryFontSize ? `${summaryFontSize}px` : "Auto (13px)"}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10.5"
                              max="18"
                              step="0.5"
                              value={summaryFontSize ?? 13}
                              onChange={(e) => setSummaryFontSize(Number(e.target.value))}
                              className="w-full accent-[#ff5500] cursor-pointer"
                            />
                            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                              <span>10.5px</span>
                              <button
                                type="button"
                                onClick={() => setSummaryFontSize(null)}
                                className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                              >
                                Auto
                              </button>
                              <span>18px</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                              <span>Content Vertical Shift</span>
                              <span className="font-mono text-[#ff7a29] font-bold">
                                {contentShiftY > 0 ? `+${contentShiftY}` : contentShiftY}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="-40"
                              max="40"
                              step="1"
                              value={contentShiftY}
                              onChange={(e) => setContentShiftY(Number(e.target.value))}
                              className="w-full accent-[#ff5500] cursor-pointer"
                            />
                            <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                              <span>-40px (Up)</span>
                              <button
                                type="button"
                                onClick={() => setContentShiftY(0)}
                                className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                              >
                                0 (Center)
                              </button>
                              <span>+40px (Down)</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rating Mode Shift */}
                      {studioMode === "rating" && (
                        <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[11px] font-inter text-zinc-300">
                            <span>Card Content Vertical Shift</span>
                            <span className="font-mono text-[#ff7a29] font-bold">
                              {contentShiftY > 0 ? `+${contentShiftY}` : contentShiftY}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-40"
                            max="40"
                            step="1"
                            value={contentShiftY}
                            onChange={(e) => setContentShiftY(Number(e.target.value))}
                            className="w-full accent-[#ff5500] cursor-pointer"
                          />
                          <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                            <span>-40px (Up)</span>
                            <button
                              type="button"
                              onClick={() => setContentShiftY(0)}
                              className="text-[9px] text-[#ff7a29] hover:underline cursor-pointer"
                            >
                              0 (Center)
                            </button>
                            <span>+40px (Down)</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Review Card & Image Border Styling */}
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                      <div className="text-[11px] font-poppins font-semibold text-zinc-200 flex items-center justify-between">
                        <span>Review Card & Image Border</span>
                        <span className="text-[9.5px] font-mono text-[#ff7a29]">
                          {imageBorderMode === "website"
                            ? "Website Noir (#07080a)"
                            : imageBorderMode === "none"
                            ? "Removed (Clean)"
                            : imageBorderMode === "subtle"
                            ? "Subtle White"
                            : "Accent Glow"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setImageBorderMode("website")}
                          className={`px-3 py-2 rounded-xl text-xs font-inter transition-all cursor-pointer text-center ${
                            imageBorderMode === "website"
                              ? "bg-[#ff5500] text-black font-bold shadow-[0_0_12px_rgba(255,85,0,0.3)]"
                              : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                          }`}
                        >
                          Website Noir
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageBorderMode("none")}
                          className={`px-3 py-2 rounded-xl text-xs font-inter transition-all cursor-pointer text-center ${
                            imageBorderMode === "none"
                              ? "bg-[#ff5500] text-black font-bold shadow-[0_0_12px_rgba(255,85,0,0.3)]"
                              : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                          }`}
                        >
                          Removed
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageBorderMode("subtle")}
                          className={`px-3 py-2 rounded-xl text-xs font-inter transition-all cursor-pointer text-center ${
                            imageBorderMode === "subtle"
                              ? "bg-[#ff5500] text-black font-bold shadow-[0_0_12px_rgba(255,85,0,0.3)]"
                              : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                          }`}
                        >
                          Subtle White
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageBorderMode("accent")}
                          className={`px-3 py-2 rounded-xl text-xs font-inter transition-all cursor-pointer text-center ${
                            imageBorderMode === "accent"
                              ? "bg-[#ff5500] text-black font-bold shadow-[0_0_12px_rgba(255,85,0,0.3)]"
                              : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/[0.06]"
                          }`}
                        >
                          Accent Border
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: BRANDING & EXPORT                                                 */}
              {/* ========================================================================= */}
              {activeTab === "branding" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Footer Watermark / Instagram Handle */}
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
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
                            className={`px-3 py-2 rounded-xl text-xs font-inter transition-all cursor-pointer border text-center ${
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
                          className="w-full bg-[#050608] border border-white/[0.1] focus:border-[#ff5500] rounded-xl px-3.5 py-2 text-xs font-inter text-white outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Brand & Identity Elements */}
                  <div className="p-5 rounded-2xl bg-[#0c0f16] border border-white/[0.07] space-y-3.5 shadow-lg">
                    <div className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Brand Elements & Masthead</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/20">
                        <span className="text-xs font-inter text-zinc-300">Top Header Logo</span>
                        <input
                          type="checkbox"
                          checked={showWatermark}
                          onChange={(e) => setShowWatermark(e.target.checked)}
                          className="accent-[#ff5500] w-3.5 h-3.5"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/20">
                        <span className="text-xs font-inter text-zinc-300">Genre Badges</span>
                        <input
                          type="checkbox"
                          checked={showGenres}
                          onChange={(e) => setShowGenres(e.target.checked)}
                          className="accent-[#ff5500] w-3.5 h-3.5"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/20">
                        <span className="text-xs font-inter text-zinc-300">Director's Hairline</span>
                        <input
                          type="checkbox"
                          checked={showHairlineAccent}
                          onChange={(e) => setShowHairlineAccent(e.target.checked)}
                          className="accent-[#ff5500] w-3.5 h-3.5"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Master Export Deck */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#ff5500]/15 via-[#ff5500]/5 to-transparent border border-[#ff5500]/30 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#ff5500] text-black font-mono font-bold text-[9px] uppercase tracking-wider">
                            1080 × 1920 UHD
                          </span>
                          <span className="text-xs font-mono text-zinc-400">Lossless PNG · 9:16 Aspect</span>
                        </div>
                        <h4 className="text-sm font-bold font-poppins text-white mt-1.5">
                          {studioMode === "full_set"
                            ? `Export Complete Story Set (${reviewSlides.length} Slide Images)`
                            : "Export High-Resolution Story Card"}
                        </h4>
                        <p className="text-xs font-inter text-zinc-300 mt-1 max-w-md leading-relaxed">
                          {studioMode === "full_set"
                            ? `Generates ${reviewSlides.length} high-resolution story card images at 1080×1920 with crisp anti-aliasing and packages them in a single ZIP file ready for Instagram.`
                            : "Exports a 1080×1920 PNG perfectly framed for Instagram Stories with transparent overlays and crisp typography."}
                        </p>
                      </div>

                      {studioMode === "full_set" ? (
                        <button
                          type="button"
                          onClick={handleDownloadZip}
                          disabled={isExporting || reviewSlides.length === 0}
                          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs shadow-[0_0_24px_rgba(255,85,0,0.45)] transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                        >
                          <Archive className="w-4 h-4" />
                          <span>{isExporting ? exportProgress || "Generating ZIP..." : `Download ${reviewSlides.length} Slides (ZIP)`}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDownloadSingle}
                          disabled={isExporting}
                          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs shadow-[0_0_24px_rgba(255,85,0,0.45)] transition-all cursor-pointer flex-shrink-0 disabled:opacity-50"
                        >
                          <Download className="w-4 h-4" />
                          <span>{isExporting ? exportProgress || "Exporting..." : "Download Story PNG"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Quick Export Footer Bar (Sticky at bottom of right panel) */}
            <div className="flex-shrink-0 px-3 sm:px-6 py-2.5 sm:py-3.5 border-t border-white/[0.08] bg-[#07080a]/95 backdrop-blur-xl flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-xs font-inter text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-[#ff5500] shadow-[0_0_8px_#ff5500]" />
                <span className="font-poppins font-medium text-white truncate max-w-[110px] sm:max-w-none text-[11px] sm:text-xs">
                  {studioMode === "full_set" ? `Full Set (${reviewSlides.length})` : studioMode === "rating" ? "Rating Card" : "Summary Card"}
                </span>
                <span className="hidden sm:inline text-zinc-600">·</span>
                <span className="hidden sm:inline font-mono text-[11px] text-zinc-500">1080×1920 UHD</span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Mobile View Toggle button to easily jump to full card */}
                <button
                  type="button"
                  onClick={() => setMobileViewMode(mobileViewMode === "split" ? "preview" : "split")}
                  className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-[11px] font-poppins text-white transition-all cursor-pointer"
                  title="Toggle card view mode"
                >
                  <Eye className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>{mobileViewMode === "split" ? "Full Card" : "Split View"}</span>
                </button>

                {studioMode === "full_set" ? (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={isExporting || reviewSlides.length === 0}
                    className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs shadow-[0_0_16px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{isExporting ? exportProgress || "ZIP..." : "Export ZIP"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDownloadSingle}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-poppins font-bold text-xs shadow-[0_0_16px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? exportProgress || "PNG..." : "Download PNG"}</span>
                  </button>
                )}
              </div>
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
