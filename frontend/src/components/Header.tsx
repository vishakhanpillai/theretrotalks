import React from "react";

interface HeaderProps {
  reviewCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ reviewCount = 4 }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.06] bg-[#07080a]/90 backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
        
        {/* Clean Logo: 'The' on top, 'Retro Talks' on bottom */}
        <div className="flex flex-col select-none group cursor-pointer">
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-[#ff5500] leading-none mb-1 group-hover:tracking-[0.35em] transition-all">
            The
          </span>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-none font-poppins group-hover:text-[#ff7a29] transition-colors">
            Retro Talks
          </span>
        </div>

        {/* Minimal Right Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-poppins text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] shadow-[0_0_8px_#ff5500]" />
            <span className="text-zinc-200 font-medium">{reviewCount}</span>
            <span className="text-zinc-500">Reviews Logged</span>
          </div>
        </div>

      </div>
    </header>
  );
};
