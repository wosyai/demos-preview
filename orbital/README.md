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

## Exterior EVA

Select **Begin spacewalk** to reach the cargo bay on Kestrel's starboard
truss. Grip the **airlock rail**, push off to the blue **scaffold rail**, then
grip the captive pin inside the gold **cargo brace**. With the pin held,
activate **Seat cargo lock**. The hand stays wrapped around the pin as it snaps
into its upper detent, and the recessed status light turns green. Then choose
**Drift to align** and move right to the blue console. Hold the brake until
you are stationary, then aim at the blue light. The reticle indicates which
way to turn if you stop while looking off-axis. Grip the console handle and
seat it to lower the cartridge into the transfer cradle. The truss guides
carry the load while the connected wrist stays fitted, and the console and
wrist lights turn green. The two mechanical poses are currently fixed
endpoints, not a timed animation. Flying through the capture zone or
braking while looking elsewhere does not arm the grip. There is no timer.
Choose **Indoor training** to repeat the original single-rail exercise. Menu and reset remain
available in both exercises. These are bounded training spaces, not a model of orbital
flight or spacecraft controls.

From the scaffold rail you can see the cartridge separated from the hull by a
visible gap. Its yoke suspends it from the starboard truss while the two-link
manipulator braces its end fitting. The latch has its own mount; the close-up
grip and seating endpoints have not moved. An open, recessed service hatch
and its conduit feeds are visible beyond the scaffold. The cabin behind the
hatch is stationary visual scenery, not an additional route.

The visual design uses authored Wosy geometry, separate open and closed glove
poses, six material finishes in a texture array, WebGL sun shadows, and a
spherical photographic Earth backdrop. Earth imagery:
[NASA Goddard Space Flight Center, Blue Marble 2015](https://svs.gsfc.nasa.gov/30763/),
Amy Moran and Jesse Allen, from Suomi NPP VIIRS. The image is presented in a
fictional orbit and does not imply NASA endorsement.

The exterior first-person arm uses a compact, indexed export of the Apollo
astronaut asset. The authored Wosy arm is the loading/fallback mesh.
[Art sources, credit, and two-pose export](art/README.md).

The contact and release states retain world-space rail anchors on all screen
sizes. At the cargo brace the pin and hand share both Wosy-authored endpoints.
Each seated control invalidates the stationary batch once. The blue console,
recessed lock, suspended cargo shell and manipulator require no per-frame
geometry updates. The WebGL host interpolates presented camera and arm coordinates around
the fixed 60 Hz Wosy simulation. Station shadows are cached until actual
station geometry changes, and the canvas can lower moving resolution on slow
GPUs while keeping still scenes sharp.
The planet is reprojected into a reusable backdrop only when the view direction
or render size changes. Single-sample WebGL keeps slow-device movement from
paying a multisample resolve every frame.

**Resolution** in the exercise menu defaults to Auto, which keeps a standard
1080p framebuffer on typical hardware unless sustained rendering pressure
requires a lower resolution. A detected software rasterizer starts with a
reduced moving resolution. Choose **Full detail** (or add `?quality=full` to
the URL) to disable dynamic reductions and favor detail; a slower graphics
device may then drop frames.

## Local performance trace

Open `?quality=full&debug=timing` to display the canvas's actual backing
dimensions and current requestAnimationFrame P90. The same renderer and
gameplay run at full detail. Use **Record trace**, complete the three-rail
route, then **Stop trace** and **Save trace**. The download is local JSON:
only relative rAF timestamps, backing dimensions, phase/leg numbers, and a
broad renderer class. It contains no account data, URLs, or device identifiers,
and is never uploaded by the game.

Run one trace without recording any video to measure play. If testing video,
repeat separately with your capture tool and compare its source frame
timestamps. rAF measures the browser's update opportunities, not screen
presentation or encoder cadence. Keep the tab foregrounded and note the
device/browser and observed issue separately, only if you choose to share it.

The exterior preserves the existing cached shadow budget in Auto and on
software graphics. Full detail on a detected hardware renderer enables
higher-precision contact shadows. Mipmapped surfaces and smoother round
hardware are available at both settings without a screen-wide blur.
