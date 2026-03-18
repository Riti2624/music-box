import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Music, Upload, AlertCircle } from "lucide-react";
import { PixelBackground } from "@/components/PixelBackground";
import { cn } from "@/lib/utils";

interface FormData {
  audioFile?: File;
  imageFile?: File;
  imageData?: string;
}

export default function Create() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({});
  const [imagePreview, setImagePreview] = useState<string>("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);

  const validateImage = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image: "Please upload a valid image (JPG, PNG, WEBP)",
      }));
      return false;
    }
    return true;
  };

  const validateAudio = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const validAudioTypes = ["audio/mp3", "audio/mpeg"];
    if (!validAudioTypes.includes(file.type) || !fileName.endsWith(".mp3")) {
      setErrors((prev) => ({
        ...prev,
        audio: "Unsupported audio format. Please upload audio/mp3 (.mp3).",
      }));
      return false;
    }
    return true;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (!base64) return;

      setImagePreview(base64);
      setFormData((prev) => ({
        ...prev,
        imageFile: file,
        imageData: base64,
      }));

      setErrors((prev) => ({ ...prev, image: "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateAudio(file)) return;

    setFormData((prev) => ({
      ...prev,
      audioFile: file,
    }));
    setErrors((prev) => ({ ...prev, audio: "" }));
  };

  const handleGenerate = async () => {
    // Validate
    if (!formData.audioFile) {
      setErrors((prev) => ({
        ...prev,
        audio: "Please upload an MP3 file",
      }));
      return;
    }

    setLoading(true);

    try {
      const slug = Math.random().toString(36).substring(7);
      const vibeData = {
        image: formData.imageData || null,
        audioFile: {
          name: formData.audioFile.name,
          data: await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(formData.audioFile!);
          }),
        },
      };

      const appWindow = window as Window & { __vibeStore?: Record<string, unknown> };
      appWindow.__vibeStore = appWindow.__vibeStore ?? {};
      appWindow.__vibeStore[`vibe_${slug}`] = vibeData;

      try {
        sessionStorage.setItem(`vibe_${slug}`, JSON.stringify(vibeData));
      } catch (storageError) {
        console.warn("Session storage is full. Using in-memory vibe data.", storageError);
      }

      setTimeout(() => {
        navigate(`/vibe/${slug}`, { state: { vibeData } });
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error("Error generating vibe:", error);
      setErrors((prev) => ({ ...prev, submit: "Failed to generate vibe. Please try again." }));
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      {/* Animated background */}
      <PixelBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm sm:text-base group-hover:scale-110 transition-transform">
              VB
            </div>
            <span className="font-bold text-lg sm:text-xl text-white hidden sm:inline">Music box</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="animate-fade-in">
          {/* Title */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="pixel-lg sm:pixel-lg mb-4 gradient-text">
              Create Your Player
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
              Transform any song into a shareable, cinematic music experience
            </p>
          </div>

          {/* Form Card */}
          <div className="glass-glow p-6 sm:p-10 space-y-8 rounded-3xl">
            {/* Error messages */}
            {errors.submit && (
              <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-400/50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-300">{errors.submit}</p>
              </div>
            )}

            {/* Audio Input - MP3 Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white pixel-sm">
                UPLOAD SONG (MP3)
              </label>
              <label className="block">
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border-2 border-dashed border-white/20 hover:border-purple-400/50 cursor-pointer transition-colors">
                  <Music className="w-5 h-5 text-purple-400" />
                  <div className="text-sm">
                    <span className="text-white font-medium">Upload MP3</span>
                    <span className="text-slate-400 ml-2">Upload Here</span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="audio/mp3,.mp3"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </label>
              {formData.audioFile && (
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg border border-white/10">
                  <p className="text-xs text-white truncate">{formData.audioFile.name}</p>
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        audioFile: undefined,
                      }))
                    }
                    className="text-xs text-slate-400 hover:text-slate-300"
                  >
                    Remove
                  </button>
                </div>
              )}
              {errors.audio && !formData.audioFile && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.audio}
                </p>
              )}
            </div>

            {/* Image Input */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white pixel-sm">
                BACKGROUND IMAGE
              </label>

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mb-4 rounded-xl border border-white/10 bg-black/20 p-2 sm:p-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mx-auto h-auto max-h-[52vh] w-auto max-w-full rounded-lg object-contain"
                  />
                  <button
                    onClick={() => {
                      setImagePreview("");
                      setFormData((prev) => ({
                        ...prev,
                        imageFile: undefined,
                        imageData: undefined,
                      }));
                    }}
                    className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs text-white hover:bg-black/80 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* File upload only */}
              <label className="block">
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-white/5 rounded-xl border-2 border-dashed border-white/20 hover:border-blue-400/50 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <div className="text-xs sm:text-sm">
                    <span className="text-white font-medium">Upload image</span>
                    <span className="text-slate-400 ml-2">(JPG, PNG, WEBP)</span>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {errors.image && !imagePreview && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.image}
                </p>
              )}
            </div>

            {/* Generate Button */}
            <div className="pt-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={cn(
                  "w-full py-3 sm:py-4 rounded-xl text-white transition-all duration-200",
                  "bg-gradient-to-r from-purple-500 via-purple-500 to-blue-500",
                  "hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 active:scale-95",
                  "border border-white/20 font-semibold pixel-md",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                  loading && "opacity-90"
                )}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-transparent border-t-white animate-spin" />
                    <span className="text-xs">CREATING...</span>
                  </div>
                ) : (
                  "GENERATE VIBE"
                )}
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-slate-400">
            <p>✨ Made with Love</p>
          </div>
        </div>
      </main>
    </div>
  );
}
