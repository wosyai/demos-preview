import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const module = new WebAssembly.Module(readFileSync(process.argv[2] ?? new URL('engine.wasm', import.meta.url)));

for (const aspect of [.53, 1.65]) {
  for (const degrees of [1, 5]) {
    let frame, engine;
    engine = new WebAssembly.Instance(module, {
      showcase: {
        aim() {}, atlas() {}, horizon() {}, mesh() {}, outline() {}, player() {}, water() {},
        frame(pointer) { frame = new Float32Array(engine.memory.buffer, pointer, 44).slice(); },
      },
      wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
    }).exports;

    const tick = (step = 1 / 60) => engine.tick(step, aspect, 1);
    const eye = () => frame.slice(16, 19);
    const boom = () => Math.hypot(frame[16] - frame[37], frame[18] - frame[38]);
    engine._start();
    engine.generate(42);
    engine.reset_camera();
    engine.look(0, -.10 / .0034);
    engine.pulse_control(7);
    tick(.02);
    const [ix, iy, iz] = eye().map(Math.floor);
    for (let x = ix - 5; x <= ix + 5; x++) {
      for (let z = iz - 5; z <= iz + 5; z++) {
        for (let y = iy - 1; y <= iy + 3; y++) engine.edit(x, y, z, 0);
      }
    }
    for (let y = iy - 1; y <= iy + 3; y++) assert.equal(engine.edit(ix + 1, y, iz + 1, 3), 1);
    engine.look(Math.PI / .0034, 0);
    assert.equal(engine.cycle_camera(), 1);
    for (let i = 0; i < 30; i++) tick();
    const open = boom(), player = frame.slice(37, 39);
    assert(open > 4);
    let previous = open, largestPull = 0, shortest = open;
    for (let i = 0; i < 360 / degrees; i++) {
      engine.look(degrees * Math.PI / 180 / .0034, 0);
      tick();
      assert.deepEqual(frame.slice(37, 39), player, 'look never moves the player');
      const [x, y, z] = eye();
      assert([x, y, z].every(Number.isFinite));
      assert(!(x > ix + 1 && x < ix + 2 && z > iz + 1 && z < iz + 2 && y > iy - 1 && y < iy + 4),
        'the camera never penetrates the wall column');
      const current = boom();
      largestPull = Math.max(previous - current, largestPull);
      shortest = Math.min(shortest, current);
      previous = current;
      const held = eye();
      tick(0);
      assert.deepEqual(eye(), held, 'an inactive frame does not consume chase interpolation');
    }
    assert(shortest < 1.6, 'looking around really encounters the obstruction');
    if (degrees === 1) assert(largestPull < 1.2, `aspect ${aspect}: the slow orbit snapped inward by ${largestPull} blocks`);
    for (let i = 0; i < 90; i++) tick();
    assert(boom() > open - .1, 'normal chase framing returns after clearing the column');
    const idleBoom = boom();
    engine.look(Math.PI / 180 / .0034, 0);
    tick(1e-42);
    assert(frame.every(Number.isFinite), 'subnormal frame time still publishes a finite camera');
    assert.deepEqual(frame.slice(37, 39), player, 'the subnormal frame does not move the player');
    assert(Math.abs(boom() - idleBoom) < .0001, 'the subnormal frame does not advance chase interpolation');
  }
}

console.log('Pocket Island: stationary orbit near a wall, fast turning and recovery passed on mobile and desktop.');
