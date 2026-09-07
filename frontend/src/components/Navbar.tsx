import React, { useState, useEffect } from "react";
import { Shield, Film, FileText, Menu, X, ArrowUpRight } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./Icons";

interface NavbarProps {
  activeTab?: string;
  onNavigateToDiary?: () => void;
  reviewCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateToDiary, reviewCount = 4 }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Experience", href: "#experience" },
    { label: "Skills", href: "#skills" },
    { label: "Projects", href: "#projects" },
    { label: "Education", href: "#education" },
  ];

  const scrollTo = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#07080a]/95 backdrop-blur-md border-b border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          : "bg-[#07080a]/70 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand / Name */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#0e1117] border border-white/[0.1] flex items-center justify-center group-hover:border-[#ff5500]/60 transition-colors">
            <Shield className="w-4 h-4 text-[#ff5500]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white font-poppins tracking-tight group-hover:text-[#ff7a29] transition-colors leading-none">
              Vishakhan Pillai V P
            </span>
            <span className="text-[11px] font-mono text-zinc-400 mt-1">
              DevSecOps Engineer
            </span>
          </div>
        </a>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.href)}
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}

          {/* Special "The Retro Talks" Diary Link */}
          <button
            onClick={() => {
              if (onNavigateToDiary) {
                onNavigateToDiary();
              } else {
                scrollTo("#retro-talks");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ff5500]/10 hover:bg-[#ff5500]/20 border border-[#ff5500]/30 text-xs font-medium text-[#ff7a29] hover:text-[#ff5500] transition-all cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-[#ff5500]" />
            <span>The Retro Talks</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#ff5500] text-black font-bold">
              {reviewCount}
            </span>
          </button>
        </nav>

        {/* Right Action Icons: Resume, GitHub, LinkedIn */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="/VP_Resume_for_website.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.2] text-xs font-mono text-zinc-300 transition-colors"
            title="View Resume PDF"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span>Resume PDF</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
          </a>

          <a
            href="https://github.com/vishakhanpillai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            aria-label="GitHub Profile"
          >
            <GithubIcon className="w-4 h-4" />
          </a>

          <a
            href="https://linkedin.com/in/vishakhanpillai"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            aria-label="LinkedIn Profile"
          >
            <LinkedinIcon className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 bg-[#090b0e] border-b border-white/[0.08] space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollTo(link.href)}
                className="text-left py-2 px-3 text-sm text-zinc-300 hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}

            <button
              onClick={() => {
                if (onNavigateToDiary) onNavigateToDiary();
                else scrollTo("#retro-talks");
              }}
              className="flex items-center justify-between py-2 px-3 text-sm text-[#ff7a29] bg-[#ff5500]/10 rounded-lg cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-[#ff5500]" />
                <span>The Retro Talks (Cinema Diary)</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#ff5500] text-black font-bold">
                {reviewCount}
              </span>
            </button>
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
            <a
              href="/VP_Resume_for_website.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-grow flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/[0.05] text-xs font-mono text-zinc-200 border border-white/[0.08]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Resume PDF</span>
              <ArrowUpRight className="w-3 h-3 text-zinc-500" />
            </a>

            <a
              href="https://github.com/vishakhanpillai"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300"
            >
              <GithubIcon className="w-4 h-4" />
            </a>

            <a
              href="https://linkedin.com/in/vishakhanpillai"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
