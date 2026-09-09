import React, { useEffect } from "react";
import { X, Calendar, User, Film, Play, Sparkles, ExternalLink } from "lucide-react";

interface AvengersDoomsdayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const castMembers = [
  {
    name: "Robert Downey Jr.",
    role: "Victor von Doom / Doctor Doom",
    picture: "https://image.tmdb.org/t/p/w185/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg",
  },
  {
    name: "Pedro Pascal",
    role: "Reed Richards / Mr. Fantastic",
    picture: "https://image.tmdb.org/t/p/w185/oKcMbVn0NJTNzQt0ClKKvVXkm60.jpg",
  },
  {
    name: "Vanessa Kirby",
    role: "Sue Storm / Invisible Woman",
    picture: "https://image.tmdb.org/t/p/w185/a8a9U00KL2JJkkekzhNnueIGKKF.jpg",
  },
  {
    name: "Benedict Cumberbatch",
    role: "Dr. Stephen Strange",
    picture: "https://image.tmdb.org/t/p/w185/wz3MRiMmoz6b5X3oSzMRC9nLxY1.jpg",
  },
  {
    name: "Tom Holland",
    role: "Peter Parker / Spider-Man",
    picture: "https://image.tmdb.org/t/p/w185/5OK84Wn1bIEIThFKcVoaN087mLj.jpg",
  },
  {
    name: "Joseph Quinn",
    role: "Johnny Storm / Human Torch",
    picture: "https://image.tmdb.org/t/p/w185/zshhuioZaH8S5ZKdMcojzWi1ntl.jpg",
  },
  {
    name: "Ebon Moss-Bachrach",
    role: "Ben Grimm / The Thing",
    picture: "https://image.tmdb.org/t/p/w185/xD8GVNayMpiTZxLfahy2DseYcQq.jpg",
  },
  {
    name: "Anthony Mackie",
    role: "Sam Wilson / Captain America",
    picture: "https://image.tmdb.org/t/p/w185/vecvTm7SimizluJkyIwBxeLbvRm.jpg",
  },
];

const crewMembers = [
  {
    name: "Anthony Russo",
    job: "Director",
    picture: "https://image.tmdb.org/t/p/w185/xbINBnWn28YygYWUJ1aSAw0xPRv.jpg",
  },
  {
    name: "Joe Russo",
    job: "Director",
    picture: "https://image.tmdb.org/t/p/w185/o0OXjFzL10jCy89iAs7UzzSbyoK.jpg",
  },
  {
    name: "Stephen McFeely",
    job: "Screenplay",
    picture: "https://image.tmdb.org/t/p/w185/i9B6gFzExPsh5IEjD2nn4ym4lx2.jpg",
  },
  {
    name: "Kevin Feige",
    job: "Producer",
    picture: "https://image.tmdb.org/t/p/w185/kCBqXZ5PT5udYGEj2wfTSFbLMvT.jpg",
  },
];

export const AvengersDoomsdayModal: React.FC<AvengersDoomsdayModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Background click overlay */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card - Styled in Doctor Doom Emerald & Dark Metallic Palette */}
      <div className="relative w-full max-w-4xl bg-[#050b07] border border-emerald-500/35 rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_60px_rgba(16,185,129,0.2)] z-10 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Top Hairline Glowing Emerald Accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-20" />

        {/* Backdrop Banner Header */}
        <div className="relative h-52 sm:h-72 w-full bg-[#030604] overflow-hidden flex-shrink-0">
          <img
            src="/images/avengers-doomsday-backdrop.webp"
            alt="Avengers: Doomsday Backdrop"
            className="w-full h-full object-cover filter contrast-125 brightness-90"
          />

          {/* Emerald & Noir Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050b07] via-[#050b07]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050b07]/90 via-[#050b07]/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-black/70 hover:bg-emerald-500 text-zinc-300 hover:text-black border border-emerald-500/30 hover:border-emerald-400 transition-all duration-200 shadow-xl cursor-pointer group z-20"
            title="Close"
          >
            <X className="w-4 h-4 transition-transform group-hover:rotate-90" />
          </button>

          {/* Header Info & Actions */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Marvel Studios • Phase 6</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-poppins font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_15px_rgba(0,0,0,0.9)]">
                Avengers: Doomsday
              </h2>
              <p className="text-xs sm:text-sm text-emerald-300/80 italic font-inter drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                "All hope lies in Doom."
              </p>
            </div>

            {/* Play Trailer Button */}
            <button
              type="button"
              onClick={() => {
                window.open(
                  "https://www.youtube.com/results?search_query=Avengers+Doomsday+official+trailer",
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-poppins font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:shadow-[0_0_35px_rgba(16,185,129,0.7)] active:scale-95 flex-shrink-0"
              title="Search and play trailer on YouTube"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>Watch Trailer</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-grow">
          
          <div className="flex flex-col sm:flex-row gap-6">
            
            {/* Poster Column */}
            <div className="flex-shrink-0 w-36 sm:w-44 mx-auto sm:mx-0">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-emerald-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.2)] bg-[#07120a] group">
                <img
                  src="/images/avengers-doomsday-poster.jpg"
                  alt="Avengers: Doomsday Poster"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-[#09150e] border border-emerald-500/20 text-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  Theatrical Premiere
                </span>
                <span className="text-xs font-semibold text-white font-poppins mt-0.5 block">
                  Dec 18, 2026
                </span>
              </div>
            </div>

            {/* Details Column */}
            <div className="flex-grow space-y-5 text-sm text-zinc-300">
              
              {/* Meta Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-inter">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2026</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-inter">
                  <Film className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Theatrical & IMAX</span>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-xs font-inter">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dir. <strong className="text-white font-medium">Anthony & Joe Russo</strong></span>
                </div>
              </div>

              {/* Synopsis */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] uppercase tracking-widest font-mono text-emerald-400 font-bold">
                  Synopsis
                </h4>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  The Marvel Cinematic Universe faces its greatest reckoning yet as Victor von Doom emerges to impose his will upon reality. Following the fracturing of the timeline, Earth's mightiest heroes and the Fantastic Four must confront a tyrant wielding supreme intellect, sovereign armor, and dark sorcery to reshape the fate of all existence.
                </p>
              </div>

              {/* Key Cast with Profile Pictures */}
              <div className="space-y-3 pt-2 border-t border-emerald-500/15">
                <h4 className="text-[10px] uppercase tracking-widest font-mono text-emerald-400 font-bold">
                  Key Cast
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {castMembers.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-3 p-2 rounded-xl bg-[#08120b] border border-emerald-500/20 hover:border-emerald-400/40 transition-colors"
                      title={`${member.name} as ${member.role}`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-emerald-500/30 shadow-sm">
                        {member.picture ? (
                          <img
                            src={member.picture}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-semibold font-poppins text-white truncate leading-tight">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-emerald-300/80 font-inter truncate leading-tight mt-0.5">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Crew with Profile Pictures */}
              <div className="space-y-3 pt-2 border-t border-emerald-500/15">
                <h4 className="text-[10px] uppercase tracking-widest font-mono text-emerald-400 font-bold">
                  Key Crew
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {crewMembers.map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-3 p-2 rounded-xl bg-[#08120b] border border-emerald-500/20 hover:border-emerald-400/40 transition-colors"
                      title={`${member.name} — ${member.job}`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 ring-1 ring-emerald-500/30 shadow-sm">
                        {member.picture ? (
                          <img
                            src={member.picture}
                            alt={member.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-semibold font-poppins text-white truncate leading-tight">
                          {member.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 font-inter truncate leading-tight mt-0.5">
                          {member.job}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
