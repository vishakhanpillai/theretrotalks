import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Crop, RotateCcw, Check, MoveVertical, Maximize2, ZoomIn, Eye } from "lucide-react";
import type { BackdropFraming } from "../types";

interface BackdropFramingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  backdropUrl: string;
  currentFraming?: BackdropFraming;
  onSaveFraming: (framing: BackdropFraming) => Promise<void> | void;
}

export const BackdropFramingModal: React.FC<BackdropFramingModalProps> = ({
  isOpen,
  onClose,
  movieTitle,
  backdropUrl,
  currentFraming,
  onSaveFraming,
}) => {
  const [y, setY] = useState<number>(currentFraming?.y ?? 0);
  const [height, setHeight] = useState<number>(currentFraming?.height ?? 70);
  const [zoom, setZoom] = useState<number>(currentFraming?.zoom ?? 100);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuides, setShowGuides] = useState(true);

  const previewRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragInitialY = useRef<number>(0);

  // Sync state with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setY(currentFraming?.y ?? 0);
      setHeight(currentFraming?.height ?? 70);
      setZoom(currentFraming?.zoom ?? 100);
      setIsSaving(false);
      setIsDragging(false);
    }
  }, [isOpen, currentFraming]);

  // Drag-to-reposition logic
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragInitialY.current = y;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !previewRef.current) return;
      const deltaY = e.clientY - dragStartY.current;
      const containerHeight = previewRef.current.clientHeight;
      // Invert delta: dragging down shows more top (decreases Y offset), dragging up shows more bottom
      const deltaPercent = -(deltaY / (containerHeight || 300)) * 100;
      const nextY = Math.min(100, Math.max(0, Math.round(dragInitialY.current + deltaPercent)));
      setY(nextY);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch support for drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartY.current = e.touches[0].clientY;
      dragInitialY.current = y;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !previewRef.current || e.touches.length !== 1) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    const containerHeight = previewRef.current.clientHeight;
    const deltaPercent = -(deltaY / (containerHeight || 300)) * 100;
    const nextY = Math.min(100, Math.max(0, Math.round(dragInitialY.current + deltaPercent)));
    setY(nextY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setY(0);
    setHeight(70);
    setZoom(100);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveFraming({ y, height, zoom });
      onClose();
    } catch (err) {
      console.error("Failed to save framing:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-5xl bg-[#090b0e] border border-white/[0.12] rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(255,85,0,0.15)] flex flex-col max-h-[95vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0f16]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#ff5500]/15 text-[#ff5500] border border-[#ff5500]/30">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-poppins text-white">
                  Frame & Crop Backdrop
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#ff5500]/15 text-[#ff7a29] text-[10px] font-mono font-semibold uppercase">
                  Live Visual Framer
                </span>
              </div>
              <p className="text-xs font-inter text-zinc-400 truncate max-w-md">
                {movieTitle} — decide what and how much of the backdrop to display
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuides(!showGuides)}
              className={`p-2 rounded-xl border text-xs font-inter transition-colors cursor-pointer ${
                showGuides
                  ? "bg-[#ff5500]/20 border-[#ff5500]/40 text-[#ff7a29]"
                  : "bg-white/[0.05] border-white/10 text-zinc-400 hover:text-white"
              }`}
              title="Toggle preview overlay guidelines"
            >
              <Eye className="w-4 h-4" />
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

        {/* Modal Body: Two sections (Preview Canvas + Controls) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow">
          
          {/* 1. Interactive Framing Preview Canvas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-inter text-zinc-400">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <MoveVertical className="w-3.5 h-3.5 text-[#ff5500]" />
                Interactive Framing Canvas
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                Click & drag up/down inside frame to reposition
              </span>
            </div>

            {/* Viewport Frame with dynamic aspect ratio */}
            <div
              ref={previewRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ height: `${Math.max(220, Math.min(380, height * 4.4))}px` }}
              className={`relative w-full rounded-2xl overflow-hidden bg-[#050608] border-2 transition-all duration-150 ${
                isDragging
                  ? "border-[#ff5500] cursor-grabbing shadow-[0_0_30px_rgba(255,85,0,0.3)]"
                  : "border-white/15 hover:border-[#ff5500]/60 cursor-grab"
              }`}
            >
              {/* Backdrop image rendered with object-cover and dynamic objectPosition */}
              <img
                src={backdropUrl}
                alt={movieTitle}
                draggable={false}
                style={{
                  objectPosition: `center ${y}%`,
                  transform: zoom > 100 ? `scale(${zoom / 100})` : "none",
                }}
                className="w-full h-full object-cover select-none pointer-events-none transition-[transform] duration-100 ease-out"
              />

              {/* Cinema Vignettes (matching ReviewPage) */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#07080a]/50 to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#07080a]/50 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#07080a] via-[#07080a]/60 to-transparent pointer-events-none" />

              {/* Optional Composition Guides & Title Simulation */}
              {showGuides && (
                <>
                  {/* Thirds guidelines */}
                  <div className="absolute inset-0 pointer-events-none opacity-20 border-y border-dashed border-white/40 flex flex-col justify-between">
                    <div className="w-full h-[33.33%] border-b border-dashed border-white/40" />
                    <div className="w-full h-[33.33%] border-t border-dashed border-white/40" />
                  </div>

                  {/* Title overlay simulation */}
                  <div className="absolute bottom-4 left-5 right-5 pointer-events-none flex items-end justify-between">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest text-[#ff7a29] uppercase font-semibold">
                        Preview Overlay
                      </span>
                      <h4 className="text-lg font-bold font-poppins text-white leading-tight drop-shadow-md">
                        {movieTitle}
                      </h4>
                    </div>

                    <div className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-zinc-300">
                      Y: <span className="text-[#ff7a29] font-bold">{y}%</span> · H: <span className="text-[#ff7a29] font-bold">{height}vh</span> · Z: <span className="text-[#ff7a29] font-bold">{zoom}%</span>
                    </div>
                  </div>
                </>
              )}

              {/* Drag instruction badge */}
              <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-inter text-zinc-300 shadow-lg">
                <MoveVertical className="w-3 h-3 text-[#ff5500]" />
                <span>{isDragging ? "Repositioning..." : "Drag up/down to reposition"}</span>
              </div>
            </div>
          </div>

          {/* 2. Control Sliders & Presets Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-4 rounded-2xl bg-[#0c0f16] border border-white/[0.07]">
            
            {/* Control 1: Vertical Position (What to show) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5 text-[#ff5500]" />
                  Vertical Position
                </label>
                <span className="text-xs font-mono font-bold text-[#ff7a29] bg-[#ff5500]/15 px-2 py-0.5 rounded-md">
                  {y}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={y}
                onChange={(e) => setY(Number(e.target.value))}
                className="w-full accent-[#ff5500] cursor-pointer bg-zinc-800 h-1.5 rounded-lg"
              />

              {/* Quick Presets for Position */}
              <div className="grid grid-cols-5 gap-1 pt-1">
                {[
                  { label: "Top", val: 0 },
                  { label: "25%", val: 25 },
                  { label: "Mid", val: 50 },
                  { label: "75%", val: 75 },
                  { label: "Btm", val: 100 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setY(p.val)}
                    className={`py-1 rounded-lg text-[10px] font-inter font-medium transition-colors cursor-pointer border ${
                      y === p.val
                        ? "bg-[#ff5500] text-black border-[#ff5500] font-bold"
                        : "bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Banner Height (How much to show) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-[#ff5500]" />
                  Banner Height (Exposure)
                </label>
                <span className="text-xs font-mono font-bold text-[#ff7a29] bg-[#ff5500]/15 px-2 py-0.5 rounded-md">
                  {height}vh
                </span>
              </div>

              <input
                type="range"
                min="45"
                max="85"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full accent-[#ff5500] cursor-pointer bg-zinc-800 h-1.5 rounded-lg"
              />

              {/* Quick Presets for Height */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: "Compact", val: 52 },
                  { label: "Standard", val: 68 },
                  { label: "Cinematic", val: 80 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setHeight(p.val)}
                    className={`py-1 rounded-lg text-[10px] font-inter font-medium transition-colors cursor-pointer border ${
                      height === p.val
                        ? "bg-[#ff5500] text-black border-[#ff5500] font-bold"
                        : "bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 3: Zoom / Scale */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold font-poppins text-white flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-[#ff5500]" />
                  Framing Zoom
                </label>
                <span className="text-xs font-mono font-bold text-[#ff7a29] bg-[#ff5500]/15 px-2 py-0.5 rounded-md">
                  {zoom}%
                </span>
              </div>

              <input
                type="range"
                min="100"
                max="140"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-[#ff5500] cursor-pointer bg-zinc-800 h-1.5 rounded-lg"
              />

              {/* Quick Presets for Zoom */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: "100% (Natural)", val: 100 },
                  { label: "115%", val: 115 },
                  { label: "130% (Tight)", val: 130 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setZoom(p.val)}
                    className={`py-1 rounded-lg text-[10px] font-inter font-medium transition-colors cursor-pointer border ${
                      zoom === p.val
                        ? "bg-[#ff5500] text-black border-[#ff5500] font-bold"
                        : "bg-white/[0.04] text-zinc-400 hover:text-white border-white/[0.06]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-[#0c0f16]/90 backdrop-blur-md">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-inter text-zinc-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-inter text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-inter font-bold text-xs shadow-[0_0_20px_rgba(255,85,0,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isSaving ? "Saving Framing..." : "Apply & Save Framing"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
