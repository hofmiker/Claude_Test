import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { createCutsceneScene, FPS, OverlayState } from "./scene";

const INITIAL_OVERLAY: OverlayState = {
  countdownText: "10",
  countdownOpacity: 0,
  skyBackground: "linear-gradient(#8ec9f0,#cfe9ff)",
  glow: null,
  fadeOpacity: 1,
};

export const Cutscene: React.FC = () => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneApiRef = useRef<ReturnType<typeof createCutsceneScene> | null>(null);
  const [overlay, setOverlay] = useState<OverlayState>(INITIAL_OVERLAY);

  // Advances the (stateful, sequential) simulation by exactly one step per
  // Remotion frame -- see the header comment in scene.ts for why this only
  // produces correct video with `remotion render --concurrency=1`.
  useLayoutEffect(() => {
    if (!canvasRef.current) return;
    if (!sceneApiRef.current) {
      sceneApiRef.current = createCutsceneScene(canvasRef.current);
    }
    const realT = frame / FPS;
    setOverlay(sceneApiRef.current.renderFrame(frame, realT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  return (
    <AbsoluteFill style={{ background: overlay.skyBackground }}>
      <canvas ref={canvasRef} width={1920} height={1080} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {overlay.glow && (
        <div
          style={{
            position: "absolute",
            left: overlay.glow.left,
            top: overlay.glow.top,
            width: 820,
            height: 820,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            opacity: overlay.glow.opacity,
            background: "radial-gradient(circle, rgba(255,225,140,0.92) 0%, rgba(255,150,40,0.55) 26%, rgba(255,90,10,0) 66%)",
            mixBlendMode: "screen",
            filter: "blur(2px)",
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: "8%",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: '"Helvetica Neue", Arial, sans-serif',
          fontWeight: 700,
          fontSize: 180,
          color: "#ffffff",
          textShadow: "0 0 30px rgba(255,150,30,0.6), 0 4px 10px rgba(0,0,0,0.35)",
          letterSpacing: 2,
          opacity: overlay.countdownOpacity,
        }}
      >
        {overlay.countdownText}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#000", opacity: overlay.fadeOpacity, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
