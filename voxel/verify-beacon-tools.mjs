import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const module = new WebAssembly.Module(readFileSync(process.argv[2]));

for (const aspect of [.56, 1.67]) {
  let game, frame, mesh, hit, uploads = 0;
  game = new WebAssembly.Instance(module, {
    showcase: {
      atlas() {}, mesh() {}, water() {}, outline() {}, aim() {},
      frame(pointer, target) {
        frame = new Float32Array(game.memory.buffer, pointer, 37).slice();
        hit = target;
      },
      player(pointer, count) {
        mesh = new Float32Array(game.memory.buffer, pointer, count * 6).slice();
        uploads++;
      },
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
  }).exports;
  const tick = (dt = .05) => game.tick(dt, aspect, 1);
  const arm = () => {
    assert.equal(mesh.length, 396 * 6);
    let z = 0;
    for (let i = 6 * 36; i < 7 * 36; i++) z += mesh[i * 6 + 2];
    return z / 36;
  };

  game._start();
  assert(game.start_beacon() > 0);
  tick(0);
  const eyeY = frame[17], eyeZ = frame[18];
  const pitch = Math.atan2(5 - eyeY, eyeZ - 40.5);
  game.look(0, (frame[19] - pitch) / .0034);
  assert.equal(game.cycle_camera(), 1);
  tick();
  assert.equal((hit >>> 6) & 15, 4);
  const neutral = arm();
  const stock = frame[28];
  assert.equal(game.edit_control(0, 2), -4, 'the protected floor rejects mining');
  const rejected = uploads;
  tick();
  assert.equal(uploads, rejected, 'rejected edits do not animate or upload a new body');
  assert.equal(game.edit_control(1, 2), 1);
  tick();
  assert.equal(frame[28], stock - 1);
  assert(arm() < neutral - .055, 'placing reaches forward with the actual right hand');
  for (let i = 0; i < 8; i++) tick();
  assert(Math.abs(arm() - neutral) < .001, 'the place gesture settles into the original standing mesh');

  assert.equal((hit >>> 6) & 15, 5);
  const topPitch = Math.atan2(6 - eyeY, eyeZ - 40.5);
  game.look(0, (frame[19] - topPitch) / .0034);
  tick(0);
  assert.equal((hit >>> 16) & 7, 3, 'aim at the first plank top face');
  assert.equal(game.edit_control(1, 2), 1, 'stack a second real plank on that top face');
  for (let i = 0; i < 8; i++) tick();
  assert.equal((hit >>> 6) & 15, 6);
  assert.equal(game.edit_control(0, 1), 1, 'hold the normal break input');
  tick();
  assert(arm() > neutral + .055, 'breaking first pulls the hand back');
  for (let i = 0; i < 2; i++) tick();
  assert(arm() < neutral - .12, 'the following strike actually swings the hand forward');
  let lastLayer = (hit >>> 6) & 15;
  assert.equal(lastLayer, 5);
  game.look(0, (frame[19] - pitch) / .0034);
  tick(0);
  let sawRepeatedStrike = false;
  for (let i = 0; i < 20; i++) {
    tick();
    lastLayer = (hit >>> 6) & 15;
    if (lastLayer === 4 && arm() < neutral - .12) sawRepeatedStrike = true;
  }
  assert.equal(lastLayer, 4, 'the held input genuinely repeats through the second plank');
  assert(sawRepeatedStrike, 'a later successful held edit still shows a visible strike');
  assert.equal(frame[28], stock - 2, 'break motion does not grant uncollected wood');
  assert(Math.abs(arm() - neutral) < .001, 'the failed held attempts do not keep the arm animated');
  const completed = uploads;
  for (let i = 0; i < 8; i++) tick();
  assert.equal(uploads, completed, 'continued rejected repeats do not rebuild the avatar');
  assert.equal(game.edit_control(0, 0), 0);
}
