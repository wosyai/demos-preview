import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const markup = await readFile(new URL('../voxel/index.html', import.meta.url), 'utf8');
for (const id of ['pause', 'fullscreen', 'camera-view', 'view-touch', 'jump-touch', 'descend-touch', 'flight-touch', 'remove', 'place']) {
  const button = markup.match(new RegExp(`<button[^>]+id="${id}"[^>]*>([\\s\\S]*?)</button>`));
  assert(button && /aria-label="[^"]+"/.test(button[0]) && /<svg /.test(button[1]), id + ' is an accessible icon button');
  assert.equal(button[1].replace(/<[^>]+>/g, '').trim(), '', id + ' has no persistent text label');
}
assert.match(markup, /<details class="entry-guide">[\s\S]*?<p class="camera-legend">[\s\S]*?href="#glyph-view"[\s\S]*?href="#glyph-person"[\s\S]*?Switch first \/ third person/);
assert.match(markup, /<header class="top">[\s\S]*?id="mission-hud"[\s\S]*?class="top-actions"[\s\S]*?<\/header>/);
assert.match(markup, /<details class="world-options">/);
assert.match(markup, /<h1 id="title">Pocket<br>Island/);

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

class Element {
  constructor() {
    this.handlers = new Map();
    this.classes = new Set();
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, force) => force ? this.classes.add(name) : this.classes.delete(name),
    };
    this.captures = new Set();
    this.properties = new Map();
    this.style = {
      setProperty: (name, value) => this.properties.set(name, value),
      removeProperty: (name) => this.properties.delete(name),
    };
    this.clientWidth = 800;
    this.clientHeight = 400;
    this.value = '471';
  }

  setAttribute(key, value) { this[key] = value; }
  addEventListener(name, fn) { this.handlers.set(name, fn); }
  dispatch(name, values = {}) {
    const event = { button: 0, prevented: false, preventDefault() { this.prevented = true; }, ...values };
    this.handlers.get(name)?.(event);
    if (name === 'pointerup' || name === 'pointercancel') this.releasePointerCapture(event.pointerId);
    return event;
  }

  replaceChildren(...children) { this.textContent = children.at(-1).trim(); }
  focus() {}
  getBoundingClientRect() { return { left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) {
    if (this.captures.delete(id)) this.dispatch('lostpointercapture', {pointerId: id});
  }
}

async function loadHost(caseId, startsLost = false, stored = null, mobile = false, modernOrientation = false) {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  const counters = { programs: 0, uploads: [], starts: 0, generations: 0, edits: [], controls: [], clears: 0, lockRequests: 0, lockExits: 0, selected: [], cycles: [], picked: 2, flying: false, grounded: true };
  const canv = node('scene');
  const doc = new Element(), win = new Element();
  if (modernOrientation) win.screen = {orientation: new Element()};
  node('move-stick').getBoundingClientRect = () => ({
    left: 10, top: 360, right: 156, bottom: 504, width: 146, height: 144,
  });
  const fetchResponse = deferred();
  const frames = new Map();
  const memory = new WebAssembly.Memory({ initial: 1 });
  Object.assign(counters, { seeds: [], parser: [], defaults: 0, stored: [], pulses: [], ticksWithPulses: [], atlasUploads: [], editStates: [], looks: [], updates: [], draws: [] });
  const pending = new Set(), held = new Set();
  let lost = startsLost;
  let frameId = 0, cameraThird = false, avatarActive = false;

  let waterPhase = 0, drawPass = -1, blend = false;
  let mission = 0;
  const gl = new Proxy({}, {
    get(_, name) {
      if (name === 'isContextLost') return () => lost;
      if (name === 'getProgramParameter' || name === 'getShaderParameter') return () => !lost;
      if (name === 'createProgram') return () => { assert(!lost); counters.programs++; return {}; };
      if (name === 'texImage2D') return (...args) => { assert(!lost); counters.atlasUploads.push([args[3],args[4],...args[8]]); };
      if (name === 'bufferData') return (_, data) => { assert(!lost); counters.uploads.push([...data]); };
      if (name === 'bufferSubData') return (_, offset, data) => {
        assert(!lost && offset === 0);
        counters.updates.push([...data]);
      };
      if (name === 'getUniformLocation') return (_, uniform) => uniform;
      if (name === 'useProgram') return () => { drawPass = -1; };
      if (name === 'uniform1i') return (uniform, value) => { if (uniform === 'pass') drawPass = value; };
      if (name === 'BLEND' || name === 'SRC_ALPHA' || name === 'ONE_MINUS_SRC_ALPHA') return name;
      if (name === 'enable') return (flag) => { if (flag === 'BLEND') blend = true; };
      if (name === 'disable') return (flag) => { if (flag === 'BLEND') blend = false; };
      if (name === 'blendFunc') return (src, dst) => {
        assert.deepEqual([src, dst], ['SRC_ALPHA', 'ONE_MINUS_SRC_ALPHA']);
      };
      if (name === 'drawArrays') return (_, first, count) => {
        assert.equal(first, 0);
        counters.draws.push([drawPass, count, blend]);
      };
      if (name.startsWith('create')) return () => { assert(!lost); return {}; };
      if (/^[A-Z_]+$/.test(name)) return 1;
      return () => {};
    },
  });
  const swatches = Array.from({ length: 6 }, (_, i) => {
    const swatch = node('slot-' + (i + 1));
    swatch.dataset = { material: (i + 1).toString() };
    return swatch;
  });
  const touch = [["jump-touch", "Space"], ["descend-touch", "KeyC"], ["remove", "KeyQ"], ["place", "KeyE"]].map(([id, move]) => {
    const button = node(id);
    button.dataset = { move };
    return button;
  });
  canv.getContext = () => gl;
  canv.requestPointerLock = () => { counters.lockRequests++; };
  const controls = ['enter', 'mission-start', 'mission-retry', 'apply-seed', 'random-seed'].map(node);
  for (const button of controls) button.disabled = true;
  const status = node('engine-status');
  status.textContent = 'Loading engine';
  node('error').hidden = true;
  Object.assign(doc, {
    getElementById: node,
    querySelector: node,
    querySelectorAll: (selector) => selector === "[data-material]" ? swatches : selector === "[data-move]" ? touch : [],
    createElement: node,
    createTextNode: (text) => text,
    exitPointerLock() {
      counters.lockExits++;
      doc.pointerLockElement = null;
      doc.dispatch('pointerlockchange');
    },
  });
  Object.assign(globalThis, {
    document: doc,
    window: win,
    HTMLInputElement: class extends Element {},
    matchMedia: () => ({ matches: mobile }),
    localStorage: { getItem() { return stored; }, setItem(key, seed) { counters.stored.push([key, seed]); } },
    devicePixelRatio: 1,
    fetch(url) {
      assert(url.pathname.endsWith('/voxel/engine.wasm'));
      assert.equal(url.search, '?v=typed-state-v1');
      return fetchResponse.promise;
    },
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout: () => 1,
    clearTimeout: () => {},
  });
  WebAssembly.instantiate = async (_, { showcase }) => {
    const instanceExports = {
      memory,
      _start() { counters.starts++; },
      control(action, active) {
        counters.controls.push([action, active]);
        if (active) {
          if (action === 7 && !held.has(action)) counters.flying = !counters.flying;
          held.add(action);
        } else held.delete(action);
      },
      pulse_control(action) {
        counters.pulses.push(action);
        if (action === 7) {
          if (!held.has(action)) counters.flying = !counters.flying;
        } else pending.add(action);
      },
      clear_controls() { counters.clears++; pending.clear(); held.clear(); },
      seed_begin(trim) { counters.parser.push({ trim, units: [] }); },
      seed_code_unit(unit) { counters.parser.at(-1).units.push(unit); return +!(unit === 88); },
      seed_end() {
        const call = counters.parser.at(-1);
        call.complete = true;
        const text = String.fromCharCode(...call.units);
        return text === '  -2147483648 ' && call.trim === 1
          ? -2147483648n : text === '7' && call.trim === 0 ? 7n : 2147483648n;
      },
      default_seed() { counters.defaults++; return 471; },
      generate(seed) {
        counters.seeds.push(seed);
        counters.generations++;
        mission = 0;
        if (counters.generations === 1) {
          new Uint8Array(memory.buffer, 6144, 8192).fill(127);
          showcase.atlas(6144,caseId === "invalid-atlas" ? 64 : 128,caseId === "invalid-atlas" ? 32 : 16);
        }
        showcase.water(0, 6);
        showcase.mesh(256, 3, 0);
      },
      start_beacon() { mission = 1; counters.missionStarts = (counters.missionStarts || 0) + 1; },
      leave_beacon() { mission = 0; counters.missionLeaves = (counters.missionLeaves || 0) + 1; },
      look(x, y) { counters.looks.push([x,y]); },
      cycle_camera() {
        counters.cameraToggles = (counters.cameraToggles || 0) + 1;
        cameraThird = !cameraThird;
        return Number(cameraThird);
      },
      tick(dt, aspect, active) {
        const showAvatar = Boolean(active && cameraThird);
        if (showAvatar !== avatarActive) {
          avatarActive = showAvatar;
          showcase.player(4096, showAvatar ? 3 : 0);
          showcase.aim(showAvatar ? -.4 : 0, showAvatar ? -.25 : 0);
        }
        if (active && dt > 0 && pending.size) {
          counters.ticksWithPulses.push([...pending]);
          pending.clear();
        }
        if (caseId === 'water-life' && active && dt > 0) {
          new Float32Array(memory.buffer, 0, 36).fill(++waterPhase / 16);
          showcase.water(0, 6);
          showcase.outline(1024, 2);
        }
        if (mission && counters.missionOverride !== undefined) mission = counters.missionOverride;
        new Float32Array(memory.buffer, 512, 30).set([
          +counters.flying, +counters.grounded, counters.picked, mission, mission === 3 ? 0 : .75, .50, 5, counters.relay ?? 0
        ], 22);
        showcase.frame(512, caseId === 'water-life' && active ? 1 : -1);
      },
      select_material(material) { counters.selected.push(material); counters.picked = material; },
      cycle_material(delta) { counters.cycles.push(delta); counters.picked += delta; },
      edit_control(mode, state) {
        counters.editStates.push([mode, state]);
        if (state === 0) return 0;
        counters.edits.push(mode === 1 ? counters.picked : 0);
        new Float32Array(memory.buffer,256,18).fill(0.25);
        showcase.mesh(256,3,0);
        return 1;
      },
    };
    return { instance: { exports: instanceExports } };
  };
  await import(new URL(`../voxel/main.js?host-test=${caseId}`, import.meta.url));
  const lostEvent = () => {
    lost = true;
    let prevented = false;
    canv.dispatch('webglcontextlost', { preventDefault() { prevented = true; } });
    assert(prevented, 'restoration must be enabled on context loss');
  };
  const restoredEvent = () => {
    lost = false;
    canv.dispatch('webglcontextrestored');
  };
  const resolveFetch = async (response = { ok: true, arrayBuffer: async () => new ArrayBuffer(0) }) => {
    fetchResponse.resolve(response);
    await new Promise((done) => setImmediate(done));
  };
  const grantLock = () => {
    doc.pointerLockElement = canv;
    doc.dispatch('pointerlockchange');
  };
  let mockTime = 0;
  const frame = () => {
    const [id, fn] = frames.entries().next().value;
    frames.delete(id); fn(mockTime += 16);
  };
  return { node, doc, win, counters, status, controls, frames, memory, lostEvent, restoredEvent, resolveFetch, grantLock, frame };
}

function disabled(host, state) {
  for (const button of host.controls) assert.equal(button.disabled, state);
}

const pending = await loadHost('lost-pending');
pending.lostEvent();
await pending.resolveFetch();
disabled(pending, true);
assert.equal(pending.status.textContent, 'Restoring graphics');
assert.equal(pending.counters.starts, 1);
assert.equal(pending.counters.uploads.length, 0);
assert.equal(pending.frames.size, 0);
pending.restoredEvent();
disabled(pending, false);
assert.equal(pending.status.textContent, 'Wosy · engine ready');
assert.equal(pending.counters.uploads.length, 2, 'restore needs both engine geometry buffers');
assert.equal(pending.frames.size, 1);
pending.node('enter').dispatch('click');
pending.doc.dispatch('keydown', { code: 'KeyW' });
assert.deepEqual(pending.counters.controls, [[0, 1]]);
pending.node('place').dispatch('click', {detail:0});
const editedMesh = Array(18).fill(0.25);
assert.deepEqual(pending.counters.edits, [2]);
assert.deepEqual(pending.counters.uploads.at(-1), editedMesh);
pending.lostEvent();
new Float32Array(pending.memory.buffer, 256, 18).fill(0);
disabled(pending, true);
assert.equal(pending.frames.size, 0);
assert.equal(pending.counters.clears, 1, 'held movement must clear on loss');
assert.equal(pending.counters.lockRequests, 1);
pending.grantLock();
assert.equal(pending.counters.lockExits, 1, 'late lock granted during loss must be released');
assert.equal(pending.doc.pointerLockElement, null);
const uploadsBeforeRestore = pending.counters.uploads.length;
pending.restoredEvent();
assert.equal(pending.counters.generations, 1, 'restore must not regenerate the island');
assert.deepEqual(pending.counters.edits, [2], 'restore must not repeat the edit');
assert.equal(pending.counters.uploads.length, uploadsBeforeRestore + 2);
assert.deepEqual(pending.counters.uploads[uploadsBeforeRestore], editedMesh, 'restore must upload retained edited geometry');
pending.node('enter').dispatch('click');
pending.doc.dispatch('keydown', { code: 'KeyW' });
assert.deepEqual(pending.counters.controls, [[0, 1], [0, 1]]);
assert.equal(pending.counters.lockRequests, 2);
pending.grantLock();
assert.equal(pending.counters.lockExits, 1, 'lock granted during play must be kept');
assert.equal(pending.doc.pointerLockElement, pending.node('scene'));

const early = await loadHost('restored-pending');
early.lostEvent();
early.restoredEvent();
disabled(early, true);
assert.equal(early.status.textContent, 'Loading engine');
assert.equal(early.frames.size, 0);
await early.resolveFetch();
disabled(early, false);
assert.equal(early.counters.programs, 4, 'two graphics programs per context');
assert.equal(early.frames.size, 1);

const initiallyLost = await loadHost('already-lost', true);
await initiallyLost.resolveFetch();
disabled(initiallyLost, true);
assert.equal(initiallyLost.counters.programs, 0);
assert.equal(initiallyLost.counters.starts, 1);
initiallyLost.restoredEvent();
disabled(initiallyLost, false);
assert.equal(initiallyLost.counters.programs, 2);
assert.equal(initiallyLost.frames.size, 1);

const failed = await loadHost('fetch-error-lost');
failed.lostEvent();
const warn = console.warn;
try {
  console.warn = () => {};
  await failed.resolveFetch({ ok: false, status: 404 });
} finally {
  console.warn = warn;
}
failed.restoredEvent();
disabled(failed, true);
assert.equal(failed.status.textContent, 'Engine unavailable');
assert.equal(failed.node('error').hidden, false);
assert.equal(failed.frames.size, 0);

console.log('Verified host boot across WebGL loss/restoration, edited mesh retention and movement reset.');

const creative = await loadHost('creative');
await creative.resolveFetch();
creative.node('enter').dispatch('click');
creative.frame();
assert.equal(creative.node('slot-2')['aria-pressed'], 'true');
assert.equal(creative.node('player-state').textContent, 'On foot');
creative.doc.dispatch('keydown', { code: 'Digit4' });
assert.equal(creative.node('slot-4')['aria-pressed'], 'false', 'hotbar waits for Wosy confirmation');
creative.frame();
assert.equal(creative.node('slot-4')['aria-pressed'], 'true');
creative.doc.dispatch('wheel', { target: creative.node('scene'), deltaY: 2 });
assert.deepEqual(creative.counters.cycles, [1]);
creative.node('slot-6').dispatch('click');
creative.frame();
assert.equal(creative.node('slot-6')['aria-pressed'], 'true');
assert.deepEqual(creative.counters.selected, [4, 6]);
creative.node('place').dispatch('click', {detail:0});
creative.node('remove').dispatch('click', {detail:0});
assert.deepEqual(creative.counters.edits, [6, 0]);
creative.doc.dispatch('keydown', { code: 'Space' });
creative.doc.dispatch('keyup', { code: 'Space' });
creative.node('flight-touch').dispatch('click');
creative.frame();
assert.deepEqual(creative.counters.controls, [[4, 1], [4, 0]]);
assert.deepEqual(creative.counters.pulses, [7]);
assert.equal(creative.node('jump-touch')['aria-label'], 'Rise');
assert.equal(creative.node('descend-touch').hidden, false);
assert.equal(creative.node('flight-touch')['aria-pressed'], 'true');
assert.equal(creative.node('player-state').textContent, 'Flying');
creative.node('flight-touch').dispatch('click');
creative.node('flight-touch').dispatch('click');
creative.frame();
assert.equal(creative.node('flight-touch')['aria-pressed'], 'true', 'two rapid taps cancel');
creative.doc.dispatch('keydown', { code: 'KeyF' });
creative.node('flight-touch').dispatch('click');
creative.frame();
assert.equal(creative.node('flight-touch')['aria-pressed'], 'false', 'physical F suppresses a concurrent touch toggle');
creative.doc.dispatch('keyup', { code: 'KeyF' });
console.log('Creative host smoke passed: 30-float HUD, Wosy material authority, keyboard/wheel/touch inputs, and selected placement.');

const accessible = await loadHost('accessible');
await accessible.resolveFetch();
accessible.node('enter').dispatch('click');
const jump = accessible.node('jump-touch');
const transitions = accessible.counters.controls;

jump.dispatch('click',{detail:0});
assert.deepEqual(transitions,[]);
assert.deepEqual(accessible.counters.pulses,[4]);
accessible.frame();
accessible.frame();
assert.deepEqual(accessible.counters.ticksWithPulses,[[4]]);
assert.deepEqual(transitions,[],'host may not synthesize control edges');
jump.dispatch('pointerdown',{pointerId:12});
jump.dispatch('pointerup',{pointerId:12});
jump.dispatch('click',{detail:1});
assert.deepEqual(transitions,[[4,1],[4,0]],'ordinary pointer click must not duplicate edges');
assert.deepEqual(accessible.counters.pulses,[4],'ordinary pointer click must not add pulse');
accessible.doc.dispatch('keydown', { code:'Space' });
jump.dispatch('click',{detail:0});
accessible.frame();
assert.deepEqual(transitions.slice(-2),[[4,0],[4,1]],'pulse must not touch a live keyboard hold');
accessible.doc.dispatch('keyup',{code:'Space'});
assert.deepEqual(transitions.slice(-2),[[4,1],[4,0]]);
jump.dispatch('click',{detail:0});
assert.deepEqual(accessible.counters.pulses,[4,4,4]);
accessible.lostEvent();
assert.equal(accessible.counters.clears,1);
accessible.restoredEvent();
accessible.node('enter').dispatch('click');
accessible.frame();
accessible.frame();
assert.deepEqual(accessible.counters.ticksWithPulses,[[4],[4]],'engine reset consumes stale pulse');
assert.deepEqual(transitions,[[4,1],[4,0],[4,1],[4,0]]);
console.log('Accessible pulse delegates exactly once; physical overlaps and graphics reset preserved.');

const parsed = await loadHost('engine-parses-seed', false, '7');
await parsed.resolveFetch();
assert.deepEqual(parsed.counters.seeds,[7]);
assert.deepEqual(parsed.counters.parser,[{trim:0,units:[55],complete:true}]);
assert.equal(parsed.counters.defaults,0);
const title = parsed.node('seed');
const form = parsed.node('seed-form');
const full = '  -2147483648 ';
title.value = full;
form.dispatch('submit');
assert.deepEqual(parsed.counters.seeds,[7,-2147483648]);
assert.deepEqual(parsed.counters.parser.at(-1),{
  trim:1,units:Array.from(full, (char) => char.charCodeAt(0)),complete:true
},'form must pass original whitespace and use Wosy trim policy');
assert.equal(title.value,'-2147483648');
title.value = '';
form.dispatch('submit');
assert.deepEqual(parsed.counters.parser.at(-1),{trim:1,units:[],complete:true});
assert.equal(parsed.counters.seeds.length,2,'sentinel must not generate a world');
title.value = 'X123';
form.dispatch('submit');
assert.deepEqual(parsed.counters.parser.at(-1),{trim:1,units:[88]});
assert.equal(parsed.counters.seeds.length,2,'Wosy invalid code unit must reject even if rest was digits');
title.value = '🌱';
form.dispatch('submit');
assert.deepEqual(parsed.counters.parser.at(-1),{trim:1,units:[0xd83c,0xdf31],complete:true});
assert.equal(parsed.counters.seeds.length,2,'supplementary characters must be passed as UTF-16 units');

const fallback = await loadHost('fallback-default', false, ' 8 ');
await fallback.resolveFetch();
assert.equal(fallback.counters.defaults,1);
assert.deepEqual(fallback.counters.seeds,[471]);
assert.deepEqual(fallback.counters.parser,[{trim:0,units:[32,56,32],complete:true}]);
assert.deepEqual(fallback.counters.stored,[['wosy-voxel-seed','471']]);
console.log('Seed host smoke passed: literal UTF-16 code units, Wosy defaults/trim/range sentinel, canonical persistence.');

const edits = await loadHost('batched-editor');
await edits.resolveFetch();
const canvas = edits.node('scene');
assert.deepEqual(edits.counters.atlasUploads.map((a) => a.slice(0,3)), [[128,16,127]]);
edits.node('enter').dispatch('click');
edits.grantLock();
edits.doc.dispatch('mousedown',{button:0,target:canvas});
edits.doc.dispatch('mousedown',{button:2,target:canvas});
edits.doc.dispatch('keydown',{code:'KeyQ'});
edits.doc.dispatch('mouseup',{button:0,target:canvas});
assert.deepEqual(edits.counters.editStates,[[0,1],[1,1]],'Q retains a still-held break');
edits.doc.dispatch('keyup',{code:'KeyQ'});
edits.doc.dispatch('mouseup',{button:2,target:canvas});
assert.deepEqual(edits.counters.editStates,[[0,1],[1,1],[0,0],[1,0]]);
const place = edits.node('place');
place.dispatch('pointerdown',{pointerId:17});
canvas.dispatch('pointerdown',{pointerId:18,pointerType:'touch',button:0,clientX:240,clientY:120});
edits.doc.exitPointerLock();
edits.node('enter').dispatch('click');
place.dispatch('pointerdown',{pointerId:17});
canvas.dispatch('pointerdown',{pointerId:18,pointerType:'touch',button:0,clientX:240,clientY:120});
canvas.dispatch('pointermove',{pointerId:18,clientX:255,clientY:133});
assert.deepEqual(edits.counters.looks.at(-1),[15,13]);
canvas.dispatch('pointercancel',{pointerId:18});
assert.deepEqual(edits.counters.editStates.at(-1),[1,1],'look cancellation must not stop place hold');
place.dispatch('pointerup',{pointerId:17});
place.dispatch('click',{detail:1});
assert.deepEqual(edits.counters.editStates.slice(-2),[[1,1],[1,0]],'ordinary click must not repeat');
place.dispatch('click',{detail:0});
assert.deepEqual(edits.counters.editStates.at(-1),[1,2]);
const position = {pointerId:19,pointerType:'mouse',button:0,clientX:220,clientY:90};
canvas.dispatch('pointerdown',position);
canvas.dispatch('pointerup',position);
assert.deepEqual(edits.counters.editStates.at(-1),[0,2],'unlocked left tap breaks once');
const beforeDrag = edits.counters.editStates.length;
canvas.dispatch('pointerdown',position);
canvas.dispatch('pointermove',{...position,clientX:236});
canvas.dispatch('pointerup',{...position,clientX:236});
assert.equal(edits.counters.editStates.length,beforeDrag,'unlocked drag is only a look');
edits.lostEvent();
new Uint8Array(edits.memory.buffer,6144,8192).fill(0);
edits.restoredEvent();
assert.deepEqual(edits.counters.atlasUploads.map((a) => a.slice(0,3)), [[128,16,127],[128,16,127]],'restore must replay copied atlas, not zeroed WASM memory');
console.log('Pixel atlas + break/build host tests passed: held overlap, mouse chords, touch cancellation, tap-vs-drag and retained atlas.');

const invalidAtlas = await loadHost('invalid-atlas');
try {
  console.warn = () => {};
  await invalidAtlas.resolveFetch();
} finally {
  console.warn = warn;
}
disabled(invalidAtlas, true);
assert.equal(invalidAtlas.status.textContent, 'Engine unavailable');
assert.equal(invalidAtlas.counters.atlasUploads.length, 0);
assert.equal(invalidAtlas.node('error').hidden, false);
console.log('Same-byte-count malformed atlas dimensions rejected before GPU upload.');

const cleared = await loadHost('repeat-after-blur');
await cleared.resolveFetch();
cleared.node('enter').dispatch('click');
cleared.grantLock();
for (const code of ['KeyQ', 'KeyE', 'KeyF', 'KeyW']) {
  cleared.doc.dispatch('keydown', {code, repeat:false});
}
window.dispatch('blur');
assert.deepEqual(cleared.counters.editStates, [[0,1],[1,1]]);
assert.deepEqual(cleared.counters.controls, [[7,1],[0,1]]);
let prevented = 0;
for (const code of ['KeyQ', 'KeyE', 'KeyF', 'KeyW', 'Digit3']) {
  cleared.doc.dispatch('keydown', {code, repeat:true, preventDefault() { prevented++; }});
}
assert.equal(prevented, 5);
assert.deepEqual(cleared.counters.editStates, [[0,1],[1,1]]);
assert.deepEqual(cleared.counters.controls, [[7,1],[0,1]]);
assert.deepEqual(cleared.counters.selected, []);
for (const code of ['KeyQ', 'KeyE', 'KeyF', 'KeyW']) {
  cleared.doc.dispatch('keyup', {code});
  cleared.doc.dispatch('keydown', {code, repeat:false});
}
assert.deepEqual(cleared.counters.editStates, [[0,1],[1,1],[0,1],[1,1]]);
assert.deepEqual(cleared.counters.controls, [[7,1],[0,1],[7,1],[0,1]]);
console.log('Blur reset ignored repeated key-down and accepted a fresh press.');

const page = await readFile(new URL('../voxel/index.html', import.meta.url), 'utf8');
assert.match(page, /<html lang="en">/);
assert.match(page, /<title>Pocket Island • Wosy<\/title>/);
assert.match(page, /href="\.\/style\.css\?v=beacon-5"/);
assert.match(page, /src="\.\/main\.js\?v=typed-state-v1"/);
assert.match(page, /id="move-stick"/);
assert.doesNotMatch(page, /class="dpad"|data-move="Key[WASD]"/);
assert.match(page, /title="Dirt · 2"/);

const mobile = await loadHost('mobile-stick', false, null, true, true);
await mobile.resolveFetch();
mobile.node('enter').dispatch('click');
const touchPoint = (pointerId, clientX, clientY) => ({pointerId, pointerType:'touch', clientX, clientY});
const stick = mobile.node('move-stick'), scene = mobile.node('scene');
const base = touchPoint(36, 78, 418), shift = (dx, dy, point = base) =>
  ({...point, clientX:point.clientX + dx, clientY:point.clientY + dy});
const go = (dx, dy) => stick.dispatch('pointermove', shift(dx, dy));
assert.equal(mobile.counters.lockRequests, 0, 'touch playback never needs pointer lock');
assert.equal(stick.dispatch('pointerdown',base).prevented,true);
assert.equal(stick.captures.has(36),true);
go(5,5);
assert.deepEqual(mobile.counters.controls, [], 'deadzone is neutral');
go(24,-25);
assert.deepEqual(mobile.counters.controls, [[0,1],[3,1]],'diagonal holds both Wosy inputs');
go(14,-14);
assert.deepEqual(mobile.counters.controls, [[0,1],[3,1]],'sub-engage motions retain a held direction via hysteresis');
const lookPoint = touchPoint(37, 246, 202);
scene.dispatch('pointerdown',lookPoint);
scene.dispatch('pointermove',shift(25,-16,lookPoint));
assert.deepEqual(mobile.counters.looks,[[25,-16]],'right-side camera drag is separate from movement');
mobile.node('jump-touch').dispatch('pointerdown',touchPoint(38, 275, 330));
mobile.node('place').dispatch('pointerdown',touchPoint(39, 292, 377));
assert.deepEqual(mobile.counters.controls.at(-1),[4,1]);
assert.deepEqual(mobile.counters.editStates,[[1,1]]);
mobile.doc.dispatch('keydown',{code:'KeyD'});
go(0,0);
assert.deepEqual(mobile.counters.controls,[[0,1],[3,1],[4,1],[0,0]],'hardware overlap retains its own direction');
mobile.doc.dispatch('keyup',{code:'KeyD'});
assert.deepEqual(mobile.counters.controls.at(-1),[3,0]);
go(-27,0);
assert.deepEqual(mobile.counters.controls.at(-1),[2,1]);
stick.dispatch('pointercancel',base);
assert.deepEqual(mobile.counters.controls.at(-1),[2,0]);
assert.equal(stick.properties.size,0);
assert.deepEqual(mobile.counters.editStates,[[1,1]],'move cancellation does not stop the Place hold');
assert.equal(scene.captures.size,1,'move cancellation does not stop right look');
mobile.node('place').dispatch('pointerup',touchPoint(39, 292, 377));
assert.deepEqual(mobile.counters.editStates.at(-1),[1,0]);
const newBase = touchPoint(40, 72, 425);
stick.dispatch('pointerdown',newBase);
stick.dispatch('pointermove',shift(0,27,newBase));
assert.deepEqual(mobile.counters.controls.at(-1),[1,1]);
mobile.win.screen.orientation.dispatch('change');
assert.equal(mobile.counters.clears,1);
assert.equal(scene.captures.size,0);
assert.equal(stick.captures.size,0);
assert.equal(mobile.node('jump-touch').captures.size,0);
const postRotate = mobile.counters.controls.length, postLooks = mobile.counters.looks.length;
stick.dispatch('pointermove',shift(-50,0,newBase));
scene.dispatch('pointermove',shift(-20,0,lookPoint));
assert.equal(mobile.counters.controls.length,postRotate);
assert.equal(mobile.counters.looks.length,postLooks);
const fresh = touchPoint(41, 88, 430);
stick.dispatch('pointerdown',fresh);
stick.dispatch('pointermove',shift(31,0,fresh));
assert.deepEqual(mobile.counters.controls.at(-1),[3,1]);
mobile.node('flight-touch').dispatch('click');
mobile.frame();
assert.equal(mobile.node('player-state').textContent,'Flying');
assert.equal(mobile.node('jump-touch')['aria-label'],'Rise');
mobile.node('descend-touch').dispatch('pointerdown',touchPoint(42, 270, 310));
assert.deepEqual(mobile.counters.controls.at(-1),[5,1]);
mobile.win.dispatch('blur');
assert.equal(mobile.counters.clears,2);
assert.equal(mobile.node('descend-touch').captures.size,0);
mobile.doc.hidden = true;
mobile.doc.dispatch('visibilitychange');
assert.equal(mobile.counters.clears,3);
console.log('English and touch host passed: tagged release, joystick hysteresis, concurrent movement/look/edit/jump/flight and capture lifecycle.');

const rotateFallback = await loadHost('old-mobile-orientation', false, null, true);
await rotateFallback.resolveFetch();
rotateFallback.node('enter').dispatch('click');
rotateFallback.node('move-stick').dispatch('pointerdown',base);
rotateFallback.win.dispatch('orientationchange');
assert.equal(rotateFallback.node('move-stick').captures.size,0);
assert.equal(rotateFallback.counters.clears,1);

const viewMode = await loadHost('third-person-toggle', false, null, true);
await viewMode.resolveFetch();
viewMode.node('enter').dispatch('click');
viewMode.doc.dispatch('keydown',{code:'KeyV',ctrlKey:true});
assert.equal(viewMode.counters.cameraToggles,undefined);
assert(viewMode.doc.dispatch('keydown',{code:'KeyV'}).prevented);
assert.equal(viewMode.node('view-touch')['aria-pressed'], 'true');
assert.equal(viewMode.node('camera-view')['aria-pressed'], 'true');
viewMode.doc.dispatch('keydown',{code:'KeyV',repeat:true});
assert.equal(viewMode.counters.cameraToggles,1,'held keyboard V must not oscillate');
viewMode.frame();
assert.equal(viewMode.node('.reticle').properties.get('--aim-x'), '30%');
assert.equal(viewMode.node('.reticle').properties.get('--aim-y'), '62.5%');
assert.equal(viewMode.counters.uploads.at(-1).length,18,'host uploads the Wosy player mesh as TRIANGLES');
viewMode.node('view-touch').dispatch('click');
viewMode.frame();
assert.equal(viewMode.counters.cameraToggles,2);
assert.equal(viewMode.node('camera-view')['aria-pressed'], 'false');
assert.equal(viewMode.node('view-touch')['aria-pressed'], 'false');
assert.equal(viewMode.node('.reticle').properties.get('--aim-x'), '50%');
assert.equal(viewMode.node('.reticle').properties.get('--aim-y'), '50%');
console.log('Perspective controls passed: exact Wosy toggle state, repeat and modifier safety, touch toggle, view mesh and projected aim.');

const ocean = await loadHost('water-life', false, null, true);
await ocean.resolveFetch();
ocean.node('enter').dispatch('click');
ocean.node('view-touch').dispatch('click');
ocean.frame();
ocean.frame();
const expectedDraws = [
  [-1, 3, false], // sky
  [0, 3, false], // opaque terrain
  [2, 3, false], // avatar
  [2, 2, false], // target outline
  [1, 6, true], // water composites over outlines and avatars behind the surface
];
assert.deepEqual(ocean.counters.draws.slice(-5), expectedDraws);
const staticUploads = ocean.counters.uploads.length;
const waterAllocations = ocean.counters.uploads.filter((upload) => upload.length === 36).length;
const waveUpdates = ocean.counters.updates.length;
const initialWave = ocean.counters.updates.at(-1);
ocean.frame();
assert.equal(ocean.counters.uploads.filter((upload) => upload.length === 36).length, waterAllocations,
  'same-size waves must not reallocate their GPU buffer');
assert.equal(ocean.counters.updates.length, waveUpdates + 1, 'active positive ticks should upload only changed wave data');
const latestWave = ocean.counters.updates.at(-1);
assert.notDeepEqual(latestWave, initialWave);
ocean.lostEvent();
ocean.memory.grow(1);
ocean.restoredEvent();
assert.equal(ocean.counters.generations, 1, 'water restoration must not reset wave phase or generate a new world');
assert(ocean.counters.uploads.slice(staticUploads).some((upload) => upload.length === 36 &&
  upload.every((component, index) => component === latestWave[index])), 'restore must upload the newest water bytes even after memory growth');
console.log('Verified water buffer reuse, coherent transparency order and restoration of the latest wave.');

const beacon = await loadHost('beacon-run');
await beacon.resolveFetch();
beacon.node('mission-start').dispatch('click');
beacon.grantLock();
beacon.frame();
assert.equal(beacon.counters.missionStarts, 1);
assert.equal(beacon.node('mission-start').textContent, 'Resume Beacon Run');
assert.equal(beacon.node('mission-result').hidden, true);
assert.equal(beacon.node('mission-hud').hidden, false);
assert.equal(beacon.node('flame').value, .75);
assert.equal(beacon.node('tide-level').textContent, 'Rising tide');
assert.equal(beacon.node('bridge-stock').textContent, '5');
assert.equal(beacon.node('relay-goal').textContent, 'Cross to the north watchfire');
beacon.counters.relay = 1;
beacon.frame();
assert.equal(beacon.node('relay-goal').textContent, 'Light the west watchfire');
beacon.counters.relay = 2;
beacon.frame();
assert.equal(beacon.node('relay-goal').textContent, 'Climb to the lighthouse');
beacon.node('pause').dispatch('click');
beacon.node('mission-start').dispatch('click');
beacon.grantLock();
beacon.frame();
assert.equal(beacon.counters.missionStarts, 1, 'resume preserves Wosy run');
beacon.counters.missionOverride = 3;
beacon.frame();
assert.equal(beacon.doc.pointerLockElement, null, 'terminal frame releases pointer lock');
assert(beacon.node('game').classes.has('playing'), 'result remains visible after lock release');
assert.equal(beacon.node('mission-readouts').hidden, true);
assert.equal(beacon.node('mission-retry').hidden, false);
assert.equal(beacon.node('mission-result').textContent, 'The sea put out the flame.');
delete beacon.counters.missionOverride;
beacon.node('mission-retry').dispatch('click');
beacon.grantLock();
assert.equal(beacon.doc.pointerLockElement, beacon.node('scene'), 'retry accepts pointer lock even before the first RAF');
assert(beacon.node('game').classes.has('playing'));
assert.equal(beacon.node('mission-retry').hidden, true);
beacon.frame();
assert.equal(beacon.counters.missionStarts, 2, 'visible retry requests exactly one new run');
beacon.counters.missionOverride = 2;
beacon.frame();
assert.equal(beacon.doc.pointerLockElement, null, 'victory also releases pointer lock');
assert.equal(beacon.node('mission-result').textContent, 'Beacon lit!');
beacon.node('pause').dispatch('click');
beacon.node('enter').dispatch('click');
beacon.grantLock();
assert.equal(beacon.doc.pointerLockElement, beacon.node('scene'), 'sandbox transition accepts pointer lock even before RAF');
beacon.frame();
assert.equal(beacon.counters.missionLeaves, 1, 'switch back restores through the engine, never regenerates terrain');
assert.equal(beacon.counters.generations, 1);
assert.equal(beacon.node('mission-hud').hidden, true);
console.log('Verified Beacon Run entry, authoritative HUD, terminal pointer lock, retry, and sandbox switch.');
