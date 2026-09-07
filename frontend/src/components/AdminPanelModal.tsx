import React from "react";
import {
  X,
  Shield,
  Film,
  Star,
  Trash2,
  Sparkles,
  LogOut,
  Database,
  Plus
} from "lucide-react";
import type { Review } from "../types";
import { getPosterUrl } from "../utils/images";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviews: Review[];
  onOpenReview: (review: Review) => void;
  onOpenPosterModal: (review: Review) => void;
  onDeleteReview: (id: string | number) => void;
  onOpenNewReviewSearch: () => void;
  onLogout: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  reviews,
  onOpenReview,
  onOpenPosterModal,
  onDeleteReview,
  onOpenNewReviewSearch,
  onLogout,
}) => {
  if (!isOpen) return null;

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : "0.0";
  const favoritesCount = reviews.filter((r) => r.isFavorite).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-[#090b0e] border border-white/[0.12] rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.15)] z-10 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-[#0e1117] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-poppins text-white">
                  Admin Control Center
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#ff5500] text-black text-[10px] font-mono font-bold uppercase">
                  SQLite Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                The Retro Talks · Personal Management Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono transition-colors cursor-pointer"
              title="Logout from Admin Mode"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-[#090b0e] border-b border-white/[0.06]">
          <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">Total Reviews</span>
            <span className="text-2xl font-bold font-poppins text-white mt-1 block">{totalReviews}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">Average Rating</span>
            <span className="text-2xl font-bold font-poppins text-[#ff5500] mt-1 block">★ {avgRating}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.06]">
            <span className="text-[10px] font-mono uppercase text-zinc-500 block">Favorites</span>
            <span className="text-2xl font-bold font-poppins text-white mt-1 block">{favoritesCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0e1117] border border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">Storage</span>
              <span className="text-xs font-mono text-emerald-400 font-bold mt-1 flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>retro_talks.db</span>
              </span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenNewReviewSearch();
              }}
              className="p-2.5 rounded-xl bg-[#ff5500] text-black hover:bg-[#ff6a1f] transition-all cursor-pointer shadow-[0_0_15px_rgba(255,85,0,0.3)]"
              title="Add New Review"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Content Body: Reviews Management Table */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Manage Database Reviews ({reviews.length})
            </h4>

            <button
              onClick={() => {
                onClose();
                onOpenNewReviewSearch();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5500]/10 hover:bg-[#ff5500]/20 border border-[#ff5500]/30 text-xs font-mono text-[#ff7a29] hover:text-[#ff5500] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Search TMDB & Log Review</span>
            </button>
          </div>

          <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-2xl overflow-hidden bg-[#0c0e13]">
            {reviews.map((rev) => {
              const poster = getPosterUrl(rev.poster, "w342");
              return (
                <div
                  key={rev.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.08]">
                      {poster ? (
                        <img src={poster} alt={rev.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-4 h-4 text-zinc-600" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-white truncate font-poppins">
                          {rev.title}
                        </h5>
                        <span className="text-xs font-mono text-zinc-500">
                          ({rev.year})
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        Dir. {rev.director} · Watched {rev.watchedDate}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[#ff5500] font-mono mt-1">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{rev.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Story Studio */}
                    <button
                      onClick={() => {
                        onClose();
                        onOpenReview(rev);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Open Instagram Story Card Studio"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Story Studio</span>
                    </button>

                    {/* Change Poster */}
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPosterModal(rev);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-[#ff5500]/15 border border-white/[0.08] hover:border-[#ff5500]/40 text-xs font-mono text-zinc-300 hover:text-[#ff7a29] transition-colors cursor-pointer"
                      title="Change Poster Artwork from TMDB"
                    >
                      <Film className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Change Poster</span>
                    </button>

                    {/* Delete Review */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${rev.title}" permanently from database?`)) {
                          onDeleteReview(rev.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                      title="Delete Review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0e1117] border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-500">
          <span>Logged in as Admin (Vishakhan Pillai)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>

      </div>
    </div>
  );
};
