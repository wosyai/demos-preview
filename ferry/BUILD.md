# Building Last Ferry

Build with Wosy revision `4e6e51710d4d129df8dd5c00574a31b8c4234f91`,
LLVM/Clang/LLD 18.1.8, Python 3, and Node. No npm packages are required.

```sh
cd ferry
WOSY=/path/to/wosy
"$WOSY" build app
node verify-wasm.mjs .wosy/artifacts/app/dev/main/main
node --test test/host.test.mjs
python test/sweep-boundary.py "$WOSY"
cp .wosy/artifacts/app/dev/main/main ferry.wasm
```

Set `CLANG` and `WASM_LD` if LLVM 18 is not on your PATH.
Serve the repository as static files and open `/ferry/` in a WebGL 2 browser.

## Play

Answer the phone, collect the tape, and reach Pier 8 before departure. Pickup starts the clock; boarding stops it. Leave the ferry on the far shore to finish. The bypass, waterfront path, and avenue loop share the same clock and collision rules. Follow the map and look for the lit harbor cranes. Free Roam has no destination or timer.

Brake overrides straight-line pedal input. Hard turns use the handbrake. Facade contact preserves clear motion and slides along the wall. At speed, steering is damped and the chase camera pulls back; free-look can pitch above the horizon.

## Browser ABI

- Imports from `ferry`: `world(ptr, floats)`, `moving(ptr, floats)`, and `frame(ptr, floats)`. Mesh vertices use six floats (XYZRGB), three vertices per triangle. World geometry can be reused across resets. The host validates counts and disjoint memory ranges before upload. Red-channel offsets encode asphalt (+2), masonry (+4), canal (+6), lamp pool (+8), lamp emission (+10), ferry foam (+12), navigation lights (+14), and reflective glass (+16). Negative blue marks contact shadows.
- `reset(0)` starts the mission; `reset(1)` starts Free Roam. Call `_start()` once before reset.
- `tick(dt, steer, drive, controls, aspect, look_x, look_y)` accepts steering and drive in −1…1 (right and forward positive) and orbit deltas in radians. Control bits 0–2 are brake/sprint, contextual action, and recenter camera. The next simulation step consumes the action; `cancel_action()` clears a queued action.
- Read road rectangles through `map_value(row, column)`. `route_selection()` identifies the active guide; `route_value(key, row, column)` reads that guide. `navigation_update()` returns the number of computed street-route points; read coordinates with `navigation_point(row, column)`. No route is returned when there is no valid path.

| Frame slots | Meaning |
| --- | --- |
| 0–15 | View-projection matrix |
| 16–20 | Driving flag, mission state, seconds, speed, action cue |
| 21–22 | Latest contact kind and sequence |
| 23–29 | Target range and X/Z, player X/Z and heading, signed target bearing |
| 30–33 | Footstep sequence, audible impact sequence, impact strength, engine load |

Mission states: 0 tape pickup, 1 timed approach, 2 delivered, 3 missed departure, 4 Free Roam, 5 crossing, 6 docked, 7 far gangway, 8 phone.
