import { Link } from "react-router-dom";
import { ArrowRight, Music, Sparkles, Share2, Image, Palette } from "lucide-react";
import { PixelBackground } from "@/components/PixelBackground";
import { cn } from "@/lib/utils";

export default function Index() {
  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      {/* Animated background */}
      <PixelBackground />

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <header className="border-b border-white/10 backdrop-blur-md">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex items-center justify-between">
            <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-base sm:text-lg group-hover:scale-110 transition-transform">
                VB
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Music box</h1>
            </div>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-28">
          <div className="space-y-6 sm:space-y-8 lg:space-y-10 animate-fade-in">
            {/* Main Headline */}
            <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
              <h2 className="pixel-lg sm:pixel-lg lg:text-5xl font-bold leading-tight">
                <span className="gradient-text">Music box</span>
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Create shareable, cinematic music experiences. Upload your MP3 track,
                choose a theme, and share a visual masterpiece with the world.
              </p>
            </div>

            {/* CTA Button */}
            <div className="flex justify-center pt-4 sm:pt-6">
              <Link
                to="/create"
                className={cn(
                  "inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4",
                  "bg-gradient-to-r from-purple-500 via-purple-500 to-blue-500",
                  "text-white font-semibold text-base sm:text-lg rounded-xl",
                  "hover:shadow-2xl hover:shadow-purple-500/50 transition-all duration-300",
                  "hover:scale-105 active:scale-95",
                  "group"
                )}
              >
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
                Create Your Vibe
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            

            {/* How It Works */}
            <div className="pt-12 sm:pt-16 lg:pt-20 max-w-3xl mx-auto">
              <h3 className="text-lg sm:text-2xl font-bold text-center text-white mb-8 sm:mb-12 pixel-md">
                HOW IT WORKS
              </h3>

              <div className="space-y-4 sm:space-y-6">
                {[
                  { step: 1, title: "Add Your Track", desc: "Upload an MP3 file" },
                  { step: 2, title: "Choose Your Look", desc: "Upload an image of your choice" },
                  { step: 3, title: "Generate & Share", desc: "Create and share with one click" },
                ].map((item) => (
                  <div key={item.step} className="glass p-4 sm:p-6 rounded-xl flex items-start gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-white">{item.title}</h4>
                      <p className="text-sm sm:text-base text-slate-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

         
            
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 mt-16 sm:mt-20 lg:mt-28 py-8 sm:py-12 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-400">
            <p>✨ Made with Love • Share the vibe, spread the love</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
