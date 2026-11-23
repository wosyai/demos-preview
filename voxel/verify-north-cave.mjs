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
const move = (button, lane, goal, direction, cap = 450) => {
  engine.control(button, 1);
  for (let i = 0; i < cap && (goal - frame[lane]) * direction > 0 && frame[25] === 1; i++) tick();
  engine.control(button, 0);
  assert((goal - frame[lane]) * direction < .03, 'reach waypoint by ordinary controls: ' + goal + ' @ ' + frame.slice(16, 19));
};
const jumpNorth = (goal) => {
  engine.control(4, 1);
  move(0, 18, goal, -1, 55);
  engine.control(4, 0);
  idle(16);
};
const start = (seed) => {
  engine.generate(seed);
  assert(engine.start_archipelago_lighthouse() > 0);
  tick(0);
  assert.equal(frame[39], 0);
  const site = Math.floor(frame[41]);
  assert(site >= -80 && site <= -48, 'lens is beyond the authored north shore');
  for (let z = -1; z >= site; z--) {
    assert.notEqual(engine.terrain_material(28, 4, z), 0, 'the connection has a continuous dry walking floor');
    for (let y = 5; y <= 8; y++) assert.equal(engine.terrain_material(28, y, z), 0, 'the approach and cave have real head clearance');
  }
  assert.notEqual(engine.terrain_material(28, 9, site), 0, 'the lens lies below a real roof');
  assert.notEqual(engine.terrain_material(26, 6, site - 7), 0, 'the rear wall closes the cave behind the lens');
  return site;
};

const sites = [-1, 0, 1, 42, 471, 726, 17107].map(start);
assert(new Set(sites).size >= 3, 'diverse signed seeds select physically different world chunks');
const site = start(726);
assert.equal(site, sites[5], 'restarting reproduces the same cave after visiting other seeds');

move(0, 18, 33.32, -1);
move(3, 16, 38.45, 1);
move(0, 18, 27.32, -1);
jumpNorth(26.48);
move(0, 18, 24.32, -1);
jumpNorth(23.52);
move(0, 18, 16.40, -1);
move(2, 16, 28.55, -1);
move(0, 18, 3.32, -1);
engine.control(6, 1);
jumpNorth(-.35);
engine.control(6, 0);
assert(Math.floor(frame[18]) === -1 && Math.abs(frame[17] - 6.62) < .05);
move(0, 18, site + 9.1, -1);
assert.equal(frame[39] & 1, 0, 'approaching the actual mouth is not enough to collect the lens');
move(0, 18, site + .55, -1);
assert.equal(frame[39] & 1, 1, 'walking beneath the roof reaches the real lens');
assert.equal(engine.terrain_ray_face(28.5, 7.5, site + .5, 0, 1, 0), 2);
const caveChunk = `2,${Math.floor(site / 12)}`;
const caveMesh = resident.get(caveChunk);
assert(caveMesh && caveMesh.length > 0);
let ceilingGeometry = false;
for (let i = 0; i < caveMesh.length; i += 6) {
  if (caveMesh[i] >= 28 && caveMesh[i] <= 29 && caveMesh[i + 1] === 9 &&
      caveMesh[i + 2] >= site && caveMesh[i + 2] <= site + 1) ceilingGeometry = true;
}
assert(ceilingGeometry, 'rendered terrain and collision share the actual cave ceiling');
move(1, 18, -5, 1, 650);
assert.equal(frame[25], 1);
assert.equal(frame[39] & 1, 1, 'the lens remains held when walking out of the cave');
assert(!resident.has(caveChunk), 'lens ownership survives actual signed cave eviction');
assert.equal(start(726), site);
