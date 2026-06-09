import { BookOpen, Clock, Globe, NotebookPen, Sparkles, Target } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Read What You Love",
    description: "Choose from a library containing over 1500 full length books.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Translate in Context",
    description: "Tap a phrase and get meaning without losing your place in the text.",
    accent: "from-info/20 to-info/5",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Save What Matters",
    description: "Highlight words and passages you want to revisit later.",
    accent: "from-warning/20 to-warning/5",
  },
  {
    icon: <NotebookPen className="h-6 w-6" />,
    title: "Build Lasting Vocabulary",
    description: "Store new words with context so review actually sticks.",
    accent: "from-success/20 to-success/5",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Learn at your own pace",
    description: "Use spaced repitition study techniques to remember what you've studied.",
    accent: "from-info/20 to-info/5",
  }
];

const checkpoints = [
  {
    title: "Choose from a library containing 1,500+ full length books.",
    detail: "Choose from a variety of genres and languages.",
  },
  {
    title: "Tap, translate, and highlight",
    detail: "Understand instantly while staying in flow. Read and translate in the same app.",
  },
  {
    title: "Review your saved words",
    detail: "Turn exposure into retention.",
  },
];

const FeatureShowcase = () => {
  return (
    <section className="relative overflow-hidden px-6 py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_40%),radial-gradient(circle_at_80%_75%,hsl(var(--accent)/0.5),transparent_35%)]" />

      <div className="relative z-10 mx-auto max-w-5xl space-y-10">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-border/70 bg-card/80 p-7 backdrop-blur sm:p-9">
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">A cleaner way to turn reading time into language progress.</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              LingoLeaf keeps translation, highlights, and vocabulary together, so learners spend less time switching tools and more time actually reading.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-2xl font-semibold">1500+</p>
                <p className="text-xs text-muted-foreground">full length books</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-2xl font-semibold">1-tap</p>
                <p className="text-xs text-muted-foreground">read and translate in the same app</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-2xl font-semibold">0 friction</p>
                <p className="text-xs text-muted-foreground">from reading to review</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/85 p-7 backdrop-blur sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How It Works</h3>
            <div className="mt-5 space-y-5">
              {checkpoints.map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-border/65 bg-card/75 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
            >
              <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br p-3 text-foreground ${feature.accent}`}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
