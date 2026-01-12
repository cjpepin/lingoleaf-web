import { Button } from "@/components/ui/button";
import AppStoreButtons from "@/components/AppStoreButtons";
import FeatureShowcase from "@/components/FeatureShowcase";
import lingualeafIcon from "@/assets/lingualeaf_icon.png";
import { ExternalLink } from "lucide-react";

const Index = () => {
  const handleOpenApp = () => {
    window.location.href = "lingualeaf://";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 min-h-screen flex items-center justify-center">
        <div className="max-w-4xl mx-auto text-center space-y-8 -mt-16">
          {/* App Icon */}
          <div className="flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-3xl shadow-xl overflow-hidden bg-primary">
              <img
                src={lingualeafIcon}
                alt="LinguaLeaf"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* App Name & Tagline */}
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "150ms", animationFillMode: "forwards" }}>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              LinguaLeaf
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
      </section>

      {/* Features Section */}
      <FeatureShowcase />

      {/* Footer */}
      <footer className="px-6 py-12 text-center border-t border-border/50">
        <div className="max-w-md mx-auto space-y-6">
          <img
            src={lingualeafIcon}
            alt="LinguaLeaf"
            className="w-12 h-12 rounded-xl mx-auto opacity-60"
          />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LinguaLeaf. Read beautifully in any language.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
