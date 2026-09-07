import React from "react";
import {
  Shield,
  Lock,
  Terminal,
  Server,
  Cpu,
  Award,
  GraduationCap,
  Briefcase,
  FileText,
  Film,
  CheckCircle2,
  ArrowRight,
  Code2,
  Bug,
  Radar,
  Workflow
} from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./Icons";

interface PortfolioSectionsProps {
  onNavigateToDiary: () => void;
  reviewCount?: number;
}

export const PortfolioSections: React.FC<PortfolioSectionsProps> = ({
  onNavigateToDiary,
  reviewCount = 4,
}) => {
  return (
    <div className="space-y-24 pb-16">
      
      {/* 1. HERO SECTION */}
      <section id="about" className="relative pt-28 pb-12 sm:pt-36 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="max-w-4xl space-y-6">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-[#ff5500] animate-pulse" />
            <span>Junior DevSecOps Engineer @ Gieom Business Solutions</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl font-poppins font-black text-white tracking-tight leading-[1.1]">
            VISHAKHAN PILLAI <span className="text-[#ff5500]">V P</span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 font-medium font-poppins max-w-2xl leading-relaxed">
            Specializing in Application Security, DevSecOps pipelines, and offensive security research.
          </p>

          <p className="text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-3xl">
            Hands-on experience conducting SAST, DAST, and SCA across enterprise applications and integrating automated security into CI/CD workflows. Academic Topper in MCA (9.0 CGPA) with proven vulnerability validation and adversarial security research experience.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <a
              href="#projects"
              className="px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1f] text-black font-semibold text-xs font-poppins transition-all shadow-[0_0_20px_rgba(255,85,0,0.3)] flex items-center gap-1.5"
            >
              <span>Explore Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onNavigateToDiary}
              className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-[#ff5500]/40 text-white font-medium text-xs font-poppins transition-all flex items-center gap-2 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-[#ff5500]" />
              <span>The Retro Talks ({reviewCount})</span>
            </button>

            <a
              href="/VP_Resume_for_website.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white font-mono text-xs transition-all flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>View Resume</span>
            </a>

            <a
              href="https://linkedin.com/in/vishakhanpillai"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-[#ff5500] transition-colors"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>

            <a
              href="https://github.com/vishakhanpillai"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/[0.06]">
            <div className="p-3.5 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-xl font-bold font-poppins text-white">9.0 / 10</div>
              <div className="text-[11px] font-mono text-[#ff7a29] mt-0.5">MCA Academic Topper</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-xl font-bold font-poppins text-white">SAST / DAST</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">GZero Product Security</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-xl font-bold font-poppins text-white">CI/CD & SDLC</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">DevSecOps Integration</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1117] border border-white/[0.06]">
              <div className="text-xl font-bold font-poppins text-white">Path Traversal</div>
              <div className="text-[11px] font-mono text-emerald-400 mt-0.5">Vulnerability Validated</div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. EXPERIENCE SECTION */}
      <section id="experience" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Briefcase className="w-5 h-5 text-[#ff5500]" />
          <h2 className="text-2xl font-bold font-poppins text-white tracking-tight">
            Work Experience
          </h2>
        </div>

        <div className="space-y-6">
          
          {/* Role 1: Junior DevSecOps Engineer */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0b0d12] border border-white/[0.08] hover:border-[#ff5500]/40 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-poppins text-white">
                  Junior DevSecOps Engineer
                </h3>
                <p className="text-sm text-[#ff7a29] font-medium">
                  Gieom Business Solutions Pvt Ltd <span className="text-zinc-500 font-normal">· Kochi, Kerala</span>
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-300 self-start sm:self-auto">
                Jul. 2026 – Present
              </div>
            </div>

            <ul className="space-y-2.5 text-sm text-zinc-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#ff5500] flex-shrink-0 mt-0.5" />
                <span>Contributing to the integration of security practices across CI/CD pipelines and the SDLC.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#ff5500] flex-shrink-0 mt-0.5" />
                <span>Supporting application security and DevSecOps initiatives involving automated security assessment and vulnerability identification.</span>
              </li>
            </ul>
          </div>

          {/* Role 2: DevSecOps Intern */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0b0d12] border border-white/[0.08] hover:border-white/[0.15] transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-poppins text-white">
                  DevSecOps Intern
                </h3>
                <p className="text-sm text-zinc-300 font-medium">
                  Gieom Business Solutions Pvt Ltd <span className="text-zinc-500 font-normal">· Kochi, Kerala</span>
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-zinc-400 self-start sm:self-auto">
                Jan. 2026 – Jun. 2026
              </div>
            </div>

            <ul className="space-y-2.5 text-sm text-zinc-300">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                <span>Performed SAST, DAST, and Software Composition Analysis (SCA) on enterprise applications as part of the GZero Product Security Framework, supporting proactive identification of application security risks.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Analyzed and manually validated security findings from automated assessments, identifying a Path Traversal vulnerability that led to the discovery of exposed sensitive credentials and demonstrated potential unauthorized access risk.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                <span>Contributed to infrastructure automation initiatives by working on NetBox automation workflows, supporting efforts to streamline infrastructure management and operational efficiency.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* 3. TECHNICAL SKILLS SECTION */}
      <section id="skills" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Terminal className="w-5 h-5 text-[#ff5500]" />
          <h2 className="text-2xl font-bold font-poppins text-white tracking-tight">
            Technical Skills & Tools
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* AppSec */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
              <Shield className="w-4 h-4 text-[#ff5500]" />
              <span>Application Security</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["SAST", "DAST", "SCA", "Vulnerability Assessment", "Secure Code Review"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-mono text-zinc-300 border border-white/[0.06]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Offensive Security */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
              <Bug className="w-4 h-4 text-[#ff5500]" />
              <span>Offensive Security</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Web App Security", "Reconnaissance", "Network Security", "CTFs"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-mono text-zinc-300 border border-white/[0.06]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Security Tools */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
              <Radar className="w-4 h-4 text-[#ff5500]" />
              <span>Security Tools</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Burp Suite", "OWASP ZAP", "Caido", "Nmap", "SonarQube", "Semgrep", "Trivy", "Metasploit", "Gobuster"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-mono text-zinc-300 border border-white/[0.06]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* DevSecOps / Infra */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
              <Workflow className="w-4 h-4 text-[#ff5500]" />
              <span>DevSecOps & Infrastructure</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["CI/CD Pipelines", "Docker", "Linux", "Azure DevOps", "NetBox", "SBOM"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-mono text-zinc-300 border border-white/[0.06]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Programming & Scripting */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
              <Code2 className="w-4 h-4 text-[#ff5500]" />
              <span>Programming & Scripting</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Python", "C/C++", "SQL", "JavaScript", "TypeScript", "Bash"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-mono text-zinc-300 border border-white/[0.06]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Version Control & Virtualization */}
          <div className="p-5 rounded-2xl bg-[#0e1117] border border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold font-poppins text-sm">
              <Server className="w-4 h-4 text-[#ff5500]" />
              <span>Version Control & Virtualization</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Git", "GitHub", "VMware Workstation", "VirtualBox"].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-white/[0.03] text-xs font-mono text-zinc-300 border border-white/[0.06]">
                  {s}
                </span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 4. PROJECTS SECTION */}
      <section id="projects" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#ff5500]" />
            <h2 className="text-2xl font-bold font-poppins text-white tracking-tight">
              Featured Projects
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Project 1: ASAP */}
          <div className="p-6 rounded-2xl bg-[#0b0d12] border border-white/[0.08] flex flex-col justify-between hover:border-[#ff5500]/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#ff5500]/10 text-[#ff7a29] border border-[#ff5500]/20">
                  Security Tool
                </span>
                <Lock className="w-4 h-4 text-zinc-500" />
              </div>

              <div>
                <h3 className="text-lg font-bold font-poppins text-white">
                  ASAP — Automated Security Analysis Platform
                </h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  React · Express · Semgrep · Trivy
                </p>
              </div>

              <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                <li>• Web-based security platform accepting Git repo URLs, branches, and auth tokens to automate scans.</li>
                <li>• Integrated Semgrep for SAST and Trivy for SCA and SBOM generation.</li>
                <li>• Real-time vulnerability dashboard summarizing findings by severity and affected components.</li>
              </ul>
            </div>

            <div className="pt-5 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Full-Stack AppSec</span>
              <span className="text-[#ff5500]">Automated Scanning</span>
            </div>
          </div>

          {/* Project 2: OpenRecon */}
          <div className="p-6 rounded-2xl bg-[#0b0d12] border border-white/[0.08] flex flex-col justify-between hover:border-[#ff5500]/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Offensive Tool
                </span>
                <Terminal className="w-4 h-4 text-zinc-500" />
              </div>

              <div>
                <h3 className="text-lg font-bold font-poppins text-white">
                  OpenRecon — Passive Reconnaissance Tool
                </h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  Python · Requests · Socket · Whois · DNS
                </p>
              </div>

              <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                <li>• Modular Python tool automating passive web security reconnaissance workflows.</li>
                <li>• Automated WHOIS lookups, DNS record harvesting, IP resolution, and HTTP headers inspection.</li>
                <li>• Built with reusable modules utilizing dnspython, socket, whois, and tldextract.</li>
              </ul>
            </div>

            <div className="pt-5 mt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Reconnaissance</span>
              <span className="text-emerald-400">Modular Framework</span>
            </div>
          </div>

          {/* Project 3: The Retro Talks */}
          <div className="p-6 rounded-2xl bg-[#0b0d12] border border-[#ff5500]/30 flex flex-col justify-between hover:border-[#ff5500]/70 transition-all shadow-[0_0_30px_rgba(255,85,0,0.1)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#ff5500] text-black font-bold">
                  Personal Platform
                </span>
                <Film className="w-4 h-4 text-[#ff5500]" />
              </div>

              <div>
                <h3 className="text-lg font-bold font-poppins text-white">
                  The Retro Talks — Cinema Diary & Story Studio
                </h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">
                  React · Vite · TypeScript · TMDB API · Tailwind CSS
                </p>
              </div>

              <ul className="space-y-2 text-xs text-zinc-300 leading-relaxed">
                <li>• Personal Letterboxd-style cinema diary and film critique showcase.</li>
                <li>• Live TMDB autosuggestion, interactive star ratings, and customizable poster artwork.</li>
                <li>• Instant 9:16 Instagram Story Card generator with quote distillation and multiple editorial themes.</li>
              </ul>
            </div>

            <div className="pt-5 mt-4 border-t border-white/[0.06]">
              <button
                onClick={onNavigateToDiary}
                className="w-full py-2.5 px-3 rounded-xl bg-[#ff5500]/10 hover:bg-[#ff5500] text-[#ff7a29] hover:text-black border border-[#ff5500]/30 hover:border-[#ff5500] text-xs font-semibold font-poppins transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open The Retro Talks Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. EDUCATION SECTION */}
      <section id="education" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <GraduationCap className="w-5 h-5 text-[#ff5500]" />
          <h2 className="text-2xl font-bold font-poppins text-white tracking-tight">
            Education & Honors
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Degree 1: MCA */}
          <div className="p-6 rounded-2xl bg-[#0b0d12] border border-white/[0.08] relative overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-[#ff7a29]">Jun. 2024 – Mar. 2026</span>
                <h3 className="text-lg font-bold font-poppins text-white mt-1">
                  Master of Computer Applications (MCA)
                </h3>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Rajagiri College of Social Sciences (Autonomous) · Kochi, Kerala
                </p>
              </div>
              <div className="p-2 rounded-xl bg-[#ff5500]/10 text-[#ff5500]">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] text-white font-bold border border-white/[0.08]">
                CGPA: 9.0 / 10
              </span>
              <span className="text-xs font-mono text-emerald-400">
                ★ Academic Topper, MCA Batch 2024–2026
              </span>
            </div>
          </div>

          {/* Degree 2: BCA */}
          <div className="p-6 rounded-2xl bg-[#0b0d12] border border-white/[0.08]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-zinc-500">Sep. 2021 – Apr. 2024</span>
                <h3 className="text-lg font-bold font-poppins text-white mt-1">
                  Bachelor of Computer Applications (BCA)
                </h3>
                <p className="text-sm text-zinc-400 mt-0.5">
                  St. Joseph’s College (Autonomous), Devagiri · Kozhikode, Kerala
                </p>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.04] text-zinc-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/[0.04] text-white font-bold border border-white/[0.08]">
                CGPA: 8.6 / 10
              </span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
