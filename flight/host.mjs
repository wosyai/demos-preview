import { createGameAudio } from "../arcade/audio.mjs";
import { flightSound } from "./sound.mjs";
const STEER = Object.freeze({ left: 1, right: 2, climb: 4, dive: 8, power: 16, brake: 32, drop: 128 });
const KEYS = new Map([
  ["KeyA", STEER.left], ["ArrowLeft", STEER.left],
  ["KeyD", STEER.right], ["ArrowRight", STEER.right],
  ["KeyS", STEER.climb], ["ArrowDown", STEER.climb],
  ["KeyW", STEER.dive], ["ArrowUp", STEER.dive],
  ["KeyE", STEER.power], ["KeyQ", STEER.brake],
]);
const COURSES = ["Crop Patrol", "Paris Air Mail"];
const replayKey = (course) => `wosy-flying-low/missions-v${course === 1 ? 8 : 7}/${course}`;
const MISSION_FRAME_FLOATS = 41;
const LANDING_CUES = [
  "Land in the marked strip", "Level wings and align with the strip", "Brake to slow down",
  "Ease your descent", "Aligned · ease onto the strip",
];
const RELEASE_CUES = [
  "", "", "", "", "", "Descend to the drop window", "Climb to the drop window",
  "", "Fly directly over the X", "Drop here",
];
const FAILURE_CUES = [
  "", "", "You hit an obstacle. Give it more clearance.", "You left the flight area or ran out of time.",
  "You touched down outside the marked strip. Aim for the near end.",
  "Touchdown was crooked. Line up and level your wings.",
  "You were too fast at touchdown. Brake earlier.",
  "Finish the delivery before landing at the final strip.",
  "You hit the bridge. Climb before the deck, or go around the amber side.",
  "You ran out of strip. Touch down earlier and hold Brake until stopped.",
  "You descended too hard. Ease the stick before touchdown.",
  "You left the side of the strip. Steer gently and brake as you roll."
];
const FLOATS_PER_VERTEX = 6;
const MAX_REPLAY = 65536;
const FIELD_COLORS = [[.64, .79, .84], [.72, .79, .83]];

const ANALOG_FLAG = 1 << 6;
const JOYSTICK_DEADZONE = .13;
const LEGACY_THRESHOLD = 38;

export function stickAxes(x, y, radius) {
  const magnitude = Math.hypot(x, y);
  const scaled = Math.min(magnitude / radius, 1);
  if (scaled <= JOYSTICK_DEADZONE) return { bank: 0, pitch: 0 };
  const factor = 127 * (scaled - JOYSTICK_DEADZONE) / ((1 - JOYSTICK_DEADZONE) * magnitude);
  return { bank: Math.round(x * factor), pitch: Math.round(y * factor) };
}

export function makeControls() {
  const keys = new Map(), pointers = new Map();
  return {
    keys, pointers, stick: null,
    get mask() {
      let result = 0;
      for (const value of keys.values()) result |= value;
      for (const value of pointers.values()) result |= value;
      return result;
    },
    input(analog) {
      const mask = this.mask;
      if (!this.stick) return mask;
      const {bank, pitch} = this.stick;
      if (analog) return mask | ANALOG_FLAG | ((bank & 255) << 8) | ((pitch & 255) << 16);
      const bankKey = bank >= LEGACY_THRESHOLD ? STEER.right : bank <= -LEGACY_THRESHOLD ? STEER.left : 0;
      const pitchKey = pitch >= LEGACY_THRESHOLD ? STEER.climb : pitch <= -LEGACY_THRESHOLD ? STEER.dive : 0;
      return mask | (mask & (STEER.left | STEER.right) ? 0 : bankKey)
        | (mask & (STEER.climb | STEER.dive) ? 0 : pitchKey);
    },
    clear() { keys.clear(); pointers.clear(); this.stick = null; },
  };
}

export function memoryRange(memory, pointer, length, ArrayType) {
  const width = ArrayType.BYTES_PER_ELEMENT;
  const buffer = memory?.buffer;
  if (!buffer || !Number.isInteger(pointer) || pointer < 0 || pointer % width
      || !Number.isSafeInteger(length) || length < 0
      || length > Math.floor((buffer.byteLength - pointer) / width)) {
    throw new Error("The flight engine returned unreadable data.");
  }
  return new ArrayType(buffer, pointer, length);
}

export function replayStore(storage) {
  return {
    load(course) {
      try {
        const encoded = storage()?.getItem(replayKey(course));
        if (!encoded || encoded.length > Math.ceil(MAX_REPLAY / 3) * 4) return null;
        const decoded = atob(encoded);
        return decoded.length <= MAX_REPLAY ? decoded : null;
      } catch { return null; }
    },
    save(course, bytes) {
      if (bytes.length === 0 || bytes.length > MAX_REPLAY) return;
      try {
        let binary = "";
        for (let n = 0; n < bytes.length; n += 4096)
          binary += String.fromCharCode(...bytes.subarray(n, n + 4096));
        storage()?.setItem(replayKey(course), btoa(binary));
      } catch { /* Private/quota-restricted browsing still supports local play. */ }
    },
  };
}

function clockText(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const centiseconds = Math.floor(seconds * 100);
  const minutes = Math.floor(centiseconds / 6000);
  const display = (number) => String(number).padStart(2, "0");
  return `${minutes}:${display(Math.floor(centiseconds / 100) % 60)}.${display(centiseconds % 100)}`;
}
function setText(node, next) {
  const value = String(next);
  if (node.textContent !== value) node.textContent = value;
}
function roundText(value, unit) {
  return Number.isFinite(value) ? `${Math.round(value)} ${unit}` : "—";
}
function sizedCanvas(canvas, ratio) {
  const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
  const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return width / height;
}

const WORLD_VERTEX = `#version 300 es
layout(location=0) in vec3 position;
layout(location=1) in vec3 color;
uniform mat4 viewProjection;
out vec3 tint;
out vec3 surface;
out float depth;
flat out int coverage;
void main() {
  tint = color;
  coverage = 16;
  if (color.r < 0.0) {
    // The transition mesh packs a 0–15 coverage band above its unmodified red channel.
    float packedRed = -color.r - 1.0;
    coverage = int(floor(packedRed * 0.5));
    tint.r = packedRed - float(coverage * 2);
  }
  surface = position;
  gl_Position = viewProjection * vec4(position, 1.0);
  depth = gl_Position.w;
}`;
const WORLD_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
in vec3 tint;
in vec3 surface;
in float depth;
flat in int coverage;
uniform vec3 atmosphere;
out vec4 fragment;
float detailHash(vec2 v) {
  vec3 p=fract(vec3(v.xyx)*.1031);
  p += dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float detailNoise(vec2 p) {
  vec2 c=floor(p), f=fract(p);
  vec2 q=f*f*(3.0-2.0*f);
  return mix(mix(detailHash(c),detailHash(c+vec2(1,0)),q.x),mix(detailHash(c+vec2(0,1)),detailHash(c+1.0),q.x),q.y);
}
float aaNoise(vec2 p, vec2 footprint) {
  float band=max(footprint.x,footprint.y);
  return mix(detailNoise(p),.5,smoothstep(.20,.95,band));
}
void main() {
  vec3 color = tint;
  vec2 xz = surface.xz;
  vec2 facade = xz*.27 + vec2(surface.y)*.43;
  vec2 water = vec2(xz.x*.25+xz.y*.11,xz.y*1.16-xz.x*.29);
  vec2 groundFootprint = fwidth(xz), facadeFootprint = fwidth(facade), waterFootprint = fwidth(water);
  bool river = distance(tint,vec3(.29,.52,.67)) < .003;
  if (river) {
    float broad = aaNoise(water*.17,waterFootprint*.17);
    float chop = aaNoise(water + vec2(broad*3.9,-broad*1.5),waterFootprint*1.4);
    float sheen = smoothstep(.53,.78,chop)*(.25+.75*broad);
    float gleam = exp(-abs(surface.x-61.0)*.013);
    color = mix(vec3(.16,.36,.43),vec3(.36,.54,.57),.26+.23*broad);
    color += sheen*mix(vec3(.085,.14,.15),vec3(.34,.24,.10),gleam)
      * (1.0-smoothstep(130.0,370.0,depth));
  } else {
    float ground = 1.0-smoothstep(.22,1.48,surface.y);
    float fields = aaNoise(xz*.31,groundFootprint*.31)*.58 + aaNoise(xz*1.73,groundFootprint*1.73)*.42;
    float material = mix(aaNoise(facade,facadeFootprint),fields,ground);
    color *= 1.0+(material-.5)*mix(.087,.21,ground);
  }
  if (coverage < 16) {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    int x0 = pixel.x & 1, y0 = pixel.y & 1;
    int x1 = (pixel.x >> 1) & 1, y1 = (pixel.y >> 1) & 1;
    int threshold = ((x0 ^ y0) * 2 + y0) * 4 + (x1 ^ y1) * 2 + y1;
    if (threshold >= coverage) discard;
  }
  float haze = smoothstep(60.0, 580.0, depth);
  vec3 horizon = mix(atmosphere,vec3(.89,.82,.69),.28);
  fragment = vec4(mix(color,horizon,haze*.89),1.0);
}`;
const SKY_VERTEX = `#version 300 es
out vec2 uv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;
const SKY_FRAGMENT = `#version 300 es
precision highp float;
uniform vec3 atmosphere;
uniform mat4 skyProjection;
in vec2 uv;
out vec4 fragment;
vec3 skyRay(mat4 matrix, vec2 screen) {
  vec3 right = vec3(matrix[0].x, matrix[1].x, matrix[2].x);
  vec3 up = vec3(matrix[0].y, matrix[1].y, matrix[2].y);
  vec3 forward = vec3(matrix[0].w, matrix[1].w, matrix[2].w);
  float r = dot(right,right);
  float u = dot(up,up);
  if (r == 0.0 || u == 0.0) return normalize(vec3(screen, -1.9));
  return normalize(forward + screen.x*right/r + screen.y*up/u);
}
float hash(vec2 v) {
  vec3 v3 = fract(vec3(v.xyx)*.1031);
  v3 += dot(v3,v3.yzx+33.33);
  return fract((v3.x+v3.y)*v3.z);
}
float noise(vec2 p) {
  vec2 c=floor(p), f=fract(p);
  vec2 q=f*f*(3.0-2.0*f);
  return mix(mix(hash(c),hash(c+vec2(1,0)),q.x),mix(hash(c+vec2(0,1)),hash(c+1.0),q.x),q.y);
}
void main() {
  vec3 ray = skyRay(skyProjection, uv*2.0-1.0);
  vec3 horizon = mix(atmosphere,vec3(.93,.83,.68),.42);
  vec3 zenith = atmosphere * vec3(.31,.64,.94);
  vec3 tone = mix(horizon, zenith, smoothstep(-.06,.79,ray.y));
  vec3 sunDirection = normalize(vec3(.35,.31,.88));
  float d = length(ray-sunDirection);
  tone = mix(tone,vec3(1.0,.72,.40),.43*exp(-5.2*d));
  tone = mix(tone,vec3(1.0,.97,.83),1.0-smoothstep(.017,.023,d));
  if (ray.y > .024) {
    vec2 p = ray.xz/max(.09,ray.y+.13)*vec2(1.56,2.12)+vec2(2.6,7.4);
    float wisps = noise(p*.77)*.55+noise(p*1.61)*.26+noise(p*4.4)*.13+noise(p*8.1)*.06;
    float cover = smoothstep(.57,.75,wisps)*smoothstep(.024,.155,ray.y);
    vec3 cloud = mix(vec3(.83,.82,.81),vec3(1.0,.91,.73),exp(-2.4*d));
    tone = mix(tone,cloud,cover*.88);
  }
  fragment = vec4(tone,1.0);
}
`;
function program(gl, vertexSource, fragmentSource) {
  function shader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const detail = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(detail || "WebGL could not compile the graphics.");
    }
    return shader;
  }
  const vertex = shader(gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  const linked = gl.createProgram();
  gl.attachShader(linked, vertex);
  gl.attachShader(linked, fragment);
  gl.linkProgram(linked);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) {
    const detail = gl.getProgramInfoLog(linked);
    gl.deleteProgram(linked);
    throw new Error(detail || "WebGL could not link the graphics.");
  }
  return linked;
}
function batch(gl, usage) {
  const vao = gl.createVertexArray(), buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindVertexArray(null);
  return { vao, buffer, usage, sent: 0, count: 0 };
}
function graphics(gl) {
  const scene = program(gl, WORLD_VERTEX, WORLD_FRAGMENT);
  const sky = program(gl, SKY_VERTEX, SKY_FRAGMENT);
  return {
    scene, sky, skyVao: gl.createVertexArray(),
    matrix: gl.getUniformLocation(scene, "viewProjection"),
    fog: gl.getUniformLocation(scene, "atmosphere"),
    skyColor: gl.getUniformLocation(sky, "atmosphere"),
    skyMatrix: gl.getUniformLocation(sky, "skyProjection"),
    field: batch(gl, gl.STATIC_DRAW),
    moving: batch(gl, gl.DYNAMIC_DRAW),
  };
}
function updateBatch(gl, item, source, memory) {
  if (item.sent === source.version) return;
  if (source.length !== 0) {
    const values = memoryRange(memory, source.pointer, source.length, Float32Array);
    gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, values, item.usage);
  }
  item.count = source.length / FLOATS_PER_VERTEX;
  item.sent = source.version;
}

export function bootFlight(win, doc) {
  const get = (name) => doc.getElementById(name);
  const shell = get("game"), canvas = get("view"), menu = get("menu"), hud = get("hud");
  const status = get("engine"), problem = get("problem"), touch = get("touch");
  const summary = get("summary"), summaryTitle = get("summary-title"), summaryDetail = get("summary-detail");
  const summaryKicker = get("summary-kicker"), again = get("again"), choose = get("choose");
  const summarySettings = get("flight-dialog-settings"), flightStats = get("flight-stats");
  const callout = get("callout"), flightCue = get("flight-cue"), buttons = Array.from(doc.querySelectorAll("[data-course]"));
  const actionButtons = Array.from(doc.querySelectorAll("[data-action]"));
  const stick = get("flight-stick"), viewToggle = get("view-toggle");
  const instruments = ["time", "mission-phase", "speed", "altitude", "best", "gates"].map(get);
  const controls = makeControls(), replays = replayStore(() => win.localStorage);
  const audio = createGameAudio("flight", { win, doc });
  const sound = flightSound(audio);
  const field = { pointer: 0, length: 0, version: 0 }, moving = { pointer: 0, length: 0, version: 0 };
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: true });
  let gpu, engine, memory, framePointer = null, frameLength = 0;
  let raf = 0, previous = null, current = 0, mode = "menu", modal = null;
  let loading = true, error = false, lost = false, hudTick = 0, dirty = true;
  let cockpit = false;
  const dropButton = actionButtons.find((button) => button.dataset.action === "drop");
  let activeStick = null, analogInput = false, dropPending = false, dropAvailable = false;
  let cinematicHud = 0;

  function syncButtons() {
    const mask = controls.mask;
    for (const button of actionButtons) button.classList.toggle("active", Boolean(mask & STEER[button.dataset.action]));
  }
  function releaseStick(pointerId) {
    if (!activeStick || activeStick.id !== pointerId) return;
    activeStick = null;
    controls.stick = null;
    for (const name of ["x", "y", "dx", "dy"]) stick.style.removeProperty("--stick-" + name);
    stick.classList.toggle("active", false);
  }
  function clearInput() {
    const captured = Array.from(controls.pointers.keys());
    if (activeStick) {
      const { id } = activeStick;
      releaseStick(id);
      if (stick.hasPointerCapture?.(id)) stick.releasePointerCapture(id);
    }
    controls.clear();
    dropPending = false;
    engine?.cancel_drop?.();
    for (const button of actionButtons) for (const id of captured) {
      if (button.hasPointerCapture?.(id)) button.releasePointerCapture(id);
    }
    syncButtons();
  }
  function capability() {
    const active = mode === "playing" && !modal && !lost && !error;
    audio.setActive(active && !doc.hidden);
    const canSelect = !loading && !error && !lost;
    buttons.forEach((button) => { button.disabled = !canSelect; });
    get("restart").disabled = !canSelect;
    get("pause").disabled = !canSelect;
    again.disabled = !canSelect;
    shell.classList.toggle("is-playing", mode !== "menu");
    shell.classList.toggle("is-paris", current === 1);
    shell.classList.toggle("is-cockpit", cockpit && active);
    viewToggle.disabled = !canSelect || !active;
    viewToggle.setAttribute("aria-pressed", String(cockpit));
    menu.hidden = mode !== "menu";
    hud.hidden = mode === "menu";
    touch.hidden = !active;
    if (dropButton) {
      dropButton.hidden = !active || !dropAvailable;
      dropButton.disabled = !active || !dropAvailable;
    }
    if (!active) { callout.hidden = true; setText(flightCue, ""); }
    hud.inert = Boolean(modal);
  }
  function setEngineStatus(message) {
    setText(status, message);
    const launchStatus = get("launch-engine");
    if (launchStatus) setText(launchStatus, message);
  }
  function failure(message) {
    error = true;
    clearInput();
    modal = null;
    mode = "menu";
    summary.hidden = true;
    setText(problem, message);
    problem.hidden = false;
    setEngineStatus("Engine unavailable");
    capability();
  }
  function provide(buffer) {
    return (pointer, length) => {
      if (length % (FLOATS_PER_VERTEX * 3) !== 0) throw new Error("The flight engine returned an incomplete mesh.");
      if (length !== 0) memoryRange(memory, pointer, length, Float32Array);
      buffer.pointer = pointer;
      buffer.length = length;
      buffer.version += 1;
    };
  }
  const imports = {
    wasi_snapshot_preview1: {
      proc_exit(code) { throw new Error(`Flight engine exited (${code}).`); },
    },
    flight: {
      world: provide(field),
      aircraft: provide(moving),
      frame(pointer, length) {
        if (length !== MISSION_FRAME_FLOATS) {
          throw new Error("The flight engine returned an invalid frame.");
        }
        memoryRange(memory, pointer, length, Float32Array);
        framePointer = pointer;
        frameLength = length;
      },
      record(pointer, length) {
        if (!Number.isSafeInteger(length) || length < 1 || length > MAX_REPLAY) return;
        replays.save(current, memoryRange(memory, pointer, length, Uint8Array));
      },
    },
  };
  function state() {
    return framePointer === null ? null : memoryRange(memory, framePointer, frameLength, Float32Array);
  }
  function updateHud(frame) {
    setText(instruments[2], roundText(frame[18], "m/s"));
    setText(instruments[3], roundText(frame[19], "m"));
    const film = frame[36];
    cinematicHud = film;
    if (film !== 0) {
      dropAvailable = false;
      if (dropButton) {
        dropButton.hidden = true;
        dropButton.disabled = true;
        dropButton.classList.toggle("drop-ready", false);
      }
      const caption = film === 1 ? "Impact" : frame[20] === 5 ? "Mail in flight" : frame[31] === 1 ? "Mail delivered" : "Mail missed";
      callout.hidden = true;
      setText(flightCue, film === 2 ? caption : "");
      setText(instruments[1], caption);
      return;
    }
    const phase = frame[20], dropStatus = frame[21], route = frame[25];
    dropAvailable = phase === 1 || phase === 9 || phase === 11;
    if (dropButton) {
      dropButton.hidden = !dropAvailable;
      dropButton.disabled = !dropAvailable;
      const action = phase === 9 ? (current === 1 ? "Load mail" : "Load spray") : phase === 11 ? "Spray row" : "Drop mail";
      setText(dropButton, action.toUpperCase());
      if (dropButton.getAttribute("aria-label") !== action) dropButton.setAttribute("aria-label", action);
      dropButton.classList.toggle("drop-ready", phase === 9 || dropStatus === 9);
    }
    const meters = roundText(frame[27], "m");
    let label, cue, distance = "";
    if (phase === 6 || phase === 10) {
      label = phase === 6 ? "Take off" : current === 1 ? "Mail loaded" : "Spray loaded";
      cue = "Hold throttle · pull down to lift off";
    } else if (phase === 7) {
      label = "Land at the supply strip";
      cue = `${LANDING_CUES[frame[29]] ?? LANDING_CUES[0]}`;
      distance = meters;
    } else if (phase === 8) {
      label = frame[26] === 13 ? "Rough touchdown · stay on the strip" : "Stop at the supply strip";
      cue = "Brake to load cargo";
      distance = `${meters} left`;
    } else if (phase === 9) {
      label = current === 1 ? "Pick up the mail pouch" : "Pick up the spray";
      cue = "Stopped on the strip · press Space or tap Load";
    } else if (phase === 11) {
      label = `Spray the marked rows · ${frame[31]}/3`;
      const sprayCues = {5:"Descend toward the row", 6:"Climb above the row", 7:"Level the wings and center on the row", 8:"Approach the next marked row", 9:"Spray now"};
      cue = sprayCues[dropStatus] ?? sprayCues[8];
      distance = meters;
    } else if (phase === 0) {
      label = "Cross the Seine";
      cue = frame[30] ? "Climb now to clear the bridge" : "Follow the turquoise guide";
      if (!frame[30]) distance = meters;
    } else if (phase === 1) {
      label = "Deliver mail";
      cue = RELEASE_CUES[dropStatus] ?? RELEASE_CUES[8];
      if (frame[26] && frame[26] === dropStatus) cue = `Not released · ${cue}`;
    } else if (phase === 5) {
      label = "Mail in flight";
      cue = "Pouch away · landing strip marked";
    } else if (phase === 3) {
      label = frame[26] === 13 ? "Rough touchdown · stay on the strip" : "Rollout";
      cue = "Steer gently and brake";
      distance = `${meters} left`;
    } else {
      label = current === 1 ? "Mail delivered · land" : "Land in the pasture";
      cue = `${LANDING_CUES[frame[29]] ?? LANDING_CUES[0]}`;
      distance = meters;
    }
    setText(instruments[1], label);
    const routeLabel = route === 1 ? "Low route." : route === 2 ? "Wide route." : "";
    setText(callout, distance ? `${cue} · ${distance}` : cue);
    callout.hidden = false;
    setText(flightCue, `${label}. ${phase === 3 ? "Steer gently and hold Brake to stop" : phase === 2 ? LANDING_CUES[frame[29]] ?? LANDING_CUES[0] : cue}. ${routeLabel}`.trim());
  }
  function showSummary(type, frame) {
    modal = type;
    clearInput();
    capability();
    summary.hidden = false;
    const snapshot = frame ?? state();
    if (snapshot) {
      setText(instruments[0], clockText(snapshot[17]));
      setText(instruments[5], `${snapshot[32]}/3`);
      setText(instruments[4], snapshot[23] > 0 ? clockText(snapshot[23]) : "—");
    }
    get("restart").hidden = type !== "pause";
    if (type === "pause") {
      setText(summaryKicker, "FLIGHT CONTROL");
      setText(summaryTitle, "Flight paused");
      setText(summaryDetail, "Resume where you left off, or pick another mission.");
      setText(again, "Resume flight");
    } else {
      const landed = frame[22] === 1;
      setText(summaryKicker, landed ? "FLIGHT REPORT" : "RUN ENDED");
      setText(summaryTitle, landed ? (current === 1 ? "Mail delivered" : "Fields treated") : "Flight ended");
      setText(summaryDetail, landed
        ? `${clockText(frame[17])} · ${frame[24]} points${frame[23] > 0 ? ` · Best ${clockText(frame[23])}` : ""}`
        : (FAILURE_CUES[frame[22]] ?? "Retry the mission for a cleaner flight."));
      setText(again, "Fly again");
    }
    again.focus();
  }
  function finishModal() {
    modal = null;
    summary.hidden = true;
    summarySettings.open = false;
    if (flightStats) flightStats.open = false;
    previous = null;
    capability();
  }
  function reset(course, playing) {
    if (loading || error || lost || !engine || !Number.isInteger(course) || course < 0 || course >= COURSES.length) return;
    try {
      current = course;
      cinematicHud = 0;
      sound.reset();
      clearInput();
      engine.reset(course);
      engine.select_view(playing && cockpit ? 1 : 0);
      const replay = replays.load(course);
      if (replay) {
        engine.ghost_begin();
        for (let index = 0; index < replay.length; index += 1) engine.ghost_byte(replay.charCodeAt(index));
        engine.ghost_end();
      }
      framePointer = null;
      const aspect = sizedCanvas(canvas, Math.min(win.devicePixelRatio || 1, 2));
      engine.tick(0, 0, aspect);
      dirty = true;
      mode = playing ? "playing" : "menu";
      finishModal();
      setText(get("track"), COURSES[course]);
      if (playing) {
        const frame = state();
        if (frame) { sound.update(frame); updateHud(frame); }
        shell.focus({ preventScroll: true });
      } else {
        buttons[course]?.focus({ preventScroll: true });
      }
    } catch {
      failure("Could not restart the flight engine. Try reloading this page.");
    }
  }
  function draw(frame) {
    const tint = FIELD_COLORS[current];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(...tint, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(gpu.sky);
    gl.bindVertexArray(gpu.skyVao);
    gl.uniform3fv(gpu.skyColor, tint);
    const projection = frame?.subarray(0, 16);
    if (projection) gl.uniformMatrix4fv(gpu.skyMatrix, false, projection);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!frame) return;
    updateBatch(gl, gpu.field, field, memory);
    updateBatch(gl, gpu.moving, moving, memory);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(gpu.scene);
    gl.uniformMatrix4fv(gpu.matrix, false, projection);
    gl.uniform3fv(gpu.fog, tint);
    for (const item of [gpu.field, gpu.moving]) {
      if (item.count === 0) continue;
      gl.bindVertexArray(item.vao);
      gl.drawArrays(gl.TRIANGLES, 0, item.count);
    }
  }
  function loop(timestamp) {
    raf = 0;
    if (error || lost || doc.hidden) return;
    try {
      const aspect = sizedCanvas(canvas, Math.min(win.devicePixelRatio || 1, 2));
      const elapsed = previous === null ? 0 : Math.max(0, (timestamp - previous) / 1000);
      previous = timestamp;
      const active = mode === "playing" && !modal;
      const resized = aspect !== loop.aspect || canvas.width !== loop.width || canvas.height !== loop.height;
      if (active) {
        const input = controls.input(analogInput) | (dropPending ? STEER.drop : 0);
        dropPending = false;
        engine.tick(elapsed, input, aspect);
      } else if (resized) engine.tick(0, 0, aspect);
      loop.aspect = aspect;
      loop.width = canvas.width;
      loop.height = canvas.height;
      const frame = state();
      if (active || dirty || resized) { draw(frame); dirty = false; }
      if (active && frame) {
        sound.update(frame);
        if (frame[22] !== 0 && frame[36] === 0) {
          updateHud(frame);
          showSummary("result", frame);
        } else if (frame[36] !== cinematicHud || (frame[36] !== 1 && timestamp >= hudTick)) {
          updateHud(frame);
          hudTick = timestamp + 90;
        }
      }
      raf = win.requestAnimationFrame(loop);
    } catch {
      failure("The game could not render this flight. Try reloading this page.");
    }
  }
  function resumeLoop() {
    previous = null;
    if (!raf && engine && gpu && !lost && !error && !doc.hidden) raf = win.requestAnimationFrame(loop);
  }
  function togglePause() {
    if (mode !== "playing" || lost || loading) return;
    if (modal === "pause") { finishModal(); shell.focus({ preventScroll: true }); }
    else if (!modal) showSummary("pause");
  }
  function toggleView() {
    if (mode !== "playing" || modal || loading || error || lost || !engine) return;
    cockpit = !cockpit;
    engine.select_view(cockpit ? 1 : 0);
    capability();
  }
  function press(event, down) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      if (!down && controls.keys.delete(event.code)) syncButtons();
      return;
    }
    if (down && event.code === "Tab" && modal) {
      const available = Array.from(summary.querySelectorAll("button:not(:disabled), a[href], summary"))
        .filter((node) => node.tabIndex >= 0 && node.getClientRects().length &&
          win.getComputedStyle(node).visibility === "visible");
      if (!available.length) return;
      const target = doc.activeElement;
      const first = available[0], last = available.at(-1);
      if (!available.includes(target) || target === (event.shiftKey ? first : last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      return;
    }
    if (down && !event.repeat && event.code === "Escape") { togglePause(); return; }
    if (down && !event.repeat && event.code === "KeyV" && mode === "playing" && !modal && !lost && !loading && !error) {
      event.preventDefault();
      toggleView();
      return;
    }
    if (down && !event.repeat && event.code === "KeyR" && mode === "playing" && !lost && modal !== "pause") {
      event.preventDefault();
      reset(current, true);
      return;
    }
    if (event.code === "Space" && mode === "playing" && !modal && !lost && !loading && !error &&
        (event.target === viewToggle || event.target?.closest?.("button") === viewToggle)) {
      event.preventDefault();
      if (down && !event.repeat && dropAvailable) dropPending = true;
      return;
    }
    if (!down) {
      if (controls.keys.delete(event.code)) { event.preventDefault(); syncButtons(); }
      return;
    }
    if (mode !== "playing" || modal || lost) return;
    const action = STEER[event.target?.dataset?.action];
    const virtual = action && (event.code === "Enter" || event.code === "Space");
    if ((virtual && action === STEER.drop) || (event.code === "Space" && !event.target?.closest?.("button"))) {
      if (dropAvailable) {
        event.preventDefault();
        if (!event.repeat) dropPending = true;
      }
      return;
    }
    const code = virtual ? action : KEYS.get(event.code);
    if (!code) return;
    event.preventDefault();
    if (event.repeat) return;
    controls.keys.set(event.code, code);
    syncButtons();
  }
  for (const button of actionButtons) {
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || modal || mode !== "playing" || lost) return;
      event.preventDefault();
      if (button === dropButton) {
        if (dropAvailable) dropPending = true;
        return;
      }
      controls.pointers.set(event.pointerId, STEER[button.dataset.action]);
      button.setPointerCapture?.(event.pointerId);
      syncButtons();
    });
    button.addEventListener("lostpointercapture", (event) => {
      if (controls.pointers.delete(event.pointerId)) syncButtons();
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  dropButton?.addEventListener("click", (event) => {
    if (event.detail === 0 && mode === "playing" && !modal && !lost && dropAvailable) dropPending = true;
  });
  stick.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || activeStick || modal || mode !== "playing" || lost) return;
    event.preventDefault();
    const area = stick.getBoundingClientRect();
    const radius = Math.max(33, Math.min(46, area.height * .32));
    const midpoint = (value, extent) => Math.max(radius, Math.min(extent - radius, value));
    activeStick = { id: event.pointerId, x: event.clientX, y: event.clientY, radius };
    controls.stick = {bank: 0, pitch: 0};
    stick.style.setProperty("--stick-x", `${midpoint(event.clientX - area.left, area.width)}px`);
    stick.style.setProperty("--stick-y", `${midpoint(event.clientY - area.top, area.height)}px`);
    stick.setPointerCapture?.(event.pointerId);
    stick.classList.toggle("active", true);
  });
  stick.addEventListener("pointermove", (event) => {
    if (!activeStick || event.pointerId !== activeStick.id) return;
    event.preventDefault();
    const {x, y, radius} = activeStick;
    const axes = stickAxes(event.clientX - x, event.clientY - y, radius);
    controls.stick = axes;
    stick.style.setProperty("--stick-dx", `${axes.bank * radius * .55 / 127}px`);
    stick.style.setProperty("--stick-dy", `${axes.pitch * radius * .55 / 127}px`);
  });
  stick.addEventListener("lostpointercapture", (event) => releaseStick(event.pointerId));
  stick.addEventListener("contextmenu", (event) => event.preventDefault());
  for (const type of ["pointerup", "pointercancel"]) win.addEventListener(type, (event) => {
    releaseStick(event.pointerId);
    if (controls.pointers.delete(event.pointerId)) syncButtons();
  }, true);
  buttons.forEach((button) => button.addEventListener("click", () => { audio.unlock(); reset(Number(button.dataset.course), true); }));
  get("restart").addEventListener("click", () => reset(current, true));
  get("pause").addEventListener("click", togglePause);
  viewToggle.addEventListener("click", toggleView);
  again.addEventListener("click", () => { audio.unlock(); if (modal === "pause") togglePause(); else reset(current, true); });
  choose.addEventListener("click", () => reset(current, false));
  win.addEventListener("keydown", (event) => press(event, true));
  win.addEventListener("keyup", (event) => press(event, false));
  function clearInterruptedInput() { clearInput(); previous = null; }
  win.addEventListener("blur", clearInterruptedInput);
  if (win.screen?.orientation?.addEventListener) win.screen.orientation.addEventListener("change", clearInterruptedInput);
  else win.addEventListener("orientationchange", clearInterruptedInput);
  doc.addEventListener("visibilitychange", () => {
    clearInput();
    capability();
    if (doc.hidden) {
      if (raf) win.cancelAnimationFrame(raf);
      raf = 0;
      previous = null;
    } else resumeLoop();
  });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    clearInput();
    if (raf) win.cancelAnimationFrame(raf);
    raf = 0;
    setEngineStatus("Restoring graphics");
    capability();
  });
  canvas.addEventListener("webglcontextrestored", () => {
    if (error) return;
    try {
      gpu = graphics(gl);
      lost = false;
      dirty = true;
      if (engine && !loading && framePointer === null) reset(current, mode === "playing");
      if (error) return;
      setEngineStatus(loading ? "Loading flight engine" : "Wosy engine ready");
      capability();
      resumeLoop();
    } catch { failure("Your browser could not restore WebGL. Reload to try again."); }
  });

  const ready = (async () => {
    if (!gl) { failure("This game needs WebGL 2. Try a current browser with hardware acceleration enabled."); return; }
    try {
      gpu = graphics(gl);
      const wasm = await win.fetch(new URL("./flight.wasm?v=flight-camera-handoff-v4", import.meta.url));
      if (!wasm.ok) throw new Error("The flight engine could not be downloaded.");
      const { instance } = await win.WebAssembly.instantiate(await wasm.arrayBuffer(), imports);
      engine = instance.exports;
      memory = engine.memory;
      for (const name of ["_start", "reset", "tick", "select_view", "cancel_drop", "ghost_begin", "ghost_byte", "ghost_end"])
        if (typeof engine[name] !== "function") throw new Error("The flight engine is incomplete.");
      engine._start();
      analogInput = engine.input_version?.() === 1;
      loading = false;
      if (!lost) reset(0, false);
      if (error) return;
      setEngineStatus(lost ? "Restoring graphics" : "Wosy engine ready");
      capability();
      resumeLoop();
    } catch {
      failure("Could not load the game. Check your connection and reload this page.");
    }
  })();
  return { ready, controls };
}

if (typeof window !== "undefined" && typeof document !== "undefined") bootFlight(window, document);
