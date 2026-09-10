import React, { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

const TARGET_DATE = new Date("2026-12-18T00:00:00").getTime();

function calculateTimeRemaining(): TimeRemaining {
  const now = Date.now();
  const diff = TARGET_DATE - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isPast: false };
}

interface AvengersCountdownProps {
  onClick?: () => void;
}

export const AvengersCountdown: React.FC<AvengersCountdownProps> = ({ onClick }) => {
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTimeRemaining);
  const [isTick, setIsTick] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining());
      setIsTick((prev) => !prev);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate seconds progress within the current minute (0% to 100%)
  const secondsProgress = ((60 - timeLeft.seconds) / 60) * 100;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 border border-emerald-500/35 bg-[#050b07] shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(16,185,129,0.14)] space-y-5 group hover:border-emerald-400/60 hover:shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_55px_rgba(16,185,129,0.28)] transition-all duration-500 cursor-pointer select-none active:scale-[0.99]"
      title="Click to view Avengers: Doomsday details"
    >
      {/* Official Marvel Graphic Backdrop with Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/images/avengers-doomsday-backdrop.webp"
          alt="Avengers: Doomsday artwork"
          className="w-full h-full object-cover object-top opacity-25 group-hover:opacity-40 scale-100 group-hover:scale-108 transition-all duration-1000 ease-out filter contrast-125 saturate-120"
        />
        {/* Layered dark emerald & noir gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b07] via-[#050b07]/80 to-[#050b07]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_75%)]" />
      </div>

      {/* Doctor Doom Emerald Energy Aura */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-36 bg-emerald-500/25 blur-3xl rounded-full pointer-events-none animate-doom-pulse" />
      
      {/* Sweeping Shimmer Light Effect */}
      <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-300/[0.08] to-transparent pointer-events-none animate-shimmer-sweep" />

      {/* Top Hairline Glowing Border */}
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

      {/* Official Avengers: Doomsday Transparent Logo Artwork */}
      <div className="relative z-10 pt-1 flex flex-col items-center text-center">
        <div className="relative w-full max-w-[270px] sm:max-w-[300px] flex items-center justify-center">
          {/* Backlight glow behind logo */}
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-90 pointer-events-none animate-doom-pulse" />
          <img
            src="/images/avengers-doomsday-logo.png"
            alt="Official Avengers Doomsday Logo"
            className="relative z-10 w-full h-auto object-contain drop-shadow-[0_0_25px_rgba(16,185,129,0.55)] group-hover:scale-105 transition-transform duration-500 filter brightness-110"
          />
        </div>

        {/* Title: "Countdown to Doomsday" */}
        <div className="mt-3 space-y-1">
          <h2 className="text-lg sm:text-xl font-black tracking-[0.15em] uppercase font-poppins text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 drop-shadow-[0_2px_12px_rgba(16,185,129,0.4)]">
            Countdown to Doomsday
          </h2>
          <p className="text-[11px] font-mono tracking-wider text-emerald-300/80 flex items-center justify-center gap-1.5">
            <Calendar className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span>DECEMBER 18, 2026 • IN THEATERS</span>
          </p>
        </div>
      </div>

      {/* Live Countdown Clock Grid */}
      <div className="relative z-10 space-y-2">
        <div className="grid grid-cols-4 gap-2">
          
          {/* Days */}
          <div className="relative overflow-hidden flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#06100a]/95 border border-emerald-500/30 group-hover:border-emerald-400/40 shadow-inner transition-colors">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              {timeLeft.days}
            </span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400/80 font-bold mt-1">
              Days
            </span>
          </div>

          {/* Hours */}
          <div className="relative overflow-hidden flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#06100a]/95 border border-emerald-500/30 group-hover:border-emerald-400/40 shadow-inner transition-colors">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              {String(timeLeft.hours).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400/80 font-bold mt-1">
              Hours
            </span>
          </div>

          {/* Minutes */}
          <div className="relative overflow-hidden flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#06100a]/95 border border-emerald-500/30 group-hover:border-emerald-400/40 shadow-inner transition-colors">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">
              {String(timeLeft.minutes).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-400/80 font-bold mt-1">
              Mins
            </span>
          </div>

          {/* Seconds (Animated Live Pulse) */}
          <div className="relative overflow-hidden flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-[#06100a]/95 border border-emerald-400/50 shadow-inner transition-colors">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
            <span
              key={timeLeft.seconds}
              className={`text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400 transition-transform duration-200 drop-shadow-[0_0_14px_rgba(16,185,129,0.7)] ${
                isTick ? "scale-105" : "scale-100"
              }`}
            >
              {String(timeLeft.seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] uppercase font-mono tracking-widest text-emerald-300 font-bold mt-1">
              Secs
            </span>
          </div>

        </div>

        {/* Dynamic Live Seconds Energy Progress Bar */}
        <div className="w-full h-1 bg-emerald-950/80 rounded-full overflow-hidden p-[1px] border border-emerald-500/20">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_8px_#10b981]"
            style={{ width: `${secondsProgress}%` }}
          />
        </div>
      </div>

    </div>
  );
};
