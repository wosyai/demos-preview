import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [artifact, digest] = process.argv.slice(2);
assert(artifact && /^[a-f0-9]{64}$/.test(digest), "pass the freshly reviewed Wasm and its SHA-256");
const bytes = readFileSync(artifact);
assert.equal(createHash("sha256").update(bytes).digest("hex"), digest);
const wasm = new WebAssembly.Module(bytes);
assert.deepEqual(WebAssembly.Module.imports(wasm).map(({module, name}) => `${module}.${name}`).sort(),
    ["flight.aircraft", "flight.frame", "flight.record", "flight.world", "wasi_snapshot_preview1.proc_exit"]);

let engine, frame, records = 0;
engine = new WebAssembly.Instance(wasm, {wasi_snapshot_preview1:{proc_exit(code){assert.fail("Wosy touchdown trapped: "+code);}}, flight: {
    world() {},
    aircraft() {},
    record() { records++; },
    frame(pointer, length) {
        assert.equal(length, 41);
        frame = new Float32Array(engine.memory.buffer, pointer, length).slice();
    },
}}).exports;
engine._start();
assert.equal(engine.input_version(), 1);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const raw = (v) => Math.round(clamp(v, -127, 127));
const analog = (bank, pitch, power = 0) => 64 | power | ((bank & 255) << 8) | ((pitch & 255) << 16);
const aspect = 1.65;
function pose() {
    const angle = Math.atan2(frame[3], frame[11]);
    const hx = Math.sin(angle), hz = Math.cos(angle);
    const right = -frame[12] / (1.61 / aspect);
    const y = frame[19], speed = frame[18];
    const forward = (-frame[15] - frame[7] * (y + 5.3)) / Math.hypot(frame[3], frame[11]) + 17.5;
    return {angle, x: hx * forward + hz * right, z: hz * forward - hx * right, y, speed};
}
function step(input = 0, dt = 1 / 30) {
    engine.tick(dt, input, aspect);
    assert.equal(frame[36], 0, "survivable rough contact never starts break-up");
    assert.equal(frame[22], 0, `no terminal failure expected, phase=${frame[20]} position=${JSON.stringify(pose())}`);
}
engine.reset(0);
step(0, 0);
assert.equal(frame[20], 6);
for (let i = 0; i < 100 && frame[20] === 6; i++) step(20);
assert.equal(frame[20], 7, "ordinary takeoff started the supply approach");

const supply = 68;
let bankedSteps = 0;
for (let i = 0; i < 520 && frame[20] === 7; i++) {
    const p = pose();
    const distance = supply + 12 - p.z;
    const height = Math.min(6.5, 1 + distance * .064);
    const climb = (height - p.y) * 1.22 + (distance > 80 ? 0 : -.064) * p.speed;
    const glide = Math.max(0, (15.5 - p.speed) * .82);
    const pitch = raw(127 * (climb + glide) / (.34 * p.speed));
    const rough = p.y <= 1.54 && p.z >= supply;
    const bank = rough ? 54 : raw(-440 * p.angle);
    if (rough) bankedSteps++;
    step(analog(bank, pitch, p.z > supply - 43 ? 32 : 0));
}
assert(bankedSteps >= 6, "ordinary joystick input established an intentional late bank");
assert.equal(frame[20], 8, "rough touchdown entered the regular supply rollout");
assert.equal(frame[26], 13, "the Wosy engine classified this as survivable rough touchdown");
const contact = pose();
assert(contact.speed > 2, "touchdown did not skip the moving rollout");
step(32 | 128);
assert.equal(frame[20], 8, "mission action cannot load during the moving rollout");
assert.equal(frame[26], 13);
assert(pose().speed > 0);

for (let i = 0; i < 180 && frame[20] === 8; i++) {
    step(32);
    if (frame[20] === 8) assert(pose().speed > 0);
}
assert.equal(frame[20], 9, "braking on the runway reached stopped cargo pickup");
assert.equal(pose().speed, 0);
step(16);
assert.equal(frame[20], 9, "throttle alone cannot load cargo");
assert.equal(pose().speed, 0);
step(128);
assert.equal(frame[20], 10, "the ordinary action loads cargo only once stopped");
assert.equal(frame[26], 0);
assert.equal(records, 0, "supply landing is not a completed mission");
console.log(JSON.stringify({result: "rough touchdown, real rollout, stopped pickup", bankedSteps, contact}));
