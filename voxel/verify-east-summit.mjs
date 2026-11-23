import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));
let engine, frame;
const resident = new Map();
engine = new WebAssembly.Instance(wasm, {
  showcase: {
    aim() {}, atlas() {}, outline() {}, player() {}, water() {},
    mesh(pointer, count, x, z) {
      const key = `${x},${z}`;
      if (!count) resident.delete(key);
      else resident.set(key, new Float32Array(engine.memory.buffer, pointer, count * 6).slice());
    },
    frame(pointer) { frame = Array.from(new Float32Array(engine.memory.buffer, pointer, 44)); },
  },
  wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
}).exports;
engine._start();
const tick = (dt = .05) => engine.tick(dt, 1, 1);
const idle = (count) => { for (let i = 0; i < count; i++) tick(); };
const move = (button, lane, goal, direction, cap = 300, pulse = false) => {
  engine.control(button, 1);
  for (let i = 0; i < cap && (goal - frame[lane]) * direction > 0 && frame[25] === 1; i++) {
    if (pulse && i % 12 === 0) engine.pulse_control(4);
    tick();
  }
  engine.control(button, 0);
  assert((goal - frame[lane]) * direction < .03, 'reach waypoint by normal controls: ' + goal + ' @ ' + frame.slice(16, 19));
};
const jumpNorth = (goal) => {
  engine.control(4, 1);
  move(0, 18, goal, -1, 55);
  engine.control(4, 0);
  idle(16);
};
const top = (x) => {
  for (let y = 15; y >= 0; y--) if (engine.terrain_material(x, y, 15)) return y;
  return -1;
};
const start = (seed) => {
  engine.generate(seed);
  assert(engine.start_archipelago_lighthouse() > 0);
  tick(0);
  const summit = Math.floor(frame[42]);
  assert(summit >= 124 && summit <= 156, 'summit occupies the exterior east archipelago');
  let height = top(96);
  assert.equal(height, 2, 'the ascent begins with a wadeable shore');
  for (let x = 97; x <= summit; x++) {
    const next = top(x);
    assert(next >= height && next <= height + 1, 'real stair rises are continuous and never exceed a single block');
    height = next;
  }
  assert.equal(height, 12);
  return summit;
};
const sites = [-1, 0, 1, 42, 471, 726, 17107].map(start);
assert(new Set(sites).size >= 3, 'diverse signed seeds select materially different ascent locations');
const summit = start(726);
assert.equal(summit, sites[5]);

move(0, 18, 33.32, -1);
move(3, 16, 38.45, 1);
move(0, 18, 27.32, -1);
jumpNorth(26.48);
move(0, 18, 24.32, -1);
jumpNorth(23.52);
move(0, 18, 14.35, -1);
move(3, 16, 46.15, 1);
for (const landing of [50.15, 55.15, 60.15, 64.15]) {
  engine.pulse_control(4);
  engine.control(6, 1);
  move(3, 16, landing, 1);
  engine.control(6, 0);
  idle(16);
}
move(3, 16, 66.05, 1);
move(1, 18, 15.38, 1);
move(3, 16, 97.30, 1, 650, true);
assert.equal(frame[39] & 2, 0, 'arrival on the ascent does not collect the summit regulator');
move(3, 16, summit + .55, 1, 900, true);
idle(16);
assert.equal(frame[39] & 2, 2, 'normal ground contact at the procedural summit collects the regulator');
assert(Math.abs(frame[17] - 14.62) < .06);
assert.equal(engine.terrain_ray_face(summit + .5, 15.5, 15.5, 0, -1, 0), 3);
const owner = `${Math.floor(summit / 12)},1`;
const vertices = resident.get(owner);
assert(vertices?.length);
assert(vertices.some((x, i) => i % 6 === 0 && x >= summit && x <= summit + 1 &&
  vertices[i + 1] === 13 && vertices[i + 2] >= 15 && vertices[i + 2] <= 16),
  'the actual rendered summit agrees with the player-facing surface');
move(2, 16, 88.30, -1, 700);
assert.equal(frame[25], 1);
assert.equal(frame[39] & 2, 2, 'descent preserves the regulator after the summit streams out');
assert(!resident.has(owner));
assert.equal(start(726), summit);
