import { BookOpen, Brain, Languages } from "lucide-react";
import { useState } from "react";
import {
  SIMULATOR_CAPTURE_HEIGHT,
  SIMULATOR_CAPTURE_WIDTH,
  SimulatorPhoneFrame,
} from "@/components/SimulatorPhoneFrame";

const VIDEO_SRC = "/lingoleaf/showcase/lingoleaf-recruiter.mp4";
const POSTER_SRC = "/lingoleaf/showcase/lingoleaf-recruiter-poster.jpg";

const engineeringCards = [
  {
    icon: BookOpen,
    title: "EPUB reader",
    description:
      "Text selection, highlights, resume position, and offline book downloads — built on React Native and Expo.",
  },
  {
    icon: Languages,
    title: "Translation pipeline",
    description:
      "Cache-first lookups with rate-limited demo API, guest and auth flows, and Supabase-backed persistence.",
  },
  {
    icon: Brain,
    title: "Study system",
    description:
      "Vocab lists, spaced repetition flashcards, progress garden, and analytics — one loop from reading to retention.",
  },
];

export default function LingoLeafShowcase() {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section id="showcase" className="scroll-mt-20 border-t border-border/50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
          <SimulatorPhoneFrame className="order-2 md:order-1">
            {!videoFailed ? (
              <video
                className="block size-full bg-black object-cover"
                src={VIDEO_SRC}
                poster={POSTER_SRC}
                width={SIMULATOR_CAPTURE_WIDTH}
                height={SIMULATOR_CAPTURE_HEIGHT}
                autoPlay
                loop
                muted
                controls
                playsInline
                preload="auto"
                onError={() => setVideoFailed(true)}
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-3 bg-muted/40 px-6 text-center">
                <p className="text-sm font-medium text-foreground">Showcase video coming soon</p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Add <code className="rounded bg-muted px-1">lingoleaf-recruiter.mp4</code> to{" "}
                  <code className="rounded bg-muted px-1">public/showcase/</code> — see README there.
                </p>
              </div>
            )}
          </SimulatorPhoneFrame>

          <div className="order-1 space-y-3 text-center md:order-2 md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              What I built
            </h2>
            <p className="text-muted-foreground">
              iOS app I designed and shipped — EPUB reader, in-context translation, and spaced
              repetition. Live on the App Store.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {engineeringCards.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-border/65 bg-card/75 p-5"
            >
              <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
