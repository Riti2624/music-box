import { useParams, Link, useLocation } from "react-router-dom";
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  Share2,
  Home,
  RotateCcw,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PixelBackground } from "@/components/PixelBackground";
import { CreateShareResponse } from "@shared/api";
import { getOrCreateUserId } from "@/lib/user";

interface AudioFile {
  name: string;
  data: string;
}

interface VibeData {
  image: string | null;
  audioFile: AudioFile | null;
}

export default function Vibe() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const [vibeData, setVibeData] = useState<VibeData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [shareError, setShareError] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inFlightShareRequest = useRef<Promise<string> | null>(null);

  useEffect(() => {
    // Load vibe data from session storage
    if (slug) {
      const routeState = location.state as { vibeData?: VibeData } | null;
      if (routeState?.vibeData) {
        setVibeData(routeState.vibeData);
        return;
      }

      const appWindow = window as Window & { __vibeStore?: Record<string, VibeData> };
      const memoryData = appWindow.__vibeStore?.[`vibe_${slug}`];
      if (memoryData) {
        setVibeData(memoryData);
        return;
      }

      const data = sessionStorage.getItem(`vibe_${slug}`);
      if (data) {
        setVibeData(JSON.parse(data));
      }
    }
  }, [slug, location.state]);

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
  }, [vibeData]);

  const createOrGetShareLink = useCallback(async () => {
    if (!vibeData?.audioFile?.data) {
      throw new Error("No audio data available for sharing.");
    }

    if (shareLink) {
      return shareLink;
    }

    if (inFlightShareRequest.current) {
      return inFlightShareRequest.current;
    }

    setIsPreparingShare(true);
    setShareError("");

    const request = (async () => {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getOrCreateUserId(),
        },
        body: JSON.stringify({
          image: vibeData.image,
          audioFile: vibeData.audioFile,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create link (${response.status}).`);
      }

      const data = (await response.json()) as CreateShareResponse;
      const nextLink = `${window.location.origin}${data.playerUrl}`;
      setShareLink(nextLink);
      return nextLink;
    })();

    inFlightShareRequest.current = request;

    try {
      return await request;
    } finally {
      inFlightShareRequest.current = null;
      setIsPreparingShare(false);
    }
  }, [vibeData, shareLink]);

  useEffect(() => {
    if (!vibeData?.audioFile?.data || shareLink) return;
    void createOrGetShareLink().catch((error) => {
      console.warn("Background share-link preparation failed:", error);
      setShareError("Could not pre-create link. Tap Share to retry.");
    });
  }, [vibeData, shareLink, createOrGetShareLink]);

  const handleShare = async () => {
    setIsSharing(true);

    try {
      const nextLink = await createOrGetShareLink();
      await navigator.clipboard.writeText(nextLink);
      setCopied(true);
      setShareError("");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to share player:", error);
      setShareError("Link creation failed. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePlayback = async () => {
    if (!audioRef.current || !vibeData?.audioFile?.data) return;

    if (audioRef.current.paused) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Unable to start audio playback:", error);
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

  if (!vibeData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-4">Vibe Not Found</h1>
          <p className="text-slate-400 mb-8">This vibe page doesn't exist or has expired.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const hasAudio = Boolean(vibeData.audioFile?.data);
  const uploadedImage = vibeData.image;

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-transparent"
    >
      {/* Layer 1: Background image with heavy blur */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: "url(/images.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Layer 1.5: Blur effect */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
        }}
      />

      {/* Layer 2: Dark gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/40" />

      {/* Layer 2.5: Fixed color overlay */}
      <div className="absolute inset-0 bg-black/18" />

      {/* Layer 3: 3D Pixel Background (semi-transparent) */}
      <div className="absolute inset-0 opacity-30 z-0">
        <PixelBackground />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 sm:p-6 backdrop-blur-sm">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-2 group px-3 py-2 rounded-xl",
              "hover:bg-white/10 smooth-transition"
            )}
          >
            <Home className="w-5 h-5 text-white" />
            <span className="text-white text-xs sm:text-sm font-medium hidden sm:inline">Home</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleFullscreen}
              className={cn(
                "p-2 rounded-lg smooth-transition text-white",
                "hover:bg-white/10 hover:shadow-lg hover:shadow-purple-500/30"
              )}
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleShare}
              disabled={(isSharing || isPreparingShare) && !shareLink || !hasAudio}
              className={cn(
                "px-3 sm:px-4 py-2 rounded-lg smooth-transition text-xs sm:text-sm flex items-center gap-2 font-medium",
                "backdrop-blur-sm border border-white/20",
                copied
                  ? "bg-green-500/30 text-green-300 border-green-400/50"
                  : "bg-white/10 text-white hover:bg-white/20 hover:border-white/40 glow-effect",
                ((isSharing || isPreparingShare) && !shareLink || !hasAudio) && "opacity-60 cursor-not-allowed"
              )}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isSharing
                  ? "Copying..."
                  : isPreparingShare && !shareLink
                    ? "Preparing..."
                    : copied
                      ? "Copied!"
                      : "Share"}
              </span>
            </button>
          </div>
        </header>

        {shareError && (
          <div className="px-4 sm:px-6 pt-2">
            <p className="text-xs sm:text-sm text-amber-200/90 text-center">{shareError}</p>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-8 sm:pb-12">
          <div className="w-full max-w-md animate-fade-in">
            <div className="space-y-4 rounded-3xl border border-white/20 bg-white/10 p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
              {uploadedImage && (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-2 shadow-xl backdrop-blur-md">
                  <img
                    src={uploadedImage}
                    alt="Uploaded background"
                    className="mx-auto h-auto max-h-[48vh] w-auto max-w-full rounded-xl object-contain"
                  />
                </div>
              )}

              <audio ref={audioRef} src={vibeData.audioFile?.data ?? ""} preload="metadata" />

              {/* Player Card */}
              <div
                className={cn(
                  "p-4 sm:p-5 rounded-2xl backdrop-blur-xl border",
                  "animate-fade-in shadow-xl",
                  "bg-white/10 border-white/20"
                )}
              >
                {/* Song Title with Pixel Font */}
                <div className="mb-4 sm:mb-5 space-y-1.5">
                  <h2 className={cn(
                    "pixel-lg font-bold mb-1",
                    "text-white"
                  )}>
                    {vibeData.audioFile?.name || "Unknown Track"}
                  </h2>
                  <p className={cn("text-xs sm:text-sm opacity-70 font-medium", "text-white")}>
                    powered by wdym_riti ✨
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 sm:mb-5 space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onChange={(e) => handleSeek(parseInt(e.target.value, 10))}
                    className={cn(
                      "w-full h-2 rounded-full cursor-pointer appearance-none bg-white/20",
                      "accent-purple-400 hover:accent-purple-300"
                    )}
                    disabled={!hasAudio}
                  />
                  <div className={cn("flex justify-between text-xs pixel-sm", "text-white")}>
                    <span className="opacity-70">{String(Math.floor(progress)).padStart(2, '0')}%</span>
                    <span className="opacity-70">100%</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlayback}
                    className={cn(
                      "flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-purple-500 via-purple-500 to-blue-500",
                      "hover:shadow-xl hover:shadow-purple-500/60 smooth-transition",
                      "active:scale-95 border border-white/20",
                      "glow-effect",
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

                  {/* Volume Control */}
                  <div className="flex-1 flex items-center gap-2 px-2 sm:px-3">
                    <Volume2 className={cn("w-4 h-4 flex-shrink-0", "text-white")} />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                      className={cn(
                        "flex-1 h-1.5 rounded-full cursor-pointer appearance-none bg-white/20",
                        "accent-purple-400"
                      )}
                    />
                    <span className={cn("text-xs w-8 text-right pixel-sm", "text-white")}>
                      {volume}
                    </span>
                  </div>

                  {/* Reset Button */}
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

                {!hasAudio && (
                  <p className="mt-4 text-xs sm:text-sm text-amber-300/90">
                    No MP3 found for this vibe. Generate a new vibe with an uploaded MP3.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-4 sm:py-6 text-xs sm:text-sm text-slate-400 border-t border-white/5 backdrop-blur-sm">
          ✨ Made with Love
        </footer>
      </div>
    </div>
  );
}
