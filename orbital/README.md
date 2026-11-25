# Orbital: Kestrel Station

A zero-gravity EVA exercise outside Kestrel Station. Use the station rails
to move from the airlock to the cargo truss and back.

- Desktop: WASD or arrows for head-relative thrust, Space/C for vertical
  thrust, Shift for fine thrust, drag to turn your head, and E for the
  offered grip/release action.
- Touch: drag and hold on the left half to thrust, drag and hold on the
  right half to turn your head, and tap the offered grip/release action.
  The thumb zones are invisible. To move up or down, first aim up or down.
- Release thrust to coast. To slow relative to the station, thrust opposite
  the indicated drift. The exterior suit has 20 m/s of total impulse per
  exercise. Collisions suppress only the velocity through the surface.

Wosy owns gameplay, thrust, collision, the head and trailing body orientation,
approach attitude and speed gates, grip/contact animations, and orbit state.
The browser owns WebGL 2 projection, materials, planet backdrop, and input
transport. The simulation uses finite expanded collision proxies for the
primary shell, hatch assembly, major catwalk courses, console and cargo,
not render-triangle collision for the entire station. The same proxies stop
the chase-camera boom without changing the astronaut path. The preview uses the full Apollo suit in both camera views when its gameplay
asset is present.
A source checkout without it uses the original procedural suit. Use
`?suit=procedural` to force the fallback.

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
and checks range, aim and speed gates, continuous grip capture from incoming
momentum, exact mechanical contact positions, sustained inertial coast,
counterthrust, swept hull contact and reset. It also verifies the independent
reentry scenario and the insufficient EVA tank for reentry from normal orbit.

## Exterior EVA

Select **Begin spacewalk** to reach the cargo bay on Kestrel's starboard
truss. Grip the **airlock rail**, push off to the blue **scaffold rail**, then
grip the captive pin inside the gold **cargo brace**. With the pin held,
activate **Seat cargo lock**. The hand follows the pin into its upper detent,
then the recessed status light turns green. Then choose
**Drift to align** and move right to the blue console. Counterthrust until
moving slowly enough to grip, then aim at the blue light. Grip the console
handle and set it to lower cargo into the cradle. Transfer separately; the
cradle's keepers close before the robot jaws open. Push off toward the hatch,
match speed, grip the handle and lock its detent. Menu and reset are always
available. The **Indoor training** exercise retains the bounded cabin.

## Orbit and reentry

The exterior scene starts in a nominal 390 km circular Earth orbit. X is
orbit-normal, Y radial outward, and −Z prograde at the station. Wosy integrates
Newtonian gravity, centrifugal and Coriolis terms in the station's rotating
frame; an unpowered release does not deorbit you. Once 150 m from the station,
**Coast ×120** is available; starting a burn returns to ordinary time. The
separate **Reentry scenario** starts at the 260 km apogee of a hypothetical
low-perigee orbit (about 55 km nominal without atmospheric drag), not as a
consequence of releasing an EVA handhold. At 120 km, coast gives way to a
displayed ×24 atmospheric descent. Heating appears deeper as air grows denser;
hot gas follows the atmosphere-relative motion. An unshielded suit eventually
loses the exercise to accumulated heating. Reset to replay. Either camera
works; third person shows the wake. This is an illustrative spherical Earth,
simple density and drag, and an uncalibrated heating index, not an astronaut,
engineering, or navigation model.

From the scaffold rail you can see the cartridge separated from the hull by a
visible gap. Its yoke suspends it from the starboard truss while the two-link
manipulator braces its end fitting. C07 has an eight-sided shell, raised
front channels, carry bands, and a plated actuator housing; the jaw stays
around the same attachment in both endpoint poses. The latch has its own mount; the close-up
grip and seating endpoints have not moved. An open, recessed service hatch
and its conduit feeds are visible beyond the scaffold. The cabin behind the
hatch is stationary visual scenery, not an additional route.

The visual design uses authored Wosy geometry, separate open and closed glove
poses, six material finishes in a texture array, WebGL sun shadows, and a
spherical photographic Earth backdrop. Earth imagery:
[NASA Goddard Space Flight Center, Blue Marble 2015](https://svs.gsfc.nasa.gov/30763/),
Amy Moran and Jesse Allen, from Suomi NPP VIIRS. The image is presented in a
fictional orbit and does not imply NASA endorsement.

Lunar albedo and relief: NASA Goddard Scientific Visualization Studio,
[CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) (LRO WAC and LOLA).
Relief is exaggerated for readability.

The Apollo model and its textures are third-party assets outside the project
license. See [Apollo NOTICE](art/apollo-NOTICE) for attribution and terms.
[Art sources, credit, and two-pose export](art/README.md).

Only the next usable grip is lit. The locator lenses are built into the rails,
console and hatch; on the return leg a small reticle arrow points to the hatch
when it is off to the side and the HUD names which way to look. Eye, aim and hand settle through a
fixed-step capture curve.

The contact and release states retain world-space rail anchors on all screen
sizes. At the cargo brace the pin and hand share both Wosy-authored endpoints.
The blue console first seats the cargo, then a separate press closes both
cradle keepers and opens the robot jaws at a fixed cargo position. The robot withdraws and parks before releasing the console. Green
keeper indicators confirm the completed transfer. Release the console and ride the
return push, counterthrust at the round airlock, and aim toward the amber locking bar.
Grip the machined bar and slide its carriage into the upper detent to complete
the EVA. Its local status light confirms the lock. The
airlock stays closed: this exercise ends with an external lock confirmation,
not a re-entry or pressurization sequence. The locks, cargo seating, and
transfer use short, bounded Wosy pose sequences. The handoff and lock actuators update only their own indexed spans, shared
with the Sun shadow draw, rather than rebuilding the room. The scene is
cached between those samples. The WebGL host interpolates presented camera and arm coordinates around
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

The default avatar, MMU and controls are original analytic meshes, with no
downloaded suit asset. The third-person toggle sees the same Wosy flight and
grip state as first person. Controller tilt follows actual left/right input;
the cold-gas jets are shown only while thrust is applied. The upgraded sky adds
a directional atmosphere limb, observable Earth rotation and a dim star map
to the existing cache, without a new rendering pass. `?sky=legacy` skips
the star-map download for an exact visual comparison.
