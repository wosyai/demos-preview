# Orbital: Kestrel Station

A first-person zero-gravity training exercise. Enter the deck, drift toward
the amber handrail, grip it, then push off. Reset to practice again.

- Desktop: WASD or arrow keys for horizontal thrust, Space/C to rise/descend,
  Shift to brake, drag the view to look around, and E to grip/release.
- Touch: hold the arrows for thrust, use the vertical buttons to rise, descend
  or brake, drag the view to look around, and tap Grip/Release when available.

Wosy owns the station and glove meshes, thrust, bounded movement, the approach
test and the grip/contact/release transition. The browser owns the WebGL 2
projection, materials and planet backdrop, presentation and input transport.
The exercise includes two authored glove configurations, an ease into contact,
and a separate release/push-off state. It is not an EVA or orbital dynamics
simulator. There are no external assets or browser runtime dependencies.

## Run / build

From the repository root, start a static HTTP server and open `/orbital/`.
The checked-in WASM is the engine used by that page.

From `orbital/`, use Wosy with LLVM/Clang/LLD 18:

```sh
wosy build app
node verify-wasm.mjs .wosy/artifacts/app/dev/main/main
cp .wosy/artifacts/app/dev/main/main orbital.wasm
node verify-wasm.mjs
```

The behavior check launches the exact WASM, verifies the room and hand meshes
and checks that grip requires both range and aim, throttle cannot displace a
held pose, held action cannot accidentally release, push-off imparts drift,
and reset restores the exact initial pose.
