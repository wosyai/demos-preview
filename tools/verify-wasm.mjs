import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const path = process.argv[2];
const file = process.argv[3] === '--binary'
  ? path : JSON.parse(readFileSync(path, 'utf8')).executable;
const binary = new WebAssembly.Module(readFileSync(file));
const imports = WebAssembly.Module.imports(binary);
const graphics = ['aim', 'atlas', 'frame', 'horizon', 'mesh', 'outline', 'player', 'water'];
assert.deepEqual(imports.filter((item) => item.module === 'showcase').map((item) => item.name).sort(), graphics);
for (const item of imports) {
  assert.equal(item.kind, 'function');
  assert(item.module === 'showcase' ||
    (item.module === 'wasi_snapshot_preview1' && item.name === 'proc_exit'));
}

let engine;
let frame, missionFlameFloor = 1;
let mesh;
const absentMeshChunk = Object.freeze({ count: 0, hash: "", lantern: Object.freeze([]) });
const meshChunks = Array(64).fill(absentMeshChunk);
const signedMeshChunks = new Map();
const meshPublications = [];
let water;
let outline;
let avatar = {count:0}, avatarUploads = 0, aim = [0, 0];
let atlasCount = 0;
function view(pointer, size) {
  assert(Number.isInteger(pointer) && pointer >= 0 && pointer % 4 === 0);
  assert(pointer + size * 4 <= engine.memory.buffer.byteLength);
  const data = new Float32Array(engine.memory.buffer, pointer, size);
  for (const component of data) assert(Number.isFinite(component));
  return data;
}
function layer(pointer, count, stride, maximum) {
  assert(Number.isInteger(count) && count >= 0 && count <= maximum && count % stride === 0);
  const data = view(pointer, count * 6);
  return { pointer, count, hash: createHash('sha256')
    .update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).digest('hex') };
}
engine = new WebAssembly.Instance(binary, {
  showcase: {
    horizon() {},
    atlas(pointer, width, height) {
      assert.equal(width, 128);
      assert.equal(height, 16);
      const bytes = new Uint8Array(engine.memory.buffer, pointer, width * height * 4);
      const tileHashes = [];
      for (let tile = 0; tile < 8; tile++) {
        const tileBytes = [];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < 16; x++) {
            const i = (y * width + tile * 16 + x) * 4;
            assert.equal(bytes[i + 3], 255);
            tileBytes.push(...bytes.subarray(i, i + 3));
          }
        }
        assert(new Set(tileBytes).size > 8, 'block tile must have texture');
        tileHashes.push(createHash('sha256').update(Uint8Array.from(tileBytes)).digest('hex'));
      }
      assert.equal(new Set(tileHashes).size, 8, 'surface material tiles must be distinct');
      atlasCount++;
    },
    mesh(pointer, count, chunkX, chunkZ) {
      assert(Number.isInteger(chunkX) && chunkX >= -32 && chunkX < 40, 'valid signed terrain X chunk');
      assert(Number.isInteger(chunkZ) && chunkZ >= -32 && chunkZ < 40, 'valid signed terrain Z chunk');
      const fixed = chunkX >= 0 && chunkX < 8 && chunkZ >= 0 && chunkZ < 8;
      const chunk = fixed ? chunkX + 8 * chunkZ : `${chunkX},${chunkZ}`;
      const current = layer(pointer, count, 3, 55296);
      const data = view(pointer, count * 6);
      const lantern = new Set();
      for (let i = 0; i < data.length; i += 6) {
        assert(data[i] >= chunkX * 12 && data[i] <= (chunkX + 1) * 12);
        assert(data[i + 2] >= chunkZ * 12 && data[i + 2] <= (chunkZ + 1) * 12);
        assert(data[i + 3] > 0 && data[i + 3] < 1, 'baked atlas U outside bounds');
        assert(data[i + 4] > 0 && data[i + 4] < 1, 'baked atlas V outside bounds');
        const light = data[i + 5];
        assert(light > 0 && (light <= 1 || Math.abs(light - 1.18) < .001 || Math.abs(light - 1.85) < .001),
          'baked light outside ordinary light or beacon signal bounds');
        if (light > 1) lantern.add(light);
      }
      if (count === 0) signedMeshChunks.delete(`${chunkX},${chunkZ}`);
      else signedMeshChunks.set(`${chunkX},${chunkZ}`, current);
      assert(signedMeshChunks.size <= 29, 'stream residency is bounded, including a mode-transition overlap');
      if (fixed) meshChunks[chunk] = count === 0 ? absentMeshChunk : { ...current, lantern: Array.from(lantern) };
      meshPublications.push({ chunk, chunkX, chunkZ, count, hash: current.hash });
      mesh = { pointer, count: meshChunks.reduce((sum, part) => sum + part.count, 0),
        hash: meshChunks.map((part) => part.hash).join(':') };
    },
    water(pointer, count) { water = layer(pointer, count, 3, 7776); },
    outline(pointer, count) { outline = layer(pointer, count, 2, 24); },
    player(pointer, count) { avatar = layer(pointer, count, 3, 576); avatarUploads++; },
    aim(x, y) {
      assert(Number.isFinite(x) && Math.abs(x) <= .941);
      assert(Number.isFinite(y) && Math.abs(y) <= .941);
      aim = [x, y];
    },
    frame(pointer, hit) {
      frame = { values: Array.from(view(pointer, 30)), hit };
      if (frame.values[25] === 1 && frame.values[26] < missionFlameFloor) missionFlameFloor = frame.values[26];
    },
  },
  wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
}).exports;

const { _start, generate, rebuild, edit, pick, control, clear_controls, look, reset_camera, tick, edit_view, select_material, cycle_material, place_selected, seed_begin, seed_code_unit, seed_end, default_seed, pulse_control, edit_control, cycle_camera, start_beacon, leave_beacon, terrain_material, terrain_ray_face, memory } = engine;
assert(memory instanceof WebAssembly.Memory);
for (const fn of [_start, generate, rebuild, edit, pick, control, clear_controls, look, reset_camera, tick, edit_view, select_material, cycle_material, place_selected, seed_begin, seed_code_unit, seed_end, default_seed, pulse_control, edit_control, cycle_camera, start_beacon, leave_beacon]) {
  assert.equal(typeof fn, 'function');
}
_start();
function seed(text, trim = 0) {
  seed_begin(trim);
  for (let i = 0; i < text.length; i++) {
    if (seed_code_unit(text.charCodeAt(i)) === 0) {
      assert.equal(seed_code_unit(52), 0, 'rejection must stay sticky until the next session');
      break;
    }
  }
  return seed_end();
}
assert.equal(default_seed(), 471);
for (const [text, expect] of [
  ['0', 0n], ['-0', 0n], ['00042', 42n], ['0'.repeat(5000) + '42', 42n],
  ['2147483647', 2147483647n], ['-2147483648', -2147483648n],
]) assert.equal(seed(text), expect, JSON.stringify(text.slice(-15)));
for (const invalid of ['', '-', '+1', '1e2', '2147483648', '-2147483649',
  '１２３', '1\n', ' 42 ', '1 2', '1234.5', '😊']) {
  assert.equal(seed(invalid), 2147483648n, JSON.stringify(invalid));
}
for (const [text, expect] of [
  ['\u00a0 -0012\ufeff\u2028', -12n], ['\r\n 18 \u3000', 18n],
  ['- 42', 2147483648n], ['\u0085' + '42', 2147483648n],
  ['4\u20002', 2147483648n], ['\u180e' + '42', 2147483648n], ['  ', 2147483648n],
]) assert.equal(seed(text, 1), expect, JSON.stringify(text));
generate(42);
assert(mesh.count > 0);
assert.equal(water.count, 3456, 'Creative updates its original continuous sea area only');
const initialSea = water;
assert.equal((pick(12.5, 15, 0.5, 0, -1, 0) >>> 6) & 15, 0, 'shore bed should emerge from the sea');
assert.equal((pick(12.5, 15, 1.5, 0, -1, 0) >>> 6) & 15, 1, 'shore should have a shallow intermediate step');
assert.equal((pick(12.5, 15, 2.5, 0, -1, 0) >>> 6) & 15, 2, 'first dry step should emerge above the water');
tick(0.06, 1, 0);
assert.deepEqual(water, initialSea, 'pause should preserve wave phase');
tick(0, 1, 1);
assert.deepEqual(water, initialSea, 'zero-time ticks should preserve wave phase');
tick(0.06, 1, 1);
assert.notEqual(water.hash, initialSea.hash, 'positive play time should advance visible waves');
assert.equal(water.pointer, initialSea.pointer, 'sea should reuse geometry storage');
assert.equal(atlasCount, 1);
const original = mesh;
generate(42);
rebuild();
assert.deepEqual(mesh, original, 'seed did not reproduce mesh in the same storage');
assert.deepEqual(water, initialSea, 'regenerating should reset wave phase deterministically');
assert.equal(atlasCount, 1, 'reseed must not regenerate the material atlas');
generate(471);
const firstSeed = mesh.hash;
generate(722);
assert.notEqual(mesh.hash, firstSeed, 'seeds separated by 251 must not produce identical terrain');
generate(42);
assert.deepEqual(mesh, original, 'the initial seed still reproduces the same world');

tick(0, 1, 0);
assert.equal(frame.hit, -1);
assert.equal(outline.count, 0);
const preview = frame.values.slice(0, 19);
tick(0, 1, 1);
assert.deepEqual(frame.values.slice(0, 19), preview, 'starting play must not snap away from the eye-level preview');
const priorView = frame.values.slice(0, 16);
look(45, -12);
tick(0, 1, 1);
assert.notDeepEqual(frame.values.slice(0, 16), priorView, 'look did not update projection');
assert.deepEqual(mesh, original, 'camera input should not affect mesh');
assert.equal(frame.values[24], 2);
select_material(6);
cycle_material(1);
tick(0, 1, 1);
assert.equal(frame.values[24], 1, 'hotbar should wrap forward');
cycle_material(-1);
select_material(0);
tick(0, 1, 1);
assert.equal(frame.values[24], 6, 'hotbar should wrap backward and ignore invalid selection');

assert.equal(pick(-4, 18, -4, -1, 0, 0), -1);
const hit = pick(12.5, 18, 12.5, 0, -1, 0);
assert(hit >= 0, 'terrain under center camera');
const x = hit & 63, y = (hit >>> 6) & 15, z = (hit >>> 10) & 63;
assert(x >= 0 && x < 48 && y >= 0 && y < 16 && z >= 0 && z < 48);
edit(x, y, z, 0);
rebuild();
assert.notEqual(mesh.hash, original.hash, 'block edit did not change mesh');
assert.equal(mesh.pointer, original.pointer, 'block edit relocated mesh storage');

for (let y = 0; y < 16; y++) {
  for (let z = 0; z < 48; z++) {
    for (let x = 0; x < 48; x++) edit(x, y, z, 0);
  }
}
for (let z = 10; z < 23; z++) {
  for (let x = 8; x < 18; x++) edit(x, 2, z, 3);
}
for (let y = 3; y <= 8; y++) {
  for (let x = 8; x < 18; x++) edit(x, y, 15, 3);
}
rebuild();
reset_camera();
look(0.72664234 / 0.0034, -0.10 / 0.0034);
tick(0, 1, 1);
const ground = frame.values[17];
const zStart = frame.values[18];
assert.equal(frame.values[22], 0);
assert.equal(frame.values[23], 1);
assert(frame.hit >= 0 && outline.count === 24, 'wall must be selectable');
control(0, 1);
tick(0.25, 1, 1);
assert(frame.values[18] < zStart && zStart - frame.values[18] <= 0.30,
  'a slow frame should advance toward the wall within the cap');
for (let i = 0; i < 10; i++) tick(0.05, 1, 1);
clear_controls();
assert(Math.abs(frame.values[18] - 16.30) < 0.012, 'solid wall must stop the player at contact');
assert(Math.abs(frame.values[17] - ground) < 0.003 && frame.values[23] === 1, 'walk stays grounded');
const blockedMesh = mesh.hash;
assert.equal(place_selected(), -3, 'cannot place a block intersecting the player');
assert.equal(mesh.hash, blockedMesh);

control(4, 1);
tick(0.04, 1, 1);
assert(frame.values[17] > ground && frame.values[23] === 0, 'jump should rise once from the ground');
for (let i = 0; i < 36; i++) tick(0.04, 1, 1);
assert(Math.abs(frame.values[17] - ground) < 0.003 && frame.values[23] === 1,
  'gravity should land; held jump must not trigger a second jump');
control(4, 0);
control(1, 1);
for (let i = 0; i < 6; i++) tick(0.05, 1, 1);
assert(frame.values[18] > 17.30, "back up outside the placement voxel");
control(1, 0);
select_material(5);
tick(0, 1, 1);
assert.equal(frame.values[24], 5);
assert.equal(place_selected(), 1, 'placing in free air next to the wall should work');
assert.notEqual(mesh.hash, blockedMesh);
assert.equal(edit_view(0), 1, 'removal should reach the newly placed block');
assert.equal(mesh.hash, blockedMesh);

const pulsedFrom = frame.values[18];
pulse_control(1);
pulse_control(1);
tick(0, 1, 1);
assert.equal(frame.values[18], pulsedFrom);
tick(NaN, 1, 1);
assert.equal(frame.values[18], pulsedFrom);
tick(0.04, 1, 0);
tick(0, 1, 1);
assert.equal(frame.values[18], pulsedFrom);
tick(0.04, 1, 1);
const singlePulse = frame.values[18];
assert(singlePulse > pulsedFrom && singlePulse - pulsedFrom <= 0.20);
tick(0.04, 1, 1);
assert.equal(frame.values[18], singlePulse, 'pulse should expire after one active advancing tick');
control(1, 1);
pulse_control(1);
tick(0.04, 1, 1);
const duringHeld = frame.values[18];
tick(0.04, 1, 1);
assert(frame.values[18] > duringHeld, 'pulse expiry must not release still-held movement');
control(1, 0);
pulse_control(4);
clear_controls();
tick(0.04, 1, 1);
assert.equal(frame.values[17], ground, 'reset must discard pending jump');
pulse_control(4);
tick(0, 1, 1);
assert.equal(frame.values[17], ground, 'jump pulse waits for a positive active tick');
tick(0.04, 1, 1);
assert(frame.values[17] > ground && frame.values[23] === 0, 'one isolated jump pulse leaves the ground');
for (let i = 0; i < 36; i++) tick(0.04, 1, 1);
assert(Math.abs(frame.values[17] - ground) < 0.003 && frame.values[23] === 1, 'jump pulse lands without repeating');
pulse_control(7);
pulse_control(7);
tick(0, 1, 1);
assert.equal(frame.values[22], 0, 'two discrete flight taps should cancel before next tick');
pulse_control(7);
tick(0, 1, 1);
assert.equal(frame.values[22], 1, 'discrete flight change should not require time advancement');
pulse_control(7);
tick(0, 1, 1);
assert.equal(frame.values[22], 0);

control(7, 1);
control(7, 1);
pulse_control(7);
tick(0, 1, 1);
assert.equal(frame.values[22], 1, 'repeated down must not toggle flight twice');
control(7, 0);
control(4, 1);
tick(0.04, 1, 1);
assert(frame.values[17] > ground, 'flight must rise with jump input');
control(4, 0);
control(7, 1);
control(7, 0);
tick(0, 1, 1);
assert.equal(frame.values[22], 0);

for (let y = 3; y <= 8; y++) {
  for (let x = 8; x < 18; x++) edit(x, y, 15, 0);
}
edit(12, 4, 10, 3);
rebuild();
reset_camera();
look(0.72664234 / 0.0034, -0.10 / 0.0034);
tick(0, 1, 1);
const [sx, sy, sz] = frame.values.slice(16, 19);
const aimedZ = () => {
  const target = pick(sx, sy, sz, 0, 0, -1);
  return target < 0 ? -1 : (target >>> 10) & 63;
};
assert.equal(aimedZ(), 10, 'generic ray should still see distant blocks');
assert.equal(frame.hit, -1, 'first-person editing ray must not target a block beyond reach');
assert.equal(edit_control(0, 2), -1, 'long-range edits must fail');
for (const z of [13, 14, 15]) edit(12, 4, z, 3);
rebuild();
tick(0, 1, 1);
assert.equal(aimedZ(), 15);
assert.equal(edit_control(0, 1), 1, 'holding break edits immediately');
assert.equal(aimedZ(), 14);
assert.equal(edit_control(0, 1), 0, 'duplicate press may not edit twice');
tick(0, 1, 1);
tick(NaN, 1, 1);
for (let i = 0; i < 6; i++) tick(0.06, 1, 0);
assert.equal(aimedZ(), 14, 'paused or invalid ticks must not advance held edits');
for (let i = 0; i < 3; i++) tick(0.06, 1, 1);
assert.equal(aimedZ(), 14, 'held edit must wait out the initial interval');
for (let i = 0; i < 2; i++) tick(0.06, 1, 1);
assert.equal(aimedZ(), 13, 'held edit advances to the next targeted block');
assert.equal(edit_control(0, 0), 0);
for (let i = 0; i < 8; i++) tick(0.06, 1, 1);
assert.equal(aimedZ(), 13, 'releasing the action must stop the repeat');
select_material(4);
assert.equal(edit_control(1, 2), 1, 'place one selected block in the face-adjacent cell');
assert.equal(aimedZ(), 14);
edit(12, 4, 14, 0);
edit(12, 4, 13, 0);
edit(12, 4, 10, 0);
for (let z = 10; z < 23; z++) {
  for (let x = 8; x < 18; x++) edit(x, 2, z, 0);
}
for (let y = 3; y <= 8; y++) {
  for (let x = 8; x < 18; x++) edit(x, y, 15, 0);
}
edit(23, 2, 0, 1);
reset_camera();
tick(0, 1, 1);
assert.deepEqual(frame.values.slice(16, 19).map(x => Math.round(x * 100)), [2350, 462, 50]);
assert.equal(frame.values[23], 1);
edit(23, 2, 0, 0);
rebuild();
reset_camera();
tick(0, 1, 1);
assert.equal(mesh.count, 0);
assert.equal(frame.values[17], 10);
assert.equal(frame.values[22], 1, 'an empty world must use a stable flight spawn');
assert.equal(frame.values[23], 0);
function renderedSeaAt(x, z) {
  const data = view(water.pointer, water.count * 6);
  const width = Math.sqrt(water.count / 6);
  assert(width === 24 || width === 36);
  const col = Math.min(width - 3, Math.floor((x + 20) / 4));
  const row = Math.min(width - 3, Math.floor((z + 20) / 4));
  const cell = ((row + 1) * width + col + 1) * 36;
  const u = (x - data[cell]) / 4, v = (z - data[cell + 2]) / 4;
  const a = data[cell + 1], c = data[cell + 7], b = data[cell + 13], d = data[cell + 19];
  return u + v <= 1 ? a * (1 - u - v) + b * u + c * v : d * (u + v - 1) + b * (1 - v) + c * (1 - u);
}
for (let z = 16; z <= 23; z++) edit(12, Math.max(0, Math.min(2, 19 - z)), z, 3);
rebuild();
reset_camera();
look(0.72664234 / 0.0034, -0.10 / 0.0034);
tick(0, 1, 1);
const startZ = frame.values[18];
control(1, 1);
tick(0.04, 1, 1);
const dryStride = frame.values[18] - startZ;
assert(dryStride > 0.18 && dryStride < 0.20);
for (let i = 0; i < 18 && frame.values[18] < 18.30; i++) tick(0.04, 1, 1);
const shallowZ = frame.values[18];
assert(shallowZ >= 18.30 && shallowZ < 18.50);
control(1, 0);
for (let i = 0; i < 20; i++) tick(0.04, 1, 1);
assert(Math.abs(frame.values[17] - 3.62) < 0.005 && frame.values[23] === 1,
  'shallow water rests on the visible seafloor instead of sinking through it');
assert(renderedSeaAt(frame.values[16], shallowZ) > 2.20, 'the shallow collision is under the visible sea');
control(1, 1);
tick(0.04, 1, 1);
const shallowStride = frame.values[18] - shallowZ;
assert(shallowStride > 0.13 && shallowStride < dryStride - 0.01, 'shallow water slows wading less than the open sea');
for (let i = 0; i < 160 && frame.values[18] < 26; i++) tick(0.06, 1, 1);
assert(frame.values[18] >= 26 && frame.values[22] === 0, 'walk off the beach into deep water without needing flight');
control(1, 0);
for (let i = 0; i < 70; i++) tick(0.04, 1, 1);
const seaGap = () => frame.values[17] - renderedSeaAt(frame.values[16], frame.values[18]);
const floatingGap = seaGap();
assert(floatingGap >= 0.30 && floatingGap <= 0.72, 'buoyancy should settle with the eye just above the rendered wave');
assert.equal(frame.values[23], 0, 'floating must not be considered solid ground');
const floatingZ = frame.values[18];
control(1, 1);
tick(0.04, 1, 1);
control(1, 0);
const swimStride = frame.values[18] - floatingZ;
assert(swimStride > 0.08 && swimStride < dryStride * 0.8, 'deep water must resist motion more than dry land');
control(4, 1);
for (let i = 0; i < 44; i++) tick(0.04, 1, 1);
control(4, 0);
assert(seaGap() > floatingGap + 0.12, 'swim-up input should increase lift while immersed');
control(0, 1);
for (let i = 0; i < 60 && frame.values[18] > 22.5; i++) tick(0.04, 1, 1);
control(0, 0);
assert(frame.values[18] <= 22.5 && frame.values[22] === 0, 'swim back onto the shallow shoreline without applying creative flight');
control(0, 1);
for (let i = 0; i < 70 && frame.values[18] > 19.31; i++) tick(0.04, 1, 1);
assert(Math.abs(frame.values[18] - 19.3) < 0.025, 'the submerged step should block a swimmer who does not climb');
control(4, 1);
for (let i = 0; i < 30 && frame.values[18] > 18.65; i++) tick(0.04, 1, 1);
control(4, 0);
control(0, 0);
assert(frame.values[18] <= 18.65 && frame.values[18] > 18.25, 'a fresh swim stroke should clear the shoreline sill');
for (let i = 0; i < 35; i++) tick(0.04, 1, 1);
assert(Math.abs(frame.values[17] - 3.62) < 0.005 && frame.values[23] === 1, 'the player can stand on the shallow sill');
control(0, 1);
control(4, 1);
for (let i = 0; i < 35 && frame.values[18] > 17.65; i++) tick(0.04, 1, 1);
control(0, 0);
for (let i = 0; i < 40; i++) tick(0.04, 1, 1);
control(4, 0);
assert(frame.values[18] <= 17.65 && frame.values[17] - 1.62 > renderedSeaAt(frame.values[16], frame.values[18]),
  'swimming up and jumping should enable dry egress, not only oscillation in the water');
assert(Math.abs(frame.values[17] - 4.62) < 0.005 && frame.values[23] === 1,
  'reaching shore lands once without automatic jump repetition while holding Jump');
pulse_control(7);
control(1, 1);
for (let i = 0; i < 45 && frame.values[18] < 24.5; i++) tick(0.04, 1, 1);
control(1, 0);
control(5, 1);
for (let i = 0; i < 22 && frame.values[17] > 2.15; i++) tick(0.04, 1, 1);
control(5, 0);
assert(frame.values[17] < renderedSeaAt(frame.values[16], frame.values[18]) && frame.values[18] > 24.5);
const flyingZ = frame.values[18];
control(1, 1);
tick(0.04, 1, 1);
control(1, 0);
assert.equal(frame.values[22], 1);
assert(Math.abs(frame.values[18] - flyingZ - dryStride) < 0.001, 'creative flight ignores water resistance');

console.log('Verified deterministic terrain, geometry, walking, jump and landing, solid walls, first-person break/build reach and repeat, flight, respawn, and sea physics.');

generate(42);
reset_camera();
look(0.72664234 / 0.0034, -0.10 / 0.0034);
tick(0, 1, 1);
const eye = frame.values.slice(16, 19);
const [ix, iy, iz] = eye.map(Math.floor);
assert(ix > 4 && iy > 1 && iz >= 6 && iz < 19, 'fixture uses the central terrain spawn');
for (let z = iz - 5; z <= iz + 4; z++) {
  for (let x = ix - 2; x <= ix + 2; x++) {
    for (let y = iy; y <= iy + 2; y++) edit(x, y, z, 0);
  }
}
edit(ix, iy, iz - 3, 3);
tick(0, 1, 1);
const aimTarget = frame.hit;
assert(aimTarget >= 0 && (aimTarget >>> 10 & 63) === iz - 3);
assert.equal(avatar.count, 0);
const settleView = (aspect = 1) => {
  for (let i = 0; i < 20; i++) tick(1 / 60, aspect, 1);
};
assert.equal(cycle_camera(), 1);
tick(0, 1, 1);
assert.deepEqual(frame.values.slice(16, 19), eye, 'selecting chase does not cut at zero elapsed time');
settleView();
const shoulder = frame.values.slice(16, 19);
const cameraDistance = (position) => Math.hypot(...position.map((value, i) => value - eye[i]));
assert(cameraDistance(shoulder) > 3.5, 'clear third-person camera sits behind the player');
assert(shoulder[0] > eye[0] && shoulder[2] > eye[2], 'third person uses a shoulder offset');
assert.equal(frame.hit, aimTarget, 'changing perspective preserves player-eye target');
assert.equal(avatar.count, 396, 'body, cap, pack and boots produce original Wosy geometry');
assert(aim[0] < 0 && aim[1] < 0);
const aimPoint = [eye[0], eye[1], iz - 2];
const project = (k) => frame.values[12 + k] +
  aimPoint[0] * frame.values[k] + aimPoint[1] * frame.values[4 + k] + aimPoint[2] * frame.values[8 + k];
assert(Math.abs(aim[0] - project(0) / project(3)) < .003, 'third-person reticle follows the actual edited surface');
assert(Math.abs(aim[1] - project(1) / project(3)) < .003);
const aimSquare = aim[0], submitted = avatarUploads;
tick(0, .65, 1);
assert(Math.abs(aim[0] - project(0) / project(3)) < .003, 'portrait reticle still tracks the exact block');
assert(Math.abs(aim[0] - aimSquare) < .06 && frame.values[16] < shoulder[0],
  'a smaller physical shoulder offset keeps the portrait avatar in view');
assert.equal(avatarUploads, submitted, 'the unchanged avatar is not submitted again');
const grazing = [ix + 1, Math.floor(eye[1] + .25 * 1.45 + .04), iz + 1];
assert.equal(edit(...grazing, 3), 1, 'grazing-wall fixture starts clear');
tick(0, .35, 1);
assert(cameraDistance(frame.values.slice(16, 19)) > 3.65, 'narrow frustum clears wall outside central boom');
tick(0, 2.8, 1);
assert(cameraDistance(frame.values.slice(16, 19)) < 2.0, 'wide near-plane corner retracts before grazing side wall');
assert.equal(frame.hit, aimTarget, 'aspect changes camera clearance, not the player target');
assert.equal(edit(...grazing, 0), 1);
const obstruction = eye.map((value, i) => Math.floor(value + (shoulder[i] - value) * .46));
assert(edit(...obstruction, 3) === 1);
tick(0, 1, 1);
assert(cameraDistance(frame.values.slice(16, 19)) < 2.2, 'voxel behind player retracts camera');
assert.equal(frame.hit, aimTarget, 'camera obstruction is not an edit target');
const releaseBoom = (steps) => {
  for (let k = 0; k < 20; k++) tick(.05, 1, 1);
  const wallDistance = cameraDistance(frame.values.slice(16,19));
  assert.equal(edit(...obstruction, 0), 1);
  tick(0, 1, 1);
  assert(Math.abs(cameraDistance(frame.values.slice(16,19)) - wallDistance) < .015,
    'a zero-time paint never snaps the cleared boom outward');
  let previous = wallDistance;
  for (const dt of steps) {
    tick(dt, 1, 1);
    const distance = cameraDistance(frame.values.slice(16,19));
    assert(distance > previous && distance - previous < .65, 'a cleared wall steadily eases the chase view out');
    previous = distance;
  }
  assert.equal(edit(...obstruction, 3), 1);
  tick(0, 1, 1);
  assert(cameraDistance(frame.values.slice(16,19)) < 2.2 && cameraDistance(frame.values.slice(16,19)) < previous,
    'new wall contact retracts immediately before the near plane can penetrate');
  return previous - wallDistance;
};
const regular = releaseBoom(Array(12).fill(1 / 60));
const irregular = releaseBoom([.015, .035, .012, .038, .019, .031, .014, .036]);
assert(Math.abs(regular - irregular) < .025, 'equal time gives equivalent chase recovery at irregular cadence');
assert.equal(edit_control(0, 2), 1, 'third-person controls break the outlined block');
tick(0, 1, 1);
assert.notEqual(frame.hit, aimTarget);
assert.equal(cycle_camera(), 0);
settleView();
assert.deepEqual(frame.values.slice(16, 19), eye, 'first-person pose returns to player eye');
assert.deepEqual(aim, [0, 0]);
assert.equal(avatar.count, 0, 'first person clears the player geometry');
assert.equal(cycle_camera(), 1);
tick(0, 1, 0);
assert.equal(avatar.count, 0, 'menu does not render avatar');
assert.deepEqual(aim, [0, 0]);
settleView();
assert.notDeepEqual(frame.values.slice(16, 19), eye, 'play retains the selected perspective');
assert.equal(cycle_camera(), 0);
settleView();
edit(...obstruction, 0);
pulse_control(7);
control(4, 1);
tick(.05, 1, 1);
control(4, 0);
const raisedEye = frame.values.slice(16,19);
assert(raisedEye[1] > iy + .83 && raisedEye[1] < iy + 1, 'elevated test ray passes below a ceiling');
edit(ix, iy, iz - 3, 3);
edit(ix, iy + 1, iz - 1, 3);
tick(0, 1, 1);
const underCeiling = frame.hit;
assert.equal(underCeiling, aimTarget, 'player-eye ray sees the original block beneath the overhang');
assert.equal(cycle_camera(), 1);
settleView();
assert.equal(frame.hit, underCeiling, 'fallback retains the visible player-eye edit target');
assert(Math.hypot(...frame.values.slice(16,19).map((v,i) => v-raisedEye[i])) < 1.42,
  'terrain occlusion pulls the boom in instead of leaving the target behind terrain');
assert(Math.abs(aim[0]) < .3 && Math.abs(aim[1]) < .3, 'the retained target remains near the center of the shortened camera');
assert.equal(avatar.count, 0, 'the avatar does not obscure a retracted camera');
assert.equal(edit_control(0, 2), 1, 'the retracted camera shows the target being edited');
tick(.02, 1, 1);
assert.notDeepEqual(frame.values.slice(16,19), raisedEye, 'chase view returns once the target is no longer occluded');
assert.equal(cycle_camera(), 0);
console.log('Verified exact Wosy chase camera, obstructed terrain, player mesh, projected reticle and player-origin editing.');


const coords = () => frame.values.slice(16, 19);
const phase = () => frame.values[25];
const missionHUD = () => frame.values.slice(25);
const steps = (count, seconds = .05, playing = 1) => {
  for (let i = 0; i < count; i++) tick(seconds, 1, playing);
};
function moveUntil(axis, index, goal, sign, cap = 150) {
  control(axis, 1);
  for (let i = 0; i < cap && (goal - coords()[index]) * sign > 0 && phase() === 1; i++) tick(.05, 1, 1);
  control(axis, 0);
}
function moveOn(axis, index, goal, sign, message, cap = 150) {
  moveUntil(axis, index, goal, sign, cap);
  assert((goal - coords()[index]) * sign <= .01, message + ': ' + coords());
}
function jumpNorth(goal, message) {
  control(4, 1);
  moveOn(0, 2, goal, -1, message, 35);
  control(4, 0);
  steps(14);
}
function aimNorthAt(y, z) {
  const [, eyeY, eyeZ] = coords();
  const pitch = Math.atan2(y - eyeY, eyeZ - z);
  look(0, (frame.values[19] - pitch) / .0034);
  tick(0, 1, 1);
}
function enterLighthouse() {
  moveUntil(0, 2, 7.6, -1, 40);
  jumpNorth(7.16, 'jump up one deck to the lighthouse entry');
  moveOn(0, 2, 5.95, -1, 'carry the lantern through the lighthouse door');
}
function lightWatchfires(whenNorth = null) {
  assert.equal(frame.values[29], 1, 'the first watchfire must be visited on the far shore');
  moveOn(0, 2, 9.45, -1, 'follow the high-bank trail past the tower approach');
  if (whenNorth) whenNorth();
  moveOn(2, 0, 9.42, -1, 'reach the west watchfire');
  assert.equal(frame.values[29], 2, 'the west watchfire is a required second milestone');
  moveOn(3, 0, 24.40, 1, 'return to the high tower approach');
  enterLighthouse();
  assert.equal(phase(), 2, 'both watchfires and the lighthouse entrance are required for victory');
}

generate(726);
assert(pick(38.5, 15.5, 38.5, 0, -1, 0) >= 0, 'creative terrain extends well beyond the old world');
edit(42, 14, 42, 5);
assert.equal(pick(42.5, 15.5, 42.5, 0, -1, 0), 42 + (14 << 6) + (42 << 10) + (3 << 16),
  'first hit retains legacy x, y, z, and top face');
select_material(4);
rebuild();
const editedSandbox = mesh;
assert(start_beacon() > 0);
tick(0, 1, 1);
const freshMission = mesh, freshWater = water, spawn = coords();
assert.equal(pick(65.5, -0.5, 67.5, 0, 1, 0), 1 + (3 << 10) + (2 << 16) + (1 << 19) + (1 << 20),
  'Beacon hit retains both high coordinate bits and the bottom face');
assert.equal(terrain_ray_face(-383.5, 15.5, -383.5, 0, 0, 1), -1,
  'the ray traverses the actual empty top layer along the underwater taper without stale hit state');
assert.equal(terrain_ray_face(-120.5, 16.5, -120.5, 0, -1, 0), 3,
  'a real ray hits the top surface outside the old packed coordinate range');
assert.equal(pick(-120.5, 16.5, -120.5, 0, -1, 0), -1,
  'the packed legacy ray ABI does not alias outside cells');
assert.equal(pick(480.5, -0.5, 67.5, 0, 1, 0), -1, 'a ray beyond the playable extent still misses');
assert(terrain_material(96, 0, 67) > 0, 'the authored world edge is no longer a terrain edge');
assert.equal(freshWater.count, 7776, 'Beacon updates the extended sea without truncating far waters');
assert.equal(freshWater.pointer, initialSea.pointer, 'both modes reuse the same packed vertex buffer');
assert.deepEqual(missionHUD(), [1, 1, 0, 12, 0]);
assert.deepEqual([spawn[0], spawn[2]], [24.5, 42.5]);
assert.equal(edit(24, 4, 42, 0), -4, 'raw edit cannot bypass the mission rules');
assert.deepEqual(mesh, freshMission);
assert(frame.values[23] === 1 && spawn[1] > 6.6, 'mission spawns on dry starting ground');
const lanternColor = () => meshChunks.flatMap((chunk) => chunk.lantern);
assert(lanternColor().length > 0 && lanternColor().every(c => Math.abs(c - 1.18) < .001),
  'the dark lighthouse and watchfires have distinct warm navigation markers');
steps(70, .06, 0);
assert.deepEqual(missionHUD(), [1, 1, 0, 12, 0], 'preview or pause must not advance the tide or flame');
assert.deepEqual(water, freshWater);
pulse_control(7);
control(7, 1);
tick(.05, 1, 1);
control(7, 0);
assert.equal(frame.values[22], 0, 'sticky or pulsed flight inputs cannot fly in Beacon Run');
select_material(3);
cycle_material(1);
tick(0, 1, 1);
assert.equal(frame.values[24], 5, 'mission stock is one material, regardless of sandbox keys');

aimNorthAt(5, 40.5);
assert.equal(place_selected(), 1, 'place one wood on the harbor path before starting the bridge');
tick(0, 1, 1);
assert.equal(frame.values[28], 11);
assert.equal(edit_view(0), 1);
tick(0, 1, 1);
assert.equal(frame.values[28], 11, 'breaking leaves the wood outside the stock');
moveOn(0, 2, 41.15, -1, 'walk to collect the loose wood before starting the bridge');
assert.equal(frame.values[28], 12, 'ordinary body pickup recovers the full stock for the twelve-cell bridge');

moveOn(0, 2, 30.52, -1, 'reach the south end of the long bridge corridor');
aimNorthAt(4, 28.5);
assert(frame.hit >= 0 && (frame.hit & 63) === 24 && ((frame.hit >>> 10) & 63) === 28 &&
  (frame.hit >>> 16) === 3, 'first piling is four-cell-ray aimable');
const beforeRejectedEdit = meshPublications.length;
assert.equal(edit_view(0), -4, 'the authored piling cannot be broken');
assert.equal(meshPublications.length, beforeRejectedEdit, 'rejected edit does not publish geometry');
const editBoundary = meshPublications.length;
assert.equal(place_selected(), 1);
assert.deepEqual(meshPublications.slice(editBoundary).map((p) => p.chunk), [18, 17],
  "a seam edit replaces only the owner and face-adjacent chunk");
assert(meshPublications.slice(editBoundary).reduce((sum, chunk) => sum + chunk.count, 0) < freshMission.count / 3,
  "seam editing moves only a fraction of the level geometry");
tick(0, 1, 1);
assert.equal(frame.values[28], 11, 'placing a beam consumes one wood');

for (const piling of [28, 26, 24, 22, 20, 18]) {
  if (piling !== 28) {
    aimNorthAt(4, piling + .50);
    assert.equal(place_selected(), 1, 'extend the dry surface above piling ' + piling);
  }
  aimNorthAt(4.5, piling + 1);
  assert.equal(place_selected(), 1, 'place adjacent wood in the next unbridged cell');
  moveOn(0, 2, piling + .55, -1, 'walk the completed portion of the bridge');
}
assert.equal(frame.values[28], 0, 'entire bridge uses all of the visible wood stock');
moveOn(0, 2, 16.48, -1, 'cross all twelve cells of the player-built bridge');
assert.equal(frame.values[29], 1);
enterLighthouse();
assert.equal(phase(), 1, 'visiting the lighthouse before the west watchfire cannot finish the run');
moveOn(1, 2, 9.45, 1, 'return to the west watchfire trail');
lightWatchfires();
assert.equal(frame.values[26], 1, 'the complete bridge keeps the flame dry');

start_beacon();
tick(0, 1, 1);
moveOn(0, 2, 30.35, -1, 'reach the direct route water edge');
control(0, 1);
for (let i = 0; i < 3; i++) {
  pulse_control(4);
  steps(13);
}
clear_controls();
assert(coords()[2] > 18 && frame.values[29] === 0 && phase() !== 2,
  'three jumps from the straight route cannot reach even the first watchfire');
steps(180);
assert.equal(phase(), 3, 'deep open water extinguishes the run');
assert.equal(frame.values[26], 0);
const knownFailure = [coords(), water, mesh, missionHUD()];
control(0, 1);
steps(90);
control(0, 0);
assert.deepEqual([coords(), water, mesh, missionHUD()], knownFailure, 'finished run freezes terrain, waves, and movement');

start_beacon();
tick(0, 1, 1);
moveOn(0, 2, 33.42, -1, 'walk around the harbor hut');
moveOn(3, 0, 28.50, 1, 'travel to open water for the Swim Up stress case');
moveOn(0, 2, 26.8, -1, 'enter open water');
control(4, 1);
steps(250, .05);
control(4, 0);
assert.equal(phase(), 3, 'a single held Swim Up cannot keep the carried flame dry indefinitely');

function westApproach(wait) {
  start_beacon();
  tick(0, 1, 1);
  if (wait) steps(wait, .06);
  assert.equal(phase(), 1, 'harbor remains safe even at high tide');
  moveOn(0, 2, 33.4, -1, 'below the southwest hills');
  moveOn(2, 0, 8.50, -1, 'west passage head');
  moveOn(0, 2, 25, -1, 'west cut low entrance');
  steps(9);
  return renderedSeaAt(coords()[0], coords()[2]);
}
const earlyCut = westApproach(0);
aimNorthAt(3.5, 23.99);
assert(frame.hit >= 0 && ((frame.hit >>> 10) & 63) === 23 && ((frame.hit >>> 6) & 15) === 3);
assert.equal(edit_view(0), 1, 'remove the bottom plug from the approved west route');
aimNorthAt(4.5, 23.99);
assert.equal(edit_view(0), 1, 'open player-height clearance through the tidal gate');
moveOn(0, 2, 20.40, -1, 'pass the opened gate before it floods');
jumpNorth(19.51, 'scramble back onto the far shelf');
moveUntil(0, 2, 18.15, -1, 30);
jumpNorth(17.40, 'climb onto the north bank');
moveOn(0, 2, 16.42, -1, 'use the west-bank trail above the water');
moveOn(3, 0, 24.50, 1, 'cross the north bank to the first watchfire');
lightWatchfires();

const lateCut = westApproach(410);
assert(lateCut > earlyCut + 1.0, 'the tide physically raises water inside the passage');
steps(160);
assert.equal(phase(), 3, 'waiting in the flooded cut costs the flame');

start_beacon();
tick(0, 1, 1);
assert.deepEqual(coords(), spawn);
assert.deepEqual(mesh, freshMission);
assert.deepEqual(water, freshWater);
assert.deepEqual(missionHUD(), [1, 1, 0, 12, 0], 'retry resets water, watchfires, wood, terrain and spawn');
moveOn(0, 2, 33.32, -1, 'go north from the harbor');
moveOn(3, 0, 38.45, 1, 'east ridge entrance');
moveUntil(0, 2, 26.8, -1, 70);
assert(Math.abs(coords()[2] - 27.3) < .05, 'first ridge rise blocks walking');
jumpNorth(26.48, 'jump the first ridge rise');
moveUntil(0, 2, 23.9, -1, 40);
assert(Math.abs(coords()[2] - 24.3) < .05, 'second ridge rise blocks walking');
jumpNorth(23.52, 'jump the second ridge rise');
moveOn(0, 2, 16.40, -1, 'come off the ridge onto the north bank');
moveOn(2, 0, 24.54, -1, 'approach the north watchfire from the ridge');
lightWatchfires(() => {
  const owner = '2,-2';
  const original = signedMeshChunks.get(owner).hash;
  const x = 24, z = -13;
  const seabed = terrain_material(x, 0, z);
  assert(seabed > 0);
  const airY = Array.from({ length: 16 }, (_, y) => y).find((y) => y > 0 && terrain_material(x + 1, y, z) === 0);
  assert(Number.isInteger(airY));
  const firstEdit = meshPublications.length;
  assert.equal(edit(x, 0, z, 0), 1, 'mine the signed exterior bottom cell through the game edit export');
  assert.equal(edit(x + 1, airY, z, 5), 1, 'place into exterior air through the same edit path');
  assert.equal(terrain_material(x, 0, z), 0);
  assert.equal(terrain_material(x + 1, airY, z), 5);
  const rebuilt = meshPublications.slice(firstEdit).map(({ chunkX, chunkZ }) => [chunkX, chunkZ].join(','));
  for (const key of ['2,-2', '1,-2', '2,-1']) assert(rebuilt.includes(key), `invalidate seam mesh ${key}`);
  const changed = signedMeshChunks.get(owner).hash;
  assert.notEqual(changed, original, 'the signed edit appears in the actual mesh');
  moveOn(1, 2, 13.25, 1, 'step south to evict the edited exterior chunk');
  assert(!signedMeshChunks.has(owner), 'actual render retirement occurred');
  assert.equal(terrain_material(x, 0, z), 0, 'the air edit still exists where no render chunk is resident');
  moveOn(0, 2, 9.45, -1, 'return north to stream the edited chunk');
  assert.equal(signedMeshChunks.get(owner).hash, changed, 'real eviction and re-entry preserve exact edited mesh bytes');
  assert.equal(terrain_material(x + 1, airY, z), 5, 'placed material also survives eviction');
  assert.equal(edit(x, 0, z, seabed), 1, 'restore the original seabed');
  assert.equal(edit(x + 1, airY, z, 0), 1, 'restore the original air');
  assert.equal(signedMeshChunks.get(owner).hash, original, 'restored cells reproduce the exact generated mesh');
  assert.equal(edit(x, 0, z, 0), 1, 'retain a final edit to check retry isolation');
});

assert(lanternColor().length > 0 && lanternColor().every(c => Math.abs(c - 1.85) < .001),
  'the finished lighthouse and both watchfires emit the brighter signal');
assert(Math.abs(coords()[1] - 7.62) < .02 && frame.values[23] === 1);
const beaconOnly = meshChunks.flatMap((chunk, id) =>
  chunk.count > 0 && (id % 8 >= 4 || Math.floor(id / 8) >= 4) ? [id] : []);
assert(beaconOnly.length > 0, 'the completed Beacon view still has genuinely resident outer slots');
const beyondFixed = [...signedMeshChunks.keys()].filter((key) => key.split(',').some((part) => Number(part) < 0 || Number(part) > 7));
assert(beyondFixed.some((key) => key.split(',').some((part) => Number(part) < 0)),
  'ordinary movement streams actual mesh on a negative world seam');
const beforeCreative = meshPublications.length;
assert(leave_beacon() > 0);
tick(0, 1, 1);
assert.equal(phase(), 0);
assert.deepEqual(meshPublications.slice(beforeCreative).filter(({ count, chunk }) => count === 0 && typeof chunk === 'number')
  .map(({ chunk }) => chunk), beaconOnly, 'the generator explicitly retires the actual outer slots exactly once');
for (const key of beyondFixed) assert(!signedMeshChunks.has(key), 'restore retires each signed adventure slot');
for (const id of beaconOnly) assert.equal(meshChunks[id], absentMeshChunk);
assert.deepEqual(mesh, editedSandbox, 'return to sandbox restores the expanded terrain and exact far-side edits');
assert.deepEqual(water, initialSea, 'return to Creative restores exact original water geometry in the short buffer');
tick(.05, 1, 1);
assert.equal(water.count, 3456, 'positive Creative ticks do not submit unused archipelago vertices');
assert.notEqual(water.hash, initialSea.hash, 'waves still advance on the restored Creative grid');
assert.equal(frame.values[24], 4);
pulse_control(7);
tick(0, 1, 1);
assert.equal(frame.values[22], 1, 'sandbox flight is restored after the mission');
console.log('Verified 48-cell world, watchfire progression, shortcut denial, twelve-beam bridge, open-water failure, west tunnel and ridge victories, retry, and exact sandbox restoration.');


clear_controls();
generate(42);
reset_camera();
look(0.72664234 / 0.0034, -0.10 / 0.0034);
tick(0, 1, 1);
const [walkX, walkY, walkZ] = coords().map(Math.floor);
for (let x = walkX - 2; x <= walkX + 2; x++) {
  for (let z = walkZ - 5; z <= walkZ + 5; z++) {
    edit(x, walkY - 2, z, 3);
    for (let y = walkY - 1; y <= walkY + 2; y++) edit(x, y, z, 0);
  }
}
tick(.02, 1, 1);
assert.equal(frame.values[23], 1, 'avatar animation starts on the flat ground fixture');
assert.equal(cycle_camera(), 1);
settleView(.66);
function bootDelta() {
  assert.equal(avatar.count, 396, 'articulated poses use the original geometry budget');
  const data = view(avatar.pointer, avatar.count * 6);
  const boot = (box) => data[(box * 36) * 6 + 2];
  return boot(8) - boot(10);
}
assert(Math.abs(bootDelta()) < .01, 'idle boots are aligned');
control(0, 1);
tick(.05, .66, 1);
const forwardSwing = bootDelta();
assert(Math.abs(forwardSwing) > .15, 'grounded movement swings the legs in opposition');
tick(.05, .66, 1);
tick(.05, .66, 1);
assert(forwardSwing * bootDelta() < 0, 'successive grounded steps swap leading feet');
control(0, 0);
tick(.05, 1, 1);
assert(Math.abs(bootDelta()) < .01, 'letting go returns to neutral');
const idleUploads = avatarUploads;
tick(.05, .66, 1);
assert.equal(avatarUploads, idleUploads, 'stationary grounded avatar does not resubmit geometry');
control(4, 1);
tick(.05, .66, 1);
control(4, 0);
assert.equal(frame.values[23], 0);
const airPose = bootDelta();
assert(Math.abs(airPose) > .1, 'jumping changes the pose even without horizontal motion');
assert.equal(cycle_camera(), 0);
tick(0, .66, 1);
assert(Math.abs(bootDelta() - airPose) < .001, 'selecting eye view does not cut the air pose');
assert.equal(cycle_camera(), 1);
tick(0, .66, 1);
assert(Math.abs(bootDelta() - airPose) < .001, 'reversing the selection retains the same air pose');
steps(24);
assert.equal(frame.values[23], 1);
assert(Math.abs(bootDelta()) < .01, 'landing blends back to idle');
console.log('Verified Wosy distance-driven gait, pivoted boots, jump pose, and perspective transitions.');


function torsoGroundPoint() {
  assert.equal(avatar.count, 396);
  const data = view(avatar.pointer, avatar.count * 6);
  return [data[36 * 6], data[36 * 6 + 2]];
}
function travelledAlongGround(start) {
  return Math.hypot(...torsoGroundPoint().map((value, i) => value - start[i]));
}
const sprintOrigin = torsoGroundPoint();
control(0, 1);
control(6, 1);
tick(.05, .66, 1);
control(6, 0);
assert(Math.abs(travelledAlongGround(sprintOrigin) - .4) < .01, 'sprint uses its physical ground speed');
assert(Math.abs(bootDelta()) > .05, 'sprint animates the feet');
const diagonalOrigin = torsoGroundPoint();
control(3, 1);
tick(.05, .66, 1);
control(3, 0);
assert(Math.abs(travelledAlongGround(diagonalOrigin) - .24) < .01, 'diagonal travel stays normalized');
assert(Math.abs(bootDelta()) > .05, 'diagonal movement animates the feet');
for (let x = walkX - 1; x <= walkX + 1; x++) {
  for (let y = walkY - 1; y <= walkY; y++) assert.equal(edit(x, y, walkZ - 3, 3), 1);
}
steps(12);
const blocked = torsoGroundPoint();
assert(Math.abs(blocked[1] - (walkZ - 2 + .30 + .14)) < .02, 'the explorer actually reached the wall boundary');
const blockedUploads = avatarUploads;
steps(4);
assert.equal(frame.values[23], 1, 'pushing into a wall does not lift the player');
assert(Math.abs(bootDelta()) < .01, 'pushing into a wall keeps a neutral stance');
assert.deepEqual(torsoGroundPoint(), blocked, 'the blocking wall prevents travel');
assert.equal(avatarUploads, blockedUploads, 'held input at a wall does not keep submitting gait frames');
control(0, 0);
console.log('Verified Wosy sprint and normalized diagonal strides, and no false gait at contact.');

assert.equal(cycle_camera(), 0);
generate(42);
reset_camera();
look(0.72664234 / 0.0034, 0);
assert.equal(cycle_camera(), 1);
control(7, 1);
control(7, 0);
control(4, 1);
steps(54);
control(4, 0);
assert.equal(frame.values[22], 1);
assert(frame.values[17] > 10, 'flight animation fixture clears the ground and surrounding obstacles');
function bodyCentre(box) {
  assert.equal(avatar.count, 396, 'flight uses the original articulated mesh budget');
  const vertices = view(avatar.pointer, avatar.count * 6);
  return [0, 1, 2].map(axis => {
    const values = Array.from({length:36}, (_,i) => vertices[(box*36+i)*6+axis]);
    return (Math.min(...values)+Math.max(...values))/2;
  });
}
function bodyAxis() {
  const torso = bodyCentre(1);
  return bodyCentre(0).map((value,i) => value-torso[i]);
}
function flyStep(direction) {
  control(direction, 1);
  for (let i=0; i<6; i++) tick(.04,.66,1);
  control(direction, 0);
  return bodyAxis();
}
const hoverAxis = bodyAxis(), flightStartZ = frame.values[18];
assert(Math.abs(hoverAxis[0])+Math.abs(hoverAxis[2]) < .002, 'vertical ascent keeps neutral lean');
control(0, 1);
tick(.04,.66,1);
const firstLean = bodyAxis()[2];
for (let i=0; i<5; i++) tick(.04,.66,1);
control(0, 0);
const forwardLean = bodyAxis()[2];
assert(frame.values[18] < flightStartZ-.65 && forwardLean < -.13);
assert(firstLean < -.035 && firstLean > forwardLean+.035, 'actual forward motion eases into nose-down lean');
const movedAxis = bodyAxis();
tick(0,.66,1);
assert.deepEqual(bodyAxis(), movedAxis, 'zero-time reprojection preserves active lean');
tick(.04,.66,1);
assert(bodyAxis()[2] > forwardLean+.035 && bodyAxis()[2] < -.035, 'letting go blends toward hover');
const reverseAxis = flyStep(1);
assert(reverseAxis[2] > .13, 'real backward motion leans in the opposite direction');
const xBeforeBank = frame.values[16];
const rightAxis = flyStep(3);
assert(frame.values[16] > xBeforeBank+.65 && rightAxis[0] > .13);
const leftAxis = flyStep(2);
assert(leftAxis[0] < -.13, 'left and right movement bank in opposite directions');
for (let i=0; i<8; i++) tick(.04,.66,1);
assert(bodyAxis().every((component,i) => Math.abs(component-hoverAxis[i]) < .0001), 'released flight controls return to neutral pose');
const settled = avatarUploads, settledPose = bodyAxis();
tick(.04,.66,1);
assert.equal(avatarUploads, settled, 'neutral hover does not resubmit unchanged mesh');
assert.equal(cycle_camera(), 0);
settleView(.66);
assert.equal(avatar.count,0);
assert.equal(cycle_camera(), 1);
settleView(.66);
assert.deepEqual(bodyAxis(), settledPose, 'camera toggles do not perturb the flight pose');
control(2, 1);
for (let i=0; i<190; i++) tick(.04,.66,1);
assert(frame.values[16] < -19, 'fixture reaches the real flight boundary');
const pinnedHover = bodyAxis(), pinnedOrigin = frame.values.slice(16,19), pinnedUploads = avatarUploads;
for (let i=0; i<6; i++) tick(.04,.66,1);
assert.deepEqual(frame.values.slice(16,19), pinnedOrigin, 'the world boundary prevents further movement');
assert(Math.abs(pinnedHover[0])+Math.abs(pinnedHover[2]) < .002, 'blocked flight input settles rather than leaning in place');
assert.deepEqual(bodyAxis(), pinnedHover);
assert.equal(avatarUploads,pinnedUploads,'blocked flight does not keep submitting avatar meshes');
control(2, 0);
console.log('Verified actual-motion flight lean, signed banking, eased hover and avatar publication.');

const survey = (seedValue) => {
  generate(seedValue);
  start_beacon();
  const profile = [];
  let mountains = 0, basins = 0, caves = 0;
  for (let z = -210; z <= -24; z += 2) {
    for (let x = -210; x <= -24; x += 2) {
      let height = -1;
      let airBelowRoof = false;
      for (let y = 0; y < 16; y++) {
        const material = terrain_material(x, y, z);
        if (!material && height >= 0) airBelowRoof = true;
        if (material) {
          if (airBelowRoof) { caves++; airBelowRoof = false; }
          height = y;
        }
      }
      profile.push(height);
      if (height >= 12) mountains++;
      if (height < 3) basins++;
    }
  }
  assert(mountains > 10 && basins > 10 && caves > 10,
    'procedural terrain at far negative coordinates contains mountains, flooded basins, and caves');
  assert.equal(terrain_material(-384, 1, -24), 0, 'world extent tapers underwater, not into an abrupt cliff');
  assert.equal(terrain_material(-385, 0, -24), 0, 'sampling enforces the configured playable envelope');
  return profile;
};
const seededAdventure = survey(726);
assert(terrain_material(24, 0, -13) > 0, 'new adventure resets the previous overlay');
assert.deepEqual(survey(726), seededAdventure, 'same seed reproduces the same terrain beyond the authored world');
assert.notDeepEqual(survey(726 + 16381), seededAdventure, 'old modulo aliases no longer alias in the adventure terrain');
