import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));
const close = (a, b) => Math.abs(a - b) < .015;

for (const aspect of [.56, 1.67]) {
  let game, hud, hit, yaw = 0;
  game = new WebAssembly.Instance(wasm, {
    showcase: {
      aim() {}, atlas() {}, mesh() {}, outline() {}, player() {}, water() {},
      frame(pointer, target) {
        hud = Array.from(new Float32Array(game.memory.buffer, pointer, 35));
        hit = target;
      },
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
  }).exports;
  game._start();
  assert(game.start_beacon() > 0);
  const tick = (dt = 0) => game.tick(dt, aspect, 1);
  const aimAt = (x, y, z) => {
    const dx = x - hud[16], dz = hud[18] - z;
    const nextYaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(y - hud[17], Math.hypot(dx, dz));
    game.look((nextYaw - yaw) / .0034, (hud[19] - pitch) / .0034);
    yaw = nextYaw;
    tick();
  };
  const faceNorth = () => {
    game.look(-yaw / .0034, hud[19] / .0034);
    yaw = 0;
    tick();
  };
  const walk = (control, axis, limit, sign) => {
    game.control(control, 1);
    for (let i = 0; i < 100 && (limit - hud[axis]) * sign > 0; i++) tick(.05);
    game.control(control, 0);
    assert((limit - hud[axis]) * sign <= 0 && hud[25] === 1);
  };
  tick();
  assert.deepEqual(hud.slice(25, 31), [1, 1, 0, 12, 0, 1]);
  assert.deepEqual(hud.slice(31, 34).map(Math.floor), [23, 5, 40]);
  assert.equal(hud[34], 0, 'guide does not highlight an edit when the actual reticle misses');

  aimAt(25.5, 5, 40.5);
  assert.deepEqual([hit & 63, (hit >>> 6) & 15, (hit >>> 10) & 63], [25, 4, 40]);
  assert.equal(game.edit_control(1, 2), 1, 'build an unrelated timber using normal stock');
  tick();
  assert.equal(hud[30], 1);
  assert.equal(hud[28], 11);

  aimAt(23.5, 5.55, 40.999);
  assert.deepEqual([hit & 63, (hit >>> 6) & 15, (hit >>> 10) & 63], [23, 5, 40]);
  assert.equal(hud[34], 1);
  assert.equal(game.edit_control(0, 2), 1, 'ordinary Break on the marked real timber');
  tick();
  assert.equal(hud[30], 2);
  assert.equal(hud[28], 11, 'the guide grants no stock');
  assert(hud.slice(31, 34).every((value, index) => close(value, [23.5, 5.14, 40.5][index])));
  aimAt(25.5, 5.55, 40.999);
  assert.deepEqual([hit & 63, (hit >>> 6) & 15, (hit >>> 10) & 63], [25, 5, 40]);
  assert.equal(game.edit_control(0, 2), 1, 'break the unrelated timber while the guide follows the first drop');
  tick();
  assert.equal(hud[28], 11);

  faceNorth();
  walk(3, 16, 25.45, 1);
  walk(0, 18, 41.13, -1);
  assert.equal(hud[28], 12, 'walking to the unrelated drop restores the stock spent on it');
  assert.equal(hud[30], 2, 'the unrelated pickup does not advance the guide');
  assert(hud.slice(31, 34).every((value, index) => close(value, [23.5, 5.14, 40.5][index])));
  walk(2, 16, 23.75, -1);
  assert.equal(hud[28], 13, 'only approaching the first marked drop advances the guide');
  assert.equal(hud[30], 3);
  assert.deepEqual(hud.slice(31, 34).map(Math.floor), [24, 4, 28]);
  assert.equal(hud[34], 0, 'the distant bridge is not ready yet');

  walk(3, 16, 24.4, 1);
  walk(0, 18, 30.52, -1);
  aimAt(hud[16], 4, 28.5);
  assert.equal(hud[34], 1, 'the real reticle can legally place the marked bridge plank');
  assert.equal(game.edit_control(1, 2), 1);
  tick();
  assert.equal(hud[30], 0, 'placing the actual bridge plank dismisses the optional hint');
  assert.equal(hud[28], 12, 'ordinary building spends a real collected unit');
  assert.equal(hud[29], 0, 'teaching does not invent a mission stage or award progress');
  aimAt(hud[16], 4.5, 29);
  assert.equal(game.edit_control(1, 2), 1);
  walk(0, 18, 28.65, -1);
  assert.equal(hud[23], 1);
  assert(close(hud[17], 6.62) && hud[26] === 1, 'ordinary built bridge supports a real dry crossing');
}
