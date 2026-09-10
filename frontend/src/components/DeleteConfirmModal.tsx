import React, { useState } from "react";
import { AlertTriangle, Trash2, X, Loader2, Film } from "lucide-react";
import type { Review } from "../types";
import { getPosterUrl } from "../utils/images";
import { formatRating } from "../utils/formatRating";

interface DeleteConfirmModalProps {
  review: Review | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  review,
  isOpen,
  onClose,
  onConfirmDelete,
}) => {
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !review) return null;

  const posterUrl = getPosterUrl(review.poster, "w342");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirmDelete();
      onClose();
    } catch (err) {
      console.error("Delete review failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0d090a] border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_50px_rgba(239,68,68,0.15)] z-10 space-y-6">
        {/* Top Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 flex-shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-inter uppercase tracking-[0.2em] text-red-400 font-semibold block">
                Confirm Deletion
              </span>
              <h3 className="text-lg font-bold font-poppins text-white">
                Delete Cinema Review
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Film Card Preview */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3.5">
          <div className="w-12 h-16 rounded-xl overflow-hidden bg-[#181c24] flex-shrink-0 border border-white/[0.08]">
            {posterUrl ? (
              <img src={posterUrl} alt={review.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                <Film className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold font-poppins text-white truncate">
              {review.title}
            </h4>
            <p className="text-xs font-inter text-zinc-400 mt-0.5">
              {review.year && `${review.year} · `}Dir. {review.director}
            </p>
            <div className="text-[11px] font-inter text-[#ff7a29] mt-1 font-medium">
              ★ {formatRating(review.rating)} / 5
            </div>
          </div>
        </div>

        {/* Warning copy */}
        <p className="text-xs font-inter text-zinc-400 leading-relaxed">
          Are you sure you want to permanently remove this review? This action cannot be undone and will delete the record immediately from your SQLite database.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-inter text-zinc-300 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-inter font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center gap-2 cursor-pointer"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
