import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Music, Disc3, ExternalLink } from "lucide-react";

interface TrackData {
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl?: string | null;
  trackViewUrl?: string;
}

interface FilmScorePlayerProps {
  movieTitle: string;
  composer?: string;
}

export const FilmScorePlayer: React.FC<FilmScorePlayerProps> = ({
  movieTitle,
  composer,
}) => {
  const [track, setTrack] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch soundtrack preview from backend API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);

    const query = new URLSearchParams({
      title: movieTitle,
      ...(composer ? { composer } : {}),
    });

    fetch(`/api/movies/soundtrack?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("No soundtrack preview");
        return res.json();
      })
      .then((data: TrackData) => {
        if (isMounted && data?.previewUrl) {
          setTrack(data);
        }
      })
      .catch(() => {
        if (isMounted) setTrack(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [movieTitle, composer]);

  const togglePlay = () => {
    if (!audioRef.current || !track) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Audio playback interrupted:", err));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // If loading or no track found, do not clutter UI
  if (loading || !track) {
    return null;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#090b10] border border-white/[0.08] p-4 sm:p-4.5 space-y-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.6)] group">
      
      {/* Hidden Native Audio Element */}
      <audio
        ref={audioRef}
        src={track.previewUrl}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setIsPlaying(false)}
      />

      {/* Header Label: Film Score Preview in one line */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Music className="w-3.5 h-3.5 text-[#ff5500] flex-shrink-0" />
          <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-300 font-semibold whitespace-nowrap">
            Film Score Preview
          </h3>
        </div>

        {/* Live Audio Equalizer Waveform Indicator */}
        <div className="flex items-end gap-0.5 h-3 flex-shrink-0">
          <span
            className={`w-0.5 rounded-full bg-[#ff5500] transition-all duration-150 ${
              isPlaying ? "h-3 animate-pulse" : "h-1 opacity-40"
            }`}
          />
          <span
            className={`w-0.5 rounded-full bg-[#ff5500] transition-all duration-200 ${
              isPlaying ? "h-2 animate-bounce" : "h-1 opacity-40"
            }`}
          />
          <span
            className={`w-0.5 rounded-full bg-[#ff5500] transition-all duration-150 ${
              isPlaying ? "h-3.5 animate-pulse" : "h-1 opacity-40"
            }`}
          />
          <span
            className={`w-0.5 rounded-full bg-[#ff5500] transition-all duration-300 ${
              isPlaying ? "h-1.5 animate-bounce" : "h-1 opacity-40"
            }`}
          />
        </div>
      </div>

      {/* Track Info & Vinyl Art */}
      <div className="flex items-center gap-3.5">
        
        {/* Spinning Vinyl Record Thumbnail */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black/80 flex-shrink-0 border border-white/[0.1] shadow-md">
          {track.artworkUrl ? (
            <img
              src={track.artworkUrl}
              alt={track.trackName}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? "scale-105" : "scale-100"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600">
              <Disc3 className="w-6 h-6" />
            </div>
          )}

          {/* Vinyl Center Hole / Disc Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[#090b10] border border-white/20" />
          </div>
        </div>

        {/* Track Title and Artist */}
        <div className="min-w-0 flex-1">
          <h4
            className="text-xs sm:text-sm font-semibold font-poppins text-white truncate group-hover:text-[#ff7a29] transition-colors"
            title={track.trackName}
          >
            {track.trackName}
          </h4>
          <p
            className="text-[11px] font-inter text-zinc-400 truncate mt-0.5"
            title={`${track.artistName} • ${track.collectionName}`}
          >
            {track.artistName}
          </p>
        </div>

        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[#ff5500] hover:bg-[#ff6a1f] active:scale-95 text-black flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(255,85,0,0.35)] hover:shadow-[0_0_25px_rgba(255,85,0,0.5)] transition-all cursor-pointer"
          title={isPlaying ? "Pause Score" : "Play Score"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-black text-black" />
          ) : (
            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
          )}
        </button>

      </div>

      {/* Progress Slider & Timestamps */}
      <div className="space-y-1 pt-0.5">
        <div className="relative w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden cursor-pointer">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff5500] to-amber-400 rounded-full transition-[width] duration-100"
            style={{ width: `${progressPercent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span>{formatTime(currentTime)}</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-3 h-3 text-red-400" />
              ) : (
                <Volume2 className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
              )}
            </button>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Footer: Apple Music Link */}
      {track.trackViewUrl && (
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-inter text-zinc-500">
          <span className="text-zinc-500">Official Soundtrack</span>
          <a
            href={track.trackViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#ff7a29] transition-colors"
            title="Listen on Apple Music"
          >
            <span>Apple Music</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}

    </div>
  );
};
