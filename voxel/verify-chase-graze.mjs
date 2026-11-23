import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const binary = new WebAssembly.Module(readFileSync(process.argv[2]));
function intersectsInterior(ax, az, bx, bz, left, right, near, far) {
  let enter = 0;
  let leave = 1;
  for (const [origin, delta, min, max] of [[ax, bx - ax, left, right], [az, bz - az, near, far]]) {
    if (Math.abs(delta) < 1e-7) {
      if (origin <= min || origin >= max) return false;
    } else {
      const first = (min - origin) / delta;
      const last = (max - origin) / delta;
      enter = Math.max(enter, Math.min(first, last));
      leave = Math.min(leave, Math.max(first, last));
    }
  }
  return enter < leave;
}

for (const aspect of [1, .53]) {
  let engine, frame, hit, avatar;
  engine = new WebAssembly.Instance(binary, {
    showcase: {
      aim() {}, atlas() {}, horizon() {}, mesh() {}, outline() {}, water() {},
      player(_, count) { avatar = count; },
      frame(pointer, target) {
        frame = new Float32Array(engine.memory.buffer, pointer, 44).slice();
        hit = target;
      },
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail('Wosy exited: ' + code); } },
  }).exports;

  const label = (message) => `aspect ${aspect}: ${message}`;
  const tick = (dt) => engine.tick(dt, aspect, 1);
  engine._start();
  engine.generate(42);
  engine.reset_camera();
  engine.look(0.72664234 / .0034, -.10 / .0034);
  engine.pulse_control(7);
  tick(.02);
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
  const distance = () => Math.hypot(frame[16] - frame[37], frame[18] - frame[38]);
  const easedTravel = (sign) => {
    const before = distance();
    tick(0);
    assert.equal(distance(), before, label('requesting a mode does not snap at zero elapsed time'));
    let last = before, firstStep;
    for (let i = 0; i < 20; i++) {
      tick(1 / 60);
      const now = distance(), travel = (now - last) * sign;
      assert(travel >= -.00001 && travel < .5, label('the unobstructed camera travels smoothly'));
      if (i === 0) firstStep = travel;
      assert.equal(hit, -1, label('changing presentation does not retarget the player ray'));
      last = now;
    }
    assert(firstStep > 0 && firstStep < .1, label('switching eases away from rest'));
  };
  easedTravel(1);
  const open = distance();
  assert.equal(engine.cycle_camera(), 0);
  easedTravel(-1);
  assert.equal(distance(), 0, label('the return settles at the exact player eye'));
  assert.equal(engine.cycle_camera(), 1);
  easedTravel(1);
  const openDx = frame[16] - frame[37], openDz = frame[18] - frame[38];
  const nearPlane = .16;
  const upScale = Math.hypot(frame[1], frame[5], frame[9]);
  const sideScale = Math.hypot(frame[0], frame[8]);
  const halfHeight = nearPlane / upScale, halfWidth = halfHeight * aspect;
  const probes = [[0, 0]];
  for (const up of [-1, 1]) {
    for (const side of [-1, 1]) {
      probes.push([
        nearPlane * frame[3] + up * halfHeight * frame[1] / upScale + side * halfWidth * frame[0] / sideScale,
        nearPlane * frame[11] + up * halfHeight * frame[9] / upScale + side * halfWidth * frame[8] / sideScale,
      ]);
    }
  }
  assert(open > 4 && avatar > 0, label('the unobstructed view starts with a visible avatar'));
  let last = open, largestPull = 0, visible = true, wallFrames = 0;
  const avatarTransitions = [];
  let uncompressedContact = -1, earlyPull = -1;
  engine.control(3, 1);
  for (let i = 0; i < 84; i++) {
    tick(1 / 60);
    const boom = distance();
    assert(Number.isFinite(boom), label('camera and player positions stay finite'));
    largestPull = Math.max(largestPull, last - boom);
    last = boom;
    const shown = avatar > 0;
    if (shown !== visible) avatarTransitions.push(shown);
    visible = shown;
    if (uncompressedContact < 0) {
      const wouldHit = probes.some(([dx, dz]) => {
        const x = frame[37] + dx, z = frame[38] + dz;
        return intersectsInterior(x, z, x + openDx, z + openDz,
          ix + 2.00001, ix + 4.99999, iz + 2.00001, iz + 2.99999);
      });
      if (wouldHit) uncompressedContact = i;
      else if (earlyPull < 0 && open - boom >= .9) earlyPull = i;
    }
    if (frame[37] >= ix + 2 && frame[37] <= ix + 4) {
      wallFrames++;
      assert(frame[18] < iz + 1.95, label('the camera stays on the player side of the rear wall'));
      assert(boom < 2, label('the boom compresses while the player passes the wall'));
    }
    assert(frame[17] >= iy - 1 && frame[17] < iy + 3, label('camera height lies inside the wall test slab'));
    assert(!intersectsInterior(frame[37], frame[38], frame[16], frame[18],
      ix + 2.02, ix + 4.98, iz + 2.02, iz + 2.98), label('the chase boom does not cut through the wall footprint'));
    assert.equal(hit, -1, label('sidestepping past a rear wall does not select the obstruction'));
  }
  engine.control(3, 0);
  assert(wallFrames > 0 && frame[37] > ix + 4, label('the path enters and clears the wall span'));
  assert(uncompressedContact >= 0, label('the open camera would meet the rear wall'));
  assert(earlyPull >= 0 && uncompressedContact - earlyPull >= 3,
    label('the camera pulls in by .9 blocks at least three ticks before the uncompressed camera would hit'));
  assert(largestPull < 1, label('the camera does not snap inward by a block in one tick'));
  assert.deepEqual(avatarTransitions, [false, true], label('avatar hides once and reappears once'));
  assert(distance() > 4 && distance() > open - .55, label('the over-shoulder framing recovers'));
  console.log(label('dynamic chase wall graze and recovery passed'));
}
