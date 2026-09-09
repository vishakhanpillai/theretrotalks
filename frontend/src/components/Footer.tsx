import React from "react";

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  return (
    <footer className={`border-t border-white/[0.08] bg-[#050608] py-6 text-xs font-inter ${className}`}>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        {/* Left Side */}
        <span className="text-zinc-400 font-medium whitespace-nowrap">
          © 2026 The Retro Talks
        </span>

        {/* Right Side */}
        <div className="text-zinc-500 text-[11px] leading-relaxed text-center sm:text-right">
          <p>Movie data and images, sourced through TMDB.</p>
        </div>
      </div>
    </footer>
  );
};
