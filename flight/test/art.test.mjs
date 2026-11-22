import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const executable = process.env.FLIGHT_WASM || new URL("../flight.wasm", import.meta.url);
const close = (a, b, tolerance = .0002) => Math.abs(a - b) <= tolerance;

async function art() {
  let engine, world, plane, state;
  const readMesh = (pointer, length) => {
    assert(Number.isInteger(pointer) && pointer >= 0 && pointer % 4 === 0);
    assert(Number.isInteger(length) && length >= 0 && length % 18 === 0);
    return new Float32Array(engine.memory.buffer, pointer, length).slice();
  };
  const module = new WebAssembly.Module(await readFile(executable));
  engine = new WebAssembly.Instance(module, {
    flight: {
      world(pointer, length) { world = readMesh(pointer, length); },
      aircraft(pointer, length) { plane = readMesh(pointer, length); },
      frame(pointer, length) {
        assert.equal(length, 36);
        state = new Float32Array(engine.memory.buffer, pointer, length).slice();
      },
      record() {},
    },
    wasi_snapshot_preview1: { proc_exit(code) { assert.fail("Wosy art exited: " + code); } },
  }).exports;
  engine._start();
  return {
    sample(course) { engine.reset(course); engine.tick(0, 0, 1.4); return { world, plane, state }; },
    view(mode, aspect) { engine.select_view(mode); engine.tick(0, 0, aspect); return { world, plane, state }; },
    step(input, aspect) { engine.tick(1 / 30, input, aspect); return { world, plane, state }; },
  };
}

function vertices(mesh, [r, g, b]) {
  const result = [];
  for (let at = 0; at < mesh.length; at += 6) {
    if (close(mesh[at+3], r) && close(mesh[at+4], g) && close(mesh[at+5], b)) {
      result.push([mesh[at], mesh[at+1], mesh[at+2]]);
    }
  }
  return result;
}

function point(mesh, target) {
  for (let at = 0; at < mesh.length; at += 6) {
    if (target.every((value, i) => close(mesh[at+i], value))) return true;
  }
  return false;
}

test("Paris scenery includes four tapered feet, an arch apex, separate decks, and a coherent spire", async () => {
  const {world} = (await art()).sample(1);
  assert(world.length <= 32768 * 6, "tower leaves the world within the allocated mesh");
  for (const x of [206, 250]) {
    for (const z of [337, 381]) assert(point(world, [x, 2.35, z]), "separate splayed footing");
  }
  assert(point(world, [205, .08, 336]), "plaza begins on the dry bank beyond the promenade");
  assert(!point(world, [206, 2.35, 262]), "no old footing in the river");
  assert(point(world, [228, 19, 373.49]), "open arch rises at the center of the south face");
  assert(point(world, [212.9, 23.35, 343.9]), "first observation deck");
  assert(point(world, [219.93, 42.45, 350.93]), "second observation deck");
  assert(point(world, [228, 84, 359]), "mast reaches the original height");
});

test("Paris has a continuous northeast river and a complete gabled quay station", async () => {
  const {world} = (await art()).sample(1);
  assert(world.length <= 32768 * 6);
  const water = vertices(world, [.29, .52, .67]);
  const seam = water.filter(([x]) => close(x, 330));
  for (const z of [265.2, 368.2]) assert(seam.filter(([, y, edge]) => close(y, .025) && close(edge, z)).length >= 2,
    "the adjoining reaches share both original bank vertices");
  for (const z of [430, 533]) assert(water.some(([x, y, edge]) => close(x, 450) && close(y, .025) && close(edge, z)),
    "the water reaches the new northeast banks");
  for (const x of [-450, 450]) assert(point(world, [x, 0, 570]), "flyable ground spans the raised map edge");
  for (const z of [458, 481]) {
    for (const x of [353, 386]) {
      assert(point(world, [x, 0, z]), "the station wall meets its bank");
      assert(point(world, [x, 12, z]), "the station wall meets its roof");
    }
    assert(point(world, [369.5, 18, z]), "the roof has a full-width centered gable");
  }
  assert.equal(vertices(world, [.24, .42, .48]).filter(([x, , z]) => x >= 353 && x <= 386 && close(z, 457.982)).length, 42,
    "a seven-bay window rhythm distinguishes the station facade");
});

test("Wright county has a terraced reservoir and raised tower outside the playable boundary", async () => {
  const {world, plane} = (await art()).sample(0);
  assert(world.length <= 32768 * 6 && plane.length <= 2048 * 6);
  const lake = vertices(world, [.23, .48, .54]);
  assert.equal(lake.length, 16 * 3);
  assert(lake.every(([x,y,z]) => x >= -405 && x <= -299 && z >= 251 && z <= 323 && close(y,.105)));
  assert(lake.filter(([x,,z]) => close(x,-352) && close(z,287)).length === 16);
  const banks = [...vertices(world, [.52, .51, .39]), ...vertices(world, [.61, .61, .48])];
  assert.equal(banks.length, 2 * 16 * 6);
  assert(banks.every(([x,y,z]) => x > -415 && x < -289 && z > 240 && z < 334 && y <= .6602));
  assert(banks.some(([,y]) => close(y,.66)), "the embankment rises above the water");
  const towerRoof = vertices(world, [.43, .27, .19]).filter(([x]) => x < -448);
  assert.equal(towerRoof.length, 12 * 3);
  assert(towerRoof.every(([x,y,z]) => x < -460.5 && y >= 28 && z >= 291.5 && z <= 306.5));
  assert(towerRoof.some(([x,y,z]) => close(x,-468) && close(y,32) && close(z,299)));
});

test("Wright Flyer has thirteen striped cells and a navy canton; Paris has one Brazilian flag mark", async () => {
  const demo = await art();
  const farm = demo.sample(0).plane;
  assert(farm.length <= 2048 * 6);
  const red = vertices(farm, [.94, .18, .18]);
  const ivory = vertices(farm, [.94, .95, .95]);
  const canton = vertices(farm, [.095, .24, .64]);
  assert.equal(red.length, 7 * 6);
  assert.equal(ivory.length, 6 * 6);
  assert.equal(canton.length, 6);
  assert.equal(vertices(farm, [.97, .97, .9]).length, 9 * 6);
  assert(close(red[0][1], ivory[0][1]) && close(red[0][1], canton[0][1]), "canton and stripes share the partitioned cloth");
  assert(vertices(farm, [.97, .97, .9])[0][1] - red[0][1] > .018, "stars are safely above their blue canton");
  const paris = demo.sample(1).plane;
  assert(paris.length <= 2048 * 6);
  const green = vertices(paris, [.035, .59, .25]);
  const gold = vertices(paris, [1, .84, .12]);
  const blue = vertices(paris, [.028, .248, .63]);
  assert.equal(green.length, 6);
  assert.equal(gold.length, 6);
  assert.equal(blue.length, 16 * 3);
  assert.equal(vertices(paris, [.98, .96, .83]).length, 3 * 6);
  assert(gold[0][1] - green[0][1] > .018, "gold marking is not coplanar with the base");
  assert(blue[0][1] - gold[0][1] > .018, "blue disk is not coplanar with the diamond");
});

test("Paris adds local limestone courses and low stepped moorings on the existing Seine banks", async () => {
  const demo = await art();
  const {world} = demo.sample(1);
  const west = vertices(world,[.76,.67,.54]).filter(([x]) => close(x,53.982));
  const east = vertices(world,[.71,.61,.48]).filter(([x]) => close(x,64.018));
  assert.equal(west.length,13*6);
  assert.equal(east.length,13*6);
  assert([...west,...east].every(([,y,z]) => y>=7.28 && y<=8.61 && z>172 && z<291),
    "warm course stones remain a veneer on the same bridge and do not change its clearance");
  const coping = vertices(world,[.84,.75,.60]).filter(([,y]) => close(y,.086));
  const risers = vertices(world,[.47,.43,.39]).filter(([,y]) => close(y,.084) || close(y,.135));
  assert.equal(coping.length,8*6);
  assert.equal(risers.length,8*6);
  assert([...coping,...risers].every(([x,y,z]) => x>=78 && x<150 && y<1 &&
    z < -117+(x+450)*.49),
    "paving and rises stay on the known land bank below the flight floor");
  assert(world.length<32768*6);
});

test("the Wasm cockpit swaps the exterior aircraft for its own near geometry without removing guides", async () => {
  const demo = await art();
  for (const [course, aspect, exteriorWing, frameMaterial] of [
    [0, 1.65, [.98 * 1.12, .83 * 1.12, .58 * 1.12], [.67,.43,.23]],
    [1, .68, [.96,.96,.86], [.34,.18,.12]],
  ]) {
    demo.sample(course);
    const outside = demo.view(0, aspect);
    const inside = demo.view(1, aspect);
    assert.notDeepEqual(inside.state.slice(0,16), outside.state.slice(0,16));
    assert(inside.state.slice(0,16).every(Number.isFinite));
    assert.deepEqual(inside.state.slice(16), outside.state.slice(16), "camera mode cannot change flight state or instruments");
    assert.strictEqual(inside.world, outside.world, "the camera does not rebuild the static world");
    assert.equal(vertices(outside.plane, exteriorWing).length, 6, "the exact outside wing exists in chase");
    assert.equal(vertices(inside.plane, exteriorWing).length, 0, "the exterior wing is not painted over the cockpit view");
    assert.equal(vertices(outside.plane, frameMaterial).length, 0, "physical cockpit hardware is not visible in chase");
    assert.equal(vertices(inside.plane, frameMaterial).length, 12, "the course-specific cockpit rails really exist");
    const speedNeedle = [.98,.52,.28];
    assert.equal(vertices(outside.plane, speedNeedle).length, 0);
    assert.equal(vertices(inside.plane, speedNeedle).length, 3, "the near scene includes a real instrument needle");
    for (const [guide, count] of [
      [[.28,1,.89], 6], [[.035,.095,.10], 24], [[1,.66,.19], 84],
    ]) {
      const exteriorGuide = vertices(outside.plane, guide);
      assert.equal(exteriorGuide.length, count, "the independent world guide exists");
      assert.deepEqual(vertices(inside.plane, guide), exteriorGuide, "camera switch retains identical world guidance");
    }
    const returned = demo.view(0, aspect);
    assert.deepEqual(returned.state, outside.state, "returning to chase restores the same complete frame");
    assert.deepEqual(returned.plane, outside.plane);
  }
});

test("banked cockpit horizon follows the actual left and right exterior wings", async () => {
  const demo = await art();
  for (const [course, aspect, wing] of [
    [0, 1.65, [.98 * 1.12, .83 * 1.12, .58 * 1.12]],
    [1, .68, [.96, .96, .86]],
  ]) {
    for (const [control, sign] of [[1, 1], [2, -1]]) {
      demo.view(0, aspect);
      demo.sample(course);
      for (let n = 0; n < 59; n++) demo.step(20, aspect);
      for (let n = 0; n < 21; n++) demo.step(control | 4, aspect);
      const outside = demo.view(0, aspect);
      assert.equal(outside.state[20], 7, "ordinary takeoff and bank stay in supply approach");
      assert.equal(outside.state[22], 0);
      assert(outside.state[19] > 2);
      const [left, right] = vertices(outside.plane, wing);
      const span = right.map((coordinate, axis) => coordinate - left[axis]);
      assert(sign * span[1] > 1, "commanded bank visibly raises the correct exterior wing");
      const inside = demo.view(1, aspect);
      assert.equal(Math.sign(inside.state[4]), sign, "the cockpit right basis follows the exterior wing");
      const vertical = span[0] * inside.state[1] + span[1] * inside.state[5] + span[2] * inside.state[9];
      const horizontal = span[0] * inside.state[0] + span[1] * inside.state[4] + span[2] * inside.state[8];
      assert(Math.abs(vertical) < .08 && horizontal > 6, "the banked wings are level in their own cockpit basis");
      assert.deepEqual(inside.state.slice(16), outside.state.slice(16));
      assert.deepEqual(demo.view(0, aspect).state, outside.state);
    }
  }
});
