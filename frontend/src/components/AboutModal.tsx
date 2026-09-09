import React, { useEffect } from "react";
import { X, User } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Clickable Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#090b0e] border border-white/[0.12] rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(255,85,0,0.15)] z-10 flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="p-6 sm:p-7 bg-[#0d1016] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5500]/10 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] shadow-[0_0_20px_rgba(255,85,0,0.2)]">
              <User className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-poppins text-white tracking-tight">
                Vishakhan Pillai V P
              </h3>
              <p className="text-xs text-zinc-400 font-inter mt-0.5">
                The Retro Talks · Cinema & Perspectives
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Simple Justified Paragraphs */}
        <div className="p-6 sm:p-8 space-y-4 text-sm text-zinc-300 leading-relaxed font-poppins overflow-y-auto max-h-[70vh]">
          <p className="text-justify leading-relaxed">
            I'm someone who has always felt that cinema is much more than just entertainment. Movies have been a source of curiosity, inspiration, escape, and sometimes even a way of understanding life a little better. I love discovering films, talking about what makes them special, and learning about the people and ideas behind them. I'm especially drawn to stories that stay with you long after the credits roll, whether because of their characters, filmmaking, performances, music, or simply the feeling they leave behind.
          </p>

          <p className="text-justify leading-relaxed">
            I have always enjoyed conversations that go beyond the surface, and that curiosity is what eventually led me to create The Retro Talks. This is a space where I can share my love for films, explore the stories behind them, and hopefully have meaningful conversations with people who love cinema as much as I do.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 bg-[#0d1016] border-t border-white/[0.08] flex items-center justify-end text-xs text-zinc-400">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer font-inter"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
