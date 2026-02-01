import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import AppStoreButtons from "@/components/AppStoreButtons";
import FeatureShowcase from "@/components/FeatureShowcase";
import lingoleafIcon from "@/assets/lingoleaf_icon.png";
import { ExternalLink, ChevronDown } from "lucide-react";

const Index = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleOpenApp = () => {
    window.location.href = "lingoleaf://";
  };

  const handleLearnMore = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  const learnMoreOpacity = Math.max(0, 1 - scrollY / 150);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-8 -mt-16">
          {/* App Icon */}
          <div className="flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
            <img
              src={lingoleafIcon}
              alt="LinguaLeaf"
              className="w-28 h-28 md:w-36 md:h-36 shadow-2xl rounded-[2rem]"
            />
          </div>

          {/* App Name & Tagline */}
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "150ms", animationFillMode: "forwards" }}>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              Lingoleaf
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-lg mx-auto">
              Read in any language. Learn as you go.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-6 pt-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            <AppStoreButtons />
            
            {/* Subtle open app link for users who already have it */}
            <button
              onClick={handleOpenApp}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Already have it? 
              <span className="underline underline-offset-2">Open App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Learn more arrow - fades on scroll */}
        <button
          onClick={handleLearnMore}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-300"
          style={{ opacity: learnMoreOpacity, pointerEvents: learnMoreOpacity < 0.1 ? "none" : "auto" }}
          aria-label="Scroll to learn more"
        >
          <span className="text-sm font-medium">Learn more</span>
          <ChevronDown className="w-5 h-5 animate-bounce-soft" />
        </button>
      </section>

      {/* Features Section */}
      <div id="features">
        <FeatureShowcase />
      </div>

      {/* Footer */}
      <footer className="px-6 py-12 text-center border-t border-border/50">
        <div className="max-w-md mx-auto space-y-6">
          <img
            src={lingoleafIcon}
            alt="LinguaLeaf"
            className="w-12 h-12 rounded-xl mx-auto opacity-60"
          />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lingoleaf. Read beautifully in any language.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
