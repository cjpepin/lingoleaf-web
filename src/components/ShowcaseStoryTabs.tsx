import { useState } from "react";
import {
  SIMULATOR_CAPTURE_HEIGHT,
  SIMULATOR_CAPTURE_WIDTH,
  SimulatorPhoneFrame,
} from "@/components/SimulatorPhoneFrame";

type StoryTab = "read" | "save" | "study";

const tabs: { id: StoryTab; label: string; image: string; title: string; body: string }[] = [
  {
    id: "read",
    label: "Read & translate",
    image: "/lingoleaf/showcase/read_translate.png",
    title: "Select any word in context",
    body: "Long-press while reading to translate instantly — no switching apps or losing your place in the book.",
  },
  {
    id: "save",
    label: "Save & organize",
    image: "/lingoleaf/showcase/save.png",
    title: "Highlights become study material",
    body: "Color-code highlights and save translations to vocab lists so new words stay tied to the passage you read.",
  },
  {
    id: "study",
    label: "Review & progress",
    image: "/lingoleaf/showcase/study.png",
    title: "Spaced repetition closes the loop",
    body: "Review saved words with flashcards and track daily progress with the garden — reading time that actually sticks.",
  },
];

function TabImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <SimulatorPhoneFrame maxWidthPx={320}>
        <div className="flex size-full items-center justify-center bg-muted/30 px-4 text-center text-xs text-muted-foreground">
          Screenshot: {alt}
        </div>
      </SimulatorPhoneFrame>
    );
  }

  return (
    <SimulatorPhoneFrame maxWidthPx={320}>
      <img
        src={src}
        alt={alt}
        width={SIMULATOR_CAPTURE_WIDTH}
        height={SIMULATOR_CAPTURE_HEIGHT}
        className="block size-full object-cover object-top"
        onError={() => setFailed(true)}
      />
    </SimulatorPhoneFrame>
  );
}

export default function ShowcaseStoryTabs() {
  const [active, setActive] = useState<StoryTab>("read");
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <section className="border-t border-border/50 px-6 pb-16 md:pb-24">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground md:text-xl">How it works</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Three beats — read, save, review — in under a minute.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid items-center gap-8 md:grid-cols-2">
          <TabImage src={current.image} alt={current.label} />
          <div className="space-y-3 text-center md:text-left">
            <h4 className="text-xl font-semibold text-foreground">{current.title}</h4>
            <p className="text-sm leading-relaxed text-muted-foreground">{current.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
