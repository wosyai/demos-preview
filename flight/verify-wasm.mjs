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
    ...(comparisonBaseline ? [] : ["wasi_snapshot_preview1.proc_exit"]),
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
engine = new WebAssembly.Instance(module, { wasi_snapshot_preview1: {proc_exit(code) { assert.fail("Wosy simulation trapped: "+code); }}, flight: {
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
        const expected = comparisonBaseline ? 35 : 41;
        frame = readFloats(pointer, length, 1, expected);
        assert.equal(frame.length, expected);
        if (!comparisonBaseline) {
            assert(frame[35] === 0 || frame[35] === 1);
            assert([0, 1, 2].includes(frame[36]));
        }
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
const postalStencil = [];
if (!comparisonBaseline) {
    const countWorld = (x0,x1,y0,y1,z0,z1) => {
        let found = 0;
        for (let i=0;i<farmWorld.length;i+=6) {
            const x=farmWorld[i], y=farmWorld[i+1], z=farmWorld[i+2];
            if (x>=x0 && x<=x1 && y>=y0 && y<=y1 && z>=z0 && z<=z1) found++;
        }
        return found;
    };
    assert.equal(countWorld(-45.93,-45.84,3.45,6.01,156,173),54,"supply approach barn has panelled side windows");
    assert(countWorld(163.6,169.4,13.89,16.71,111.6,117.4)>=72,"ribbed eastern silo has a full roof within the old obstacle footprint");
    for (const z of [185,225,265])
        assert.equal(countWorld(-30.41,0,.1505,.153,z+3.3,z+24.3),96,"every treated field has apparent cut rows within its original bounds");
}
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
if (!comparisonBaseline) {
    assert(world.length/6<32000,"the Paris quarter leaves space in the static mesh arena");
    const yard = [], buoyTips = [], crossing = [], streets = [], awnings = [];
    const plank = [], floats = [], postalTarget = [];
    const approx=(a,b)=>Math.abs(a-b)<.001;
    const riverBand=(x,z)=>z-(103.5+x*.49);
    for(let i=0;i<world.length;i+=6) {
        const [x,y,z,r,g,b]=world.subarray(i,i+6);
        const bank=riverBand(x,z);
        if (x>=0 && x<88 && bank>12 && bank<60) {
            assert(!(approx(y,.13) && ((approx(r,.23) && approx(g,.91)) || (approx(r,.98) && approx(g,.76)))),
                "no obsolete solid route panel is left floating on the water");
            if (approx(y,1.10) && ((approx(r,.28) && approx(g,.72)) || (approx(r,.83) && approx(g,.59))))
                buoyTips.push([x,z]);
        }
        if (approx(y,.091) && approx(r,.92) && approx(g,.85) && approx(b,.69)) crossing.push([x,bank]);
        if (((approx(y,.082) && approx(r,.39)) || (approx(y,.081) && approx(r,.42))) && approx(b,.39+(y<.0815?.03:0)))
            streets.push(bank);
        if (approx(y,2.79) && x>80 && x<122 && bank< -10 && bank> -21) awnings.push([x,bank]);
        if(x>98 && x<120 && z>207 && z<229) {
            if(approx(y,.193) && r>.64 && r<.71 && g>.47 && g<.54 && b>.30 && b<.37) plank.push([x,z]);
            if(approx(y,.163) && approx(r,.27*1.12) && approx(g,.25*1.12) && approx(b,.22*1.12))
                floats.push(x);
            if((approx(y,.21) || approx(y,.22)) && approx(r,.96) && approx(g,.70) && approx(b,.29))
                postalTarget.push([x,z]);
        }
        if(x>=-92.86 && x<=-81.81 && y>=.143 && y<=.173 && z>=-27.11 && z<=4.81)
            yard.push(Array.from(world.subarray(i,i+6)));
    }
    assert.equal(buoyTips.length,7,"the existing seven route hints are now compact buoy caps");
    for(const [x,z] of [[8,143.7],[24,155.7],[41,167.7],[18,132.7],[40,147.7],[65,158.7],[84,174.7]])
        assert(buoyTips.some(([bx,bz])=>approx(x,bx)&&approx(z,bz)),"every buoy preserves the old hint center");
    assert.equal(crossing.length,72,"four street crossings each have three deliberate pale stripes");
    assert(crossing.every(([,bank])=>bank > -28 && bank < -18),"crossings occupy the bank-side avenue, not the river");
    assert(streets.some(bank=>bank< -18) && streets.some(bank=>bank>126),"paved avenues connect both banks");
    assert.equal(awnings.length,12,"the four station bookstalls have pitched ends above the quay");
    assert.equal(plank.length,54,"the postal pontoon has nine visible timber runs");
    assert(plank.every(([x,z])=>x>99 && x<119 && z>208 && z<228),"each timber is inside the preserved target deck");
    assert.equal(floats.length,12,"the deck has a dark supporting float on both edges");
    assert(floats.some(x=>x<99) && floats.some(x=>x>119),"both floats read beyond the deck edges");
    assert.equal(postalTarget.length,12,"the functional postal target is still the same pair of quads");
    for(const [axis,[min,max]] of [[0,[104,114]],[1,[213,223]]]) {
        const points=postalTarget.map(v=>v[axis]);
        assert(approx(Math.min(...points),min) && approx(Math.max(...points),max),
            "the amber X retains its exact scoring-center footprint");
    }
    const ofColor = (r,g,b) => yard.filter(v => Math.abs(v[3]-r)<.001 && Math.abs(v[4]-g)<.001 && Math.abs(v[5]-b)<.001);
    const stone = ofColor(.67,.60,.51);
    assert.equal(stone.length,6,"a single stone court links the real stop line to the post room");
    assert(stone.every(([x])=>x>-93),"the yard does not paint across the usable runway");
    assert.equal(ofColor(.51,.39,.34).length,18,"the post court has three complete working bays");
    assert.equal(ofColor(.78,.46,.29).length,12,"a short connector near the stop and the entry threshold share terracotta");
    const thresholdZ = ofColor(.78,.46,.29).map(v=>v[2]);
    assert(thresholdZ.some(z=>z>3.23 && z<4),"the connector is beside the real stop, not the touchdown beacon");
    assert(thresholdZ.some(z=>z>-27 && z<-26),"the path meets the post room facade");
    for(let i=0;i<world.length;i+=6) {
        const [x,y,z,r,g,b]=world.subarray(i,i+6);
        if(x>-109 && x< -106 && z>=-23.001 && z<=-12.999 && y>.237 && y<.245)
            postalStencil.push([x,y,z,r,g,b]);
    }
    assert.equal(postalStencil.length,15,"the painted postal stencil has a base, inset and flap");
    const paint=postalStencil.filter(([,y])=>Math.abs(y-.238)<.0001);
    assert.equal(paint.length,6,"the base has two triangles at a single paint height");
    assert(paint.every(([,, ,r,g,b])=>Math.abs(r-.63)<.001 && Math.abs(g-.39)<.001 && Math.abs(b-.29)<.001));
    const bounds=axis=>[Math.min(...paint.map(v=>v[axis])),Math.max(...paint.map(v=>v[axis]))];
    for(const [axis,expected] of [[0,[-108.8,-106.4]],[2,[-23,-13]]])
        assert(bounds(axis).every((value,index)=>Math.abs(value-expected[index])<.001),
            "the stencil keeps its exact offset beside, not across, the runway centerline");
}
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
let verifyCockpitMail=false;
function aircraftPose() {
    if (frame[36] === 2 || verifyCockpitMail)
        return {x:frame[37], y:frame[38], z:frame[39], speed:frame[18], angle:frame[40]};
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
        const rawRed = aircraft[i+3];
        const red = rawRed < 0 ? (-rawRed-1)%2 : rawRed;
        if (aircraft[i+1] >= minY && color.every((value, c) => Math.abs((c === 0 ? red : aircraft[i+3+c]) - value) < .001)) {
            result.push(aircraft.slice(i,i+3));
        }
    }
    return result;
}
function verifyCueProjection(label, cue, minimumWidth, minimumHeight, screenHeight = null) {
    const before = frame.slice();
    for (const aspect of [1.65, .45]) {
        tick(0, 0, aspect);
        assert.deepEqual(frame.subarray(16), before.subarray(16), label + " camera inspection must not advance play");
        const points = cue();
        assert(points.length > 0, label + " emits actual geometry");
        const ndc = points.map(([x,y,z]) => {
            const c = (i) => frame[i]*x+frame[i+4]*y+frame[i+8]*z+frame[i+12];
            const w = c(3);
            assert(w > 0, label + " is in front of the eye");
            const projected = [c(0)/w, c(1)/w, c(2)/w];
            assert(projected.every(value => Math.abs(value) < 1),
                label + " fits the true frustum at aspect " + aspect);
            return projected;
        });
        for (const [axis, minimum] of [[0, minimumWidth], [1, minimumHeight]]) {
            const values = ndc.map(point => point[axis]);
            const span = Math.max(...values)-Math.min(...values);
            const size = screenHeight === null ? span : span*screenHeight*.5*(axis === 0 ? aspect : 1);
            assert(screenHeight === null ? size > minimum : size >= minimum, label + " is legible on screen at aspect " + aspect);
        }
    }
    tick(0, 0, 1.65);
    assert.deepEqual(frame, before, label + " restores the ordinary chase replay frame");
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

if (!comparisonBaseline) {
    const controls = [
        [.98,.52,.28], [.46,.86,.95], [.59,.96,.54], [.94,.62,.27],
    ];
    const plaqueInk = [.99,.91,.71];
    const scales = [
        [[.195,.136,.083],[.95,.68,.33],27],
        [[.087,.172,.209],[.58,.85,.94],27],
        [[.119,.195,.126],[.77,.93,.64],15],
    ];
    const materials = [[.67,.43,.23],[.34,.18,.12]];
    const projection = ([x,y,z], i) => frame[i]*x+frame[i+4]*y+frame[i+8]*z+frame[i+12];
    const instrument = points => points.map(point => [0,1,2].map(i => projection(point,i)/projection(point,3)));
    const vertical = points => Math.max(...instrument(points).map(point => point[1]));
    for (const kind of [0,1]) {
        engine.select_view(0);
        reset(kind);
        assert.equal(marker(materials[kind]).length,0,"the actual interior is absent in chase view");
        engine.select_view(1);
        reset(kind);
        for (const aspect of [1.65,.54,.45]) {
            tick(0,0,aspect);
            assert(marker(materials[kind]).length > 5,"the cockpit has real airframe-specific framing");
            assert.equal(marker(materials[1-kind]).length,0,"the other cockpit geometry is absent");
            for (const [face, marks, count] of scales) {
                assert.equal(marker(face).length,36,"each role has an independent Wosy dial face");
                assert.equal(marker(marks).length,count,"the live instruments carry distinct scale marks");
            }
            const labels = instrument(marker(plaqueInk));
            assert(labels.every(([x,y,z]) => Math.abs(x)<.90 && y>-.57 && y<-.29 && Math.abs(z)<1),
                "all physical labeling is visible below the main forward scene");
            for (const [left,right,count] of [[-.53,-.25,78],[-.24,.04,54],[.05,.34,96]]) {
                const label = marker(plaqueInk).filter(point => {
                    const cameraX = projection(point,0) / Math.hypot(frame[0],frame[8]);
                    return cameraX >= left && cameraX <= right;
                });
                const points = instrument(label);
                const x = points.map(p => p[0]), y = points.map(p => p[1]);
                assert.equal(label.length,count,"all three engraved words have distinct bounded strokes");
                assert((Math.max(...x)-Math.min(...x))*.5*(720*aspect) > 30 &&
                    (Math.max(...y)-Math.min(...y))*.5*720 > 18,"at 720 px height the word has readable size");
            }
            for (const color of controls) {
                const points = marker(color);
                assert(points.length >= 3,"each instrument emits actual mesh geometry");
                assert(points.every(point => projection(point,3)>1.7 && projection(point,3)<2.4),"instrument has true foreground depth");
                assert(instrument(points).every(([x,y,z]) => Math.abs(x)<.94 && y<-.4 && y>-.97 && Math.abs(z)<1),
                    "instruments stay in view below the horizon in portrait and landscape");
            }
        }
        const resting = controls.map(color => instrument(marker(color)));
        const closed = vertical(marker(controls[3]));
        for (let i=0;i<45;i++) tick(16,1/30,.45);
        assert(frame[18] > 10 && frame[20] === 6,"actual ground throttle speeds up without liftoff");
        assert.notDeepEqual(instrument(marker(controls[0])),resting[0],"ground acceleration moves the airspeed needle");
        assert(vertical(marker(controls[3])) > closed+.035,"effective throttle moves the lever forward");
        tick(48,1/30,.45);
        assert(vertical(marker(controls[3])) < closed-.035,"ground braking matches the simulation's brake priority over throttle");
        for (let i=0;i<54;i++) tick(20,1/30,.45);
        assert(frame[19] > 2,"the plane actually climbed");
        assert(Math.abs(instrument(marker(controls[1]))[1][0]-resting[1][1][0]) > .003,
            "real climbing moves the altitude needle");
        for (let i=0;i<9;i++) tick(18,1/30,.45);
        assert(Math.abs(instrument(marker(controls[2]))[1][0]-resting[2][1][0]) > .035,
            "an actual bank moves the slip-free bank needle, not the yaw or pitch");
    }
    engine.select_view(0);
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
    const archived = [.23,.58,.43];
    const archivedCount = comparisonBaseline ? 0 : marker(archived).length;
    if (archivedCount) group("previously-cleared",archivedCount,[archived]);
    if (rim.every((value,c) => Math.abs(aircraft[offset+3+c]-value)<.001))
        group("arrow",comparisonBaseline ? 12 : 30,[cyan,rim]);
    if ([7,8].includes(frame[20]) || (comparisonBaseline && frame[20] === 9))
        group("pickup",12,[1,.89,.77,.95].map(scale => cyan.map(value => value*scale)));
    if (!comparisonBaseline && [7,8].includes(frame[20]))
        group("pickup-footprint",24,[[.14,.72,.67]]);
    if (!comparisonBaseline && frame[20] === 9)
        group("pickup",93,[[.045,.17,.16],[.42,.97,.84]]);
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
    verifyCockpitMail=false;
    engine.select_view(0);
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
    let checkedPortraitDrop = false, checkedChaseDrop = false, checkedSupplyFrustum = false;
    let checkedPredictedImpact = false;
    let seenFalling=0, seenContact=0, returnedAfterContact=false, previousPouchHeight=Infinity;
    let cockpitAtRelease=false, returnedCockpit=false, heldPouchXZ=null, releaseHeading=null;
    let portraitCockpitSteps=0;
    let craftStartX;
    let movingSeine = false;
    let cartStartZ, movingCart = false;
    const checkedLoadVisibility = new Set();
    const impactTrace = [];
    function step(input = 0, dt = 1/30, aspect = 1.65) {
        const gates = frame[32];
        if (mode === "strike") impactTrace.push({input,dt});
        tick(input,dt,aspect);
        observer?.step(gates,input,dt,aspect);
        if (frame[32] > gates) {
            assert(marker([.22,1,.43]).length === 84, "an earned ring immediately turns green");
            if (!comparisonBaseline) {
                assert.equal(frame[35], 1, "the actual ring award asserts the flash signal");
                assert.equal(marker([1,.66,.19]).length, frame[33] < 3 ? 84 : 0, "only the next ring remains amber");
            }
            confirmed++;
        }
    }
    for (let i = 0; i < 1700 && frame[22] === 0; i++) {
        const p = aircraftPose(), phase = frame[20], status = frame[21];
        visited.add(phase);
        observer?.before(p, phase);
        let input = 0;
        if(!comparisonBaseline && course===1 && (mode==="normal" || mode==="cockpit mail")) {
            if(frame[36]===2 && phase===5) {
                if(mode==="cockpit mail") {
                    cockpitAtRelease = verifyCockpitMail;
                    const depth = ([x,y,z]) => frame[3]*x+frame[7]*y+frame[11]*z+frame[15];
                    assert(marker([.99,.91,.71]).every(point => depth(point) > .7),
                        "as dashboard lowers it cannot cross the blended eye");
                    assert.equal(marker([.96,.96,.86]).length,0,"the exterior airframe does not enclose the blending cockpit eye");
                }
                const pouch=marker([.88,.41,.19]);
                assert.equal(pouch.length,6,"the cut renders the actual pouch");
                const cx=(Math.min(...pouch.map(v=>v[0]))+Math.max(...pouch.map(v=>v[0])))/2;
                const cz=pouch[0][2]-.29;
                if(!heldPouchXZ) heldPouchXZ=[cx,cz];
                assert(Math.abs(cx-heldPouchXZ[0])<.001 && Math.abs(cz-heldPouchXZ[1])<.001,
                    "the released pouch falls without horizontal drift");
                const y=Math.min(...pouch.map(v=>v[1]));
                assert(y<=previousPouchHeight+.001,"the cinematic pouch falls continuously");
                previousPouchHeight=y;
                seenFalling++;
            } else if(frame[36]===2 && phase===2) {
                assert.equal(frame[31],1,"the actual Wosy delivery counted before the return");
                const impact=marker([.31,.82,.32]);
                assert.equal(impact.length,24,"a marker is drawn at the counted impact");
                if(seenContact===0) {
                    for(const [axis,coordinate] of [[0,heldPouchXZ[0]],[2,heldPouchXZ[1]]]) {
                        const values=impact.map(v=>v[axis]);
                        assert(Math.abs((Math.min(...values)+Math.max(...values))/2-coordinate)<.001,
                            "the marker confirms the pouch's exact vertical world impact point");
                    }
                    assert((heldPouchXZ[0]-109)**2+(heldPouchXZ[1]-218)**2<=90.26,"the point is inside the original postal target");
                }
                if(seenContact===2 && mode==="normal")
                    verifyCueProjection("mail impact framing", () => impact, .12,.04);
                seenContact++;
            } else if(seenContact>0 && phase===2) {
                returnedAfterContact=true;
                if(mode==="cockpit mail" && !returnedCockpit) {
                    assert.equal(marker([.99,.91,.71]).length,228,"the selected cockpit returns without another toggle");
                    const interior=frame.slice(0,16);
                    engine.select_view(0); tick(0,0,1.65);
                    assert.deepEqual(frame.slice(0,16),interior,"a pause never consumes live camera easing");
                    returnedCockpit=true;
                }
                assert.equal(marker([.31,.82,.32]).length,0,"the landing view does not retain a cinematic marker");
            }
        }
        if (!comparisonBaseline && course === 0 && mode === "normal") {
            const cart = marker([.91,.58,.23]);
            const servicePhase = phase === 7 || phase === 8 || phase === 9;
            if (phase === 9) assert.equal(cart.length,6,"the stopped loading scene still shows the cart deck");
            if (servicePhase && cart.length) {
                assert.equal(cart.length,6,"the service cart has a whole deck");
                assert(cart.every(([x,y,z])=>x>4 && x<8.1 && y>.84 && y<.85 && z>126 && z<135.3),
                    "the animated cart stays low and confined to the yard outside the runway");
                if (phase === 7) {
                    if (cartStartZ === undefined) cartStartZ = cart[0][2];
                    if (Math.abs(cart[0][2]-cartStartZ)>1.2) movingCart = true;
                }
                assert(aircraft.length/6 < 2048,"the active Wright yard fits the moving arena");
            } else if (!servicePhase) {
                assert.equal(cart.length,0,"the yard cart is not submitted outside the service phases");
            }
        }
        if (!comparisonBaseline && course === 1 && (mode === "normal" || mode === "cyan")) {
            const craft = marker([.32,.16,.11]);
            const wake = marker([.62,.77,.72]);
            assert.equal(aircraft.length % 18,0,"the route activity stays in triangular mesh units");
            assert(aircraft.length/6 < 2048,"active Paris route including the market craft fits the moving arena");
            if (phase !== 0 && phase !== 1) assert.equal(craft.length,0,"the distant craft is not submitted outside the river/mail leg");
            if (craft.length) {
                assert.equal(craft.length,9,"the craft has a complete deck and tapered prow");
                assert(craft.every(([x,y,z]) => y<1 && z>-117+(x+450)*.49+25 &&
                    z<-117+(x+450)*.49+60),"the hull is fully inside the route river and below the flight floor");
                if (wake.length) {
                    assert.equal(wake.length,6,"travel adds a paired wake");
                    assert(wake.every(([x,y,z]) => Math.abs(y-.052)<.001 && z> -117+(x+450)*.49+25),
                        "the painted wake remains on the river");
                    const leadingX = Math.max(...craft.map(([x]) => x));
                    if (craftStartX === undefined) craftStartX = leadingX;
                    if (leadingX > craftStartX+2) movingSeine = true;
                }
            }
        }
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
            if (!comparisonBaseline && !checkedSupplyFrustum && mode === "normal"
                && p.z >= supply-32 && p.z < supply-30 && p.y > 1.5) {
                verifyCueProjection("airborne supply beacon", () => marker([.28,1,.89])
                    .concat(...[.89,.77,.95].map(scale => marker([.28,1,.89].map(c => c*scale))))
                    .filter(([x,,z]) => Math.abs(x-(course ? -111 : -15)) < 2.6 && Math.abs(z-supply-34) < 2.6),
                    .04, .035);
                checkedSupplyFrustum = true;
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
        if (!comparisonBaseline && [7,8,10].includes(phase) && !checkedLoadVisibility.has(phase)) {
            assert.equal(marker([.42,.97,.84]).length,0,"no load sign before stationary admission or after loading");
            checkedLoadVisibility.add(phase);
        }
        if (phase === 8) input = mode === "overrun" ? 16 : 32;
        if (phase === 3) input = 32;
        if (phase === 9) {
            if (comparisonBaseline) {
                assert(marker([.28, 1, .89]).length >= 3, "stopped cargo pickup has a world-space marker");
            } else if (!checkedLoadVisibility.has(phase)) {
                if (mode === "normal") {
                    assert(checkedSupplyFrustum, "this ordinary flight checked the airborne supply cue during descent");
                    verifyCueProjection("stopped load sign", () => {
                        const label = marker([.42,.97,.84]);
                        assert.equal(label.length,87,"chase view points to the stopped plane");
                        return label.concat(marker([.045,.17,.16]));
                    }, .20, .09);
                    if (course === 1)
                        verifyCueProjection("stopped postal stencil", () => postalStencil, 32, 15, 600);
                }
                const ink = marker([.42,.97,.84]);
                assert.equal(ink.length,87,"the phase-owned sign pays only for a pointer and fourteen strokes");
                const tip = ink.reduce((a,b) => a[1]<b[1] ? a : b);
                const chaseScale = Math.hypot(frame[0],frame[8]);
                const across = (frame[0]*tip[0]+frame[8]*tip[2]+frame[12])/chaseScale;
                const along = Math.sin(p.angle)*(tip[0]-p.x)+Math.cos(p.angle)*(tip[2]-p.z);
                assert(Math.abs(across)<.01 && Math.abs(along)<.01,
                    "the sign points to the actual stopped aircraft, not a fixed runway spot");
                checkedLoadVisibility.add(phase);
            }
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
            if (mode === "farm impact") {
                input = pilot(p,0,0.1,-0.08,32);
                step(input);
                continue;
            }
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
            if (mode === "ground impact") {
                input = pilot(p,0,0.1,-0.08,32);
                step(input);
                continue;
            }
            if (mode === "riverside" || mode === "tower impact") {
                if (p.z >= 105 && p.y >= 35) surveyCruise = true;
                const target = surveyCruise ? [67, 190] : [-111, p.z + 90];
                input = pilot(p, Math.atan2(target[0]-p.x, target[1]-p.z), 38, 0, 16);
                step(input);
                continue;
            }
            const target = p.z < 100 ? [-111,160] : mode === "eastbound overhead" ? [67,221] : [67,190];
            const slope = mode === "cyan" && p.x >= 24 && p.x < 49 ? .23 : 0;
            const height = mode === "high" && p.z > 140 ? 19 :
                mode === "strike" ? 7.9 :
                mode === "cyan" ? clamp(7.9+(p.x-24)*.23,7.9,13.5) : 13;
            input = pilot(p,Math.atan2(target[0]-p.x,target[1]-p.z),height,slope,0);
        }
        if (phase === 1) {
            if (!comparisonBaseline && mode === "cockpit mail" && !verifyCockpitMail) {
                engine.select_view(1);
                verifyCockpitMail = true;
            }
            if (mode === "tower impact") {
                const bearing = Math.atan2(228-p.x,359-p.z);
                input = pilot(p,bearing,51,0,16);
                step(input);
                continue;
            }
            if (mode === "riverside") {
                assert(surveyCruise, "the survey reached roof clearance before leaving the launch corridor");
                if (!comparisonBaseline && !checkedPortraitDrop && p.y >= 35) {
                    if (portraitCockpitSteps === 0) {
                        engine.select_view(1);
                        verifyCockpitMail = true;
                    }
                    if (portraitCockpitSteps === 14) {
                        assert.equal(marker([.99,.72,.29]).length, 105, "the anchored DROP objective is still generated in tall portrait cockpit");
                        assert.equal(marker([.035,.095,.10]).length, 24, "the directional fallback remains when the high cockpit can look over the target");
                        assert.equal(marker([.99,.91,.71]).length,228,"the live transition has fully reached portrait cockpit");
                        checkedPortraitDrop = true;
                    }
                    portraitCockpitSteps++;
                }
                if (surveyEast && p.z > 447 && p.x > 315 && p.x < 435 && p.y > 19) {
                    assert(comparisonBaseline || checkedPortraitDrop, "the northeast survey exercised a high cockpit portrait cue");
                    return {result: "northeast reach", position: p};
                }
                if (p.x >= 310 && p.z >= 240 && p.z <= 310) surveyEast = true;
                const target = surveyEast ? [368, 468] : [332, 272];
                input = pilot(p, Math.atan2(target[0]-p.x, target[1]-p.z), 38, 0, 16);
                step(input,1/30,portraitCockpitSteps > 0 ? .45 : 1.65);
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
            input = pilot(p,mode === "eastbound overhead" ? 1.5707963 : Math.atan2(109-p.x,218-p.z),mode === "high" ? 20 : 11,0,32);
            if (!comparisonBaseline && mode === "normal" && status === 9 && !checkedPredictedImpact) {
                const impactColor = [.44,.84,1];
                const observedImpact = marker(impactColor);
                assert.equal(observedImpact.length,15,"impact geometry is two brackets and one visible central face");
                const tip = observedImpact.reduce((a,b) => a[1]<b[1] ? a : b);
                assert((tip[0]-109)**2 + (tip[2]-218)**2 <= 90.26,
                    "the Wosy pipper points inside the same legal impact circle while release is ready");
                assert(Math.abs(tip[1]-.28)<.001 && Math.hypot(tip[0]-frame[37],tip[2]-frame[39])<1.53,
                    "the guide is at surface height directly beneath the aircraft, with at most one interpolated step of lag");
                checkedPredictedImpact = true;
            }
            if (!comparisonBaseline && mode === "early" && status === 8) {
                const impact = marker([.44,.84,1]);
                assert(impact.length > 0,"a valid-height early approach previews the actual miss");
                const tip = impact.reduce((a,b) => a[1]<b[1] ? a : b);
                assert((tip[0]-109)**2 + (tip[2]-218)**2 > 90.24,"the early pipper stays outside the actual drop circle");
                step(input|128);
                assert.equal(frame[26],8,"an early input is rejected by the Wosy release gate");
                assert.equal(frame[20],1,"early mail does not launch");
                assert.equal(frame[36],0,"a rejected predicted miss cannot start the cinematic or count a delivery");
                assert.equal(frame[31],0);
                return {result:"early release rejected"};
            }
            if (mode === "high" && status === 5) {
                if (!comparisonBaseline) assert.equal(marker([.44,.84,1]).length,0,"above the drop window, do not show an actionable prediction");
                step(input|128);
                assert.equal(frame[26],5);
                assert.equal(frame[20],1,"late/high mail cannot be scored in flight");
                observer?.finish("invalid release");
                return {result:"invalid release"};
            }
            if (status === 9) {
                releaseHeading = p.angle;
                if (mode === "eastbound overhead") {
                    assert(Math.abs(difference(releaseHeading,.80))>.53,
                        "this real eastbound heading is outside the removed alignment gate");
                    step(input|128);
                    assert.equal(frame[20],5,"a valid overhead release succeeds outside the old heading window");
                    const groundPoint=[frame[37],frame[39]];
                    for(let k=0;k<70 && frame[20]===5;k++) step(pilot(aircraftPose(),releaseHeading,11,0,32));
                    assert.equal(frame[31],1,"the eastbound parcel counts on impact through real gameplay");
                    assert.equal(frame[20],2);
                    return {result:"eastbound delivered",heading:releaseHeading,groundPoint};
                }
                input |= 128;
            }
        }
        if (phase === 5 || phase === 2) {
            if (!comparisonBaseline && course === 1 && mode === "normal") {
                assert(checkedPredictedImpact,"a completed ordinary Paris release was observed with a visible prediction");
                assert.equal(marker([.99,.72,.29]).length, 0, "the delivery objective clears after release");
                assert.equal(marker([.44,.84,1]).length,0,"the prediction does not linger after release");
            }
            const final = course ? 290 : 331, endX = course ? 125 : -15;
            const bearing = p.z >= final-13 ? 0 : clamp(Math.atan2(endX-p.x,Math.max(22,final+8-p.z)),-.38,.38);
            const target = final+(course?15:10), slope = course?-.207:-.133;
            const height = Math.min(12.3,1+(p.z-target)*slope);
            input = pilot(p,bearing,height,height<12.3?slope:0,p.z>final-50?32:0);
        }
        step(input);
    }
    assert.equal(confirmed, frame[32], "for each scored gate, the mesh confirms the score");
    if (!comparisonBaseline && frame[22] === 1) {
        assert.equal(frame[35], 0, "the actual Wosy ring flash has expired by landing");
        assert.equal(marker([.22,1,.43]).length, 0);
        assert.equal(marker([.23,.58,.43]).length, frame[32]*84, "earned rings remain marked after the flash");
    }
    observer?.finish();
    if (!comparisonBaseline && course === 0 && mode === "normal")
        assert(movingCart,"ordinary Wright descent encounters the actively moving supply cart");
    if(!comparisonBaseline && course===1 && (mode==="normal" || mode==="cockpit mail")) {
        assert(seenFalling>10 && seenContact>18 && returnedAfterContact,
            "a complete ordinary sortie uses pouch-follow, holds actual impact, then returns to landing");
        if(mode==="cockpit mail") assert(cockpitAtRelease && returnedCockpit);
    }
    if (!comparisonBaseline && course === 1 && (mode === "normal" || mode === "cyan"))
        assert(movingSeine,"ordinary Paris controls observe a real moving market boat and wake");
    if (mode === "riverside" || mode === "county") return {result: frame[22], phase:frame[20], position: aircraftPose(), surveyCruise, surveyEast};
    return {result:frame[22], course, visited, time:frame[17], data:packet, actions:frame[31], gates:frame[32], route:frame[25], releaseHeading, impactTrace};
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
const wreckVertexCounts = [[60,210,348,60,60,42], [30,156,258,114,42,60]];
const intactVertexCounts = [720,594];
function wreckMesh(course, intact = false) {
    const vertices = intact ? intactVertexCounts[course] : wreckVertexCounts[course].reduce((a,b) => a+b,0);
    const floats = vertices*6;
    assert(aircraft.length >= floats && aircraft.length <= 2048*6,
        "actual airframe geometry remains inside the original aircraft arena");
    return aircraft.subarray(-floats);
}
function wreckGroup(course, part) {
    const counts = wreckVertexCounts[course];
    const offset = counts.slice(0,part).reduce((a,b) => a+b,0);
    const points = wreckMesh(course).subarray(offset*6,(offset+counts[part])*6);
    return Array.from({length: counts[part]}, (_,i) => points.slice(i*6,i*6+3));
}
function wreckYRange(course, part) {
    const y = wreckGroup(course, part).map(([,y]) => y);
    assert(y.every(Number.isFinite));
    return [Math.min(...y),Math.max(...y)];
}
function wreckCenters(course) {
    return wreckVertexCounts[course].map((_,part) => {
        const piece = wreckGroup(course,part);
        return [0,1,2].map(axis => {
            const values = piece.map(point => point[axis]);
            return (Math.min(...values)+Math.max(...values))/2;
        });
    });
}
function intactColors(course) {
    const points = wreckMesh(course,true);
    return Array.from({length: points.length/6}, (_,i) => Array.from(points.slice(i*6+3,i*6+6)).join(","));
}
const originalColorOrder = [];
if (!comparisonBaseline) for (const course of [0,1]) {
    engine.select_view(0);
    reset(course);
    originalColorOrder.push(intactColors(course));
}
const impact = sortie(1,"strike");
assert.equal(impact.result,8,"failing to climb out of the low route hits the bridge");
if (!comparisonBaseline) {
    assert.equal(frame[36],1,"fatal bridge contact starts a separate wreck presentation");
    const atImpact = aircraft.slice();
    const bridgeTime = frame[17];
    const trace = impact.impactTrace;
    const last = trace.at(-1);
    assert(last.dt === 1/30 && trace.length > 20,"ordinary bridge expects one more flight step at impact");
    engine.select_view(0);
    reset(1);
    for (const sample of trace.slice(0,-1)) tick(sample.input,sample.dt,.45);
    assert.equal(frame[22],0,"the related ordinary trace really is one step short of impact");
    tick(last.input,0.124,.45);
    assert.equal(frame[22],8);
    assert.equal(frame[17],bridgeTime,"extra hitch substeps are wreck time only");
    assert.equal(frame[36],1);
    assert.deepEqual(intactColors(1),originalColorOrder[1],
        "the first public result preserves the entire exterior even if a hitch already stepped wreck physics twice");
    const hitchIntact = wreckMesh(1,true).slice();
    tick(0,0,.45);
    assert.deepEqual(wreckMesh(1,true),hitchIntact,"a zero-dt reprojection does not consume the intact transition");
    tick(0,.017,.45);
    assert.notDeepEqual(wreckMesh(1,true),hitchIntact,"a subsequent timed frame shows the naturally advanced fragments");
    assert(wreckMesh(1).every(Number.isFinite));
    assert.equal(sortie(1,"strike").result,8,"restore ordinary bridge after the asymmetric cadence test");
    assert.deepEqual(intactColors(1),originalColorOrder[1],"first bridge frame is the exact intact Santos Dumont airframe");
    const first = wreckMesh(1,true);
    const flags = first.filter((_,i) => i%6===3 && Math.abs(first[i]-.035)<.001);
    assert.equal(flags.length,6,"the intact Brazilian flag stays visible at impact");
    const clock = frame[17], before = frame.slice();
    engine.select_view(1);
    tick(128,0,.45);
    assert.deepEqual(frame.subarray(16),before.subarray(16),"camera changes and zero dt cannot advance the crash");
    engine.cancel_drop();
    for(let i=0;i<28;i++) tick(20,1/30,.45);
    assert.equal(frame[36],1,"debris is still active after the first second");
    assert.equal(frame[17],clock,"the fixed mission clock is frozen at actual impact");
    assert.notDeepEqual(aircraft,atImpact,"gravity and collision move the real Wosy wreck mesh");
    const parted = wreckCenters(1);
    assert(Math.hypot(...parted[1].map((v,i) => v-parted[2][i]))>7,
        "the actual left and right wing stacks separate rather than replacing the aircraft with slabs");
    assert(wreckMesh(1).every(Number.isFinite),"all six authentic rendered groups are finite");
    for(let i=0;i<340 && frame[36]!==0;i++) tick(128,1/30,.45);
    assert.equal(frame[36],0,"the result is ready after the visual-only crash clock ends");
    assert.equal(frame[22],8,"cinematic physics never changes the cause of the loss");
    assert.equal(frame[17],clock,"controls during the scene never advance or record mission progress");
    const wreck = aircraft.slice();
    tick(0,1/30,.45);
    assert.deepEqual(aircraft,wreck,"the completed wreck stays on the terrain behind the result");
    engine.select_view(0);
    assert.equal(sortie(1,"strike").result,8,"the same low route repeats the same impact");
    for(let i=0;i<1330 && frame[36]!==0;i++) tick(i%3?4:128,1/120,.45);
    assert.equal(frame[36],0,"120 Hz presentation also reaches the completed verdict");
    assert.deepEqual(aircraft,wreck,"debris gravity and obstacle response share fixed 30 Hz steps");
    engine.select_view(1);
    reset(1);
    assert.equal(frame[36],0,"retry clears the wreck");
    assert.equal(marker([.99,.91,.71]).length,228,"retry immediately retained the user-selected cockpit");
    const cockpit = frame.slice();
    engine.select_view(0); tick(0,0);
    assert.deepEqual(frame,cockpit,"zero dt does not jump away from the retried cockpit");
    for(let i=0;i<14;i++) tick(0);
    assert.equal(marker([.99,.91,.71]).length,0,"running presentation reaches chase after a retry");
}
assert.equal(sortie(0,"overrun").result,9,"pickup overrun remains an explicit failure");
if(!comparisonBaseline) {
    assert.equal(frame[36],0,"rollout overrun is not an impact cinematic");
    const wreckMajorHeight=()=>Math.max(...[0,1,2].map(i=>wreckYRange(1,i)[1]));
    const ground=sortie(1,"ground impact");
    assert.equal(ground.result,7,"an ordinary fatal touchdown reaches terrain without a clearance");
    assert.equal(frame[19],1);
    assert.equal(frame[36],1);
    for(let i=0;i<340 && frame[36]!==0;i++) tick(0,1/30,.45);
    assert.equal(frame[36],0);
    for(let part=0;part<6;part++) {
        const [low,high]=wreckYRange(1,part);
        assert(low>-.08 && high<5,"all six parts of a terrain crash end at ground support");
    }
    const tower=sortie(1,"tower impact");
    assert.equal(tower.result,2,"an ordinary high strike reaches a real geometry collider");
    assert(frame[19]>39,"the real contact starts too high for the former short cap");
    const contactHeight=frame[19];
    assert.equal(frame[36],1);
    for(let i=0;i<84;i++) tick(0,1/30,.45);
    assert.equal(frame[36],1,"high debris is still falling past the former cap");
    assert(wreckMajorHeight() < contactHeight-8,"the live exterior camera follows the descending core and both wings");
    tick(0,0,1.65);
    verifyCueProjection("high fall frames all six fragments",()=>wreckCenters(1),.08,.08);
    for(let i=0;i<340 && frame[36]!==0;i++) tick(0,1/30,.45);
    assert.equal(frame[36],0,"the support fallback is bounded");
    tick(0,0,1.65);
    verifyCueProjection("settled high view fits all six fragments",()=>wreckCenters(1),.08,.08);
    for(let part=0;part<6;part++) {
        const [low,high]=wreckYRange(1,part);
        const [x,,z] = wreckCenters(1)[part];
        const deck = Math.abs(x-228)<8.35 && Math.abs(z-359)<8.35 && low>45.66 && low<47 && high<50;
        assert((low>-.08 && high<contactHeight-15) || deck,
            `high-impact group ${part} descends to ground/lower support or settles visibly above the real observation deck, never suspended inside it (${low},${high})`);
    }
}
if (!comparisonBaseline) {
    assert([2,4,5,6,7,8,10].includes(sortie(0,"farm impact").result),
        "ordinary Wright controls hit terrain on an unsafe low crop leg");
    assert.equal(frame[36],1);
    assert.deepEqual(intactColors(0),originalColorOrder[0],"first Wright wreck frame is the original airframe, with US markings");
    for(let i=0;i<24;i++) tick(0,1/30,.45);
    assert(wreckMesh(0).every(Number.isFinite),"all six Wright airframe groups remain real geometry");
    for(let i=0;i<340 && frame[36]!==0;i++) tick(0,1/30,.45);
    assert.equal(frame[36],0);
    for(let part=0;part<6;part++) {
        const [low,high]=wreckYRange(0,part);
        assert(low>-.08 && high<6,"all six Wright fragments settle on terrain rather than disappearing");
    }
}
function inspectSolidRoute(course, targetX, surfaceZ, height) {
    engine.select_view(0);
    reset(course);
    for (let i=0;i<1200 && frame[22]===0;i++) {
        const p = aircraftPose();
        if (p.z > surfaceZ+12) return {result:0, position:p};
        const toward = Math.atan2(targetX-p.x,Math.max(8,surfaceZ-8-p.z));
        const input = frame[20]===6 ? 20 : pilot(p,toward,height,0,0);
        tick(input,1/30);
        if (frame[22]!==0) return {result:frame[22],position:p, alt:frame[19], cinematic:frame[36]};
    }
    return {result:frame[22], stall:true};
}
if (!comparisonBaseline) {
    for (const [course,sx,sz] of [[0,3.5,113],[1,-89,-26]]) {
        const close = inspectSolidRoute(course,sx+3.5,sz+3,5.65);
        assert.equal(close.result,2,`course ${course}'s roof sign is solid above its roof: ${JSON.stringify(close)}`);
        assert(Math.abs(close.position.x-sx-3.5)<1.5 && Math.abs(close.position.z-sz-3)<2 &&
            close.alt>4.34 && close.alt<6.53 && close.cinematic===1,
            "the actual roof-level strike occurs at the visible sign instead of the shed");
        const alongside = inspectSolidRoute(course,sx+.28,sz+3,5.65);
        assert(alongside.result===0 && !alongside.stall,
            `course ${course} keeps the visible gap to the sign open: ${JSON.stringify(alongside)}`);
    }
    const peak = inspectSolidRoute(0,-61,152,17.4);
    assert.equal(peak.result,2,`the actual west barn gable hits above the former 17m cuboid: ${JSON.stringify(peak)}`);
    assert(peak.alt>17 && peak.alt<18 && Math.abs(peak.position.x+61)<1.5 &&
        Math.abs(peak.position.z-152)<2 && peak.cinematic===1);
    const shoulder = inspectSolidRoute(0,-49,152,16.1);
    assert(shoulder.result===0 && !shoulder.stall,
        `ordinary flight threads visible air above the sloped barn shoulder: ${JSON.stringify(shoulder)}`);
}
const noCargo = sortie(0,"no cargo");
assert(noCargo.visited.has(9) && !noCargo.visited.has(10) && !noCargo.data,"throttling without loading cargo never advances the mission");
assert.equal(sortie(1,"high").result,"invalid release");
if (!comparisonBaseline) {
    assert.equal(sortie(1,"early").result,"early release rejected");
    assert.equal(sortie(1,"cockpit mail").result,1,"capturing the same mail shot restores an independently selected cockpit");
    const side=sortie(1,"eastbound overhead");
    assert.equal(side.result,"eastbound delivered");
    assert(Math.abs(difference(side.heading,goodParis.releaseHeading))>.25,
        "two distinct real approach headings can complete the same vertical delivery");
}
for (const {course, visited, result, time, data, actions, gates} of [goodFarm,goodParis,cyanParis]) {
    assert.equal(result,1,"complete delivery plus final stop earns a successful sortie");
    for (const phase of [6,7,8,9,10,2,3,...(course?[0,1,5]:[11])]) assert(visited.has(phase),`sortie passed phase ${phase}`);
    assert.equal(actions,course?1:3);
    assert(gates>0 && gates<=3,"timed gate score is earned by a real flight path");
    reset(1-course); reset(course);
    assert.equal(data[2],course === 1 && !comparisonBaseline ? 8 : 7);
    if(course===1 && !comparisonBaseline) {
        const legacy=data.slice(); legacy[2]=7;
        load(legacy); tick(0,0);
        assert.equal(frame[23],0,"a v7 Paris packet cannot enter the changed overhead rules");
    }
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
        if (!comparisonBaseline) {
            assert.equal(frame[35],0);
            assert.equal(marker([.23,.58,.43]).length,0,"an expired ring is not recorded as earned");
        }
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

if (!comparisonBaseline) {
    const rails = [[.67,.43,.23],[.34,.18,.12]];
    for (const completed of [goodFarm,goodParis]) {
        const course = completed.course;
        reset(1-course); reset(course);
        load(completed.data);
        tick(0,0);
        assert.equal(frame[23],completed.time, "the approved full replay is actually loaded");
        engine.select_view(1);
        const wing = course ? [.96,.96,.86] : [.98*1.12,.83*1.12,.58*1.12];
        const ghostWing = wing.map((component,index) => component*.19+[.28,.72,.78][index]);
        let seen = false;
        for (let n=0;n<160;n++) {
            tick(0,1/30,.54);
            if (!marker(ghostWing).length) continue;
            assert.equal(marker(ghostWing).length,6,"the actual separate replay aircraft is in the cockpit's moving mesh");
            assert.equal(marker(wing).length,0,"only the replay's wings are drawn here");
            assert.equal(marker(rails[course]).length,12);
            assert.equal(marker([.99,.91,.71]).length,228,"the full ink remains with a separate replay aircraft");
            assert.equal(marker([1,.66,.19]).length,84,"the active ring remains under real replay rendering");
            const live = aircraft.length/6;
            // Max independent constituents: cockpit 918, Wright ghost 720,
            // three 84-vertex gates, 30 arrow, 18 crop strips and 84 plume.
            // Paris cockpit/ghost are smaller; even DROP (114 + 24 impact)
            // fits with their three gates and arrow. Mission sign phases exclude.
            assert(live <= 2022 && live < 2048,"live artwork fits the interval mesh allocation");
            seen = true;
            break;
        }
        assert(seen,"the recorded flight genuinely moved more than 11 m from the stationary pilot");
        engine.select_view(0);
    }
}

if (!comparisonBaseline) {
    const eyeZ = () => {
        const [a,b,c,d,e,f,g,h,i] = [frame[0],frame[4],frame[8],frame[1],frame[5],frame[9],frame[3],frame[7],frame[11]];
        const det = a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);
        return (-(d*h-e*g)*frame[12]-(g*b-h*a)*frame[13]-(a*e-b*d)*frame[15])/det;
    };
    for (const aspect of [1.65,.45]) {
        engine.select_view(0);
        reset(0);
        tick(0,0,aspect);
        const chase = frame.slice(), startZ = eyeZ();
        engine.select_view(1);
        tick(0,0,aspect);
        assert.deepEqual(frame,chase,"select_view queues a live transition without a paused camera jump");
        let prev = startZ;
        const partial = new Set();
        for (let i=0; i<14; i++) {
            tick(0,1/30,aspect);
            const current = eyeZ();
            for (let k=3;k<aircraft.length;k+=6) {
                if (aircraft[k] < 0) partial.add(Math.floor((-aircraft[k]-1)*.5));
            }
            assert(current >= prev-.001 && current-prev < 2.2,"chase-to-cockpit translation is eased and monotone");
            prev = current;
        }
        assert(partial.size >= 3 && [...partial].every(x=>x>=0 && x<16),"physical meshes use multiple fade coverage steps before settling");
        assert(Math.abs(prev-startZ-18.25)<.003,"camera reaches the authored cockpit without lag");
        assert.equal(marker([.99,.91,.71]).length,228,"cockpit remains full after easing");
        engine.select_view(0);
        for (let i=0; i<6; i++) tick(0,1/30,aspect);
        const between = frame.slice();
        engine.select_view(1);
        tick(0,0,aspect);
        assert.deepEqual(frame,between,"reversing an in-progress live transition cannot jump");
        for (let i=0; i<14; i++) tick(0,1/30,aspect);
        assert(Math.abs(eyeZ()-prev)<.003,"retargeted camera reaches the same authored endpoint");
    }
    engine.select_view(0);
}

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
