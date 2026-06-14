import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** iPhone 16 Pro simulator screen capture (@3x). */
export const SIMULATOR_CAPTURE_WIDTH = 1206;
export const SIMULATOR_CAPTURE_HEIGHT = 2622;

const DEFAULT_MAX_WIDTH_PX = 320;

type SimulatorPhoneFrameProps = {
  children: ReactNode;
  className?: string;
  maxWidthPx?: number;
};

export function SimulatorPhoneFrame({
  children,
  className,
  maxWidthPx = DEFAULT_MAX_WIDTH_PX,
}: SimulatorPhoneFrameProps) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div
        className="rounded-[2.75rem] bg-black p-[11px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.07] sm:rounded-[3rem] sm:p-3"
        style={{ width: `min(100%, ${maxWidthPx}px)` }}
      >
        <div
          className="overflow-hidden rounded-[2.15rem] bg-black sm:rounded-[2.35rem]"
          style={{
            aspectRatio: `${SIMULATOR_CAPTURE_WIDTH} / ${SIMULATOR_CAPTURE_HEIGHT}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
