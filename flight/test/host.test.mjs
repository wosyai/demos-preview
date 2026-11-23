import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bootFlight, makeControls, memoryRange, replayStore, stickAxes } from "../host.mjs";

class Hub {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, callback) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(callback);
  }
  events(name, source = {}) {
    const value = { target: this, button: 0, repeat: false, prevented: false,
      preventDefault() { this.prevented = true; }, ...source };
    for (const listener of this.listeners.get(name) || []) listener(value);
    return value;
  }
}

function graphicsFixture() {
  const draws = [], uploads = [], matrices = [];
  const gl = {
    ARRAY_BUFFER: 34962, FLOAT: 5126, TRIANGLES: 4,
    STATIC_DRAW: 35044, DYNAMIC_DRAW: 35048,
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COLOR_BUFFER_BIT: 16384, DEPTH_BUFFER_BIT: 256,
    createShader: () => ({}), createProgram: () => ({}), createVertexArray: () => ({}), createBuffer: () => ({}),
    getShaderParameter: () => true, getProgramParameter: () => true,
    getUniformLocation: (_, name) => name,
    drawArrays: (...args) => draws.push(args),
    uniformMatrix4fv: (name, transpose, values) => matrices.push([name, transpose, [...values]]),
    bufferData: (_, values, usage) => uploads.push([values.length, usage]),
  };
  for (const name of "shaderSource compileShader attachShader linkProgram deleteShader enableVertexAttribArray vertexAttribPointer bindVertexArray bindBuffer viewport clearColor clear disable enable useProgram uniform3fv uniform1f".split(" ")) gl[name] = () => {};
  return { gl, draws, uploads, matrices };
}

function mock({ noGraphics = false, badMesh = false, initialLost = false, exitAtStart = false, inputVersion = null, orientationAPI = false, frameLength = 41 } = {}) {
  const doc = new Hub(), win = new Hub(), nodes = new Map(), raf = new Map(), data = new Map();
  const g = graphicsFixture(), called = { reset: [], tick: [], replay: [], requests: [], views: [], begin: 0, cancel: 0 };
  const wasmExports = new WebAssembly.Memory({initial: 1});
  let index = 0, shouldComplete = false, current = 0, imported, distance = 122, phase = 2, dropStatus = 0, route = 0, eventCode = 0;
  let guidance = [0, 4, 0, 0], ringState = [0, 0, 0, 0], lossCode = 0, cinematic = 0;
  function element(name, dataset = {}) {
    const node = new Hub();
    const captures = new Set(), classes = new Set(), properties = new Map();
    Object.assign(node, {
      dataset, id: name, hidden: false, disabled: false, textContent: "", captures, classes,
      classList: { toggle(key, enabled) { if (enabled) classes.add(key); else classes.delete(key); } },
      focus() { doc.activeElement = this; },
      properties,
      setAttribute: (key, value) => properties.set(key, value),
      getAttribute: (key) => properties.get(key),
      style: {setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key)},
      getBoundingClientRect: () => ({left: 12, top: 220, width: 174, height: 145}),
      setPointerCapture(id) { captures.add(id); },
      hasPointerCapture(id) { return captures.has(id); },
      releasePointerCapture(id) { captures.delete(id); this.events("lostpointercapture", {pointerId: id}); },
    });
    nodes.set(name, node);
    return node;
  }
  const courses = [element("farm", {course: "0"}), element("paris", {course: "1"})];
  const controls = ["power", "brake", "drop"].map((value) => element(value, {action: value}));
  for (const name of "game view menu hud engine problem touch flight-stick summary summary-title summary-detail summary-kicker again choose flight-stats flight-dialog-settings flight-controls arcade-back callout flight-cue time mission-phase speed altitude best gates restart pause view-toggle track".split(" ")) element(name);
  const dialog = nodes.get("summary"), settings = nodes.get("flight-dialog-settings");
  const dialogNodes = ["again", "restart", "choose", "flight-stats", "flight-dialog-settings", "flight-controls", "arcade-back"].map((name) => nodes.get(name));
  settings.open = false;
  dialog.querySelectorAll = () => dialogNodes.filter((node) => !node.disabled);
  for (const node of dialogNodes) {
    node.tabIndex = 0;
    node.getClientRects = () => dialog.hidden || node.hidden ||
      (node.id === "flight-controls" && !settings.open) ? [] : [{}];
  }
  const canvas = nodes.get("view");
  Object.assign(canvas, { clientWidth: 820, clientHeight: 420, getContext: () => noGraphics ? null : g.gl });
  Object.assign(doc, { hidden: false, getElementById: (name) => nodes.get(name),
    querySelectorAll: (selector) => selector === "[data-course]" ? courses : controls });
  Object.assign(win, {
    devicePixelRatio: 3,
    getComputedStyle: (node) => ({visibility: node.visibility ?? "visible"}),
    ...(orientationAPI ? {screen: {orientation: new Hub()}} : {}),
    localStorage: { setItem: (key, value) => data.set(key, value), getItem: (key) => data.get(key) },
    fetch: async (url) => {
      called.requests.push(url);
      if (initialLost) canvas.events("webglcontextlost");
      return {ok: true, arrayBuffer: async () => new ArrayBuffer(0)};
    },
    WebAssembly: { async instantiate(_bytes, imports) {
      imported = imports.flight;
      return {instance: {exports: {
        memory: wasmExports, _start() { if (exitAtStart) imports.wasi_snapshot_preview1.proc_exit(9); },
        ...(inputVersion === null ? {} : {input_version: () => inputVersion}),
        reset(course) {
          current = course;
          phase = course === 1 ? 0 : 2; dropStatus = 0; route = 0; eventCode = 0; lossCode = 0; cinematic = 0;
          called.reset.push(course);
          imported.world(0, badMesh ? 16 : 18);
        },
        select_view(view) { called.views.push(view); },
        cancel_drop() { called.cancel++; },
        ghost_begin() { called.begin++; },
        ghost_byte(byte) { called.replay.push(byte); },
        ghost_end() { called.replay.push(-1); },
        tick(dt, mask, aspect) {
          called.tick.push([dt, mask, aspect]);
          imported.aircraft(128, 18);
          const frame = new Float32Array(wasmExports.buffer, 256, frameLength);
          frame.set([aspect,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1, current,12.125,31,22,phase,dropStatus,shouldComplete ? 1 : lossCode,12.125,250,route,eventCode,distance]);
          if (frameLength === 41) { frame.set(guidance, 28); frame.set(ringState, 32); frame[36]=cinematic; }
          imported.frame(256, frameLength);
          if (shouldComplete) {
            new Uint8Array(wasmExports.buffer, 512, 3).set([3,4,255]);
            imported.record(512, 3);
          }
        },
      }}};
    }},
    requestAnimationFrame(callback) { raf.set(++index, callback); return index; },
    cancelAnimationFrame(id) { raf.delete(id); },
  });
  const host = bootFlight(win, doc);
  return { ...host, ...g, doc, win, nodes, data, courses, canvas, called, raf,
    complete(value = true) { shouldComplete = value; },
    impact(code, active) { lossCode = code; cinematic=Number(active); },
    film(value) { cinematic = value; },
    cue(next) {
      ({distance = 122, phase = 2, dropStatus = 0, route = 0, eventCode = 0} = next);
    },
    rings(count, next, seconds, flash) { ringState = [count, next, seconds, flash]; },
    guidance(turn, instruction, climb = false, delivered = false) {
      guidance = [turn, instruction, Number(climb), Number(delivered)];
    },
    frame(t) {
      const entry = raf.entries().next().value;
      assert.ok(entry, "a frame is pending");
      raf.delete(entry[0]);
      entry[1](t);
    } };
}

test("shared actions remain held while one key or pointer is released", () => {
  const controls = makeControls();
  controls.keys.set("ArrowLeft", 1);
  controls.keys.set("KeyA", 1);
  controls.pointers.set(11, 4);
  controls.pointers.set(12, 16);
  assert.equal(controls.mask, 21);
  controls.keys.delete("KeyA");
  controls.pointers.delete(11);
  assert.equal(controls.mask, 17);
  controls.clear();
  assert.equal(controls.mask, 0);
});
test("range guards validate alignment, memory bound, and current WebAssembly buffer", () => {
  const memory = new WebAssembly.Memory({initial: 1});
  memoryRange(memory, 4, 1, Float32Array)[0] = 81;
  memory.grow(1);
  assert.equal(memoryRange(memory, 4, 1, Float32Array)[0], 81);
  assert.throws(() => memoryRange(memory, 1, 1, Float32Array));
  assert.throws(() => memoryRange(memory, 131072, 1, Float32Array));
  assert.throws(() => memoryRange(memory, 4, Infinity, Float32Array));
});
test("opaque replay preserves binary bytes per course and degrades when storage is unavailable", () => {
  const data = new Map();
  const store = replayStore(() => ({getItem: data.get.bind(data), setItem: data.set.bind(data)}));
  store.save(1, Uint8Array.of(0, 65, 255));
  assert.equal(store.load(0), null);
  assert.deepEqual(Array.from(store.load(1), (value) => value.charCodeAt(0)), [0,65,255]);
  const unavailable = replayStore(() => { throw new Error("private"); });
  unavailable.save(1, Uint8Array.of(3));
  assert.equal(unavailable.load(1), null);
});
test("boots to course selection, selects Paris, forwards concurrent desktop and touch controls", async () => {
  const sim = mock();
  await sim.ready;
  assert.deepEqual(sim.called.reset, [0]);
  assert.equal(sim.courses[1].disabled, false);
  sim.courses[1].events("click");
  assert.deepEqual(sim.called.reset, [0,1]);
  assert.equal(sim.nodes.get("track").textContent, "Paris Air Mail");
  const key = sim.win.events("keydown", {code: "KeyS"});
  assert.equal(key.prevented, true);
  const stick = sim.nodes.get("flight-stick");
  assert.equal(stick.events("pointerdown", {pointerId: 5, clientX: 100, clientY: 300}).prevented, true);
  stick.events("pointermove", {pointerId: 5, clientX: 50, clientY: 300});
  sim.nodes.get("power").events("pointerdown", {pointerId: 6});
  sim.frame(16);
  assert.equal(sim.called.tick.at(-1)[1], 21);
  sim.win.events("pointercancel", {pointerId: 5});
  assert.equal(stick.classes.has("active"), false);
  assert.equal(stick.properties.size, 0);
  sim.frame(32);
  assert.equal(sim.called.tick.at(-1)[1], 20);
  sim.win.events("blur");
  assert.equal(sim.nodes.get("power").captures.size, 0);

  assert.equal(sim.win.events("keydown", {code: "KeyS", repeat: true}).prevented, true);
  sim.frame(4000);
  assert.deepEqual(sim.called.tick.at(-1), [0,0,820/420]);
  sim.win.events("keydown", {code: "KeyS"});
  sim.frame(4016);
  assert.equal(sim.called.tick.at(-1)[1], 4);

  assert.equal(sim.canvas.width, 1640);
  assert.equal(sim.uploads.filter(([,usage]) => usage === sim.gl.STATIC_DRAW).length, 1);
  assert.ok(sim.draws.length > 3);
});
test("reports a result, stores only the active course, restores replay on retry and handles pause", async () => {
  const sim = mock();
  await sim.ready;
  sim.courses[1].events("click");
  sim.complete();
  sim.frame(16);
  assert.equal(sim.nodes.get("summary").hidden, false);
  assert.equal(sim.nodes.get("summary-title").textContent, "Mail delivered");
  assert.match(sim.nodes.get("summary-detail").textContent, /250 points/);
  assert.equal(sim.nodes.get("touch").hidden, true);
  assert.equal(sim.data.size, 1);
  assert.ok(sim.data.has("wosy-flying-low/missions-v8/1"));
  sim.complete(false);
  sim.nodes.get("again").events("click");
  assert.deepEqual(sim.called.replay, [3,4,255,-1]);
  sim.win.events("keydown", {code: "Escape"});
  assert.equal(sim.nodes.get("summary-title").textContent, "Flight paused");
  const pauseCount = sim.called.tick.length;
  sim.frame(32);
  assert.equal(sim.called.tick.length, pauseCount);
  sim.nodes.get("again").events("click");
  sim.frame(50);
  assert.equal(sim.called.tick.length, pauseCount + 1);
  assert.equal(sim.nodes.get("summary").hidden, true);
});
test("pause navigation wraps visible controls and recovers focus after Settings closes", async () => {
  const sim = mock();
  await sim.ready;
  sim.courses[0].events("click");
  const get = (id) => sim.nodes.get(id);
  const tab = (shiftKey = false) => sim.win.events("keydown", {code: "Tab", shiftKey});
  get("pause").events("click");
  assert.equal(sim.doc.activeElement, get("again"));

  assert.equal(tab(true).prevented, true);
  assert.equal(sim.doc.activeElement, get("arcade-back"));
  assert.equal(tab().prevented, true);
  assert.equal(sim.doc.activeElement, get("again"));

  get("flight-dialog-settings").open = true;
  get("flight-controls").focus();
  assert.equal(tab().prevented, false, "native traversal remains intact within the dialog");
  get("flight-dialog-settings").open = false;
  assert.equal(tab().prevented, true, "the focused control stopped being visible");
  assert.equal(sim.doc.activeElement, get("again"));

  get("arcade-back").visibility = "hidden";
  assert.equal(tab(true).prevented, true, "CSS-hidden anchors are removed from wrap");
  assert.equal(sim.doc.activeElement, get("flight-dialog-settings"));
  get("flight-dialog-settings").open = true;
  get("again").events("click");
  assert.equal(get("flight-dialog-settings").open, false);
  assert.equal(sim.doc.activeElement, get("game"));
});
test("terminal contact draws the wreck before opening the retry summary", async () => {
  const sim = mock();
  await sim.ready;
  sim.courses[1].events("click");
  sim.cue({phase:1,dropStatus:9});
  sim.frame(8);
  assert.equal(sim.nodes.get("drop").hidden, false);
  sim.film(2);
  sim.cue({phase:5});
  sim.frame(12);
  assert.equal(sim.nodes.get("mission-phase").textContent, "Mail in flight");
  sim.impact(8, true);
  sim.frame(16);
  assert.equal(sim.nodes.get("summary").hidden, true);
  assert.equal(sim.nodes.get("callout").hidden, true);
  assert.equal(sim.nodes.get("drop").hidden, true);
  assert.equal(sim.nodes.get("flight-cue").textContent, "");
  const draws=sim.draws.length;
  const ticks=sim.called.tick.length;
  sim.frame(32);
  assert.equal(sim.nodes.get("summary").hidden, true);
  assert.ok(sim.draws.length>draws);
  assert.equal(sim.called.tick.length,ticks+1,"Wosy still receives elapsed presentation time");
  sim.impact(8, false);
  sim.frame(48);
  assert.equal(sim.nodes.get("summary").hidden, false);
  assert.equal(sim.data.size,0,"a wreck cannot publish a successful replay");
});
test("the mail shot reports actual impact and returns to ordinary controls", async () => {
  const sim=mock();
  await sim.ready;
  sim.courses[1].events("click");
  sim.film(2);
  sim.cue({phase:5});
  sim.frame(16);
  assert.equal(sim.nodes.get("mission-phase").textContent,"Mail in flight");
  assert.equal(sim.nodes.get("callout").hidden, true);
  assert.equal(sim.nodes.get("drop").hidden,true);
  sim.guidance(0,4,false,true);
  sim.cue({phase:2});
  sim.frame(132);
  assert.equal(sim.nodes.get("mission-phase").textContent,"Mail delivered");
  sim.guidance(0,4,false,false);
  sim.cue({phase:1,dropStatus:8,eventCode:8});
  sim.frame(238);
  assert.equal(sim.nodes.get("mission-phase").textContent,"Mail missed");
  assert.equal(sim.nodes.get("drop").hidden,true);
  sim.film(0);
  sim.frame(344);
  assert.notEqual(sim.nodes.get("mission-phase").textContent,"Mail missed");
  assert.equal(sim.nodes.get("drop").hidden,false);
  assert.equal(sim.nodes.get("summary").hidden,true);
});
test("context recovery redraws without resetting an active run", async () => {
  const sim = mock();
  await sim.ready;
  sim.courses[0].events("click");
  sim.frame(16);
  const oldDraws = sim.draws.length;
  assert.equal(sim.canvas.events("webglcontextlost").prevented, true);
  assert.equal(sim.raf.size, 0);
  sim.canvas.events("webglcontextrestored");
  sim.frame(50);
  assert.equal(sim.called.reset.length, 2);
  assert.ok(sim.draws.length > oldDraws);
  assert.equal(sim.called.tick.at(-1)[0], 0);
});
test("context recovery during initial download boots a preview", async () => {
  const sim = mock({initialLost: true});
  await sim.ready;
  assert.deepEqual(sim.called.reset, []);
  sim.canvas.events("webglcontextrestored");
  assert.deepEqual(sim.called.reset, [0]);
  assert.equal(sim.courses[0].disabled, false);
});
test("unsupported graphics or invalid WebAssembly mesh shows a useful error and disables courses", async () => {
  const noGraphics = mock({noGraphics: true});
  await noGraphics.ready;
  assert.match(noGraphics.nodes.get("problem").textContent, /WebGL 2/);
  assert.equal(noGraphics.courses[0].disabled, true);
  const bad = mock({badMesh: true});
  await bad.ready;
  assert.match(bad.nodes.get("problem").textContent, /restart/);

  assert.equal(bad.courses[0].disabled, true);
  const exited = mock({exitAtStart: true});
  await exited.ready;
  assert.match(exited.nodes.get("problem").textContent, /load the game/);
  assert.equal(exited.courses[0].disabled, true);
});

test("distance stays visual, while the live status announces meaningful mission progress", async () => {
  const sim = mock();
  await sim.ready;
  sim.courses[0].events("click");
  const live = sim.nodes.get("flight-cue");
  sim.frame(10);
  assert.match(live.textContent, /^Land in the pasture/);
  const before = live.textContent;
  sim.cue({distance: 45, phase: 2});
  sim.frame(150);
  assert.match(sim.nodes.get("callout").textContent, /45 m/);
  assert.equal(live.textContent, before);
  sim.cue({distance: 31, phase: 3});
  sim.frame(250);
  assert.equal(live.textContent, "Rollout. Steer gently and hold Brake to stop.");
});

test("radial stick keeps a deadzone, scales proportionally, and clamps diagonals without a square bias", () => {
  assert.deepEqual(stickAxes(3, 3, 45), {bank: 0, pitch: 0});
  assert.deepEqual(stickAxes(-90, 0, 45), {bank: -127, pitch: 0});
  const shallow = stickAxes(13, -13, 45), deep = stickAxes(24, -24, 45);
  assert.ok(shallow.bank > 0 && shallow.bank < deep.bank);
  assert.equal(shallow.pitch, -shallow.bank);
  assert.equal(deep.pitch, -deep.bank);
  assert.deepEqual(stickAxes(100, -100, 45), {bank: 90, pitch: -90});
});

test("analog motion packs both axes while thumbs stay independent across pause, blur and focus", async () => {
  const sim = mock({inputVersion: 1});
  await sim.ready;
  sim.courses[0].events("click");
  const stick = sim.nodes.get("flight-stick"), power = sim.nodes.get("power");
  const bytes = (value) => [(value << 16) >> 24, (value << 8) >> 24];
  stick.events("pointerdown", {pointerId: 10, clientX: 96, clientY: 290});
  power.events("pointerdown", {pointerId: 20});
  stick.events("pointermove", {pointerId: 10, clientX: 108, clientY: 282});
  sim.frame(100);
  const shallow = sim.called.tick.at(-1)[1];
  assert.equal(shallow & 127, 64 | 16);
  assert.ok(bytes(shallow)[0] > 0 && bytes(shallow)[1] < 0);
  stick.events("pointermove", {pointerId: 20, clientX: 14, clientY: 290});
  stick.events("pointerdown", {pointerId: 30, clientX: 20, clientY: 290});
  sim.frame(116);
  assert.equal(sim.called.tick.at(-1)[1], shallow);
  stick.events("pointermove", {pointerId: 10, clientX: 131, clientY: 260});
  sim.win.events("keydown", {code: "ArrowLeft"});
  sim.frame(132);
  const deep = sim.called.tick.at(-1)[1];
  assert.equal(deep & 127, 64 | 16 | 1);
  assert.ok(bytes(deep)[0] > bytes(shallow)[0] && bytes(deep)[1] < bytes(shallow)[1]);
  sim.win.events("pointerup", {pointerId: 20});
  sim.frame(148);
  assert.deepEqual(bytes(sim.called.tick.at(-1)[1]), bytes(deep));
  assert.equal(sim.called.tick.at(-1)[1] & 16, 0);
  sim.nodes.get("pause").events("click");
  assert.equal(stick.captures.has(10), false);
  assert.equal(stick.properties.size, 0);
  sim.nodes.get("again").events("click");
  stick.events("pointermove", {pointerId: 10, clientX: 139, clientY: 268});
  sim.win.events("keydown", {code: "ArrowLeft", repeat: true});
  sim.frame(170);
  assert.equal(sim.called.tick.at(-1)[1], 0);
  stick.events("pointerdown", {pointerId: 31, clientX: 96, clientY: 290});
  stick.events("pointermove", {pointerId: 31, clientX: 96, clientY: 390});
  sim.frame(186);
  assert.deepEqual(bytes(sim.called.tick.at(-1)[1]), [0, 127]);
  sim.win.events("blur");
  sim.frame(5028);
  assert.deepEqual(sim.called.tick.at(-1), [0, 0, 820/420]);
  assert.equal(stick.captures.size, 0);
});

test("the sky uses the live world camera projection before and after resize", async () => {
  const sim = mock();
  await sim.ready;
  sim.courses[0].events("click");
  sim.frame(16);
  const [firstSky, firstScene] = sim.matrices.slice(-2);
  assert.equal(firstSky[0], "skyProjection");
  assert.deepEqual(firstScene, ["viewProjection", false, firstSky[2]]);
  sim.canvas.clientWidth = 390;
  sim.canvas.clientHeight = 680;
  sim.frame(32);
  const [secondSky, secondScene] = sim.matrices.slice(-2);
  assert.equal(secondSky[0], "skyProjection");
  assert.deepEqual(secondScene, ["viewProjection", false, secondSky[2]]);
  assert.notEqual(secondSky[2][0], firstSky[2][0]);
});

test("the Flight host and Wasm share a deployment cache token", async () => {
  const sim = mock();
  await sim.ready;
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /href="\.\/style\.css\?v=paris-quay-quarter-flight-v11-hud1"/);
  assert.match(html, /src="\.\/host\.mjs\?v=flight-golden-skies-v1"/);
  assert.deepEqual(sim.called.requests.map((url) => [url.pathname.split("/").at(-1), url.search]),
    [["flight.wasm", "?v=flight-golden-skies-v1"]]);
});

test("view button and V toggle the engine camera without resetting a route", async () => {
  const sim = mock({ inputVersion: 1 });
  await sim.ready;
  const button = sim.nodes.get("view-toggle");
  assert.equal(button.disabled, true);
  sim.courses[1].events("click");
  assert.equal(button.disabled, false);
  assert.equal(button.getAttribute("aria-pressed"), "false");
  const resets = sim.called.reset.slice();
  const tickCount = sim.called.tick.length;
  button.events("click");
  assert.equal(sim.called.views.at(-1), 1);
  assert.equal(sim.nodes.get("game").classes.has("is-cockpit"), true);
  assert.equal(sim.nodes.get("game").classes.has("is-paris"), true);
  assert.equal(button.getAttribute("aria-pressed"), "true");
  assert.deepEqual(sim.called.reset, resets);
  assert.equal(sim.called.tick.length, tickCount);
  assert.equal(sim.win.events("keydown", {code:"KeyV", repeat:true}).prevented, false);
  assert.equal(sim.win.events("keydown", {code:"KeyV"}).prevented, true);
  assert.equal(sim.called.views.at(-1), 0);
  assert.equal(button.getAttribute("aria-pressed"), "false");
  assert.equal(sim.nodes.get("game").classes.has("is-cockpit"), false);
  assert.deepEqual(sim.called.reset, resets);
});

test("Space dispatches the Paris mission action even when the camera button has focus", async () => {
  const sim = mock({ inputVersion: 1 });
  await sim.ready;
  sim.courses[1].events("click");
  const camera = sim.nodes.get("view-toggle");
  camera.focus();
  camera.events("click");
  const views = sim.called.views.slice();
  const press = (type, props = {}) => sim.win.events(type, {code: "Space", target: camera, ...props});
  sim.cue({phase: 2});
  sim.frame(20);
  assert.equal(press("keydown").prevented, true);
  assert.equal(press("keyup").prevented, true);
  sim.frame(32);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 0, "an unavailable release stays blocked");
  sim.cue({phase: 1, dropStatus: 9});
  sim.frame(120);
  assert.equal(press("keydown").prevented, true);
  assert.equal(press("keyup").prevented, true);
  sim.frame(138);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 128);
  assert.equal(press("keydown", {repeat: true}).prevented, true);
  sim.frame(155);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 0);
  assert.deepEqual(sim.called.views, views);
  assert.equal(sim.win.events("keydown", {code: "Enter", target: camera}).prevented, false);
  camera.events("click", {detail: 0});
  assert.equal(sim.called.views.at(-1), 0, "the native keyboard activation still changes the camera");
});

test("phone rotation releases the old touch and accepts a fresh steer in the new aspect", async () => {
  for (const orientationAPI of [false, true]) {
    const sim = mock({inputVersion: 1, orientationAPI});
    await sim.ready;
    sim.courses[0].events("click");
    const stick = sim.nodes.get("flight-stick");
    stick.events("pointerdown", {pointerId: 13, clientX: 95, clientY: 300});
    stick.events("pointermove", {pointerId: 13, clientX: 176, clientY: 300});
    sim.frame(100);
    assert.equal((sim.called.tick.at(-1)[1] >> 8) & 255, 127);
    sim.canvas.clientWidth = 320;
    sim.canvas.clientHeight = 640;
    if (orientationAPI) sim.win.screen.orientation.events("change");
    else sim.win.events("orientationchange");
    assert.equal(stick.captures.size, 0);
    stick.events("pointermove", {pointerId: 13, clientX: 35, clientY: 300});
    sim.frame(120);
    assert.deepEqual(sim.called.tick.at(-1), [0, 0, .5]);
    stick.events("pointerdown", {pointerId: 14, clientX: 95, clientY: 300});
    stick.events("pointermove", {pointerId: 14, clientX: 15, clientY: 300});
    sim.frame(140);
    assert.equal((sim.called.tick.at(-1)[1] >> 8) & 255, 129);
    assert.equal(sim.doc.activeElement, sim.nodes.get("game"));
  }
});

test("Paris impact guidance never marks a high or early release ready", async () => {
  const sim = mock({inputVersion: 1});
  await sim.ready;
  const drop = sim.nodes.get("drop"), callout = sim.nodes.get("callout");
  sim.courses[1].events("click");
  sim.guidance(0, 0, false);
  sim.cue({phase: 1, dropStatus: 5, route: 2});
  sim.frame(20);
  assert.equal(callout.textContent, "Descend to the drop window");
  assert.equal(drop.classes.has("drop-ready"), false);
  sim.cue({phase: 1, dropStatus: 8, route: 2});
  sim.frame(120);
  assert.equal(callout.textContent, "Fly directly over the X");
  assert.equal(drop.classes.has("drop-ready"), false);
  sim.cue({phase: 1, dropStatus: 9, route: 2});
  sim.frame(220);
  assert.equal(callout.textContent, "Drop here");
  assert.equal(drop.classes.has("drop-ready"), true);
});

test("the Paris drop control supports quick taps and keyboard without swallowing other controls", async () => {
  const sim = mock({inputVersion: 1});
  await sim.ready;
  const drop = sim.nodes.get("drop"), callout = sim.nodes.get("callout");
  sim.courses[0].events("click");
  assert.equal(drop.hidden, true);
  sim.courses[1].events("click");
  assert.equal(drop.disabled, true);
  assert.equal(drop.hidden, true);
  sim.guidance(0, 0, true);
  sim.frame(20);
  assert.equal(callout.textContent, "Climb now to clear the bridge");
  sim.cue({phase: 1, dropStatus: 9, route: 2});
  sim.frame(120);
  assert.equal(drop.disabled, false);
  assert.equal(drop.classes.has("drop-ready"), true);
  assert.equal(callout.textContent, "Drop here");
  drop.events("pointerdown", {pointerId: 17});
  sim.win.events("pointerup", {pointerId: 17});
  sim.win.events("keydown", {code: "KeyQ"});
  sim.frame(135);
  assert.equal(sim.called.tick.at(-1)[1] & 160, 160, "tapped Drop and held Brake coexist");
  sim.frame(150);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 0, "tap is sent only once");
  assert.equal(sim.win.events("keydown", {code: "Space"}).prevented, true);
  sim.win.events("keyup", {code: "Space"});
  sim.frame(165);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 128);
  sim.win.events("keydown", {code: "Space"});
  const beforeBlur = sim.called.cancel;
  sim.win.events("blur");
  assert.equal(sim.called.cancel, beforeBlur + 1, "blur clears a queued engine release");
  sim.frame(175);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 0, "blur clears a pending browser release");
  sim.cue({phase: 5, route: 2});
  sim.frame(260);
  assert.equal(drop.hidden, true);
  assert.match(callout.textContent, /Pouch away/);
  sim.cue({phase: 2, route: 2});
  for (const [instruction, title] of [
    [1, "Level wings and align with the strip"], [2, "Brake to slow down"],
    [3, "Ease your descent"], [4, "Aligned · ease onto the strip"], [9, "Land in the marked strip"],
  ]) {
    sim.guidance(-.99, instruction, false, true);
    sim.frame(450 + instruction * 100);
    assert.equal(callout.textContent, `${title} · 122 m`);
    assert.match(sim.nodes.get("flight-cue").textContent, /Mail delivered/);
  }
});

test("mission replay storage isolates both courses and other replay namespaces", () => {
  const prefix = "wosy-flying-low/";
  const active = [prefix + "missions-v7/0",prefix + "missions-v8/1"];
  const preserved = new Map([
    [prefix + "missions-v7/1",btoa("legacy v7 directional Paris")],
    [prefix + "v1/1", btoa("legacy race binary")],
    [prefix + "missions-v4/0", btoa("v4 Wright")],
    [prefix + "missions-v4/1", btoa("v4 Paris")],
    [prefix + "missions-v5/0", btoa("synthetic v5 Wright")],
    [prefix + "missions-v5/1", btoa("synthetic v5 Paris")],
    [prefix + "missions-v6/0", btoa("v6 Wright")],
    [prefix + "missions-v6/1", btoa("v6 Paris")],
  ]);
  const data = new Map(preserved);
  const reads = [], writes = [];
  const open = () => replayStore(() => ({
    getItem(key) { reads.push(key); return data.get(key); },
    setItem(key, value) { writes.push(key); data.set(key, value); },
  }));
  const wright = Uint8Array.of(87, 70, 7, 0, 255);
  const paris = Uint8Array.of(87, 70, 8, 1, 0);
  const wrightRecord = String.fromCharCode(...wright);
  const parisRecord = String.fromCharCode(...paris);
  const store = open();
  assert.equal(store.load(0), null);
  assert.equal(store.load(1), null);

  store.save(0, wright);
  assert.equal(open().load(1), null, "Wright replay is not loaded for Paris");
  assert.equal(open().load(0), wrightRecord);

  store.save(1, paris);
  const reopened = open();
  assert.equal(reopened.load(1), parisRecord);
  assert.equal(reopened.load(0), wrightRecord, "Paris save did not change Wright");
  assert.deepEqual(writes, active);
  assert.deepEqual(reads, [0,1,1,0,1,0].map((course) => active[course]));
  assert.deepEqual(data, new Map([...preserved, [active[0], btoa(wrightRecord)], [active[1], btoa(parisRecord)]]));
});

test("rough touchdown announces survivable rollout and keeps cargo unloaded", async () => {
  const sim = mock({inputVersion: 1});
  await sim.ready;
  sim.courses[0].events("click");
  sim.cue({phase: 8, eventCode: 13});
  sim.frame(110);
  assert.match(sim.nodes.get("mission-phase").textContent, /Rough touchdown/);
  assert.equal(sim.nodes.get("drop").disabled, true);
  assert.match(sim.nodes.get("callout").textContent, /Brake to load cargo/);
  sim.cue({phase: 3, eventCode: 13});
  sim.frame(220);
  assert.match(sim.nodes.get("mission-phase").textContent, /Rough touchdown/);
  assert.match(sim.nodes.get("callout").textContent, /Steer gently and brake/);
});

test("bonus rings never interrupt the active instruction or live region", async () => {
  const sim = mock({inputVersion: 1});
  await sim.ready;
  sim.courses[0].events("click");
  sim.rings(1, 1, 4, 0);
  sim.frame(110);
  assert.equal(sim.nodes.get("gates").textContent, "");
  assert.doesNotMatch(sim.nodes.get("flight-cue").textContent, /Ring cleared/);
  sim.rings(1, 1, 4, 1);
  sim.frame(220);
  assert.doesNotMatch(sim.nodes.get("callout").textContent, /Ring cleared|\+80/);
  assert.doesNotMatch(sim.nodes.get("flight-cue").textContent, /Ring cleared|\+80/);
  sim.rings(1, 1, 3, 0);
  sim.frame(330);
  assert.doesNotMatch(sim.nodes.get("callout").textContent, /Ring cleared/);
  assert.doesNotMatch(sim.nodes.get("flight-cue").textContent, /Ring cleared/);
});

test("only next action, speed and altitude occupy the live HUD; stats and restart sit behind pause", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const hudMarkup = html.match(/<section id="hud"[\s\S]*?<\/section>/)?.[0];
  assert.ok(hudMarkup);
  for (const id of ["mission-phase", "callout", "speed", "altitude", "view-toggle", "pause"]) assert.match(hudMarkup, new RegExp(`id="${id}"`));
  for (const id of ["gates", "time", "best", "track", "restart", "keys"]) assert.doesNotMatch(hudMarkup, new RegExp(`id="${id}"`));
  const sim = mock({inputVersion: 1});
  await sim.ready;
  sim.courses[1].events("click");
  const get = (id) => sim.nodes.get(id);
  sim.rings(2, 2, 4, 0);
  sim.frame(110);
  get("pause").events("click");
  assert.equal(get("gates").textContent, "2/3");
  assert.equal(get("restart").hidden, false);
  assert.equal(get("hud").inert, true);
  get("flight-stats").open = true;
  get("again").events("click");
  assert.equal(get("flight-stats").open, false);
  assert.equal(get("hud").inert, false);
  get("pause").events("click");
  const resetCount = sim.called.reset.length;
  get("restart").events("click");
  assert.equal(sim.called.reset.length, resetCount + 1);
  assert.equal(get("summary").hidden, true);
});

test("only the exact mission frame ABI is accepted", async () => {
  for (const frameLength of [28, 30, 32, 34, 35, 36, 37, 40, 42]) {
    const unknown = mock({frameLength});
    await unknown.ready;
    assert.equal(unknown.courses[0].disabled, true);
    assert.match(unknown.nodes.get("problem").textContent, /restart/);
  }
});

test("touch loads Wright cargo only while stopped, then exposes its own spray action", async () => {
  const sim = mock({inputVersion: 1});
  await sim.ready;
  const action = sim.nodes.get("drop");
  sim.courses[0].events("click");
  sim.cue({phase: 8});
  sim.frame(10);
  assert.equal(action.hidden, true);
  action.events("pointerdown", {pointerId: 7});
  sim.frame(55);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 0);
  sim.cue({phase: 9});
  sim.frame(190);
  assert.equal(action.textContent, "LOAD SPRAY");
  action.events("pointerdown", {pointerId: 7});
  sim.frame(250);
  assert.equal(sim.called.tick.at(-1)[1] & 128, 128);
  sim.cue({phase: 10});
  sim.frame(340);
  assert.equal(action.hidden, true);
  sim.cue({phase: 11, dropStatus: 9});
  sim.guidance(.3, 0, false, 2);
  sim.frame(450);
  assert.equal(action.textContent, "SPRAY ROW");
  assert.equal(action.classes.has("drop-ready"), true);
});
