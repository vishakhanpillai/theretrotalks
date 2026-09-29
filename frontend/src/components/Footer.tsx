import React from "react";

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  return (
    <footer className={`border-t border-white/[0.08] bg-[#050608] py-6 text-xs font-inter ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        {/* Left Side */}
        <span className="text-zinc-400 font-medium whitespace-nowrap">
          © 2026 The Retro Talks
        </span>

        {/* Center: Under Construction Notice */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/90 text-[11px] font-mono tracking-wide shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>Site is still under construction</span>
        </div>

        {/* Right Side */}
        <div className="text-zinc-500 text-[11px] leading-relaxed text-center sm:text-right">
          <p>Movie data and images, sourced through TMDB.</p>
        </div>
      </div>
    </footer>
  );
};
