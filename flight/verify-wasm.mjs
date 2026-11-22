import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const captureRoot = process.env.FLIGHT_MARKER_CAPTURE;
const comparisonBaseline = process.env.FLIGHT_MARKER_BASELINE === "1";
assert(!comparisonBaseline || captureRoot, "baseline mode requires an isolated capture directory");
const captureProfiles = [[420, 750], [1000, 600]];
const floatBytes = (array) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const digest = (array) => createHash("sha256").update(floatBytes(array)).digest("hex");

const module = new WebAssembly.Module(readFileSync(process.argv[2] ?? new URL("flight.wasm", import.meta.url)));
assert.deepEqual(WebAssembly.Module.imports(module).map(({ module, name }) => `${module}.${name}`).sort(), [
    "flight.aircraft", "flight.frame", "flight.record", "flight.world",
]);

let engine;
let frame;
let world;
let aircraft;
let worldPointer;
let aircraftPointer;
let worldUploads = 0;
let packet;
function readFloats(pointer, length, stride, limit) {
    assert(Number.isInteger(pointer) && pointer >= 0 && pointer % 4 === 0);
    assert(Number.isInteger(length) && length > 0 && length <= limit && length % stride === 0);
    assert(pointer + length * 4 <= engine.memory.buffer.byteLength);
    const values = new Float32Array(engine.memory.buffer, pointer, length).slice();
    assert(values.every(Number.isFinite));
    return values;
}
engine = new WebAssembly.Instance(module, { flight: {
    world(pointer, length) {
        worldPointer = pointer;
        world = readFloats(pointer, length, 18, 196608);
        worldUploads += 1;
    },
    aircraft(pointer, length) {
        aircraftPointer = pointer;
        aircraft = readFloats(pointer, length, 18, 12288);
    },
    frame(pointer, length) {
        frame = readFloats(pointer, length, 1, 35);
        assert.equal(frame.length, 35);
        assert(frame[28] >= -1 && frame[28] <= 1, "turn cue is bounded");
        assert([0, 1, 2, 3, 4].includes(frame[29]), "landing enum is recognized");
        assert(frame[30] === 0 || frame[30] === 1, "shortcut availability is Boolean");
    },
    record(pointer, length) {
        assert(length >= 186 && length <= 16206);
        assert(pointer >= 0 && pointer + length <= engine.memory.buffer.byteLength);
        packet = new Uint8Array(engine.memory.buffer, pointer, length).slice();
    },
} }).exports;
engine._start();
assert.equal(engine.input_version(), 1);

const tick = (mask = 0, dt = 1 / 30, aspect = 1.65) => engine.tick(dt, mask, aspect);
function load(data) {
    engine.ghost_begin();
    for (const octet of data) engine.ghost_byte(octet);
    engine.ghost_end();
}
function reset(course) {
    engine.reset(course);
    tick(0, 0);
    assert.equal(frame[16], course);
    assert.equal(frame[17], 0);
    assert.equal(frame[20], 6);
    assert.equal(frame[21], 0);
    assert.equal(frame[22], 0);
    assert(aircraft.length >= 1000);
    assert(world.length >= 10000);
}

reset(0);
const farmWorld = world;
assert(worldPointer + world.length * 4 <= aircraftPointer || aircraftPointer + aircraft.length * 4 <= worldPointer,
    "persistent static and streamed moving meshes have disjoint backing");
const farmAircraft = aircraft;
const startFrame = frame;
for (let i = 0; i < 58; i++) tick(16);
assert(frame[18] > startFrame[18], "throttle accelerates");
assert.equal(frame[20], 6, "holding throttle alone does not lift off");
assert.deepEqual(new Float32Array(engine.memory.buffer, worldPointer, world.length), farmWorld,
    "moving frames never mutate static geometry needed on graphics restore");
const allForward = [frame, aircraft];
reset(0);
assert.equal(worldUploads, 1, "retrying the same course does not rebuild or reupload terrain");
for (let i = 0; i < 58; i++) tick(16);
assert.deepEqual([frame, aircraft], allForward, "fixed control replay is deterministic");

// At the neutral spawn, the plane's cloth and framing are axis aligned. Check
// that two positive-area triangle interiors never compete on the same plane.
function cross(a, b, p) {
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}
function overlapArea(left, right) {
    let shape = left;
    const winding = Math.sign(cross(...right));
    for (let i = 0; i < 3 && shape.length; i++) {
        const a = right[i], b = right[(i + 1) % 3];
        const clipped = [];
        for (let j = 0; j < shape.length; j++) {
            const p = shape[j], q = shape[(j + 1) % shape.length];
            const dp = cross(a, b, p) * winding, dq = cross(a, b, q) * winding;
            if (dp >= 0) clipped.push(p);
            if ((dp < 0) !== (dq < 0)) {
                const t = dp / (dp - dq);
                clipped.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
            }
        }
        shape = clipped;
    }
    let doubledArea = 0;
    for (let i = 0; i < shape.length; i++) {
        const a = shape[i], b = shape[(i + 1) % shape.length];
        doubledArea += a[0] * b[1] - a[1] * b[0];
    }
    return Math.abs(doubledArea) / 2;
}
function assertNonOverlappingParisPanels(values) {
    // Recover aircraft-local axes from the same Y-rotated Paris chase matrix.
    const len = Math.hypot(frame[3], frame[11]);
    const sx = frame[3] / len, cz = frame[11] / len;
    const triangles = [];
    for (let i = 0; i < values.length; i += 18) {
        const corners = [0, 6, 12].map((v) => {
            const [x,y,z] = values.subarray(i + v, i + v + 3);
            return [cz*x-sx*z,y,sx*x+cz*z];
        });
        const axis = [0, 1, 2].find((n) => corners.every((p) => Math.abs(p[n] - corners[0][n]) < 0.00005));
        if (axis === undefined) continue;
        const plane = corners[0][axis];
        const projected = corners.map((p) => p.filter((_, n) => n !== axis));
        if (Math.abs(cross(...projected)) < 0.00001) continue;
        for (const previous of triangles) {
            if (previous.axis !== axis || Math.abs(previous.plane - plane) >= 0.00005) continue;
            assert(overlapArea(projected, previous.projected) < 0.00008,
                `overlapping aircraft triangles on axis ${axis} at ${plane}`);
        }
        triangles.push({ axis, plane, projected });
    }
    assert(triangles.length > 60, "the panel check covers the actual aircraft geometry");
}

reset(1);
assert.equal(worldUploads, 2, "changing course publishes new terrain");
assert.notDeepEqual(world, farmWorld, "courses draw different scenery");
assert.notDeepEqual(aircraft, farmAircraft, "courses draw different airplanes");
assertNonOverlappingParisPanels(aircraft);
const parisPose = [frame, aircraft];
for (let i = 0; i < 4; i++) {
    tick(0, 0);
    assert.deepEqual([frame, aircraft], parisPose, "repeated presentation of a stationary pose is stable");
}
tick(0, 0, 0.55);
assert(frame[0] > parisPose[0][0] && frame[3] === parisPose[0][3], "portrait changes projection rather than the camera mode");

reset(1);
const malformed = [
    [87, 70, 1, 1, 180, 0, ...Array(180).fill(0)],
    [87, 70, 2, 1, 180, 0, ...Array(360).fill(0)],
    [87, 70, 3, 0, 180, 0, ...Array(360).fill(0)],
    [87, 70, 3, 1, 181, 0, ...Array(360).fill(0)],
    [87, 70, 3, 1, 180, 0, ...Array(360).fill(0)],
    [87, 70, 3, 1, 180, 0, 64, 255, ...Array(358).fill(0)],
];
for (const bytes of malformed) {
    load(bytes);
    tick(0, 0);
    assert.equal(frame[23], 0, "rejects corrupt, mismatched, or unfinished ghost runs");
}
assert.equal(packet, undefined, "never publishes a record before landing");
const hostAnalog = (bank, pitch, power = 0) => 64 | (power & 176) | ((bank & 255) << 8) | ((pitch & 255) << 16);
function headingAfter(input) {
    reset(0);
    for (let i = 0; i < 59; i++) tick(20);
    for (let i = 0; i < 21; i++) tick(input | 4);
    return frame[3];
}
const weakRight = headingAfter(hostAnalog(63, 0));
const digitalRight = headingAfter(2);
assert(weakRight > 0 && weakRight < digitalRight, "partial joystick motion banks proportionally");
assert.equal(headingAfter(hostAnalog(-127, 0) | 2), digitalRight, "keyboard wins on its own axis");
assert(headingAfter(hostAnalog(-127, 0)) < 0, "signed joystick left is preserved");

// Play through the public input/projection ABI, with no exported test state or
// ability to teleport. The chase offset is documented by the authored camera.
function aircraftPose() {
    const angle = Math.atan2(frame[3], frame[11]);
    const hx = Math.sin(angle), hz = Math.cos(angle);
    const right = -frame[12] / (1.61 / 1.65);
    const y = frame[19], speed = frame[18];
    const forward = (-frame[15] - frame[7] * (y + 5.3)) / Math.hypot(frame[3], frame[11]) + 17.5;
    return {x: hx * forward + hz * right, y, z: hz * forward - hx * right, speed, angle};
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const raw = (v) => Math.round(clamp(v, -127, 127));
const difference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function pilot(p, bearing, height, slope, power) {
    const bank = raw(440 * difference(bearing, p.angle));
    const glide = Math.max(0, (15.5 - p.speed) * .82);
    const climb = (height - p.y) * 1.22 + slope * p.speed;
    const pitch = raw(127 * (climb + glide) / (.34 * p.speed));
    return hostAnalog(bank, pitch, power);
}
function marker(color, minY = -Infinity) {
    const result = [];
    for (let i = 0; i < aircraft.length; i += 6) {
        if (aircraft[i+1] >= minY && color.every((value, c) => Math.abs(aircraft[i+3+c] - value) < .001)) {
            result.push(aircraft.slice(i,i+3));
        }
    }
    return result;
}
if (!comparisonBaseline) {
    for (const course of [0,1]) {
        reset(course);
        const bright = marker([.28,1,.89]), rim = marker([.035,.095,.10]);
        assert.equal(bright.length,6,"the directional fill is two triangles");
        assert.equal(rim.length,24,"only the outline surrounds the fill");
        const tip = rim.reduce((a,b) => a[2]>b[2] ? a : b);
        const x = course ? -111 : -15;
        const z = (course ? -199 : -74) + 3;
        assert(Math.abs(tip[0]-x) < .001 && Math.abs(tip[2]-z-13.1) < .01,
            "takeoff arrow tip remains on the original course centreline and extent");
    }
}

function cueRanges() {
    let offset = 0;
    const ranges = {};
    function group(name, vertices, palette) {
        const end = offset + vertices * 6;
        assert(end <= aircraft.length);
        for (let i=offset; i<end; i+=6) {
            assert(palette.some(color => color.every((value,c) => Math.abs(aircraft[i+3+c]-value)<.001)),
                `unexpected ${name} vertex at ${i/6}`);
        }
        ranges[name] = [offset/6,vertices];
        offset = end;
    }
    const cyan = [.28,1,.89], amber = [1,.66,.19], green = [.22,1,.43];
    const rim = comparisonBaseline ? [.05,.30,.28] : [.035,.095,.10];
    if (frame[33] < 3) group("amber",84,[amber]);
    if (marker(green).length === 84) group("green",84,[green]);
    if (rim.every((value,c) => Math.abs(aircraft[offset+3+c]-value)<.001))
        group("arrow",comparisonBaseline ? 12 : 30,[cyan,rim]);
    if ([7,8,9].includes(frame[20]))
        group("pickup",12,[1,.89,.77,.95].map(scale => cyan.map(value => value*scale)));
    if (!comparisonBaseline && [7,8].includes(frame[20]))
        group("pickup-footprint",24,[[.14,.72,.67]]);
    return ranges;
}

function observeMarkers(course, mode) {
    if (!captureRoot) return null;
    const trace = createHash("sha256");
    trace.update(floatBytes(frame));
    let ticks = 0;
    const samples = {};
    const views = mode === "normal" ? captureProfiles.map(([width, height]) => {
        const directory = join(captureRoot, String(course), `${width}x${height}`);
        mkdirSync(directory, { recursive: true });
        writeFileSync(join(directory, "world.bin"), floatBytes(world));
        return { directory, width, height, snapshots: [] };
    }) : [];
    const capture = (name) => {
        if (!views.length || samples[name]) return;
        const start = frame.slice();
        const originalAircraft = digest(aircraft);
        const ranges = cueRanges();
        if (name === "ring-approach") assert(ranges.amber && ranges.arrow);
        if (name === "ring-cleared") assert(ranges.green);
        if (name === "cargo" || name === "supply-approach") assert(ranges.pickup);
        for (const view of views) {
            tick(0, 0, view.width / view.height);
            assert.deepEqual(frame.subarray(16), start.subarray(16), "render capture cannot advance the mission");
            assert.equal(digest(aircraft), originalAircraft, "aspect-only capture cannot change world markers");
            const i = view.snapshots.length;
            writeFileSync(join(view.directory, `moving-${i}.bin`), floatBytes(aircraft));
            view.snapshots.push({ i, name, matrix: Array.from(frame.subarray(0, 16)), moving: aircraft.length, ranges });
        }
        tick(0, 0, 1.65);
        assert.deepEqual(frame, start, "restore original camera before the next scripted control step");
        samples[name] = {phase: frame[20], altitude: frame[19], gates: frame[32]};
        const cue = name === "ring-cleared" ? "green" : (name === "cargo" || name === "supply-approach") ? "pickup" : null;
        if (cue) {
            const [from,count] = ranges[cue];
            samples[name][cue] = Array.from(aircraft.subarray(from*6,(from+count)*6));
        }
    };
    return {
        before(p, phase) {
            const firstGateZ = course ? -99 : 40;
            if (phase === 7 && p.y > 2 && p.z >= firstGateZ - 23 && p.z < firstGateZ && frame[32] === 0)
                capture("ring-approach");
            if (phase === 7 && p.y > 2 && frame[32] === 1 && p.z > firstGateZ + 3)
                capture("supply-approach");
            if (phase === 9) capture("cargo");
            if (phase === 0 && p.z >= 100) capture("river");
            if (phase === 11 && p.y >= 4) capture("crop");
        },
        step(gates,input,dt,aspect) {
            ticks++;
            trace.update(JSON.stringify([input,dt,aspect]) + "\n");
            trace.update(floatBytes(frame));
            if (gates === 0 && frame[32] === 1) capture("ring-cleared");
        },
        cancel() { trace.update("cancel\n"); },
        finish(outcome = frame[22]) {
            if (views.length) {
                for (const name of ["ring-approach","ring-cleared","supply-approach","cargo",course ? "river" : "crop"])
                    assert(samples[name], `missing deterministic checkpoint: ${name}`);
                for (const {directory,width,height,snapshots} of views)
                    writeFileSync(join(directory,"frames.json"),JSON.stringify({course,width,height,world:world.length,snapshots}));
            }
            const dir = join(captureRoot,String(course));
            mkdirSync(dir,{recursive:true});
            writeFileSync(join(dir,`${mode}.json`),JSON.stringify({
                ticks, trace: trace.digest("hex"), replay: packet ? digest(packet) : null,
                outcome, final: Array.from(frame), samples,
            }));
        },
    };
}
function sortie(course, mode = "normal") {
    reset(1-course); reset(course);
    if (!comparisonBaseline) {
        const start = aircraftPose();
        assert(Math.abs(start.x - (course ? -111 : -15)) < .02, "course switch restored that course's home center");
        assert(Math.abs(start.z - (course ? -196 : -71)) < .02, "the aircraft starts three meters down its own home strip");
        assert(Math.abs(frame[27] - 61) < .02, "the takeoff guide points down that same strip");
    }
    packet = undefined;
    const supply = course ? -71 : 68;
    const visited = new Set();
    const observer = observeMarkers(course, mode);
    let premature = false, canceled = false, wrongWindow = false, checkedSupply = false, confirmed = 0;
    let surveyCruise = false, surveyEast = false;
    let checkedPortraitDrop = false, checkedChaseDrop = false;
    function step(input = 0, dt = 1/30, aspect = 1.65) {
        const gates = frame[32];
        tick(input,dt,aspect);
        observer?.step(gates,input,dt,aspect);
        if (frame[32] > gates) {
            assert(marker([.22,1,.43]).length === 84, "an earned ring immediately turns green");
            confirmed++;
        }
    }
    for (let i = 0; i < 1700 && frame[22] === 0; i++) {
        const p = aircraftPose(), phase = frame[20], status = frame[21];
        visited.add(phase);
        observer?.before(p, phase);
        let input = 0;
        if (phase === 6 || phase === 10) input = 20;
        if (phase === 7) {
            assert(marker([.28, 1, .89]).some(([x,y,z]) => Math.abs(x - (course ? -111 : -15)) < .001
                && Math.abs(y - 4) < .001 && Math.abs(z - (supply+34)) < .001),
                "supply approach renders a world-space beacon at the pickup strip");
            if (!comparisonBaseline && !checkedSupply && mode === "normal") {
                const cx = course ? -111 : -15, cz = supply + 34;
                const footprint = marker([.14,.72,.67]);
                assert.equal(footprint.length, 24, "the fixed supply outline uses four flat quads");
                for (const [,y] of footprint) assert(Math.abs(y-.39)<.001, "the outline sits above the painted strip");
                const xs = footprint.map(([x]) => x), zs = footprint.map(([, ,z]) => z);
                const bounded = (values, lo, hi) => Math.abs(Math.min(...values)-lo)<.001 && Math.abs(Math.max(...values)-hi)<.001;
                assert(bounded(xs, cx-5, cx+5) && bounded(zs, cz-6, cz+6), "the outline is anchored at the same runway position as the floating beacon");
                checkedSupply = true;
            }
            const distance = supply+12-p.z;
            const height = Math.min(6.5,1+distance*.064);
            input = pilot(p,0,height,distance>80 ? 0 : -.064,p.z>supply-43 ? 32 : 0);
            if (!premature) {
                step(input | 128);
                assert.equal(frame[20], 7);
                assert.equal(frame[26], 12, "airborne cargo pickup is rejected");
                premature = true;
                continue;
            }
        }
        if (phase === 8) input = mode === "overrun" ? 16 : 32;
        if (phase === 3) input = 32;
        if (phase === 9) {
            assert(marker([.28, 1, .89]).length >= 3, "stopped cargo pickup has a world-space marker");
            if (!canceled) {
                assert.equal(p.speed, 0);
                step(128,0);
                engine.cancel_drop();
                observer?.cancel();
                step(0);
                assert.equal(frame[20],9,"a canceled load cannot relaunch");
                canceled = true;
                continue;
            }
            input = mode === "no cargo" ? 20 : 128;
        }
        if (phase === 11) {
            if (mode === "county") {
                if (p.y >= 26 && p.z >= 160) surveyCruise = true;
                if (surveyCruise && p.x < -302 && p.x > -410 && Math.abs(p.z-287) < 44 && p.y > 19) {
                    return {result: "reservoir reach", position: p};
                }
                const target = surveyCruise ? [-352, 287] : [-15, p.z + 90];
                input = pilot(p, Math.atan2(target[0]-p.x, target[1]-p.z), 31, 0, 16);
                step(input);
                continue;
            }
            input = pilot(p,0,7,0,0);
            if (!wrongWindow) {
                assert.notEqual(status,9);
                step(input|128);
                assert.equal(frame[31],0,"spray outside the marked pass changes no coverage");
                assert.notEqual(frame[26],0);
                wrongWindow = true;
                continue;
            }
            if (status === 9) input |= 128;
        }
        if (phase === 0) {
            if (mode === "riverside") {
                if (p.z >= 105 && p.y >= 35) surveyCruise = true;
                const target = surveyCruise ? [67, 190] : [-111, p.z + 90];
                input = pilot(p, Math.atan2(target[0]-p.x, target[1]-p.z), 38, 0, 16);
                step(input);
                continue;
            }
            const target = p.z < 100 ? [-111,160] : [67,190];
            const slope = mode === "cyan" && p.x >= 24 && p.x < 49 ? .23 : 0;
            const height = mode === "high" && p.z > 140 ? 19 :
                mode === "strike" ? 7.9 :
                mode === "cyan" ? clamp(7.9+(p.x-24)*.23,7.9,13.5) : 13;
            input = pilot(p,Math.atan2(target[0]-p.x,target[1]-p.z),height,slope,0);
        }
        if (phase === 1) {
            if (mode === "riverside") {
                assert(surveyCruise, "the survey reached roof clearance before leaving the launch corridor");
                if (!comparisonBaseline && !checkedPortraitDrop && p.y >= 35) {
                    const before = frame.slice();
                    engine.select_view(1);
                    tick(0, 0, .45);
                    assert.equal(marker([.99,.72,.29]).length, 105, "the anchored DROP objective is still generated in tall portrait cockpit");
                    assert.equal(marker([.035,.095,.10]).length, 24, "the directional fallback remains when the high cockpit can look over the target");
                    assert.deepEqual(frame.subarray(16), before.subarray(16), "the cockpit check cannot change route state");
                    engine.select_view(0);
                    tick(0, 0, 1.65);
                    assert.deepEqual(frame, before, "restore the ordinary route camera");
                    checkedPortraitDrop = true;
                }
                if (surveyEast && p.z > 447 && p.x > 315 && p.x < 435 && p.y > 19) {
                    assert(comparisonBaseline || checkedPortraitDrop, "the northeast survey exercised a high cockpit portrait cue");
                    return {result: "northeast reach", position: p};
                }
                if (p.x >= 310 && p.z >= 240 && p.z <= 310) surveyEast = true;
                const target = surveyEast ? [368, 468] : [332, 272];
                input = pilot(p, Math.atan2(target[0]-p.x, target[1]-p.z), 38, 0, 16);
                step(input);
                continue;
            }
            if (!comparisonBaseline && mode === "normal") {
                const dropMarker = marker([.99,.72,.29]);
                if (!checkedChaseDrop) {
                    assert.equal(marker([.035,.095,.10]).length, 24, "the ordinary chase approach retains its directional cue");
                    checkedChaseDrop = true;
                }
                assert.equal(dropMarker.length, 105, "the Wosy DROP sign remains visible while approaching the delivery point");
                assert(dropMarker.some(([x,y,z]) => Math.abs(x-109)<.001 && Math.abs(y-4.7)<.001 && Math.abs(z-218)<.001),
                    "the tip stays anchored to the actual mail target");
            }
            input = pilot(p,Math.atan2(109-p.x,218-p.z),mode === "high" ? 20 : 11,0,32);
            if (mode === "high" && status === 5) {
                step(input|128);
                assert.equal(frame[26],5);
                assert.equal(frame[20],1,"late/high mail cannot be scored in flight");
                observer?.finish("invalid release");
                return {result:"invalid release"};
            }
            if (status === 9) input |= 128;
        }
        if (phase === 5 || phase === 2) {
            if (!comparisonBaseline && course === 1 && mode === "normal")
                assert.equal(marker([.99,.72,.29]).length, 0, "the delivery objective clears after release");
            const final = course ? 290 : 331, endX = course ? 125 : -15;
            const bearing = p.z >= final-13 ? 0 : clamp(Math.atan2(endX-p.x,Math.max(22,final+8-p.z)),-.38,.38);
            const target = final+(course?15:10), slope = course?-.207:-.133;
            const height = Math.min(12.3,1+(p.z-target)*slope);
            input = pilot(p,bearing,height,height<12.3?slope:0,p.z>final-50?32:0);
        }
        step(input);
    }
    assert.equal(confirmed, frame[32], "for each scored gate, the mesh confirms the score");
    observer?.finish();
    if (mode === "riverside" || mode === "county") return {result: frame[22], phase:frame[20], position: aircraftPose(), surveyCruise, surveyEast};
    return {result:frame[22], course, visited, time:frame[17], data:packet, actions:frame[31], gates:frame[32], route:frame[25]};
}
const goodFarm = sortie(0), goodParis = sortie(1), cyanParis = sortie(1,"cyan");
assert.equal(goodFarm.gates,3,"Crop Patrol confirms all three rings on a real flight");
assert.equal(goodParis.gates,3,"Paris Air Mail confirms all three rings on a real flight");
assert.equal(goodParis.route,2,"the higher, wider Paris route earns the amber route outcome");
if (!comparisonBaseline) {
    const west = sortie(0, "county");
    assert.equal(west.result, "reservoir reach", `ordinary Wright controls can reach the county reservoir: ${JSON.stringify(west)}`);
    const east = sortie(1, "riverside");
    assert.equal(east.result, "northeast reach", `ordinary flight controls can reach the new Paris northeast district: ${JSON.stringify(east)}`);
}
assert.equal(cyanParis.route,1,"the low Paris departure earns the cyan route outcome");
assert.equal(sortie(1,"strike").result,8,"failing to climb out of the low route hits the bridge");
assert.equal(sortie(0,"overrun").result,9,"pickup overrun remains an explicit failure");
const noCargo = sortie(0,"no cargo");
assert(noCargo.visited.has(9) && !noCargo.visited.has(10) && !noCargo.data,"throttling without loading cargo never advances the mission");
assert.equal(sortie(1,"high").result,"invalid release");
for (const {course, visited, result, time, data, actions, gates} of [goodFarm,goodParis,cyanParis]) {
    assert.equal(result,1,"complete delivery plus final stop earns a successful sortie");
    for (const phase of [6,7,8,9,10,2,3,...(course?[0,1,5]:[11])]) assert(visited.has(phase),`sortie passed phase ${phase}`);
    assert.equal(actions,course?1:3);
    assert(gates>0 && gates<=3,"timed gate score is earned by a real flight path");
    reset(1-course); reset(course);
    assert.equal(data[2],7);
    assert.equal(data.length,6+2*(data[4]+data[5]*256));
    const noActions = data.slice();
    for (let i=6;i<noActions.length;i+=2) noActions[i] &= 127;
    load(noActions);
    tick(0,0);
    assert.equal(frame[23],0,"controls without mission actions cannot be accepted as a replay");
    load(data);
    tick(0,0);
    assert.equal(frame[23],time,"authentic full sortie replay retains the exact timer");
}
reset(1); reset(0);
for (let i=0;i<235;i++) tick(0);
assert.equal(frame[32],0,"waiting does not earn a gate");
assert.equal(frame[33],0,"first timed gate stays available through its deadline");
for (let i=0;i<8;i++) tick(0);
assert.equal(frame[33],1,"expired gate advances without points or changing the mission phase");
assert.equal(frame[20],6);
for (const course of [0, 1]) {
    reset(course);
    for (const [index,z] of (course ? [-99,167,204] : [40,160,298]).entries()) {
        let steps = 0;
        while (frame[33] < index && steps++ < 1000) tick(0);
        assert.equal(frame[33], index);
        const amber = marker([1,.66,.19]);
        assert.equal(amber.length,84,"each course presents exactly one active ring");
        assert(amber.every(([, , depth]) => Math.abs(depth-z) < .001),"active ring geometry matches the scoring plane");
        if (!comparisonBaseline) {
            const x = course ? [-111, 5, 89][index] : -15;
            const y = index === 0 ? 5 : course ? 15.5 : 9.5;
            for (let i=0; i<14; i++) {
                const [first, last] = [amber[i*6], amber[i*6+1]];
                for (const [gx,gy] of [first,last])
                    assert(Math.abs(Math.hypot((gx-x)/9.5,(gy-y)/5.3) - 1) < .01,
                        "each optional dash retains the outer ring ellipse");
                const next = amber[((i+1)%14)*6];
                const gap = Math.hypot(last[0]-next[0],last[1]-next[1]);
                assert(gap > .35 && gap < .9, "all optional ring dashes are visibly separated in world space");
            }
        }
        assert.equal(marker([.22,1,.43]).length,0,"missing a ring never plays success coloring");
    }
}
function visibleGhost(rejectedCandidate) {
    reset(1); reset(0);
    for (const oldVersion of [1, 2, 3, 4, 5, 6]) {
        const oldPacket = goodFarm.data.slice();
        oldPacket[2] = oldVersion;
        load(oldPacket);
        tick(0, 0);
        assert.equal(frame[23], 0, `mission engine refuses old format v${oldVersion}`);
    }
    load(goodFarm.data);
    tick(0, 0);
    assert.equal(frame[23], goodFarm.time);
    if (rejectedCandidate) {
        const truncated = goodFarm.data.slice(0, -2);
        const ticks = (truncated.length - 6)/2;
        truncated[4] = ticks & 255;
        truncated[5] = ticks >> 8;
        load(truncated);
        tick(0, 0);
        assert.equal(frame[23], goodFarm.time, "a shorter non-finish cannot replace an existing best");
    }
    let diverged = null;
    for (let i = 0; i < 160 && frame[22] === 0; i++) {
        tick(i<58 ? 0 : (16|4|2));
        if (aircraft.length > farmAircraft.length) diverged = aircraft;
    }
    assert(diverged, "a restored mission ghost actually draws after the routes diverge");
    return diverged;
}
assert.deepEqual(visibleGhost(true), visibleGhost(false),
    "rejected candidate validation never mutates a previously restored ghost's mission state");

// Recheck that the plane and chase camera share the same presentation pose.
function playerWingCorner() {
    return Array.from(aircraft.subarray(aircraft.length - 6, aircraft.length - 3));
}
function screenPoint([x, y, z]) {
    const w = frame[3] * x + frame[7] * y + frame[11] * z + frame[15];
    return [
        (frame[0] * x + frame[4] * y + frame[8] * z + frame[12]) / w,
        (frame[1] * x + frame[5] * y + frame[9] * z + frame[13]) / w,
    ];
}
function distance(a, b) {
    return Math.hypot(...a.map((v, i) => v - b[i]));
}
for (const hz of [60, 90, 120]) {
    for (const steering of [0, 2]) {
        reset(1);
        reset(0);
        for (let i = 0; i < 62; i++) tick(20);
        for (let i = 0; i < 14; i++) tick(steering|4);
        const fixedClock = frame[17];
        let wing = playerWingCorner();
        const relative = screenPoint(wing);
        for (let i = 1; i < hz / 30; i++) {
            tick(steering|4, 1 / hz);
            assert.equal(frame[17], fixedClock, "presentation never advances the simulation clock");
            const next = playerWingCorner();
            assert(distance(next, wing) > 0.08, `aircraft interpolates a substep at ${hz} Hz`);
            assert(distance(relative, screenPoint(next)) < 0.002,
                `camera and aircraft share the same presentation pose at ${hz} Hz while steering ${steering}`);
            wing = next;
        }
        const still = [frame, aircraft];
        tick(0, 0);
        assert.deepEqual([frame, aircraft], still, "zero elapsed time freezes the exact presented pose");
    }
}

reset(1);
reset(0);
for (let i = 0; i < 62; i++) tick(20);
let previousHeading = 0, wrapped = false;
for (let i = 0; i < 800 && !wrapped; i++) {
    tick(2|4, 1 / 120);
    const heading = Math.atan2(frame[3], frame[11]);
    const raw = heading - previousHeading;
    const signed = Math.atan2(Math.sin(raw), Math.cos(raw));
    assert(signed > -0.00001 && signed < 0.013, "held bank follows the short yaw arc through each subframe");
    if (previousHeading > 3 && heading < -3) wrapped = true;
    previousHeading = heading;
}
assert(wrapped, "the bank trace actually crosses the yaw wrap");

function catchUp(increments) {
    reset(1);
    reset(0);
    for (let i = 0; i < 66; i++) tick(20);
    for (let i = 0; i < 12; i++) tick(6);
    for (const dt of increments) tick(6, dt);
    return { time: frame[17], point: playerWingCorner(), camera: screenPoint(playerWingCorner()) };
}
const afterHitch = catchUp([0.125]);
const afterFrames = catchUp(Array(15).fill(1 / 120));
assert.equal(afterHitch.time, afterFrames.time, "catch-up traverses the same authoritative steps");
assert(distance(afterHitch.point, afterFrames.point) < 0.001, "catch-up retains the last step's prior pose");
assert(distance(afterHitch.camera, afterFrames.camera) < 0.0001, "catch-up camera uses the same final substep");

console.log("Flight WASM: geometry, 60/90/120 Hz cadence, fixed-step controls, both missions, failure diagnostics, and replays verified");
