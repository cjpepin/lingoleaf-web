import { useCallback, useEffect, useState } from "react";
import AppDemoEmbed, { type DemoEmbedMode } from "@/components/AppDemoEmbed";
import { Button } from "@/components/ui/button";

type Props = {
  initialExpanded?: boolean;
  initialMode?: DemoEmbedMode;
};

export default function DemoSection({ initialExpanded = false, initialMode = "explore" }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [mode, setMode] = useState<DemoEmbedMode>(initialMode);

  const openDemo = useCallback((nextMode: DemoEmbedMode) => {
    setMode(nextMode);
    setExpanded(true);
  }, []);

  useEffect(() => {
    if (initialExpanded) {
      setExpanded(true);
      setMode(initialMode);
    }
  }, [initialExpanded, initialMode]);

  return (
    <section id="try-demo" className="scroll-mt-20 border-t border-border/50 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-4xl space-y-8 text-center">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Try it in your browser
          </h2>
          <p className="mx-auto max-w-lg text-muted-foreground">
            Same React Native codebase as iOS · demo data · no install. Start with a guided tour or
            explore freely.
          </p>
        </div>

        {!expanded ? (
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button type="button" size="lg" onClick={() => openDemo("showcase")}>
              Guided tour
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={() => openDemo("explore")}>
              Explore freely
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "showcase" ? "default" : "outline"}
                onClick={() => setMode("showcase")}
              >
                Guided tour
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "explore" ? "default" : "outline"}
                onClick={() => setMode("explore")}
              >
                Explore freely
              </Button>
            </div>
            <AppDemoEmbed mode={mode} load />
          </div>
        )}
      </div>
    </section>
  );
}
