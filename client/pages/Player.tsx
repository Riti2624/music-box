import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Home, Maximize2, Pause, Play, RotateCcw, Share2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelBackground } from "@/components/PixelBackground";
import { SharedPlayerData } from "@shared/api";

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const [playerData, setPlayerData] = useState<SharedPlayerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const loadPlayer = async () => {
      if (!id) {
        setError("Missing player id.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/player/${id}`);
        if (!response.ok) {
          throw new Error("This shared player link is invalid or expired.");
        }

        const payload = (await response.json()) as SharedPlayerData;
        setPlayerData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load player.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadPlayer();
  }, [id]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncProgress = () => {
      if (!audio.duration || Number.isNaN(audio.duration)) {
        setProgress(0);
        return;
      }

      const nextProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(Number.isFinite(nextProgress) ? nextProgress : 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", syncProgress);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", syncProgress);

    return () => {
      audio.removeEventListener("timeupdate", syncProgress);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", syncProgress);
    };
  }, [playerData]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen();
      setIsFullscreen(true);
      return;
    }

    void document.exitFullscreen();
    setIsFullscreen(false);
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !playerData?.audioFile?.data) return;

    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (playError) {
        console.error("Unable to start playback:", playError);
      }
      return;
    }

    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleSeek = (value: number) => {
    setProgress(value);

    if (!audioRef.current?.duration || Number.isNaN(audioRef.current.duration)) {
      return;
    }

    audioRef.current.currentTime = (value / 100) * audioRef.current.duration;
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }

    setIsPlaying(false);
    setProgress(0);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        Loading shared player...
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-lg">{error ?? "Player not found"}</p>
        <Link
          to="/create"
          className="px-5 py-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
        >
          Create a New Link
        </Link>
      </div>
    );
  }

  const hasAudio = Boolean(playerData.audioFile?.data);
  const sharedBackgroundStyle = {
    backgroundImage: "url(/images.jpg)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };

  return (
    <div ref={containerRef} className="relative min-h-screen w-full overflow-hidden bg-transparent">
      <div
        className="absolute inset-0 w-full h-full"
        style={sharedBackgroundStyle}
      />

      <div className="absolute inset-0 w-full h-full" style={{ backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/40" />
      <div className="absolute inset-0 opacity-30 z-0">
        <PixelBackground />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between p-4 sm:p-6 backdrop-blur-sm">
          <Link
            to="/"
            className={cn("flex items-center gap-2 group px-3 py-2 rounded-xl", "hover:bg-white/10 smooth-transition")}
          >
            <Home className="w-5 h-5 text-white" />
            <span className="text-white text-xs sm:text-sm font-medium hidden sm:inline">Home</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleFullscreen}
              className={cn("p-2 rounded-lg smooth-transition text-white", "hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/30")}
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg smooth-transition text-xs sm:text-sm flex items-center gap-2 font-medium",
                "backdrop-blur-sm border border-white/20",
                copied
                  ? "bg-green-500/30 text-green-200 border-green-400/50"
                  : "bg-white/10 text-white hover:bg-white/20 hover:border-white/40"
              )}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-10">
          <div className="w-full max-w-md animate-fade-in">
            <div className="space-y-4 rounded-3xl border border-white/20 bg-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
              {playerData.image && (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-md">
                  <img src={playerData.image} alt="Cover" className="mx-auto h-auto max-h-[48vh] w-auto max-w-full rounded-xl object-contain" />
                </div>
              )}

              <audio ref={audioRef} src={playerData.audioFile.data} preload="metadata" />

              <div className="p-4 sm:p-5 rounded-2xl backdrop-blur-xl border animate-fade-in shadow-xl bg-white/10 border-white/20">
                <div className="mb-4 sm:mb-5 space-y-1.5">
                  <h2 className="pixel-lg font-bold mb-1 text-white">{playerData.audioFile.name}</h2>
                  <p className="text-xs sm:text-sm opacity-70 font-medium text-white">Send this to someone ❤️</p>
                </div>

                <div className="mb-4 sm:mb-5 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => handleSeek(parseInt(e.target.value, 10))}
                    className="w-full h-2 rounded-full cursor-pointer appearance-none bg-white/20 accent-purple-400 hover:accent-purple-300"
                    disabled={!hasAudio}
                  />
                  <div className="flex justify-between text-xs pixel-sm text-white">
                    <span className="opacity-70">{String(Math.floor(progress)).padStart(2, "0")}%</span>
                    <span className="opacity-70">100%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <button
                    onClick={togglePlayback}
                    className={cn(
                      "flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-purple-500 via-purple-500 to-blue-500",
                      "hover:shadow-xl hover:shadow-purple-500/60 smooth-transition",
                      "active:scale-95 border border-white/20",
                      !hasAudio && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!hasAudio}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                    ) : (
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white ml-0.5" />
                    )}
                  </button>

                  <div className="flex-1 flex items-center gap-2 px-2 sm:px-3">
                    <Volume2 className="w-4 h-4 flex-shrink-0 text-white" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                      className="flex-1 h-1.5 rounded-full cursor-pointer appearance-none bg-white/20 accent-purple-400"
                    />
                    <span className="text-xs w-8 text-right pixel-sm text-white">{volume}</span>
                  </div>

                  <button
                    onClick={handleReset}
                    className={cn(
                      "p-2 rounded-lg smooth-transition",
                      "hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/30 text-white",
                      "border border-white/10 hover:border-white/30",
                      !hasAudio && "opacity-50 cursor-not-allowed"
                    )}
                    title="Reset"
                    disabled={!hasAudio}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="text-center py-4 sm:py-6 text-xs sm:text-sm text-slate-300 border-t border-white/10 backdrop-blur-sm">
          ✨ Made with Love
        </footer>
      </div>
    </div>
  );
}
