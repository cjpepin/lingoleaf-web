import { BookOpen, Globe, Sparkles, NotebookPen, Target } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="w-6 h-6" />,
    title: "Read What You Love",
    description: "Dive into books in your target language — no dictionary juggling required.",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Translate Instantly",
    description: "Tap any word or phrase to see what it means, right where you're reading.",
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: "Highlight & Remember",
    description: "Mark important passages and come back to them anytime.",
  },
  {
    icon: <NotebookPen className="w-6 h-6" />,
    title: "Build Your Word List",
    description: "Save new vocabulary with context so you actually remember it.",
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Learn Your Way",
    description: "Choose from dozens of languages and learn at your own pace.",
  },
];

const LeafDecoration = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
  </svg>
);

const FeatureShowcase = () => {
  return (
    <section className="px-6 py-20 md:py-28 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <LeafDecoration className="absolute top-20 -left-8 w-32 h-32 text-primary/[0.03] rotate-45" />
        <LeafDecoration className="absolute bottom-32 -right-12 w-48 h-48 text-primary/[0.04] -rotate-12" />
        <LeafDecoration className="absolute top-1/2 left-1/4 w-24 h-24 text-primary/[0.02] rotate-90" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <LeafDecoration className="w-4 h-4" />
            <span>Why LinguaLeaf?</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Your new favorite way to learn
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Stop switching between apps. Read, translate, and learn — all in one beautiful experience.
          </p>
        </div>

        {/* Simple Feature List */}
        <div className="space-y-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group flex items-start gap-5 p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 hover:bg-accent/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                {feature.icon}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
