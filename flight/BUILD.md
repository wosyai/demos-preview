# Building Flying Low
From the demos checkout, with Wosy compiler revision
`2c8f459b94f0262e306f5c7b1bf7486b59ee1332`:

```sh
cd flight
WOSY=/path/to/wosy
"$WOSY" build app
node verify-wasm.mjs .wosy/artifacts/app/dev/main/main
node --test test/host.test.mjs
cp .wosy/artifacts/app/dev/main/main flight.wasm
```

Set `CLANG` and `WASM_LD` if LLVM 18 is not on your PATH. There are no npm
dependencies.

## Host ABI

The WebAssembly host imports module `flight`: `world` and `aircraft` receive
packed XYZRGB triangles, `frame` receives a 41-float projection/HUD/cinematic buffer,
and `record` receives an opaque binary replay. The host supplies elapsed real
time, an input bitmask, and viewport aspect. Pointers are byte offsets into
exported memory; reacquire typed views after growth. `world` is stable until a
different mission is selected. `aircraft` and `frame` are stable until the next
`tick`. Persist any `record` bytes before another callback can replace them.

The frame keeps the projection in [0–15], mission in [16], elapsed seconds,
speed and altitude in [17–19], best time in [23],
and score in [24]. Mission-specific fields are:

| Index | Meaning |
| --- | --- |
| 20 | Phase: 0 cross the Seine, 1 approach drop, 2 landing approach, 3 rollout, 5 falling pouch, 6 takeoff, 7 supply approach, 8 supply rollout, 9 cargo pickup, 10 cargo relaunch, 11 spray rows |
| 21 | Delivery action window: 0 inactive, 5 high, 6 low, 7 spray misaligned (Wright only), 8 not yet over target, 9 release |
| 22 | End: 0 active, 1 complete, 2 obstacle, 3 bounds/time, 4 outside strip, 5 alignment, 6 speed, 7 delivery not completed, 8 bridge, 9 overrun, 10 descent, 11 lateral exit |
| 25–26 | Route (0 none, 1 low, 2 wide) and last action status (12 premature cargo pickup, 13 rough but survivable touchdown) |
| 27–28 | Distance to target (or rollout remaining) and signed normalized turn cue |
| 29–31 | Landing instruction (1 align, 2 slow down, 3 ease descent, 4 ready), climb warning, delivered pouch or completed crop rows |
| 32–34 | Gates earned, current gate index, and seconds remaining for the current gate |
| 35 | Wosy ring-award flash: 1 during the short confirmation, or 0 |
| 36 | Presentation state: 0 normal, 1 crash, 2 pouch follow; crash takes priority |
| 37–40 | Actual interpolated aircraft X/Y/Z and heading, independent of camera framing |

Input uses bits 0–5 for left, right, climb, dive, power, brake. For proportional
controls, set bit 6 and put signed bank and pitch bytes at bits 8–15 and 16–23.
Keyboard steering takes precedence on its axis. Wosy quantizes effective
axes to ±7. Bit 7 is a one-shot contextual mission action (load, spray, or mail release); the browser sends it for one
`tick`, and the engine consumes it on the next fixed simulation step.
`cancel_drop()` clears a not-yet-consumed release when input is interrupted
without changing the simulation clock or undoing a pouch already launched.

## Replay

Replay packets start with `WF`, a version byte (7 Wright, 8 Paris), a mission byte, and a little-endian 16-bit step count. Each step stores one little-endian control word. Only runs that finish on their last step are valid (at most 8,100 steps and 16,206 bytes). Paris v7 saves are not loaded or overwritten.

## Play

- Press V or tap Cockpit to switch views. `select_view(0)` selects chase; `select_view(1)` selects cockpit. Camera selection is not replay input.
- In Paris, fly over the amber X at 3–14 m. The blue marker shows where the pouch will fall. The aircraft remains controllable during the pouch camera.
- Fly forward through optional bonus gates before they expire. Gates award points, not access to later phases.
- Green brackets guide the approach to the selected strip and disappear at rollout. Brake for tighter rollout steering and stay on the strip until stopped. A rough supply landing does not load cargo. Decorative windsocks do not model gameplay wind.
- Fatal impact stops mission time and recording. The engine then presents the breakup; the host hides actionable cues until it ends. Sheds and barns use their drawn geometry for solid contact; debris support is approximate.
