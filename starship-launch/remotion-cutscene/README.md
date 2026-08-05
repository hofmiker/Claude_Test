# Starship Launch — Cutscene Render (Remotion)

Renders the `starship-launch` cinematic (countdown → ignition → ascent →
booster separation → moon descent → touchdown) to a standalone MP4, using
the exact same vanilla Three.js scene-building/particle/camera code as
`../index.html`, ported almost unchanged into a Remotion composition.

This is a render tool, not a deployed project: it produces
`out/starship-cutscene.mp4` and is not linked from the repo's landing page.

## What's deliberately left out

Only what the cutscene's camera actually frames is built: the rocket
(booster + ship), launch pad/tower/ground/clouds, the moon landing pad +
immediate terrain, stars, and Earth-on-the-horizon. Everything that exists
in `index.html` purely for the open-world walking-around gameplay after the
cutscene ends — the space station, solar park, comms mast, rover, big rig,
crystals, pickup stones, decorative rocks, and the post-landing
ramp/hatch/astronaut walkout itself — is omitted, since none of it is ever
in frame during this segment. Procedural audio (Web Audio API) is also not
included; the output is a silent video.

## Rendering

```sh
npm install
npm run render   # -> out/starship-cutscene.mp4
```

`npm run render` always passes `--concurrency=1`. That's not a style
choice: `src/scene.ts` keeps mutable simulation state (particles, the
camera's smoothed follow height, booster separation) across frames exactly
like the original file's `requestAnimationFrame` loop kept state across
ticks. That is only correct when frames are advanced strictly in ascending
order in a single browser context — which is what `--concurrency=1` (and
`remotion render`'s normal frame-by-frame capture) guarantees, but which
scrubbing the Remotion Studio timeline backwards (`npm run preview`) does
not. Studio preview is fine for checking a specific forward playthrough;
don't trust it after scrubbing backwards.

## Timing

`src/scene.ts` keeps the original file's timeline constants
(`T_IGNITE`, `T_ASCENT_END`, `T_MOON_TOUCHDOWN`, …) unchanged. The
composition's duration is `T_MOON_TOUCHDOWN` + a ~1.6s settle beat +
a 1s fade to black, stopping just short of `T_RAMP_START` (when the
original's post-landing ramp/hatch cutscene would begin) so that code
never needs to be ported.
