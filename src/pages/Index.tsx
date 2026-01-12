import { Button } from "@/components/ui/button";
import FeatureCard from "@/components/FeatureCard";
import AppStoreButtons from "@/components/AppStoreButtons";
import lingualeafIcon from "@/assets/lingualeaf_icon.png";
import { BookOpen, Globe, Sparkles, NotebookPen, Target } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="w-6 h-6 text-primary" />,
    title: "Read What You Love",
    description: "Dive into books in your target language — no dictionary juggling required.",
  },
  {
    icon: <Globe className="w-6 h-6 text-primary" />,
    title: "Translate Instantly",
    description: "Tap any word or phrase to see what it means, right where you're reading.",
  },
  {
    icon: <Sparkles className="w-6 h-6 text-primary" />,
    title: "Highlight & Remember",
    description: "Mark important passages and come back to them anytime.",
  },
  {
    icon: <NotebookPen className="w-6 h-6 text-primary" />,
    title: "Build Your Word List",
    description: "Save new vocabulary with context so you actually remember it.",
  },
  {
    icon: <Target className="w-6 h-6 text-primary" />,
    title: "Learn Your Way",
    description: "Choose from dozens of languages and learn at your own pace.",
  },
];

const Index = () => {
  const handleOpenApp = () => {
    window.location.href = "lingualeaf://";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* App Icon */}
          <div className="flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
            <img
              src={lingualeafIcon}
              alt="LinguaLeaf"
              className="w-28 h-28 md:w-36 md:h-36 rounded-3xl shadow-xl"
            />
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            <Button
              size="lg"
              className="px-8 py-6 text-lg font-semibold"
              onClick={handleOpenApp}
            >
              Open App
            </Button>
            <AppStoreButtons />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12 opacity-0 animate-fade-in" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            Everything you need to read and learn
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={500 + index * 100}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 text-center">
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
