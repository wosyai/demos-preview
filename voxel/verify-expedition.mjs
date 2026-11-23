import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));
let engine, frame;
let horizon, horizonPublications = 0;
const resident = new Map();
const visibleParts = new Map();
const emission = [1.31, 1.45, 1.64];
engine = new WebAssembly.Instance(wasm, {
  showcase: {
    horizon(pointer, count) {
      assert(count <= 5400 && count % 6 === 0, 'coarse terrain has a fixed budget and whole tiles');
      horizon = Array.from(new Float32Array(engine.memory.buffer, pointer, count * 6));
      horizonPublications++;
    },
    aim() {}, atlas() {}, outline() {}, player() {}, water() {},
    mesh(pointer, count, x, z) {
      const key = `${x},${z}`;
      visibleParts.delete(key);
      if (!count) resident.delete(key);
      else {
        resident.set(key, createHash('sha256')
          .update(new Uint8Array(engine.memory.buffer, pointer, count * 24)).digest('hex'));
        const vertices = new Float32Array(engine.memory.buffer, pointer, count * 6);
        const parts = [];
        for (let i = 0; i < vertices.length; i += 6) {
          if (vertices[i + 5] <= 1) continue;
          const part = emission.findIndex((light) => Math.abs(vertices[i + 5] - light) < .005);
          if (part >= 0) parts.push([part, vertices[i], vertices[i + 1], vertices[i + 2]]);
        }
        if (parts.length) visibleParts.set(key, parts);
      }
    },
    frame(pointer) { frame = Array.from(new Float32Array(engine.memory.buffer, pointer, 44)); },
  },
  wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
}).exports;
engine._start();

const tick = (dt = .05) => engine.tick(dt, 1, 1);
const settle = (count = 16) => { for (let i = 0; i < count; i++) tick(); };
const move = (button, lane, goal, pulse = false, cap = 900) => {
  const sign = button === 1 || button === 3 ? 1 : -1;
  engine.control(button, 1);
  for (let i = 0; i < cap && (goal - frame[lane]) * sign > 0 && frame[25] === 1; i++) {
    if (pulse && i % 12 === 0) engine.pulse_control(4);
    tick();
  }
  engine.control(button, 0);
  assert((goal - frame[lane]) * sign < .03, 'walk or swim to ' + goal + ' @ ' + frame.slice(16, 19));
};
const north = (z) => move(0, 18, z);
const south = (z) => move(1, 18, z);
const west = (x, pulse = false) => move(2, 16, x, pulse);
const east = (x, pulse = false) => move(3, 16, x, pulse);
const jump = (button, lane, goal, sprint = false) => {
  if (sprint) engine.control(6, 1);
  engine.pulse_control(4);
  move(button, lane, goal, false, 55);
  engine.control(6, 0);
  settle();
};
const aimNorth = (y, z) => {
  const pitch = Math.atan2(y - frame[17], frame[18] - z);
  engine.look(0, (frame[19] - pitch) / .0034);
  tick(0);
};

const expectPart = (part, x, surface, z, count) => {
  const key = `${Math.floor(x / 12)},${Math.floor(z / 12)}`;
  const found = (visibleParts.get(key) ?? []).filter(([kind]) => kind === part);
  assert.equal(found.length, count, 'the renderer receives exactly the visible vertices for part ' + part);
  for (const [kind, vx, vy, vz] of found) {
    assert.equal(kind, part);
    assert(Math.abs(vx - x) < .45 && vy > surface && vy < surface + .9 && Math.abs(vz - z) < .45,
      'the emitted geometry is supported at the exact Wosy pickup location');
  }
};

const start = (seed) => {
  engine.generate(seed);
  assert(engine.start_archipelago_lighthouse() > 0);
  tick(0);
  assert.equal(frame[25], 1);
  assert.equal(frame[39], 0);
  assert(resident.size <= 25, 'horizon does not grow the full-resolution terrain residency');
  assert.equal(horizon.length, 5400 * 6);
  const heights = new Set();
  let far = 0, aboveTide = false;
  for (let i = 0; i < horizon.length; i += 6) {
    const [x, y, z] = horizon.slice(i, i + 3);
    assert(Number.isFinite(y) && x % 6 === 0 && z % 6 === 0, 'horizon terrain uses the same world grid');
    const distance = Math.hypot(x - frame[37], z - frame[38]);
    far = Math.max(distance, far);
    if (distance >= 35 && distance <= 62) {
      heights.add(Math.round(y));
      if (y > 7) aboveTide = true;
    }
  }
  assert(far > 80 && heights.size > 4 && aboveTide, 'real seeded land forms are present beyond mesh detail');
  const beforeStationary = horizonPublications;
  tick();
  tick();
  assert.equal(horizonPublications, beforeStationary, 'stationary frames do not regenerate or reupload coarse geometry');
  assert(frame[40] >= 0 && Math.hypot(frame[35], frame[36]) > 0);
  const [cave, summit, wreck] = frame.slice(41, 44).map(Math.floor);
  assert(cave <= -48 && summit >= 124 && wreck <= -48);
  return { cave, summit, wreck };
};

const buildCrossing = () => {
  north(30.52);
  for (const piling of [28, 26, 24, 22, 20, 18]) {
    aimNorth(4, piling + .50);
    assert.equal(engine.place_selected(), 1);
    aimNorth(4.5, piling + 1);
    assert.equal(engine.place_selected(), 1);
    north(piling + .55);
  }
  south(33.40);
};
const turnNorthBank = () => {
  north(16.48);
  assert(frame[17] > 6.5);
};
const returnHarbor = () => {
  south(33.40);
  assert(frame[17] > 6.5);
};
const recoverLens = (site, verifyEdit) => {
  turnNorthBank();
  east(28.55);
  north(3.32);
  jump(0, 18, -.35, true);
  north(site + 2.35);
  assert.equal(frame[39] & 1, 0);
  expectPart(0, 28.5, 5, site + .5, 36);
  north(site + .55);
  assert.equal(frame[39] & 1, 1);
  expectPart(0, 28.5, 5, site + .5, 0);
  assert(Math.abs(frame[17] - 6.62) < .06);
  if (verifyEdit) {
    const owner = `2,${Math.floor(site / 12)}`;
    const baseline = resident.get(owner);
    assert(baseline);
    assert.equal(engine.terrain_material(29, 5, site), 0);
    assert.equal(engine.edit(29, 5, site, 5), 1);
    const edited = resident.get(owner);
    assert.notEqual(edited, baseline);
    south(-5.1);
    assert(!resident.has(owner));
    assert.equal(engine.terrain_material(29, 5, site), 5);
    north(site + .55);
    assert.equal(resident.get(owner), edited, 'the actual streamed mesh recovers the prior edit');
    assert.equal(frame[39] & 1, 1);
    expectPart(0, 28.5, 5, site + .5, 0);
  }
  south(-.38);
  jump(1, 18, 3.55, true);
  south(9.45);
  west(24.45);
  returnHarbor();
};
const recoverRegulator = (site) => {
  turnNorthBank();
  north(11.5);
  east(40.1);
  south(14.35);
  east(46.15);
  for (const landing of [50.15, 55.15, 60.15, 64.15]) jump(3, 16, landing, true);
  east(66.05);
  south(15.38);
  east(site - 1.7, true);
  assert.equal(frame[39] & 2, 0);
  expectPart(1, site + .5, 13, 15.5, 108);
  east(site + .55, true);
  settle();
  assert.equal(frame[39] & 2, 2);
  expectPart(1, site + .5, 13, 15.5, 0);
  assert(Math.abs(frame[17] - 14.62) < .06);
  const stepsFromSea = [88, 87, 86, 85, 84].map((x) => {
    for (let y = 5; y >= 0; y--) if (engine.terrain_material(x, y, 15)) return y;
    return -1;
  });
  assert.deepEqual(stepsFromSea, [0, 1, 2, 3, 4], 'the real return shore rises above the water one step at a time');
  west(62.45, true);
  for (const [launch, landing] of [[62.45, 59.45], [57.45, 54.45], [52.45, 49.45], [48.45, 45.45], [44.45, 42.45]]) {
    west(launch);
    jump(2, 16, landing, true);
  }
  west(39.5);
  north(11.5);
  west(24.45);
  returnHarbor();
};
const recoverIgniter = (site) => {
  west(8.50);
  west(site + 2.35, true);
  assert.equal(frame[39] & 4, 0);
  expectPart(2, site + .5, 6, 33.5, 144);
  west(site + .48, true);
  settle();
  assert.equal(frame[39] & 4, 4);
  expectPart(2, site + .5, 6, 33.5, 0);
  assert(Math.abs(frame[17] - 7.62) < .06);
  east(24.47, true);
};
const finish = () => {
  assert.equal(frame[39], 7);
  assert.equal(frame[40], -1);
  turnNorthBank();
  north(8.31);
  jump(0, 18, 7.16);
  north(5.95);
  assert.equal(frame[25], 2, 'all three far-world parts restore the physical lighthouse');
  assert.equal(engine.terrain_material(24, 14, 4), 8);
};

const first = start(726);
buildCrossing();
const beforeWest = horizonPublications;
recoverIgniter(first.wreck);
assert(horizonPublications > beforeWest, 'crossing a world chunk updates the horizon');
assert.equal(frame[39], 4);
recoverLens(first.cave, true);
assert.equal(frame[39], 5);
recoverRegulator(first.summit);
finish();
const second = start(17107);
assert.notDeepEqual(second, first);
buildCrossing();
recoverRegulator(second.summit);
assert.equal(frame[39], 2);
recoverIgniter(second.wreck);
assert.equal(frame[39], 6);
recoverLens(second.cave, false);
finish();
assert.deepEqual(start(726), first);
assert.equal(engine.terrain_material(29, 5, first.cave), 0, 'an explicit restart clears the previous run edit');
