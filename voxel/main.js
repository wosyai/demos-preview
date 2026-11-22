const get = (id) => document.getElementById(id);
const shell = get("game");
const canvas = get("scene");
const enter = get("enter");
const missionStart = get("mission-start"), missionRetry = get("mission-retry");
const missionHud = get("mission-hud"), missionResult = get("mission-result");
const missionReadouts = get("mission-readouts"), flameMeter = get("flame");
const tideLevel = get("tide-level"), bridgeStock = get("bridge-stock"), relayGoal = get("relay-goal");
const guideHint = get("guide-hint"), guideText = get("guide-hint-text"), guideHintIcon = get("guide-hint-icon");
const guideMarker = get("guide-marker"), guideMarkerIcon = get("guide-marker-icon");
const breakTouch = get("remove"), placeTouch = get("place");
const guideLabels = ["", "Break marked timber for wood", "Walk to the dropped wood", "Place wood to bridge the channel"];
const guideGlyphs = ["", "#glyph-break", "#glyph-collect", "#glyph-build"];
const objectiveBearing = get("objective-bearing");
let shownBearing = null;
let shownGuide = 0, shownGuideReady = false;
const seedInput = get("seed");
const applySeed = get("apply-seed");
const randomSeed = get("random-seed");
const status = get("engine-status");
const error = get("error");
const notice = get("notice");
const reticle = document.querySelector(".reticle");
const coarse = matchMedia("(pointer: coarse)");
const movementState = get("player-state");
const jumpTouch = get("jump-touch");
const descendTouch = get("descend-touch");
const flightTouch = get("flight-touch");
const viewButtons = [get("camera-view"), get("view-touch")];
const moveStick = get("move-stick");
const materials = Array.from(document.querySelectorAll("[data-material]"));

const gl = canvas.getContext("webgl2", { alpha: false, antialias: true });
const fogColor = [0.66, 0.78, 0.83];
const keyActions = new Map([
  ["KeyW",0], ["ArrowUp",0], ["KeyS",1], ["ArrowDown",1],
  ["KeyA",2], ["ArrowLeft",2], ["KeyD",3], ["ArrowRight",3],
  ["Space",4], ["KeyC",5], ["ShiftLeft",6], ["ShiftRight",6], ["KeyF",7],
]);
const editKeys = new Map([["KeyQ",0], ["KeyE",1]]);
const pressed = new Set();
const heldButtons = new Map();
const MOVE_MASK = 15;
const downActions = new Set();
const editMouse = new Set();
const downEdits = new Set();
const atlas = { data: null, width: 0, height: 0 };
const terrainChunks = new Map();
const layers = {
  water: { pointer: 0, count: 0, version: 0 },
  outline: { data: null, count: 0, version: 0 },
  player: { data: null, count: 0, version: 0 },
};

let engine, memory, gpu, playing = false, loaded = false, failed = false, contextLost = false;
let pointerLook = null, stick = null, axes = 0, toastTimer = 0, previous = 0, raf = 0;
let displayedMaterial, displayedFlight, displayedGrounded;
let aimX = 0, aimY = 0, terrainVersion = 0;
let beaconState = 0, shownFlame = -1, shownTide = -1, shownWood = -1, shownRelay = -1;

const vertex = `#version 300 es
layout(location=0) in vec3 position;
layout(location=1) in vec3 color;
uniform mat4 projection;
out vec3 rgb;
out vec3 point;
void main() {
  rgb=color;
  point=position;
  gl_Position=projection*vec4(position,1.0);
}`;
const fragment = `#version 300 es
precision highp float;
in vec3 rgb;
in vec3 point;
uniform vec3 eye;
uniform vec3 fog;
uniform int pass;
uniform sampler2D terrainAtlas;
out vec4 pixel;
void main() {
  vec3 col=rgb;
  float alpha=1.0;
  float haze=clamp((distance(eye,point)-29.0)/94.0,0.0,1.0);
  if (pass==1) {
    vec3 normal=normalize(cross(dFdx(point),dFdy(point)));
    vec3 view=normalize(eye-point);
    float fresnel=pow(1.0-clamp(abs(dot(normal,view)),0.0,1.0),4.0);
    float ripple=sign(normal.y)*dot(normal.xz,vec2(-0.72,0.69));
    vec3 water=vec3(0.038,0.32,0.41)+vec3(0.16,0.27,0.23)*ripple;
    vec3 reflected=reflect(-view,normal*sign(normal.y));
    float glitter=pow(max(0.0,dot(reflected,normalize(vec3(-.83,.36,-.27)))),28.0);
    water += vec3(.71,.57,.28)*glitter;
    col=mix(water,fog,0.72*fresnel);
    alpha=mix(0.55+0.37*fresnel,1.0,haze);
  } else if (pass==0) {
    if (rgb.z > 1.0) {
      col = rgb.z > 1.5 ? vec3(1.0,0.83,0.30) : vec3(0.88,0.39,0.09);
    } else {
      vec3 texel=texture(terrainAtlas,rgb.xy).rgb;
      float macro=sin(point.x*.33+sin(point.z*.44))*sin(point.z*.29-point.y*.41);
      float strata=sin(point.y*28.0+sin(point.x*3.7+point.z*3.1)*.8);
      float grain=mix(strata,macro,clamp(abs(normalize(cross(dFdx(point),dFdy(point))).y),0.0,1.0));
      col=texel*rgb.z*(.93+.06*macro+.045*grain)+vec3(.017,.026,.035)*(1.0-rgb.z);
    }
  }
  pixel=vec4(mix(col,fog,pow(haze,1.08)*0.94),alpha);
}`;
const skyVertex = `#version 300 es
out vec2 uv;
void main() {
  vec2 p=vec2((gl_VertexID << 1)&2, gl_VertexID&2);
  uv=p;
  gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;
const skyFragment = `#version 300 es
precision highp float;
in vec2 uv;
uniform mat4 skyProjection;
uniform vec3 fog;
out vec4 pixel;
vec3 skyRay(mat4 matrix, vec2 screen) {
  vec3 right = vec3(matrix[0].x, matrix[1].x, matrix[2].x);
  vec3 up = vec3(matrix[0].y, matrix[1].y, matrix[2].y);
  vec3 forward = vec3(matrix[0].w, matrix[1].w, matrix[2].w);
  float r = dot(right,right);
  float u = dot(up,up);
  if (r == 0.0 || u == 0.0) return normalize(vec3(screen, -1.9));
  return normalize(forward + screen.x*right/r + screen.y*up/u);
}
float hash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*.1031);
  q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float noise(vec2 p) {
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void main() {
  vec3 ray = skyRay(skyProjection, uv*2.0-1.0);
  float height = max(0.0,ray.y);
  vec3 sunDirection = normalize(vec3(-.83,.36,-.27));
  float d = length(ray-sunDirection);
  vec3 col = mix(fog,vec3(.078,.32,.57),pow(height,.55));
  float haze=exp(-8.0*height);
  col=mix(col,vec3(.87,.76,.60),.58*haze*max(.15,1.0-d*.47));
  if(ray.y>0.018) {
    vec2 p=ray.xz/(ray.y+.16)*2.9+vec2(14.3,3.8);
    float clouds=.67*noise(p)+.23*noise(p*2.07)+.10*noise(p*4.11);
    float cover=smoothstep(.50,.71,clouds)*smoothstep(.018,.13,ray.y);
    vec3 cloud=mix(vec3(.58,.70,.79),vec3(1.,.92,.80),smoothstep(.49,.75,clouds));
    col=mix(col,cloud,cover*.91);
  }
  col=mix(col,vec3(1.,.79,.48),.33*exp(-8.0*d));
  col=mix(col,vec3(1.,.96,.81),1.0-smoothstep(.018,.023,d));
  if(ray.y<.065 && ray.y>-.035) {
    float angle=atan(ray.x,ray.z);
    float ridge=max(0.0,noise(vec2(angle*4.2,6.3))-.46);
    float edge=.005+ridge*.13;
    float land=(1.0-smoothstep(edge,edge+.004,ray.y))*smoothstep(.035,.082,ridge)*smoothstep(-.034,-.008,ray.y);
    col=mix(col,vec3(.38,.55,.60),land*.76);
  }
  pixel = vec4(col,1.0);
}
`;

function makeProgram(vs, fs) {
  function shader(kind, src) {
    const result = gl.createShader(kind);
    gl.shaderSource(result, src);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(result) || "Invalid WebGL shader.");
    }
    return result;
  }
  const vert = shader(gl.VERTEX_SHADER, vs), frag = shader(gl.FRAGMENT_SHADER, fs);
  const result = gl.createProgram();
  gl.attachShader(result, vert);
  gl.attachShader(result, frag);
  gl.linkProgram(result);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(result) || "Invalid WebGL program.");
  }
  return result;
}

function geometry(values, usage) {
  const vao = gl.createVertexArray(), buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  if (values) gl.bufferData(gl.ARRAY_BUFFER, values, usage);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindVertexArray(null);
  return { vao, buffer };
}

function newGraphics() {
  const world = makeProgram(vertex, fragment), sky = makeProgram(skyVertex, skyFragment);
  const terrainAtlas = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, terrainAtlas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (atlas.data) uploadAtlas(terrainAtlas);
  const locations = (program, names) => Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  gpu = {
    world, sky, terrainAtlas, skyVao: gl.createVertexArray(),
    terrain: new Map(Array.from(terrainChunks, ([id, chunk]) => [id, geometry(chunk.data, gl.DYNAMIC_DRAW)])),
    water: waterGeometry(),
    outline: geometry(layers.outline.data, gl.DYNAMIC_DRAW),
    player: geometry(layers.player.data, gl.DYNAMIC_DRAW),
    main: locations(world, ["projection", "eye", "fog", "pass", "terrainAtlas"]),
    background: locations(sky, ["skyProjection", "fog"]),
  };
}

function memoryFloats(pointer, length) {
  if (!memory || !Number.isInteger(pointer) || pointer < 0 || (pointer & 3) ||
      !Number.isSafeInteger(length) || length < 0 || pointer + length * 4 > memory.buffer.byteLength) {
    throw new Error("The engine returned invalid data.");
  }
  return new Float32Array(memory.buffer, pointer, length);
}

function uploadAtlas(texture) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, atlas.width, atlas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, atlas.data);
}

function bindAtlas(pointer, width, height) {
  const bytes = width * height * 4;
  if (!memory || !Number.isInteger(pointer) || pointer < 0 || width !== 128 || height !== 16 ||
      pointer + bytes > memory.buffer.byteLength) {
    throw new Error("The engine returned an invalid texture atlas.");
  }
  atlas.width = width;
  atlas.height = height;
  atlas.data = new Uint8Array(memory.buffer, pointer, bytes).slice();
  if (gpu && !contextLost) uploadAtlas(gpu.terrainAtlas);
}

function bindLayer(name, stride) {
  return (pointer, count) => {
    if (!Number.isInteger(count) || count < 0 || count % stride !== 0) {
      throw new Error("The engine returned invalid geometry.");
    }
    const layer = layers[name];
    layer.data = count === 0 ? null : memoryFloats(pointer, count * 6).slice();
    layer.count = count;
    layer.version++;
    if (count === 0 || !gpu || contextLost) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu[name].buffer);
    gl.bufferData(gl.ARRAY_BUFFER, layer.data, gl.DYNAMIC_DRAW);
  };
}

function bindMesh(pointer, count, id) {
  if (!Number.isInteger(id) || id < 0 || id >= 64 || !Number.isInteger(count) || count < 0 || count > 55296 || count % 3 !== 0) {
    throw new Error("The engine returned an invalid terrain chunk.");
  }
  terrainVersion++;
  if (count === 0) {
    terrainChunks.delete(id);
    if (gpu && !contextLost) {
      const slot = gpu.terrain.get(id);
      if (slot) {
        gl.deleteVertexArray(slot.vao);
        gl.deleteBuffer(slot.buffer);
        gpu.terrain.delete(id);
      }
    }
    return;
  }
  const data = memoryFloats(pointer, count * 6).slice();
  terrainChunks.set(id, { count, data });
  if (gpu && !contextLost) {
    const slot = gpu.terrain.get(id);
    if (slot) {
      gl.bindBuffer(gl.ARRAY_BUFFER, slot.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    } else {
      gpu.terrain.set(id, geometry(data, gl.DYNAMIC_DRAW));
    }
  }
}

function waterGeometry() {
  const { pointer, count } = layers.water;
  return { ...geometry(count ? memoryFloats(pointer, count * 6) : null, gl.DYNAMIC_DRAW), count };
}

function bindWater(pointer, count) {
  if (!Number.isInteger(count) || count < 0 || count % 3 !== 0) {
    throw new Error("The engine returned invalid water geometry.");
  }
  const data = count ? memoryFloats(pointer, count * 6) : null;
  layers.water.pointer = pointer;
  layers.water.count = count;
  layers.water.version++;
  if (!data || !gpu || contextLost) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.water.buffer);
  if (gpu.water.count === count) {
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
  } else {
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gpu.water.count = count;
  }
}

function setStatus(text) {
  if (status.textContent !== text) status.textContent = text;
}

function refreshAvailability() {
  const ready = !failed && loaded && !contextLost && Boolean(gpu);
  enter.disabled = missionStart.disabled = missionRetry.disabled = applySeed.disabled = randomSeed.disabled = !ready;
  if (failed) return;
  if (contextLost) setStatus("Restoring graphics");
  else if (!ready) setStatus("Loading engine");
  else {
    setStatus("Wosy · engine ready");
    startLoop();
  }
}

function loseGraphics() {
  const wasLost = contextLost;
  contextLost = true;
  gpu = null;
  if (!wasLost) {
    stopPlaying();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    if (raf) cancelAnimationFrame(raf);
    raf = 0; previous = 0;
  }
  refreshAvailability();
}

function prepareGraphics() {
  if (!gl.isContextLost()) {
    try { newGraphics(); }
    catch (e) { if (!gl.isContextLost()) throw e; }
  }
  if (gl.isContextLost()) loseGraphics();
  else {
    contextLost = false;
    refreshAvailability();
  }
}

function fail(message, detail) {
  if (detail) console.warn("Pocket Island:", detail);
  failed = true;
  loaded = false;
  stopPlaying();
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  enter.disabled = missionStart.disabled = missionRetry.disabled = applySeed.disabled = randomSeed.disabled = true;
  setStatus("Engine unavailable");
  error.textContent = message;
  error.hidden = false;
}

function toast(message) {
  notice.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { notice.textContent = ""; }, 2800);
}

function generate(seed) {
  const previousMesh = terrainVersion, previousWater = layers.water.version;
  if (loaded) clearInputs();
  engine.generate(seed);
  if (!atlas.data || previousMesh === terrainVersion || previousWater === layers.water.version) {
    throw new Error("The engine did not return geometry for the new island.");
  }
  try { localStorage.setItem("wosy-voxel-seed-preview", String(seed)); } catch {}
  seedInput.value = String(seed);
}

async function boot() {
  if (!gl) {
    fail("WebGL 2 is not available in this browser. Enable hardware acceleration or try another browser.");
    return;
  }
  try {
    prepareGraphics();
    const response = await fetch(new URL("./engine.wasm?v=beacon-bearing-v1", import.meta.url));
    if (!response.ok) throw new Error(`Engine not found (HTTP ${response.status}).`);
    const bytes = await response.arrayBuffer();
    const api = {
      showcase: {
        atlas: bindAtlas,
        mesh: bindMesh,
        water: bindWater,
        outline: bindLayer("outline", 2),
        player: bindLayer("player", 3),
        aim: positionAim,
        frame: present,
      },
      wasi_snapshot_preview1: {
        proc_exit(code) { throw new WebAssembly.RuntimeError(`Wosy exited with code ${code}.`); },
      },
    };
    const { instance } = await WebAssembly.instantiate(bytes, api);
    if (failed) return;
    engine = instance.exports;
    memory = engine.memory;
    const required = [
      "_start", "generate", "control", "pulse_control", "clear_controls", "look", "tick", "edit_control",
      "select_material", "cycle_material", "cycle_camera", "start_beacon", "leave_beacon",
      "seed_begin", "seed_code_unit", "seed_end", "default_seed",
    ];
    if (!(memory instanceof WebAssembly.Memory) || required.some((name) => typeof engine[name] !== "function")) {
      throw new Error("The WebAssembly binary has an incompatible interface.");
    }
    if (gl.isContextLost()) loseGraphics();
    engine._start();
    let stored = null;
    try { stored = localStorage.getItem("wosy-voxel-seed-preview"); } catch {}
    generate(readSeed(stored, false) ?? engine.default_seed());
    loaded = true;
    if (gl.isContextLost()) loseGraphics();
    else refreshAvailability();
  } catch (e) {
    fail("The Wosy engine could not start. Reload the page to try again.", e);
  }
}

function renderControls(flight, grounded, material) {
  if (displayedMaterial !== material) {
    displayedMaterial = material;
    for (const button of materials) {
      button.setAttribute("aria-pressed", String(Number(button.dataset.material) === material));
    }
  }
  if (displayedFlight === flight && displayedGrounded === grounded) return;
  displayedFlight = flight;
  displayedGrounded = grounded;
  movementState.textContent = flight ? "Flying" : grounded ? "On foot" : "In the air";
  const jumpLabel = flight ? "Rise" : "Jump";
  jumpTouch.setAttribute("aria-label", jumpLabel);
  jumpTouch.setAttribute("title", jumpLabel);
  shell.classList.toggle("flying", flight);
  descendTouch.hidden = !flight;
  const flightLabel = flight ? "Stop flight" : "Fly";
  flightTouch.setAttribute("aria-label", flightLabel);
  flightTouch.setAttribute("title", flightLabel);
  flightTouch.setAttribute("aria-pressed", String(flight));
}

function renderMission(state, flame, tide, stock, relay) {
  if (state !== beaconState) {
    beaconState = state;
    shell.classList.toggle("beacon", state !== 0);
    shell.classList.toggle("beacon-finished", state >= 2);
    missionHud.hidden = state === 0;
    missionReadouts.hidden = state !== 1;
    missionResult.hidden = missionRetry.hidden = state < 2;
    missionStart.textContent = state === 1 ? "Resume Beacon Run" : "Beacon Run";
    if (state >= 2) {
      clearInputs();
      missionResult.textContent = state === 2 ? "Beacon lit!" : "The sea put out the flame.";
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    }
  }
  if (state !== 1) return;
  if (shownRelay !== relay) {
    shownRelay = relay;
    relayGoal.textContent = ["Cross to the north watchfire", "Light the west watchfire", "Climb to the lighthouse"][relay];
  }
  const flamePercent = Math.round(flame * 100);
  if (shownFlame !== flamePercent) {
    shownFlame = flamePercent;
    flameMeter.value = flamePercent / 100;
  }
  const stage = tide <= 0 ? 0 : tide >= 1 ? 2 : 1;
  if (shownTide !== stage) {
    shownTide = stage;
    tideLevel.textContent = ["Low tide", "Rising tide", "High tide"][stage];
  }
  if (shownWood !== stock) {
    shownWood = stock;
    bridgeStock.textContent = String(stock);
  }
}

function renderBeaconGuide(frame) {
  const stage = playing ? frame[30] : 0;
  const ready = stage !== 0 && frame[34] === 1;
  const stageChanged = stage !== shownGuide;
  if (stageChanged) {
    shownGuide = stage;
    guideHint.hidden = stage === 0;
    guideText.textContent = guideLabels[stage];
    if (stage !== 0) {
      guideHintIcon.setAttribute("href", guideGlyphs[stage]);
      guideMarkerIcon.setAttribute("href", guideGlyphs[stage]);
    }
  }
  if (stageChanged || ready !== shownGuideReady) {
    shownGuideReady = ready;
    guideMarker.classList.toggle("ready", ready);
    breakTouch.classList.toggle("guide-ready", ready && stage === 1);
    placeTouch.classList.toggle("guide-ready", ready && stage === 3);
  }
  if (stage === 0) {
    guideMarker.hidden = true;
    return;
  }
  const x = frame[31], y = frame[32], z = frame[33];
  const w = frame[3] * x + frame[7] * y + frame[11] * z + frame[15];
  const screenX = (frame[0] * x + frame[4] * y + frame[8] * z + frame[12]) / w;
  const screenY = (frame[1] * x + frame[5] * y + frame[9] * z + frame[13]) / w;
  guideMarker.hidden = !(w > .15 && Math.abs(screenX) <= 1 && Math.abs(screenY) <= 1);
  if (!guideMarker.hidden) {
    guideMarker.style.left = `${(1 + screenX) * 50}%`;
    guideMarker.style.top = `${(1 - screenY) * 50}%`;
  }
}

function renderObjectiveBearing(frame) {
  const right = frame[35], forward = frame[36];
  const heading = playing && frame[25] === 1 && (right || forward)
    ? (Math.round(Math.atan2(right, forward) * 90 / Math.PI) * 2 + 360) % 360
    : null;
  if (heading === shownBearing) return;
  shownBearing = heading;
  objectiveBearing.hidden = heading === null;
  if (heading !== null) objectiveBearing.style.transform = `rotate(${heading}deg)`;
}

function present(pointer, hit) {
  if (!gpu || contextLost || document.hidden) return;
  const data = memoryFloats(pointer, 37);
  renderMission(data[25], data[26], data[27], data[28], data[29]);
  renderBeaconGuide(data);
  renderObjectiveBearing(data);
  if (playing) renderControls(data[22] === 1, data[23] === 1, data[24]);
  reticle.classList.toggle("target", hit >= 0);

  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.useProgram(gpu.sky);
  const projection = data.subarray(0, 16);
  gl.uniformMatrix4fv(gpu.background.skyProjection, false, projection);
  gl.uniform3fv(gpu.background.fog, fogColor);
  gl.bindVertexArray(gpu.skyVao);
  gl.drawArrays(gl.TRIANGLES,0,3);

  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(gpu.world);
  gl.uniformMatrix4fv(gpu.main.projection, false, projection);
  gl.uniform3f(gpu.main.eye, data[16], data[17], data[18]);
  gl.uniform3fv(gpu.main.fog, fogColor);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gpu.terrainAtlas);
  gl.uniform1i(gpu.main.terrainAtlas, 0);
  gl.uniform1i(gpu.main.pass, 0);
  for (const [id, { count }] of terrainChunks) {
    gl.bindVertexArray(gpu.terrain.get(id).vao);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }
  if (layers.player.count > 0) {
    gl.uniform1i(gpu.main.pass, 2);
    gl.bindVertexArray(gpu.player.vao);
    gl.drawArrays(gl.TRIANGLES, 0, layers.player.count);
  }
  if (hit >= 0 && layers.outline.count > 0) {
    gl.uniform1i(gpu.main.pass, 2);
    gl.bindVertexArray(gpu.outline.vao);
    gl.drawArrays(gl.LINES, 0, layers.outline.count);
  }
  if (layers.water.count > 0) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1i(gpu.main.pass, 1);
    gl.bindVertexArray(gpu.water.vao);
    gl.drawArrays(gl.TRIANGLES, 0, layers.water.count);
    gl.disable(gl.BLEND);
  }
}

function frame(now) {
  raf = 0;
  if (!loaded || !gpu || contextLost || document.hidden) { previous = 0; return; }
  const dt = previous ? (now - previous) / 1000 : 0;
  previous = now;
  const ratio = Math.min(devicePixelRatio || 1, 1.65);
  const w = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const h = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (w !== canvas.width || h !== canvas.height) { canvas.width = w; canvas.height = h; }
  gl.viewport(0, 0, w, h);
  try { engine.tick(dt, w / h, playing ? 1 : 0); }
  catch (e) { fail("The engine could not update the scene.", e); }
  startLoop();
}

function startLoop() {
  if (loaded && !raf && !contextLost && !document.hidden) raf = requestAnimationFrame(frame);
}

function syncAction(action) {
  if (!loaded || !playing || contextLost) return;
  const active = Boolean(MOVE_MASK & axes & (1 << action)) ||
    [...pressed].some((key) => keyActions.get(key) === action) ||
    [...heldButtons.values()].some((button) => keyActions.get(button.dataset.move) === action);
  if (active === downActions.has(action)) return;
  if (active) downActions.add(action);
  else downActions.delete(action);
  try { engine.control(action, active ? 1 : 0); }
  catch (e) { fail("The engine could not accept a control input.", e); }
}

function syncInput(code) {
  if (editKeys.has(code)) syncEdit(editKeys.get(code));
  else syncAction(keyActions.get(code));
}

function syncEdit(mode) {
  if (!playing || !loaded || contextLost) return;
  const active = editMouse.has(mode) || [...pressed].some((key) => editKeys.get(key) === mode) ||
    [...heldButtons.values()].some((button) => editKeys.get(button.dataset.move) === mode);
  if (active === downEdits.has(mode)) return;
  if (active) downEdits.add(mode);
  else downEdits.delete(mode);
  sendEdit(mode, active ? 1 : 0);
}

function pulseControl(action) {
  if (!playing || !loaded || contextLost) return;
  try { engine.pulse_control(action); }
  catch (e) { fail("The engine could not accept a control input.", e); }
}

function releaseCapture(element, id) {
  if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id);
}

function setStickAxes(next) {
  const changed = axes ^ next;
  axes = next;
  for (let action = 0; action < 4; action++) {
    if (changed & (1 << action)) syncAction(action);
  }
}

function closeStick(id, report) {
  if (!stick || stick.id !== id) return;
  stick = null;
  for (const field of ["x", "y", "dx", "dy"]) moveStick.style.removeProperty("--stick-" + field);
  moveStick.classList.remove("held");
  if (report) setStickAxes(0);
  else axes = 0;
}

function clearInputs() {
  const capturedButtons = [...heldButtons];
  const lookId = pointerLook?.id;
  const stickId = stick?.id;
  pressed.clear();
  heldButtons.clear();
  downActions.clear();
  editMouse.clear();
  downEdits.clear();
  pointerLook = null;
  previous = 0;
  if (stickId !== undefined) {
    closeStick(stickId, false);
    releaseCapture(moveStick, stickId);
  }
  if (lookId !== undefined) releaseCapture(canvas, lookId);
  for (const [id, button] of capturedButtons) {
    button.classList.remove("held");
    releaseCapture(button, id);
  }
  if (loaded) {
    try { engine.clear_controls(); }
    catch (e) { fail("The engine could not clear the controls.", e); }
  }
}

function look(dx, dy) {
  if (!playing || !loaded || contextLost) return;
  try { engine.look(dx, dy); }
  catch (e) { fail("The engine could not move the camera.", e); }
}

function selectMaterial(material, cycle = false) {
  if (!playing || !loaded || contextLost) return;
  try {
    if (cycle) engine.cycle_material(material);
    else engine.select_material(material);
  } catch (e) { fail("The engine could not select that material.", e); }
}

function sendEdit(mode, state) {
  if (!playing || !loaded || contextLost) return;
  try {
    const result = engine.edit_control(mode, state);
    if (result === -1) toast("Aim at a block.");
    if (result === -2) toast("You reached the island boundary.");
    if (result === -3) toast("That block would be in your way.");
    if (result === -4 && beaconState === 1) {
      toast(mode === 0 ? "That block cannot be mined in Beacon Run." : "Choose an empty spot and make sure you have wood.");
    }
    if (result === -5) toast("Pick up the loose wood before building here.");
    if (result === -6) toast("Too much loose wood. Pick some up before mining again.");
  } catch (e) { fail("The engine could not update the island.", e); }
}

function requestLook() {
  if (coarse.matches || typeof canvas.requestPointerLock !== "function") return;
  try { canvas.requestPointerLock()?.catch(() => toast("Drag the scene to look around.")); }
  catch { toast("Drag the scene to look around."); }
}

function positionAim(x, y) {
  if (aimX === x && aimY === y) return;
  aimX = x;
  aimY = y;
  reticle.style.setProperty("--aim-x", `${(1 + x) * 50}%`);
  reticle.style.setProperty("--aim-y", `${(1 - y) * 50}%`);
}

function cycleCamera() {
  if (!loaded || !playing || contextLost) return;
  try {
    const third = engine.cycle_camera() === 1;
    for (const button of viewButtons) {
      button.setAttribute("aria-pressed", String(third));
    }
  } catch (e) { fail("The engine could not change the view.", e); }
}

function startPlaying(presentTransition = false) {
  if (!loaded || contextLost) return;
  playing = true;
  shell.classList.add("playing");
  if (presentTransition) {
    const aspect = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight);
    engine.tick(0, aspect, 1);
  }
  canvas.focus({ preventScroll: true });
  requestLook();
}

function stopPlaying() {
  playing = false;
  clearInputs();
  shell.classList.remove("playing");
}

function readSeed(value, trim) {
  if (typeof value !== "string") return null;
  engine.seed_begin(trim ? 1 : 0);
  for (let index = 0; index < value.length; index++) {
    if (engine.seed_code_unit(value.charCodeAt(index)) === 0) return null;
  }
  const seed = engine.seed_end();
  return seed === 2147483648n ? null : Number(seed);
}

function changeSeed(seed) {
  if (!engine || !loaded || contextLost) return;
  if (seed === null) { toast("Enter a valid whole number for the seed."); return; }
  try { generate(seed); toast(`New island · seed ${seed}`); }
  catch (e) { fail("The engine could not generate this island.", e); }
}

function playSandbox() {
  if (!loaded || contextLost) return;
  try {
    const switched = beaconState !== 0;
    if (switched) {
      clearInputs();
      engine.leave_beacon();
    }
    startPlaying(switched);
  } catch (e) { fail("The engine could not open the sandbox.", e); }
}

function playBeacon(restart) {
  if (!loaded || contextLost) return;
  try {
    const restarted = restart || beaconState !== 1;
    if (restarted) {
      clearInputs();
      engine.start_beacon();
    }
    startPlaying(restarted);
  } catch (e) { fail("The engine could not start Beacon Run.", e); }
}

enter.addEventListener("click", playSandbox);
missionStart.addEventListener("click", () => playBeacon(false));
missionRetry.addEventListener("click", () => playBeacon(true));
for (const button of viewButtons) button.addEventListener("click", cycleCamera);
get("pause").addEventListener("click", () => {
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  stopPlaying();
  enter.focus({ preventScroll: true });
});
get("seed-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!loaded || contextLost) return;
  try { changeSeed(readSeed(seedInput.value, true)); }
  catch (e) { fail("The engine could not read the seed.", e); }
});
randomSeed.addEventListener("click", () => changeSeed(crypto.getRandomValues(new Int32Array(1))[0]));
const menuFullscreen = get("menu-fullscreen");
async function toggleFullscreen(event) {
  const menu = event.currentTarget === menuFullscreen;
  function unavailable() {
    const message = "Full screen is not available in this browser.";
    if (menu) get("menu-fullscreen-status").textContent = message;
    else toast(message);
  }
  try {
    if (menu) get("menu-fullscreen-status").textContent = "";
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (shell.requestFullscreen) await shell.requestFullscreen();
    else unavailable();
  } catch {
    unavailable();
  }
}
get("fullscreen").addEventListener("click", toggleFullscreen);
if (menuFullscreen) {
  menuFullscreen.hidden = !document.fullscreenEnabled || !shell.requestFullscreen;
  menuFullscreen.addEventListener("click", toggleFullscreen);
}

document.addEventListener("keydown", (e) => {
  if (!playing || e.target instanceof HTMLInputElement) return;
  if (e.code === "Space" && e.target?.nodeName === "BUTTON") return;
  if (keyActions.has(e.code) || editKeys.has(e.code)) {
    e.preventDefault();
    if (!e.repeat) {
      pressed.add(e.code);
      syncInput(e.code);
    }
  }
  if (e.code === "Escape") stopPlaying();
  if (e.code === "KeyV" && !e.altKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    if (!e.repeat) cycleCamera();
  }
  const slot = /^(?:Digit|Numpad)([1-6])$/.exec(e.code);
  if (slot) {
    e.preventDefault();
    if (!e.repeat) selectMaterial(Number(slot[1]));
  }
});
document.addEventListener("keyup", (e) => {
  if (pressed.delete(e.code)) syncInput(e.code);
});
window.addEventListener("blur", clearInputs);
if (window.screen?.orientation?.addEventListener) window.screen.orientation.addEventListener("change", clearInputs);
else window.addEventListener("orientationchange", clearInputs);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearInputs();
  else startLoop();
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    if (!playing || beaconState >= 2) document.exitPointerLock();
    return;
  }
  if (!playing || beaconState >= 2) return;
  const fullscreenButton = document.activeElement === get("fullscreen");
  if (fullscreenButton) clearInputs();
  else stopPlaying();
});
document.addEventListener("pointerlockerror", () => toast("Drag the scene to look around."));
document.addEventListener("mousemove", (e) => {
  if (playing && document.pointerLockElement === canvas) look(e.movementX, e.movementY);
});
document.addEventListener("contextmenu", (e) => {
  if (e.target === canvas || document.pointerLockElement === canvas) e.preventDefault();
});
document.addEventListener("mousedown", (e) => {
  const mode = e.button === 0 ? 0 : e.button === 2 ? 1 : undefined;
  if (!playing || !loaded || contextLost || mode === undefined ||
      (document.pointerLockElement !== canvas && !(mode === 1 && e.target === canvas))) return;
  e.preventDefault();
  editMouse.add(mode);
  syncEdit(mode);
});
document.addEventListener("mouseup", (e) => {
  const mode = e.button === 0 ? 0 : e.button === 2 ? 1 : undefined;
  if (editMouse.delete(mode)) syncEdit(mode);
});
canvas.addEventListener("pointerdown", (e) => {
  if (!playing || !loaded || contextLost) return;
  const tapBreak = e.pointerType !== "touch";
  if (tapBreak) canvas.focus({ preventScroll: true });
  if (tapBreak && (document.pointerLockElement === canvas || e.button !== 0)) return;
  if (pointerLook || stick?.id === e.pointerId || heldButtons.has(e.pointerId)) return;
  if (!tapBreak) e.preventDefault();
  pointerLook = { id: e.pointerId, x: e.clientX, y: e.clientY, tapBreak };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (pointerLook?.id !== e.pointerId || document.pointerLockElement === canvas) return;
  const dx = e.clientX - pointerLook.x, dy = e.clientY - pointerLook.y;
  if (pointerLook.tapBreak && Math.abs(dx) + Math.abs(dy) < 4) return;
  pointerLook.tapBreak = false;
  look(dx, dy);
  if (pointerLook) { pointerLook.x = e.clientX; pointerLook.y = e.clientY; }
});
for (const event of ["pointerup","pointercancel","lostpointercapture"]) {
  canvas.addEventListener(event, (e) => {
    if (pointerLook?.id !== e.pointerId) return;
    const lookInput = pointerLook;
    pointerLook = null;
    if (event !== "pointerup" || !lookInput.tapBreak || document.pointerLockElement === canvas ||
        Math.abs(e.clientX - lookInput.x) + Math.abs(e.clientY - lookInput.y) >= 4) return;
    const bounds = canvas.getBoundingClientRect();
    if (e.clientX >= bounds.left && e.clientX < bounds.right &&
        e.clientY >= bounds.top && e.clientY < bounds.bottom) sendEdit(0, 2);
  });
}
function direction(value, negative, positive) {
  const enter = .34, leave = .21;
  if (value <= -(axes & negative ? leave : enter)) return negative;
  if (value >= (axes & positive ? leave : enter)) return positive;
  return 0;
}

moveStick.addEventListener("pointerdown", (e) => {
  if (!playing || !loaded || contextLost || e.button !== 0 || stick ||
      e.pointerId === pointerLook?.id || heldButtons.has(e.pointerId)) return;
  e.preventDefault();
  const rect = moveStick.getBoundingClientRect();
  const radius = Math.max(37, Math.min(54, rect.height * .35));
  const center = (value, extent) => Math.max(radius, Math.min(extent - radius, value));
  stick = { id: e.pointerId, x: e.clientX, y: e.clientY, radius };
  moveStick.style.setProperty("--stick-x", `${center(e.clientX - rect.left, rect.width)}px`);
  moveStick.style.setProperty("--stick-y", `${center(e.clientY - rect.top, rect.height)}px`);
  moveStick.classList.add("held");
  moveStick.setPointerCapture(e.pointerId);
});
moveStick.addEventListener("pointermove", (e) => {
  if (!stick || stick.id !== e.pointerId) return;
  e.preventDefault();
  const dx = e.clientX - stick.x, dy = e.clientY - stick.y;
  const scale = Math.max(stick.radius, Math.hypot(dx, dy));
  const x = dx / scale, y = dy / scale;
  moveStick.style.setProperty("--stick-dx", `${x * stick.radius * .49}px`);
  moveStick.style.setProperty("--stick-dy", `${y * stick.radius * .49}px`);
  setStickAxes(direction(y, 1, 2) | direction(x, 4, 8));
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
  moveStick.addEventListener(event, (e) => closeStick(e.pointerId, true));
}
moveStick.addEventListener("contextmenu", (e) => e.preventDefault());

for (const btn of document.querySelectorAll("[data-move]")) {
  const code = btn.dataset.move;
  btn.addEventListener("click", (e) => {
    if (e.detail !== 0) return;
    if (editKeys.has(code)) sendEdit(editKeys.get(code), 2);
    else pulseControl(keyActions.get(code));
  });
  btn.addEventListener("pointerdown", (e) => {
    if (!playing || !loaded || contextLost || e.button !== 0 || e.pointerId === pointerLook?.id ||
        stick?.id === e.pointerId || heldButtons.has(e.pointerId)) return;
    e.preventDefault();
    heldButtons.set(e.pointerId, btn);
    btn.classList.add("held");
    btn.setPointerCapture(e.pointerId);
    syncInput(code);
  });
  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  for (const event of ["pointerup","pointercancel","lostpointercapture"]) {
    btn.addEventListener(event, (e) => {
      if (heldButtons.get(e.pointerId) !== btn) return;
      heldButtons.delete(e.pointerId);
      if (![...heldButtons.values()].includes(btn)) btn.classList.remove("held");
      syncInput(code);
    });
  }
}
for (const button of materials) {
  button.addEventListener("click", () => selectMaterial(Number(button.dataset.material)));
}
flightTouch.addEventListener("click", () => pulseControl(7));
document.addEventListener("wheel", (e) => {
  if (!playing || !loaded || contextLost || e.ctrlKey || e.deltaY === 0 ||
      (e.target !== canvas && document.pointerLockElement !== canvas &&
        !e.target?.closest?.(".hotbar"))) return;
  selectMaterial(Math.sign(e.deltaY), true);
  e.preventDefault();
}, { passive: false });
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  loseGraphics();
  if (!failed) toast("The browser paused the graphics.");
});
canvas.addEventListener("webglcontextrestored", () => {
  if (failed) return;
  try { prepareGraphics(); }
  catch (e) { fail("Graphics could not be restored. Reload the page.", e); }
});
boot();
