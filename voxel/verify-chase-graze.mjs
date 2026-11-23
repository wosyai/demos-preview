import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const binary = new WebAssembly.Module(readFileSync(process.argv[2]));
let engine, frame, hit, avatar;
engine = new WebAssembly.Instance(binary, {
  showcase: {
    aim() {}, atlas() {}, horizon() {}, mesh() {}, outline() {}, water() {},
    player(_, count) { avatar = count; },
    frame(pointer, target) {
      frame = Array.from(new Float32Array(engine.memory.buffer, pointer, 44));
      hit = target;
    },
  },
  wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
}).exports;

engine._start();
engine.generate(42);
engine.reset_camera();
engine.look(0.72664234 / .0034, -.10 / .0034);
engine.pulse_control(7);
engine.tick(.02, 1, 1);
const eye = frame.slice(16, 19);
const [ix, iy, iz] = eye.map(Math.floor);
for (let x = ix - 3; x <= ix + 8; x++) {
  for (let z = iz - 2; z <= iz + 5; z++) {
    for (let y = iy - 1; y <= iy + 3; y++) engine.edit(x, y, z, 0);
  }
}
for (let x = ix + 2; x <= ix + 4; x++) {
  for (let y = iy - 1; y <= iy + 2; y++) assert.equal(engine.edit(x, y, iz + 2, 3), 1);
}
assert.equal(engine.cycle_camera(), 1);
engine.tick(0, 1, 1);
const distance = () => Math.hypot(frame[16] - frame[37], frame[17] - eye[1], frame[18] - frame[38]);
const open = distance();
let last = open, largestPull = 0, avatarTransitions = 0, lastAvatar = avatar;
let beforeCorner;
engine.control(3, 1);
for (let i = 0; i < 84; i++) {
  engine.tick(1 / 60, 1, 1);
  const boom = distance();
  largestPull = Math.max(largestPull, last - boom);
  last = boom;
  if (avatar !== lastAvatar) { avatarTransitions++; lastAvatar = avatar; }
  if (i === 7) beforeCorner = boom;
  if (frame[37] >= ix + 2 && frame[37] <= ix + 4) {
    assert(frame[18] < iz + 1.95, 'the camera stands on the player side of the solid rear wall');
    assert(boom < 2, 'the boom remains compressed until the opposite corner');
  }
  assert.equal(hit, -1, 'side stepping past a rear wall does not select the obstruction');
}
engine.control(3, 0);
assert(beforeCorner < open - .9, 'the chase camera anticipates a corner instead of jumping on the contact frame');
assert(largestPull < 1, 'lateral graze does not snap the chase camera inward multiple blocks');
assert(avatarTransitions === 2, 'avatar hides and reappears once each, rather than flickering');
assert(distance() > 4, 'the camera recovers to a useful over-shoulder framing after the corner');
