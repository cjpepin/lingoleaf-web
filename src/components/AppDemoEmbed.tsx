import { useEffect, useState } from "react";

const demoBaseSrc = "/lingoleaf/demo/embed/index.html";

/** Scaled iPhone frame — smaller than full device for portfolio embed. */
const DEMO_FRAME_WIDTH = 320;
const DEMO_FRAME_HEIGHT = 640;

export type DemoEmbedMode = "showcase" | "explore";

function isExpoEmbedHtml(html: string): boolean {
  return html.includes("_expo/static") || html.includes("expo-reset");
}

type Props = {
  mode?: DemoEmbedMode;
  load?: boolean;
};

export default function AppDemoEmbed({ mode = "explore", load = false }: Props) {
  const buildFlag = import.meta.env.VITE_HAS_DEMO === "true";
  const [demoReady, setDemoReady] = useState(buildFlag);

  useEffect(() => {
    if (buildFlag) return;

    let cancelled = false;
    fetch(demoBaseSrc)
      .then(async (response) => {
        if (cancelled || !response.ok) return;
        const html = await response.text();
        if (isExpoEmbedHtml(html)) {
          setDemoReady(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [buildFlag]);

  if (!load) {
    return null;
  }

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

  const demoSrc = `${demoBaseSrc}?mode=${mode}`;

  return (
    <div className="flex justify-center overflow-auto rounded-xl bg-[#E7ECE8] px-6 py-10">
      <div
        className="shrink-0 rounded-[40px] bg-[#151516] p-2.5 shadow-2xl"
        style={{ width: DEMO_FRAME_WIDTH + 20, minWidth: DEMO_FRAME_WIDTH + 20 }}
      >
        <iframe
          key={mode}
          title="LingoLeaf web demo"
          src={demoSrc}
          width={DEMO_FRAME_WIDTH}
          height={DEMO_FRAME_HEIGHT}
          className="block border-0"
          style={{
            minWidth: DEMO_FRAME_WIDTH,
            minHeight: DEMO_FRAME_HEIGHT,
            borderRadius: 32,
            overflow: "hidden",
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
}
