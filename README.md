# Wosy demos

Playable [Wosy](https://github.com/wosyai/lang) games for desktop and touch in a WebGL 2 browser. Wosy runs the simulation; the browser handles input, rendering, and audio.

- **Last Ferry:** Answer the phone, collect a tape at Sunset Video, and reach Pier 8 before the ferry leaves. Follow the map to Pier 8 and look for the lit cranes. Free Roam has no timer. [Build guide](ferry/BUILD.md)
- **Flying Low:** Pick up mail or crop spray, complete the delivery, and land. Follow the green landing brackets and steer while braking on rollout. Replay against your best ghost. [Build guide](flight/BUILD.md)
- **Pocket Island:** In Beacon Run, find the lens, regulator, and igniter in any order, then restore the lighthouse. Swim or build crossings. Free Build opens a separate island with unlimited blocks and flight.

Pocket Island: move with WASD or arrows, jump or swim up with Space, switch views with V, and break or place with Q/E. On touch, use the left stick to move and drag the world to look.

## Build Pocket Island locally

Use the Wosy compiler revision in `tools/wosy-revision`, LLVM/Clang/LLD 18.1.8, Python 3, and Node.

```sh
WOSY=/path/to/wosy bash ./build.sh
python3 -m http.server 8000
```

Open `http://localhost:8000/voxel/` with a WebGL 2-capable browser. Run the engine and host checks without a GPU:

```sh
node tools/verify-wasm.mjs voxel/engine.wasm --binary
node tools/verify-host.mjs
```

## Audio

Select a game to enable sound. The Sound toggle is shared across games. [Asset formats and regeneration](arcade/audio/README.md)
