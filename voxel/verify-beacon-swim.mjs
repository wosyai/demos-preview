import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));

for (const aspect of [.56, 1.67]) {
  let engine, hud, sea, avatar = new Float32Array(), uploads = 0;
  engine = new WebAssembly.Instance(wasm, {
    showcase: {
      horizon() {},
      aim() {}, atlas() {}, mesh() {}, outline() {},
      water(pointer, count) { sea = { pointer, count }; },
      player(pointer, count) {
        uploads++;
        avatar = new Float32Array(engine.memory.buffer, pointer, count * 6).slice();
      },
      frame(pointer) { hud = Array.from(new Float32Array(engine.memory.buffer, pointer, 35)); },
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
  }).exports;
  engine._start();
  assert(engine.start_beacon() > 0);
  const tick = (dt = .05) => engine.tick(dt, aspect, 1);
  const settleView = () => { for (let i = 0; i < 20; i++) tick(1 / 60); };
  const walk = (button, axis, limit, sign) => {
    engine.control(button, 1);
    for (let i = 0; i < 80 && (limit - hud[axis]) * sign > 0 && hud[25] === 1; i++) tick();
    engine.control(button, 0);
    assert((limit - hud[axis]) * sign <= 0 && hud[25] === 1, 'ordinary beacon waypoint ' + limit);
  };
  const center = (box, axis) => {
    let lo = Infinity, hi = -Infinity;
    for (let n = 0; n < 36; n++) {
      const coordinate = avatar[(box * 36 + n) * 6 + axis];
      lo = Math.min(lo, coordinate);
      hi = Math.max(hi, coordinate);
    }
    return (lo + hi) / 2;
  };
  const renderedSea = (x, z) => {
    const width = Math.sqrt(sea.count / 6);
    const data = new Float32Array(engine.memory.buffer, sea.pointer, sea.count * 6);
    const row = Math.floor((z + 20) / 4) + 1, col = Math.floor((x + 20) / 4) + 1;
    const at = (row * width + col) * 36;
    const u = (x - data[at]) / 4, v = (z - data[at + 2]) / 4;
    const a = data[at + 1], b = data[at + 13], c = data[at + 7], d = data[at + 19];
    return u + v <= 1 ? a * (1 - u - v) + b * u + c * v : d * (u + v - 1) + b * (1 - v) + c * (1 - u);
  };
  tick(0);
  assert.equal(avatar.length, 0, 'normal first-person play does not draw a body');
  assert.equal(engine.cycle_camera(), 1);
  settleView();
  assert.equal(avatar.length, 396 * 6);
  const dry = center(0, 2) - center(1, 2);
  assert(Math.abs(dry) < .02, 'dry standing torso is upright');
  assert.equal(engine.cycle_camera(), 0);
  settleView();
  assert.equal(avatar.length, 0, 'switching back hides the visible body');

  walk(0, 18, 33.42, -1);
  walk(3, 16, 28.5, 1);
  walk(0, 18, 26.5, -1);
  assert.equal(hud[22], 0, 'Beacon does not fly');
  assert.equal(hud[23], 0, 'the avatar actually left dry support');
  const [x, y, z] = hud.slice(16, 19);
  assert(renderedSea(x, z) > y - 1.62 + .5, 'the same rendered sea measurably immerses the player');
  assert.equal(avatar.length, 0);

  assert.equal(engine.cycle_camera(), 1);
  settleView();
  assert.equal(avatar.length, 396 * 6);
  const startZ = center(1, 2);
  let minArm = Infinity, maxArm = -Infinity, minLean = Infinity;
  engine.control(0, 1);
  for (let i = 0; i < 30; i++) {
    tick(.05);
    assert.equal(hud[25], 1, 'the swimming sample is real active play');
    assert.equal(avatar.length, 396 * 6, 'third person displays the articulated body during strokes');
    const arms = center(5, 2) - center(6, 2);
    minArm = Math.min(minArm, arms);
    maxArm = Math.max(maxArm, arms);
    minLean = Math.min(minLean, center(0, 2) - center(1, 2));
  }
  engine.control(0, 0);
  assert(center(1, 2) < startZ - 1.0, 'the stroke observations include actual movement through water');
  assert(minLean < -.12, 'the wet pose visibly pitches away from the upright dry body');
  assert(minArm < -.045 && maxArm > .045, 'both actual arm meshes alternate a full stroke');
  const finalPose = avatar.slice(), before = uploads;
  tick(0);
  assert.equal(uploads, before, 'zero-time reprojection does not rebuild identical avatar geometry');
  assert.deepEqual(avatar, finalPose);
  assert.equal(engine.cycle_camera(), 0);
  tick(0);
  assert.deepEqual(avatar, finalPose, 'changing the requested view is not a zero-time cut');
  settleView();
  assert.equal(avatar.length, 0, 'first person hides the wet body too');
  assert.equal(engine.cycle_camera(), 1);
  settleView();
  assert.equal(avatar.length, 396 * 6, 'restoring third person shows the actual running swim pose');
  console.log(JSON.stringify({ aspect, dry, minLean, minArm, maxArm, forward: startZ - center(1, 2) }));
}
