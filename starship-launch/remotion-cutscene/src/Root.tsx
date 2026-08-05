import React from "react";
import { Composition } from "remotion";
import { Cutscene } from "./Cutscene";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./scene";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StarshipCutscene"
      component={Cutscene}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
