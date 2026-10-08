import React from "react";
import {
  Film,
  Plus,
  Layers,
  Heart,
  Tv,
  ArrowUpDown,
  Database,
  Upload,
  ExternalLink,
  LogOut,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Check,
  Edit3,
  PanelLeftClose,
} from "lucide-react";
import type { ReviewDraft } from "../utils/draftStorage";

export type FilterTab = "all" | "movie" | "tv" | "favorites" | "5star" | "4star_plus";

interface AdminSidebarProps {
  totalReviews: number;
  favoritesCount: number;
  movieCount: number;
  tvCount: number;
  avgRating: string;
  fiveStarCount?: number;
  fourStarPlusCount?: number;
  filterTab: FilterTab;
  setFilterTab: (tab: FilterTab) => void;
  isReorderMode: boolean;
  setIsReorderMode: (val: boolean) => void;
  hasPendingReorder: boolean;
  onSaveReorder: () => Promise<void>;
  savingReorder: boolean;
  onOpenAddCinema: () => void;
  onOpenImport: () => void;
  onDownloadBackup: (format: "sqlite" | "json" | "csv") => Promise<void>;
  downloadingFormat: "sqlite" | "json" | "csv" | null;
  onNavigateHome: () => void;
  onLogout: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  draft?: ReviewDraft | null;
  onResumeDraft?: () => void;
  onDiscardDraft?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  totalReviews,
  favoritesCount,
  movieCount,
  tvCount,
  filterTab,
  setFilterTab,
  isReorderMode,
  setIsReorderMode,
  hasPendingReorder,
  onSaveReorder,
  savingReorder,
  onOpenAddCinema,
  onOpenImport,
  onDownloadBackup,
  downloadingFormat,
  onNavigateHome,
  onLogout,
  isOpen = true,
  onToggle,
  onClose,
  isMobileOpen,
  onCloseMobile,
  draft,
  onResumeDraft,
  onDiscardDraft,
}) => {
  const isActuallyOpen = isOpen ?? isMobileOpen ?? true;
  const handleClose = onClose || onCloseMobile || onToggle || (() => {});

  const handleMobileNav = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      handleClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isActuallyOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden animate-in fade-in duration-200"
          onClick={handleClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#08090d] border-r border-white/[0.08] flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isActuallyOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full"
        }`}
      >
        {/* Top Section */}
        <div className="flex flex-col flex-grow overflow-y-auto no-scrollbar p-5 space-y-5">
          
          {/* Brand Header with Toggle Button */}
          <div className="flex items-center justify-between">
            <div
              onClick={onNavigateHome}
              className="flex items-center gap-3 cursor-pointer group select-none"
              title="Return to Public Homepage"
            >
              <div className="w-9 h-9 rounded-xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] group-hover:scale-105 group-hover:bg-[#ff5500] group-hover:text-black transition-all shadow-[0_0_15px_rgba(255,85,0,0.15)]">
                <Film className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#ff5500] font-bold leading-none mb-1">
                  The Retro Talks
                </span>
                <span className="text-base font-extrabold font-poppins text-white tracking-tight leading-none group-hover:text-[#ff7a29] transition-colors">
                  Studio Desk
                </span>
              </div>
            </div>

            {/* Collapse / Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Database Live Cloud Indicator */}
          <div className="px-3 py-2 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15 flex items-center justify-between text-xs font-inter text-emerald-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-medium text-[11px] tracking-wide">Turso Cloud Database</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-emerald-500/80 uppercase px-1.5 py-0.5 rounded bg-emerald-500/10">Active</span>
          </div>

          {/* PRIMARY "ADD CINEMA" BUTTON */}
          <button
            type="button"
            onClick={() => {
              onOpenAddCinema();
              handleMobileNav();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black border border-[#ff5500] text-xs font-inter font-bold transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-[0_0_20px_rgba(255,85,0,0.25)] hover:shadow-[0_0_25px_rgba(255,85,0,0.4)] active:scale-[0.98]"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Cinema Review</span>
            </div>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/15 text-black font-semibold">
              ⌘K
            </kbd>
          </button>

          {/* UNFINISHED REVIEW DRAFT BANNER (If draft exists) */}
          {draft && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Unfinished Draft</span>
                </div>
                {onDiscardDraft && (
                  <button
                    type="button"
                    onClick={onDiscardDraft}
                    className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                    title="Discard draft"
                  >
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-xs font-semibold font-poppins text-white truncate">
                {draft.customTitle || draft.movie?.title || "Untitled Draft"}
              </p>

              {onResumeDraft && (
                <button
                  type="button"
                  onClick={() => {
                    onResumeDraft();
                    handleMobileNav();
                  }}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-inter font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Resume Writing</span>
                </button>
              )}
            </div>
          )}

          {/* Catalog Navigation & Filters */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold px-2 block mb-1.5">
              Archive Filters
            </span>

            {/* All Reviews Tab */}
            <button
              type="button"
              onClick={() => {
                setFilterTab("all");
                handleMobileNav();
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-inter flex items-center justify-between transition-all cursor-pointer ${
                filterTab === "all" && !isReorderMode
                  ? "bg-[#ff5500]/15 text-[#ff7a29] font-semibold border border-[#ff5500]/30 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>All Titles</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                {totalReviews}
              </span>
            </button>

            {/* Movies Filter */}
            <button
              type="button"
              onClick={() => {
                setFilterTab("movie");
                handleMobileNav();
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-inter flex items-center justify-between transition-all cursor-pointer ${
                filterTab === "movie" && !isReorderMode
                  ? "bg-[#ff5500]/15 text-[#ff7a29] font-semibold border border-[#ff5500]/30 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4" />
                <span>Movies</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                {movieCount}
              </span>
            </button>

            {/* TV Series Filter */}
            <button
              type="button"
              onClick={() => {
                setFilterTab("tv");
                handleMobileNav();
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-inter flex items-center justify-between transition-all cursor-pointer ${
                filterTab === "tv" && !isReorderMode
                  ? "bg-[#ff5500]/15 text-[#ff7a29] font-semibold border border-[#ff5500]/30 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4" />
                <span>TV Shows</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
                {tvCount}
              </span>
            </button>

            {/* Favorites Filter */}
            <button
              type="button"
              onClick={() => {
                setFilterTab("favorites");
                handleMobileNav();
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-inter flex items-center justify-between transition-all cursor-pointer ${
                filterTab === "favorites" && !isReorderMode
                  ? "bg-[#ff5500]/15 text-[#ff7a29] font-semibold border border-[#ff5500]/30 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>Favorites</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {favoritesCount}
              </span>
            </button>

            {/* Reorder Mode Button */}
            <button
              type="button"
              onClick={() => {
                setIsReorderMode(!isReorderMode);
                handleMobileNav();
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-inter flex items-center justify-between transition-all cursor-pointer mt-2 ${
                isReorderMode
                  ? "bg-[#ff5500] text-black font-bold shadow-[0_0_20px_rgba(255,85,0,0.35)]"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ArrowUpDown className="w-4 h-4" />
                <span>Display Order Mode</span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  isReorderMode ? "bg-black/20 text-black" : "bg-white/[0.08] text-zinc-400"
                }`}
              >
                {isReorderMode ? "Active" : "Off"}
              </span>
            </button>

            {/* Pending reorder notification bar */}
            {isReorderMode && hasPendingReorder && (
              <button
                type="button"
                onClick={onSaveReorder}
                disabled={savingReorder}
                className="w-full mt-2 py-2 px-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-bold text-xs font-inter flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg animate-pulse"
              >
                {savingReorder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Order...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Save Order Changes</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Database & Backups */}
          <div className="space-y-2 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
                Database Backups
              </span>
            </div>

            {/* 1-Click Backup Export Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onDownloadBackup("sqlite")}
                disabled={Boolean(downloadingFormat)}
                title="Download binary SQLite database (.sqlite)"
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-[#ff5500] text-zinc-300 hover:text-black border border-white/[0.06] hover:border-[#ff5500] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadingFormat === "sqlite" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="text-[10px] font-mono font-bold">.sqlite</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadBackup("json")}
                disabled={Boolean(downloadingFormat)}
                title="Export all reviews as structured JSON"
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-[#ff5500] text-zinc-300 hover:text-black border border-white/[0.06] hover:border-[#ff5500] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadingFormat === "json" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="text-[10px] font-mono font-bold">JSON</span>
              </button>

              <button
                type="button"
                onClick={() => onDownloadBackup("csv")}
                disabled={Boolean(downloadingFormat)}
                title="Export reviews as CSV spreadsheet"
                className="p-2 rounded-xl bg-white/[0.03] hover:bg-[#ff5500] text-zinc-300 hover:text-black border border-white/[0.06] hover:border-[#ff5500] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {downloadingFormat === "csv" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span className="text-[10px] font-mono font-bold">CSV</span>
              </button>
            </div>

            {/* Import Database CTA */}
            <button
              type="button"
              onClick={() => {
                onOpenImport();
                handleMobileNav();
              }}
              className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-inter font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>Import / Restore Data</span>
            </button>
          </div>
        </div>

        {/* Bottom Utility Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-[#06070a] space-y-2 flex-shrink-0">
          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-inter text-zinc-300 hover:text-white flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>Public Cinema Site</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">↗</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full px-3 py-2 rounded-xl bg-red-500/[0.06] hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 text-xs font-inter text-red-400 hover:text-red-300 flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </div>
            <span className="text-[10px] font-mono text-red-400/80">Lock</span>
          </button>
        </div>
      </aside>
    </>
  );
};
