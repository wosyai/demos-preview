import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));
let engine, frame;
engine = new WebAssembly.Instance(wasm, {
  showcase: {
    horizon() {},
    aim() {}, atlas() {}, mesh() {}, outline() {}, player() {}, water() {},
    frame(pointer) { frame = Array.from(new Float32Array(engine.memory.buffer, pointer, 44)); },
  },
  wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
}).exports;
engine._start();
const tick = (dt = 0.05) => engine.tick(dt, 1, 1);
const steps = (count) => { for (let i = 0; i < count; i++) tick(); };
const start = (seed) => {
  engine.generate(seed);
  assert(engine.start_lighthouse() > 0);
  tick(0);
  assert.equal(frame[25], 1);
  assert.equal(frame[39], 0, 'a new expedition starts with no parts');
  assert(frame[40] >= 0 && frame[40] < 3 && Math.hypot(frame[35], frame[36]) > 0,
    'the Wosy engine publishes a readonly heading to an uncollected landmark');
  return frame.slice(41, 44);
};
const move = (button, lane, goal, direction, cap = 200) => {
  engine.control(button, 1);
  for (let i = 0; i < cap && (goal - frame[lane]) * direction > 0 && frame[25] === 1; i++) tick();
  engine.control(button, 0);
  assert((goal - frame[lane]) * direction <= .02, 'reach waypoint using normal controls: ' + goal + ' @ ' + frame.slice(16, 19));
};
const jumpNorth = (goal) => {
  engine.control(4, 1);
  move(0, 18, goal, -1, 35);
  engine.control(4, 0);
  steps(14);
};

const markers = start(726);
const alternate = start(726 + 16381);
assert.notDeepEqual(alternate, markers, 'formerly aliased seeds influence real reachable landmark coordinates');
const samples = [0, 1, 42, 471, -1, -2147483648, 2147483647].map(start);
assert(new Set(samples.map((sample) => JSON.stringify(sample))).size >= 6, 'diverse signed seeds produce diverse landmark coordinates');
assert.deepEqual(start(726), markers, 'retrying the same seed reproduces the actual landmarks');

const ridge = () => {
  move(3, 16, 38.45, 1);
  move(0, 18, 28.0, -1);
  const regulator = frame[39];
  move(0, 18, 27.32, -1);
  jumpNorth(26.48);
  move(0, 18, 24.32, -1);
  jumpNorth(23.52);
  move(0, 18, 16.40, -1);
  move(2, 16, 24.54, -1);
  return regulator;
};
const enterLamp = () => {
  move(0, 18, 8.31, -1);
  jumpNorth(7.16);
  move(0, 18, 5.95, -1);
};
const coastLens = () => {
  move(2, 16, 12.20, -1);
  move(3, 16, 24.40, 1);
};

steps(2300);
assert.equal(frame[25], 1, 'waiting through a tide cycle does not silently end an expedition');
move(0, 18, 33.32, -1);
assert.equal(ridge(), 2, 'the eastern regulator can be collected first');
move(0, 18, 9.45, -1);
assert.equal(frame[39], 6, 'the north-bank igniter can be collected second');
enterLamp();
assert.equal(frame[25], 1, 'the lighthouse refuses to restore with a missing part');
move(1, 18, 9.45, 1);
coastLens();
assert.equal(frame[39], 7, 'ordinary west-cliff walking collects the last part');
assert.equal(frame[40], -1);
enterLamp();
assert.equal(frame[25], 2, 'the first expedition restores the lamp after all components');
assert.deepEqual(start(726), markers, 'explicit restart clears progress but not same-seed landmark placement');

assert.deepEqual(start(726 + 16381), alternate);
const aimNorth = (y, z) => {
  const pitch = Math.atan2(y - frame[17], frame[18] - z);
  engine.look(0, (frame[19] - pitch) / .0034);
  tick(0);
};
move(0, 18, 30.52, -1);
for (const piling of [28, 26, 24, 22, 20, 18]) {
  aimNorth(4, piling + .50);
  assert.equal(engine.place_selected(), 1, 'extend the surface above the next piling');
  aimNorth(4.5, piling + 1);
  assert.equal(engine.place_selected(), 1, 'place a bridge block using ordinary aimed controls');
  move(0, 18, piling + .55, -1);
}
move(0, 18, 9.45, -1);
assert.equal(frame[39], 4, 'an ordinary player-built crossing reaches the igniter first');
coastLens();
assert.equal(frame[39], 5, 'the lens is second in the alternate expedition');
move(1, 18, 33.40, 1);
assert.equal(ridge(), 7, 'the alternate expedition can collect the regulator last');
move(0, 18, 9.45, -1);
assert.equal(frame[40], -1);
enterLamp();
assert.equal(frame[25], 2, 'the second seed and collection order also restore the same lighthouse');
