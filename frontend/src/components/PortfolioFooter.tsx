import React from "react";
import { Shield, Film, FileText, ArrowUp } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./Icons";

interface PortfolioFooterProps {
  onNavigateToDiary?: () => void;
}

export const PortfolioFooter: React.FC<PortfolioFooterProps> = ({ onNavigateToDiary }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-white/[0.08] bg-[#050608] py-12 text-zinc-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand & Title */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
            <Shield className="w-4 h-4 text-[#ff5500]" />
            <span>Vishakhan Pillai V P</span>
          </div>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span className="text-zinc-400">Junior DevSecOps Engineer</span>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span className="text-zinc-500">Kochi, Kerala</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-5">
          <a
            href="https://linkedin.com/in/vishakhanpillai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <LinkedinIcon className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </a>

          <a
            href="https://github.com/vishakhanpillai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          <a
            href="/VP_Resume_for_website.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Resume PDF</span>
          </a>

          {onNavigateToDiary && (
            <button
              onClick={onNavigateToDiary}
              className="flex items-center gap-1.5 text-[#ff7a29] hover:text-[#ff5500] transition-colors cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>The Retro Talks</span>
            </button>
          )}

          <button
            onClick={scrollToTop}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] transition-colors cursor-pointer ml-2"
            title="Back to Top"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
