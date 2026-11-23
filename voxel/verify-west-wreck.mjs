import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));
const resident = new Map();
let engine, frame;
engine = new WebAssembly.Instance(wasm, {
  showcase: {
    horizon() {},
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
const move = (button, lane, goal, direction, cap = 400, pulse = false) => {
  engine.control(button, 1);
  for (let i = 0; i < cap && (goal - frame[lane]) * direction > 0 && frame[25] === 1; i++) {
    if (pulse && i % 12 === 0) engine.pulse_control(4);
    tick();
  }
  engine.control(button, 0);
  assert((goal - frame[lane]) * direction < .03, 'reach waypoint by normal controls: ' + goal + ' @ ' + frame.slice(16, 19));
};
const top = (x) => {
  for (let y = 15; y >= 0; y--) if (engine.terrain_material(x, y, 33)) return y;
  return -1;
};
const start = (seed) => {
  engine.generate(seed);
  assert(engine.start_archipelago_lighthouse() > 0);
  tick(0);
  const wreck = Math.floor(frame[43]);
  assert(wreck >= -80 && wreck <= -48, 'the wreck is physically beyond the western coastline');
  assert.deepEqual([-1, 0, 1, 2, 3, 4].map(top), [2, 2, 3, 4, 4, 4],
    'the authored shore has a real gradual exit from the west sandbar');
  let height = top(-1);
  assert.equal(height, 2, 'the access bar starts as a wadeable shallow');
  for (let x = -2; x >= wreck; x--) {
    const next = top(x);
    assert(next >= height && next <= height + 1, 'the sandbar and gangway rise without inaccessible jumps');
    height = next;
  }
  assert.equal(height, 5);
  assert.equal(engine.terrain_material(wreck, 5, 33), 5, 'the item is on a wooden deck');
  assert.equal(engine.terrain_material(wreck - 3, 10, 35), 5, 'the off-lane mast stands above the deck');
  assert.equal(engine.terrain_material(wreck - 2, 8, 35), 4, 'the torn sail is separate from the wooden spar');
  return wreck;
};
const sites = [-1, 0, 1, 42, 471, 726, 17107].map(start);
assert(new Set(sites).size >= 3, 'representative signed seeds move the actual wreck');
const wreck = start(726);
assert.equal(wreck, sites[5]);

move(0, 18, 33.40, -1);
move(2, 16, 8.50, -1);
move(2, 16, wreck + 8.5, -1, 700, true);
assert.equal(frame[39] & 4, 0, 'approaching the wreck is not enough to recover its part');
move(2, 16, wreck + .48, -1, 400, true);
idle(18);
assert.equal(frame[39] & 4, 4, 'ordinary wading, boarding and walking on the wreck collects the igniter');
assert(Math.abs(frame[17] - 7.62) < .05);
assert.equal(engine.terrain_ray_face(wreck + .5, 9.5, 33.5, 0, -1, 0), 3);
const mastX = wreck - 3;
const owner = `${Math.floor(mastX / 12)},2`;
const vertices = resident.get(owner);
assert(vertices?.length);
assert(vertices.some((x, i) => i % 6 === 0 && x >= mastX && x <= mastX + 1 &&
  vertices[i + 1] === 11 && vertices[i + 2] >= 35 && vertices[i + 2] <= 36 &&
  Math.floor(vertices[i + 3] * 8) === 6), 'the real rendered mast has a visible wooden top face');

move(3, 16, 8.50, 1, 800, true);
assert.equal(frame[25], 1);
assert.equal(frame[39] & 4, 4, 'returning to shore preserves the part after stream eviction');
assert(!resident.has(owner));
assert.equal(start(726), wreck);
