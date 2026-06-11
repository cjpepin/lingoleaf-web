import { useEffect, useState } from "react";

const demoSrc = "/lingoleaf/demo/embed/index.html";

/** Native iPhone 15 logical frame (393×852) plus minimal embed padding. */
const DEMO_FRAME_WIDTH = 425;
const DEMO_FRAME_HEIGHT = 876;

export default function AppDemoEmbed() {
  const buildFlag = import.meta.env.VITE_HAS_DEMO === "true";
  const [demoReady, setDemoReady] = useState(buildFlag);

  useEffect(() => {
    if (buildFlag) return;

    let cancelled = false;
    fetch(demoSrc, { method: "HEAD" })
      .then((response) => {
        if (!cancelled && response.ok) {
          setDemoReady(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [buildFlag]);

  if (!demoReady) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        <p className="mb-3">
          The mobile demo bundle is not built yet. Export from the LingoLeaf subproject and sync:
        </p>
        <pre className="mx-auto max-w-md overflow-x-auto rounded-lg bg-muted px-4 py-3 text-left font-mono text-xs">
          {`cd projects/lingoleaf
npm run export:web-demo

cd ../../apps/portfolio
./scripts/sync-lingoleaf-demo.sh`}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex justify-center overflow-auto rounded-xl bg-[#E7ECE8] p-4">
      <iframe
        title="LingoLeaf web demo"
        src={demoSrc}
        width={DEMO_FRAME_WIDTH}
        height={DEMO_FRAME_HEIGHT}
        className="shrink-0 border-0 shadow-lg"
        style={{ minWidth: DEMO_FRAME_WIDTH, minHeight: DEMO_FRAME_HEIGHT }}
        loading="lazy"
      />
    </div>
  );
}
