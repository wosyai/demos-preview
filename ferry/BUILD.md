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

Wosy produces the two XYZRGB batches and perspective projection, and owns the
fixed-step simulation, foot and car movement, traffic, collision responses,
objective state, ramp boarding, the canal crossing, and disembarking, and the one-shot action consumed by the next step. Browser
code forwards analog and digital input, displays status, and submits batches
to WebGL. The lobby illustration is not a gameplay capture or a world asset.
All world objects with volume are modeled in 3D, not stacked sprites. The
static scene includes a western district anchored by Sunset Video, with two
links to the original boulevard and an expanded harbor promenade. Windshield
facets and facade geometry are modeled in Wosy. The browser sky evaluates a
direction at infinity from the same camera matrix as the world draw, so the
sun and clouds are stationary when the player moves.

World storage reserves nine 4,096-vertex chunks and moving storage 24
256-vertex chunks. Wosy never writes beyond either capacity, and the
host checks the reported counts and disjoint byte ranges before upload.
The six-float vertex format stores explicit material bands in red: ordinary
base red is 0–1; asphalt, masonry, canal, lamp pool and lamp emit red
plus 2, 4, 6, 8 or 10 respectively; animated ferry foam adds 12 and the pier signal lens adds 14. Each triangle has one band, removed
in the vertex shader before interpolation. Negative blue remains the
contact-shadow channel. Light-pool and ferry foam green store opacity; each pool is
centered under its matching lamp. The GPU shades with world coordinates
so textures do not slide as the camera moves. Player wheel detail phase
follows signed simulation displacement; the browser does not move wheels.

Traffic follows separate north-south and east-west lanes on the boulevard and
the western district. The player and traffic share two vehicle substeps per
fixed simulation tick. Each move sweeps the oriented body along its relative
translation, keeps the motion up to first contact, and does not step through
another vehicle. A normal response with a clamped nudge for a car hit by
traffic leaves available tangential motion rather than reversing the car. Northbound traffic
turns south of the separately marked harbor crosswalk. Physical bollards keep
the end of the road open for people walking from the vehicle approach to Pier 8.
The objective marker and compass guide toward that crossing on the west side.
From the phone, the car faces the southern bypass: the painted edge and
street lamps lead via the separated western service spur and setback building frontage to parking south of Sunset
Video. The return uses a marked west-side Park & Walk bay before the traffic
queue. Its normal curbside action hands off to a highlighted path along
the west pavement and across the harbor zebra crossing. The original
boulevard remains an open alternative; the bypass does not change
traffic, collision or timer rules. After pickup, the footprint action at
the tape apron can instead mark the foot-only waterfront path. Follow the
teal pavement stripe around the video shop to the seawall and across the
same harbor crosswalk. Leaving the stripe area or entering a car resumes
ordinary guidance without restarting the countdown. Mark Avenue at the
taxi-side turnaround sign to take the west loop before merging into ordinary
eastbound traffic. The amber off-lane bay hands off to the existing central
zebra crossing and on-foot pier approach; the service return remains the
default. No route changes the clock or grants collision immunity.

## Browser ABI

- Imports from `ferry`: `world(ptr, floats)`, `moving(ptr, floats)`,
  `frame(ptr, floats)`. Both mesh batches use six floats per vertex (XYZRGB),
  with three vertices per triangle. World geometry can be reused across resets.
- Exports: `_start()`, `reset(mode)`, `tick(dt, steer, drive, controls, aspect)`,
  `cancel_action()`, and memory. Reset mode 0 is the timed mission and mode 1
  is free roam. Axes range from -1 to 1; positive steer means right and
  positive drive means forward. Control bit 0 holds brake or sprint; bit 1
  queues the contextual action. Cancel it on lifecycle interruption.
- Frame length 30: view-projection [0–15], walking/driving [16], mission
  state [17], seconds [18], speed [19], action cue [20], latest contact and
  sequence [21–22], target range and position [23–25], player position
  [26–27], heading [28], signed target bearing in radians [29]. Mission states: 0 pickup,
  1 timed drive/walk to Pier 8, 2 delivered ashore, 3 missed departure,
  4 free roam, 5 boarding/crossing, 6 docked awaiting disembark,
  7 walking the far gangway, 8 phone prologue. The phone unlocks the drive-in
  pickup but does not start the clock. Boarding stops the countdown, and the
  passenger must leave the ferry to complete the mission.

## Lobby art

`art/lobby.webp` is an original illustration generated with the built-in image
tool and encoded as a 1536 × 1024 WebP. Generation prompt:

> Use case: stylized-concept. Create one wide 1536×1024 or widescreen landscape original game title-menu illustration for Last Ferry (no words in the image). A late-1980s waterfront district at blue hour: a glowing Art Deco drive-in marquee without any readable text, a boxy immaculate cream coupe with a restrained teal side accent, stylized asphalt lane markings, a couple of palm silhouettes and, beyond them, a small warmly lit ferry on the teal canal. Keep the car and main lights on the right third, with the central focal elements kept within the middle 70% vertically for responsive wide crops. The entire left 45% should be quiet dark deep navy negative space and faint pavement for an HTML title set later, with no high-contrast details there. Art direction: intentionally designed angular low-poly shapes with tactile, restrained pixel dithering, navy and dusty rose with small pools of amber and cyan, strong readable silhouette and cohesive dusk atmosphere. One connected illustration, no framing border. Neither a gameplay screenshot nor an imitation of an existing game cover. No letters, logos, watermarks, real vehicle brands, characters, guns, violence, or UI.
