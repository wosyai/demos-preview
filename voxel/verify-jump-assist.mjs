import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const module = new WebAssembly.Module(readFileSync(process.argv[2]));
for (const dt of [1 / 120, 1 / 30]) {
  let engine, f;
  engine = new WebAssembly.Instance(module, {
    showcase: {
      horizon() {}, aim() {}, atlas() {}, mesh() {}, outline() {}, water() {}, player() {},
      frame(pointer) { f = Array.from(new Float32Array(engine.memory.buffer, pointer, 46)); },
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exit ' + code); } },
  }).exports;
  engine._start();
  // Isolated two-height stone shelf centered on the ordinary sandbox spawn.
  for (let y = 0; y < 16; y++) for (let z = 0; z < 48; z++) for (let x = 0; x < 48; x++) engine.edit(x, y, z, 0);
  for (let z = 8; z < 23; z++) for (let x = 8; x < 18; x++) {
    engine.edit(x, 4, z, 3);
    if (z >= 14) engine.edit(x, 6, z, 3);
  }
  engine.rebuild();
  const tick = () => engine.tick(dt, 1.6, 1);
  const setup = () => {
    engine.reset_camera();
    engine.look(.72664234 / .0034, -.1 / .0034);
    tick();
    assert.equal(f[23], 1);
    assert(f[17] > 8 && f[18] > 14);
  };
  function leaveLedge() {
    setup();
    engine.control(0, 1);
    for (let i = 0; i < Math.ceil(2 / dt) && f[23] === 1; i++) tick();
    engine.control(0, 0);
    assert.equal(f[23], 0);
    assert(f[18] < 13.72, 'actually walked beyond the shelf');
  }
  leaveLedge();
  const edgeY = f[17];
  engine.pulse_control(4);
  tick();
  assert(f[17] > edgeY, 'a tap just after leaving support should still jump');
  leaveLedge();
  for (let i = 0; i < Math.ceil(.15 / dt); i++) tick();
  const fallY = f[17];
  assert.equal(f[23], 0);
  engine.pulse_control(4);
  tick();
  assert(f[17] < fallY, 'coyote grace should expire before an airborne tap');

  setup();
  engine.pulse_control(4);
  tick();
  assert.equal(f[23], 0);
  let landing = 1;
  while (f[23] === 0 && landing < Math.ceil(2 / dt)) { tick(); landing++; }
  assert.equal(f[23], 1);
  const floorY = f[17];
  setup();
  engine.pulse_control(4);
  const early = Math.max(1, Math.round(.063 / dt));
  for (let i = 0; i < landing - early; i++) tick();
  assert.equal(f[23], 0);
  engine.pulse_control(4);
  for (let i = 0; i < early + Math.ceil(.12 / dt); i++) tick();
  assert(f[17] > floorY + .50 && f[23] === 0, 'a landing-buffered tap should launch once on contact');
  for (let i = 0; i < Math.ceil(1.1 / dt); i++) tick();
  assert.equal(f[23], 1, 'the consumed buffer cannot keep auto-hopping');
  assert(Math.abs(f[44] - 2.55) < .001 && f[45] === 0, 'render frame carries the real sandbox tide and no beacon glow');
  console.log(`${Math.round(1 / dt)} Hz: edge grace, expiry, landing buffer, and single jump passed`);
}
