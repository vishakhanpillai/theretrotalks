import React, { useEffect } from "react";
import {
  Shield,
  Film,
  FileText,
  Briefcase,
  Terminal,
  GraduationCap,
  Award,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Bug,
  Radar,
  Workflow,
  Code2,
  Server
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "../components/Icons";

interface AboutPageProps {
  onNavigateHome: () => void;
  reviewCount?: number;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  onNavigateHome,
  reviewCount = 4,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#07080a] text-[#ededed] flex flex-col font-poppins selection:bg-[#ff5500] selection:text-black">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl transition-all">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          
          {/* Back to Cinema Diary */}
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#ff5500]/40 text-xs font-medium text-zinc-300 hover:text-white transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#ff5500] group-hover:-translate-x-0.5 transition-transform" />
            <span>The Retro Talks</span>
          </button>

          {/* Center Brand */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-[#ff5500]" />
            <span className="text-white font-medium">About Vishakhan</span>
          </div>

          {/* Right Action: Resume */}
          <a
            href="/VP_Resume_for_website.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5500]/10 hover:bg-[#ff5500]/20 border border-[#ff5500]/30 text-xs font-mono text-[#ff7a29] hover:text-[#ff5500] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Resume PDF</span>
          </a>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16 w-full">
        
        {/* Profile Card / Hero */}
        <section className="p-6 sm:p-8 rounded-3xl bg-[#0b0d12] border border-white/[0.08] relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono text-zinc-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] animate-pulse" />
                <span>Junior DevSecOps Engineer @ Gieom</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black font-poppins text-white tracking-tight">
                Vishakhan Pillai <span className="text-[#ff5500]">V P</span>
              </h1>

              <p className="text-sm text-zinc-400 font-mono mt-1">
                Kochi, Kerala · Application Security & DevSecOps
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <a
                href="https://linkedin.com/in/vishakhanpillai"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-[#ff5500] transition-colors"
                title="LinkedIn"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>

              <a
                href="https://github.com/vishakhanpillai"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors"
                title="GitHub"
              >
                <GithubIcon className="w-4 h-4" />
              </a>

              <a
                href="/VP_Resume_for_website.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-zinc-300 hover:text-white transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Resume</span>
              </a>
            </div>
          </div>

          {/* Bio / Summary */}
          <div className="space-y-3 text-sm sm:text-base text-zinc-300 font-normal leading-relaxed">
            <p>
              I am a Junior DevSecOps Engineer with hands-on experience in application security, SAST, DAST, SCA, vulnerability validation, and CI/CD pipeline security.
            </p>
            <p className="text-sm text-zinc-400">
              Experienced in assessing enterprise applications and investigating security findings, with a strong focus on offensive security, penetration testing, reconnaissance, and adversarial security research. Academic Topper in MCA with a 9.0 CGPA.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.06]">
            <div className="p-3 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-lg font-bold font-poppins text-white">9.0 / 10</div>
              <div className="text-[10px] font-mono text-[#ff7a29] mt-0.5">MCA Academic Topper</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-lg font-bold font-poppins text-white">SAST / DAST</div>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">GZero Security</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-lg font-bold font-poppins text-white">CI/CD Security</div>
              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">DevSecOps SDLC</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-lg font-bold font-poppins text-white">{reviewCount} Films</div>
              <div className="text-[10px] font-mono text-[#ff5500] mt-0.5">The Retro Talks</div>
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Briefcase className="w-4 h-4 text-[#ff5500]" />
            <h2 className="text-lg font-bold font-poppins text-white">
              Work Experience
            </h2>
          </div>

          <div className="space-y-4">
            {/* Junior DevSecOps Engineer */}
            <div className="p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.07] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Junior DevSecOps Engineer
                  </h3>
                  <p className="text-xs text-[#ff7a29]">
                    Gieom Business Solutions Pvt Ltd · Kochi, Kerala
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-400">Jul. 2026 – Present</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5500] flex-shrink-0 mt-1" />
                  <span>Contributing to the integration of security practices across CI/CD pipelines and the SDLC.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#ff5500] flex-shrink-0 mt-1" />
                  <span>Supporting application security and DevSecOps initiatives involving automated security assessment and vulnerability identification.</span>
                </li>
              </ul>
            </div>

            {/* DevSecOps Intern */}
            <div className="p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.07] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    DevSecOps Intern
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Gieom Business Solutions Pvt Ltd · Kochi, Kerala
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500">Jan. 2026 – Jun. 2026</span>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1" />
                  <span>Performed SAST, DAST, and SCA on enterprise applications as part of the GZero Product Security Framework.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-1" />
                  <span>Manually validated security findings, identifying a Path Traversal vulnerability that exposed sensitive credentials and demonstrated unauthorized access risk.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-1" />
                  <span>Contributed to infrastructure automation initiatives by working on NetBox automation workflows.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technical Skills */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Terminal className="w-4 h-4 text-[#ff5500]" />
            <h2 className="text-lg font-bold font-poppins text-white">
              Skills & Security Arsenal
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-poppins">
                <Lock className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>Application Security</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                SAST, DAST, SCA, Vulnerability Assessment, Secure Code Review
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-poppins">
                <Bug className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>Offensive Security</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Web AppSec, Reconnaissance, Network Security, CTFs
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-poppins">
                <Radar className="w-4 h-4 text-[#ff5500]" />
                <span>Security Tools</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Burp Suite, OWASP ZAP, Caido, Nmap, Semgrep, Trivy, SonarQube
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-poppins">
                <Workflow className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>DevSecOps & Infra</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                CI/CD, Docker, Linux, Azure DevOps, NetBox, SBOM
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-poppins">
                <Code2 className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>Programming</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Python, C/C++, SQL, TypeScript, JavaScript
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-poppins">
                <Server className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>Tools & Virtualization</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                Git, GitHub, VMware Workstation, VirtualBox
              </p>
            </div>
          </div>
        </section>

        {/* Education Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <GraduationCap className="w-4 h-4 text-[#ff5500]" />
            <h2 className="text-lg font-bold font-poppins text-white">
              Education
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#ff7a29]">
                <span>2024 – 2026</span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <Award className="w-3 h-3" />
                  <span>Academic Topper</span>
                </span>
              </div>
              <h3 className="text-sm font-bold text-white font-poppins">
                Master of Computer Applications (MCA)
              </h3>
              <p className="text-xs text-zinc-400">
                Rajagiri College of Social Sciences · CGPA: 9.0/10
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0b0d12] border border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>2021 – 2024</span>
                <span>CGPA: 8.6/10</span>
              </div>
              <h3 className="text-sm font-bold text-white font-poppins">
                Bachelor of Computer Applications (BCA)
              </h3>
              <p className="text-xs text-zinc-400">
                St. Joseph’s College, Devagiri · Kozhikode
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA to Return to The Retro Talks */}
        <section className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-semibold text-xs font-poppins transition-all shadow-[0_0_20px_rgba(255,85,0,0.3)] cursor-pointer"
          >
            <Film className="w-4 h-4" />
            <span>Return to The Retro Talks Cinema Diary</span>
          </button>

          <span className="text-xs font-mono text-zinc-500">
            Portfolio of Vishakhan Pillai V P
          </span>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#050608] py-8 text-center text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]" />
            <span className="text-zinc-300 font-bold font-poppins">Vishakhan Pillai V P</span>
            <span className="text-zinc-600">— DevSecOps Engineer</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onNavigateHome}
              className="text-[#ff7a29] hover:text-[#ff5500] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Film className="w-3 h-3" />
              <span>The Retro Talks</span>
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
