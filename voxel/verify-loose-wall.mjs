import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const wasm = new WebAssembly.Module(readFileSync(process.argv[2]));
const cubeX = 24.5, cubeTop = 7.26, cubeRight = 24.62, cubeNear = 40.62;
const skin = .0001, radius = .30, head = .18, feet = 1.62;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const unpack = (hit) => {
  assert(hit >= 0, 'read-only probe or reticle should hit terrain');
  return [(hit & 63) + ((hit >>> 19) & 1) * 64, (hit >>> 6) & 15,
    ((hit >>> 10) & 63) + ((hit >>> 20) & 1) * 64, (hit >>> 16) & 7];
};
for (const aspect of [.56, 1.67]) {
  let game, hud, hit, draw, yaw = 0, meshWrites = 0, drawnTail = new Float32Array();
  const chunkX = 2, chunkZ = 3;
  game = new WebAssembly.Instance(wasm, {
    showcase: {
      horizon() {},
      aim() {}, atlas() {}, outline() {}, player() {}, water() {},
      mesh(pointer, count, x, z) {
        if (x !== chunkX || z !== chunkZ) return;
        meshWrites++;
        const mesh = new Float32Array(game.memory.buffer, pointer, count * 6);
        draw = createHash('sha256').update(new Uint8Array(mesh.buffer, mesh.byteOffset, mesh.byteLength)).digest('hex');
        drawnTail = mesh.subarray(Math.max(0, (count - 36) * 6)).slice();
      },
      frame(pointer, target) {
        hud = Array.from(new Float32Array(game.memory.buffer, pointer, 30));
        hit = target;
      },
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
  }).exports;
  game._start();
  assert(game.start_beacon() > 0);
  const step = (dt = .05) => game.tick(dt, aspect, 1);
  step(0);
  const aimAt = (x, y, z) => {
    const dx = x - hud[16], dz = hud[18] - z;
    const nextYaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(y - hud[17], Math.hypot(dx, dz));
    game.look((nextYaw - yaw) / .0034, (hud[19] - pitch) / .0034);
    yaw = nextYaw;
    step(0);
  };
  const placeOn = (x, y, z) => {
    aimAt(x + .5, y + 1, z + .5);
    assert.deepEqual(unpack(hit), [x, y, z, 3], 'use the real upper face for construction');
    assert.equal(game.place_selected(), 1);
    step(0);
  };
  placeOn(24, 4, 40);
  placeOn(25, 4, 40);
  placeOn(24, 5, 40);
  game.pulse_control(4);
  for (let i = 0; i < 4; i++) step();
  assert(hud[17] > 7.2, 'jump normally to see the wall top');
  placeOn(24, 6, 40);
  for (let i = 0; i < 20; i++) step();
  assert.equal(hud[23], 1, 'return to the original ground');
  assert.equal(hud[28], 8, 'four actual placements, no free timber');

  aimAt(cubeX, 7.5, 40.999);
  assert.deepEqual(unpack(hit), [24, 7, 40, 5]);
  assert.equal(game.edit_view(0), 1);
  step(0);
  const initiallyLoose = draw;
  const xs = Array.from(drawnTail).filter((_, i) => i % 6 === 0);
  const ys = Array.from(drawnTail).filter((_, i) => i % 6 === 1);
  const zs = Array.from(drawnTail).filter((_, i) => i % 6 === 2);
  assert(Math.abs(Math.min(...ys) - 7.02) < .001 && Math.abs(Math.max(...ys) - cubeTop) < .001
    && Math.abs(Math.min(...xs) - 24.38) < .001 && Math.abs(Math.max(...xs) - cubeRight) < .001
    && Math.abs(Math.min(...zs) - 40.38) < .001 && Math.abs(Math.max(...zs) - cubeNear) < .001, 'the sole loose item is on the real wall top');
  const writesAfterBreak = meshWrites;

  game.control(0, 1);
  for (let i = 0; i < 16; i++) step();
  game.control(0, 0);
  const [x, y, z] = hud.slice(16, 19);
  assert(Math.abs(x - cubeX) < .02 && Math.abs(z - 41.3) < .02, 'body reaches the actual lower wall face');
  const ox = clamp(cubeX, x - radius + skin, x + radius - skin);
  const oy = clamp(7.02, y - feet + skin, y + head - skin);
  const oz = clamp(cubeNear, z - radius + skin, z + radius - skin);
  const dx = cubeX - ox, dy = 7.02 - oy, dz = cubeNear - oz;
  assert(dx * dx + dy * dy + dz * dz <= .25, 'the same finite cube is geometrically in reach');
  assert.deepEqual(unpack(game.pick(ox, oy, oz, dx, dy, dz)), [24, 6, 40, 5],
    'the closest segment is physically occluded by the constructed retaining wall');
  for (let i = 0; i < 8; i++) step();
  assert.equal(hud[25], 1);
  assert.equal(hud[28], 8, 'active and close but the wall blocks pickup');
  assert.equal(draw, initiallyLoose, 'the exact same loose cube remains published');
  assert.equal(meshWrites, writesAfterBreak);
  console.log(JSON.stringify({aspect, phase: 'blocked', x, y, z, reachSquared: dx * dx + dy * dy + dz * dz,
    stock: hud[28], draw}));

  const move = (button, axis, limit, sign) => {
    game.control(button, 1);
    for (let i = 0; i < 24 && (limit - hud[axis]) * sign > 0; i++) step();
    game.control(button, 0);
    assert((limit - hud[axis]) * sign <= 0, 'normal control reaches the next waypoint');
  };
  move(3, 16, 25.45, 1);
  assert(hud[16] - radius > cubeRight + .5, 'step sideways outside pickup range');
  game.pulse_control(4);
  move(0, 18, 40.62, -1);
  for (let i = 0; i < 16; i++) step();
  assert.equal(hud[23], 1);
  assert(Math.abs(hud[17] - 7.62) < .03, 'normal motion climbs the separately placed step');
  assert.equal(hud[28], 8, 'going around has not yet touched the cube');
  move(2, 16, 25.34, -1);
  assert.equal(hud[28], 9, 'the open near-body route collects that same item exactly once');
  assert.notEqual(draw, initiallyLoose, 'pickup retires its rendered geometry');
  assert.equal(meshWrites, writesAfterBreak + 1);
  for (let i = 0; i < 8; i++) step();
  assert.equal(hud[28], 9);
  assert.equal(meshWrites, writesAfterBreak + 1);
  console.log(JSON.stringify({aspect, phase: 'collected', pose: hud.slice(16, 19), stock: hud[28], draw}));
}
