import { BookOpen, Globe, Sparkles, NotebookPen, Target } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: "Read What You Love",
    description: "Dive into books in your target language — no dictionary juggling required.",
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: <Globe className="w-7 h-7" />,
    title: "Translate Instantly",
    description: "Tap any word or phrase to see what it means, right where you're reading.",
    gradient: "from-sky-500/20 to-blue-500/20",
  },
  {
    icon: <Sparkles className="w-7 h-7" />,
    title: "Highlight & Remember",
    description: "Mark important passages and come back to them anytime.",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    icon: <NotebookPen className="w-7 h-7" />,
    title: "Build Your Word List",
    description: "Save new vocabulary with context so you actually remember it.",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: "Learn Your Way",
    description: "Choose from dozens of languages and learn at your own pace.",
    gradient: "from-rose-500/20 to-pink-500/20",
  },
];

const FeatureShowcase = () => {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            Why LinguaLeaf?
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Your new favorite way to learn
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stop switching between apps. Read, translate, and learn — all in one beautiful experience.
          </p>
        </div>

        {/* Bento-style Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Large feature card */}
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${features[0].gradient} p-8 md:col-span-2 lg:col-span-2 lg:row-span-1`}>
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6">
                {features[0].icon}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">{features[0].title}</h3>
              <p className="text-muted-foreground text-lg max-w-md">{features[0].description}</p>
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
          </div>

          {/* Regular cards */}
          {features.slice(1).map((feature, index) => (
            <div
              key={feature.title}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${feature.gradient} p-6 md:p-8 transition-transform hover:scale-[1.02]`}
            >
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-primary/5 blur-xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
