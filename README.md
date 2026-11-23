# Wosy demos

Playable examples built with the [Wosy language](https://github.com/wosyai/lang).

## Last Ferry

Pick up a tape at Sunset Video and reach Pier 8 before the last ferry leaves.
Choose the coastal boulevard, cut through the neighborhood streets, or get
out of the car. Explore the district without a time limit in **Free roam**.
The town and its moving objects are full 3D; Wosy runs the vehicle, traffic,
pedestrians, collisions, and mission. See the [build guide](ferry/BUILD.md).

## Flying Low

A third-person game with two early-aviation missions. Land at the marked pickup strip, collect the payload, and take off again. In Paris, drop the mail pouch over its target. On the Wright Flyer, dust the marked crop strips before returning to land. Fly again against a ghost of your best completed mission.

Flying Low runs in English on desktop and mobile in a WebGL 2 browser. Wosy owns flight dynamics, the chase camera, mission geometry and outcome, scoring, and replay. The browser handles input, drawing, and storing replays on the device.

See the [build guide](flight/BUILD.md). Verify both missions and replay behavior with `node tools/verify-flight-wasm.mjs`.

## Pocket Island

Explore a seeded island in **Creative**, or carry a flame to two watchfires and then to the lighthouse in **Beacon Run**. Take the longer dry ridge, build across the channel, or risk the tidal cut. Waves affect buoyancy and drag, and the tide can submerge the flame. Your creative terrain is restored when you leave the mission.

Wosy owns terrain, texture pixels, collisions, water geometry and swimming, camera and editable targets, and all mission rules. The browser only handles input and submits the meshes to WebGL 2.

- Desktop: WASD or arrows to move, Space to jump or swim up, V to switch perspective, and F to toggle creative flight. In flight, Space and C rise and descend. Select with 1–6 or the wheel, and use Q/E to remove/place. With mouse capture, left/right click also break/place; hold either action to repeat. Drag to look when capture is unavailable.
- Touch: drag the left joystick to move and the world on the right to look. Use the jump, view, and editing buttons with your other thumb. Flight is available in Creative. Pick a building material from the hotbar. To set a seed manually, pause and open World options.

This is an experimental demo, not a claim that all game logic is statically verified.

## Build Pocket Island locally

Use the Wosy compiler revision in `tools/wosy-revision`, LLVM/Clang/LLD 18.1.8, Python 3 and Node. The build links the exact WebAssembly exports and checks the actual browser ABI and a deterministic world before updating the published binary.

```sh
WOSY=/path/to/wosy bash ./build.sh
python3 -m http.server 8000
```

Open `http://localhost:8000/voxel/` with a WebGL 2-capable browser. The site is static and does not require a backend. The engine and browser-host smoke tests can run without a GPU:

```sh
node tools/verify-wasm.mjs voxel/engine.wasm --binary
node tools/verify-host.mjs
```

## Sound design

Sound packs are generated offline with Earshot 1.0.0; see
[the asset manifest and regeneration notes](arcade/audio/README.md). No Python,
FFmpeg, model, remote asset service, or JS audio library is needed to play.

| Game | Quiet continuous sound | Gameplay cues |
| --- | --- | --- |
| Pocket Island | Surf only near the shore | Grounded footsteps; successful block break and placement; loose material and lighthouse-part pickup; entering the sea; lighthouse restored or run flooded |
| Flying Low | Throttle/speed-shaped motor and airflow | Bonus gate, cargo pickup, mail release and result, completed spray row, normal and rough touchdown, crash |
| Last Ferry | Load-shaped car motor, quiet crossing bed | Grounded footsteps, car door, strong player impact, phone, tape pickup, ferry boarding, delivery or missed ferry |

The Wosy simulation supplies confirmed events and continuous state. The audio
adapter does not decide whether an input succeeded. Aborted actions, repeated
HUD hints, pointer movement, and routine route updates stay silent. A click or
tap unlocks audio; the Sound toggle is shared across the arcade, and pause or a
hidden tab stops the sound. Browser-decodable compressed files are attempted
first, with fallbacks for devices that cannot decode them.
