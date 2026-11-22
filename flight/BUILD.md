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
dependencies. The browser handles input, presentation, and storage. Flight
physics, scenery, camera, cargo pickup, mail trajectory, farm spray, landings, and replays run in Wosy.

## Host ABI

The WebAssembly host imports module `flight`: `world` and `aircraft` receive
packed XYZRGB triangles, `frame` receives a 35-float projection/HUD buffer,
and `record` receives an opaque binary replay. The host supplies elapsed real
time, an input bitmask, and viewport aspect. Pointers are byte offsets into
exported memory; reacquire typed views after growth. `world` is stable until a
different mission is selected. `aircraft` and `frame` are stable until the next
`tick`. Persist any `record` bytes before another callback can replace them.

The frame keeps the projection in [0–15], mission in [16], elapsed seconds,
speed and altitude in [17–19], terminal status in [22], best time in [23],
and score in [24]. Mission-specific fields are:

| Index | Meaning |
| --- | --- |
| 20 | Phase: 0 cross the Seine, 1 approach drop, 2 landing approach, 3 rollout, 5 falling pouch, 6 takeoff, 7 supply approach, 8 supply rollout, 9 cargo pickup, 10 cargo relaunch, 11 spray rows |
| 21 | Delivery action window: 0 inactive, 5 high, 6 low, 7 misaligned, 8 not yet over target, 9 release |
| 22 | End: 0 active, 1 complete, 2 obstacle, 3 bounds/time, 4 outside strip, 5 alignment, 6 speed, 7 delivery not completed, 8 bridge, 9 overrun, 10 descent, 11 lateral exit |
| 25–26 | Route (0 none, 1 low, 2 wide) and last action status (12 premature cargo pickup, 13 rough but survivable touchdown) |
| 27–28 | Distance to target (or rollout remaining) and signed normalized turn cue |
| 29–31 | Landing instruction (1 align, 2 slow down, 3 ease descent, 4 ready), climb warning, delivered pouch or completed crop rows |
| 32–34 | Gates earned, current gate index, and seconds remaining for the current gate |

Input uses bits 0–5 for left, right, climb, dive, power, brake. For proportional
controls, set bit 6 and put signed bank and pitch bytes at bits 8–15 and 16–23.
Keyboard steering takes precedence on its axis. Wosy quantizes effective
axes to ±7. Bit 7 is a one-shot contextual mission action (load, spray, or mail release); the browser sends it for one
`tick`, and the engine consumes it on the next fixed simulation step.
`cancel_drop()` clears a not-yet-consumed release when input is interrupted
without changing the simulation clock or undoing a pouch already launched.

Mission replay format uses magic bytes `WF`, version byte 7, mission byte, a
little-endian 16-bit step count, then one little-endian canonical control word
per step. The mission action is included in its original step. Only legally completed
missions on the final step are admitted, up to 8,100 steps and 16,206 bytes.
The browser stores v7 separately from v4/v5/v6 mission records and older race records.
Older packets are not accepted under the changed course geometry and landing rules; the browser
neither reads nor overwrites the earlier save keys.

Touchdown and rollout use the same strip limits used to draw the markings.
A touchdown beyond the suggested approach limits can still enter roll-out, but
severe angle, speed, or descent still fails. Rollout still requires staying on
the strip and stopping fully; a rough supply touchdown does not load cargo or
skip take-off. Steering during rollout is slower than airborne banking. The Eiffel Tower
uses tapered leg, platform, lattice, and arch collision envelopes rather
than an invisible solid box; these approximate the drawn ironwork.

Bonus gates are optional. The plane must pass through the opening in the
forward (positive world Z) direction before its deadline. A missed opening
stays available until the deadline. Gate points never unlock a mission phase.

The Paris route extends beyond the old northeast bank to the quay station.
The station uses the same typed gable dimensions for its visible walls and flight contact.

The Wright course's western county has a terraced reservoir and gravel service
track. All new scenery within flyable airspace remains below landing height;
the raised water tower visibly marks the county boundary beyond it. This visual
change leaves replay v7 and the route physics unchanged.
