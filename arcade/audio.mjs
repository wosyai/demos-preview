const mixerURL = new URL("./audio/manifest.json", import.meta.url);
const preference = "wosy.arcade.audioMuted";
const maxVoices = 12;

const bounded = (value, fallback, min, max) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function createGameAudio(game, options = {}) {
  const browser = options.browser ?? options.win ?? globalThis;
  const document = options.doc ?? browser.document;
  let Audio = options.AudioContext ?? browser.AudioContext ?? browser.webkitAudioContext;
  const load = options.fetch ?? browser.fetch?.bind(browser);
  let context, master, manifestRequest;
  let active = true, epoch = 0;
  let muted = false;
  try { muted = browser.localStorage?.getItem(preference) === "1"; } catch {}
  const buffers = new Map();
  const unavailable = new Set();
  const sequence = new Map();
  const shots = new Set();
  const loops = new Map();
  const requests = new Map();
  const buttons = Array.from(document?.querySelectorAll?.("[data-game-mute]") ?? []);

  function updateButtons() {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(muted));
      button.textContent = muted ? "Sound off" : "Sound on";
    }
  }

  function setMuted(next) {
    muted = Boolean(next);
    try { browser.localStorage?.setItem(preference, muted ? "1" : "0"); } catch {}
    master?.gain.setTargetAtTime(muted ? 0 : .75, context.currentTime, .02);
    if (muted) { epoch++; stopLoops(); stopShots(); }
    updateButtons();
  }

  function bank() {
    return manifestRequest ??= Promise.resolve().then(async () => {
      const response = await load(mixerURL);
      if (!response.ok) throw Error("audio manifest unavailable");
      return (await response.json())[game] ?? {};
    }).catch(() => ({}));
  }

  function samples(cue) {
    if (!buffers.has(cue)) buffers.set(cue, bank().then(async bankMap => {
      const entry = bankMap[cue];
      if (!entry?.takes) return [];
      return (await Promise.all(entry.takes.map(async formats => {
        for (const file of formats) {
          try {
            const response = await load(new URL(file, mixerURL));
            if (response.ok) return await context.decodeAudioData(await response.arrayBuffer());
          } catch {}
        }
        return null;
      }))).filter(Boolean);
    }));
    return buffers.get(cue);
  }

  function audible() {
    return Boolean(context && context.state === "running" && active && !muted);
  }

  async function unlock() {
    if (!Audio || !load) return false;
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = muted ? 0 : .75;
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.ratio.value = 6;
        master.connect(limiter).connect(context.destination);
      }
      if (context.state !== "running") await context.resume();
      if (context.state === "running" && !muted) {
        void bank().then(async catalog => {
          const cues = Object.keys(catalog);
          for (let i = 0; i < cues.length; i += 3) {
            await Promise.all(cues.slice(i, i + 3).map(samples));
          }
        });
      }
      return context.state === "running";
    } catch {
      if (!master) Audio = undefined;
      return false;
    }
  }

  function controls(params, fallback) {
    return {
      gain: bounded(params.gain, fallback, 0, 1),
      rate: bounded(params.rate, 1, .5, 2)
    };
  }

  function sourceFor(buffer, { gain, rate }, loop) {
    const source = context.createBufferSource();
    const volume = context.createGain();
    volume.gain.value = loop ? 0 : gain;
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    source.connect(volume).connect(master);
    return { source, volume };
  }

  function play(cue, params = {}) {
    if (!audible() || unavailable.has(cue) || shots.size >= maxVoices) return;
    const frame = context.currentTime, generation = epoch;
    const previous = sequence.get(cue);
    if (previous && frame - previous.time < .055) return;
    const index = previous ? previous.index + 1 : 0;
    sequence.set(cue, { time: frame, index });
    void samples(cue).then(takes => {
      if (!takes.length) { unavailable.add(cue); return; }
      if (generation !== epoch || !audible() || shots.size >= maxVoices || context.currentTime - frame > .18) return;
      const { source, volume } = sourceFor(takes[index % takes.length], controls(params, .42), false);
      shots.add(source);
      source.onended = () => { shots.delete(source); source.disconnect(); volume.disconnect(); };
      source.start();
    }).catch(() => {});
  }

  function updateLoop(track, mix) {
    if (!track.mix || Math.abs(track.mix.gain - mix.gain) >= .01) {
      track.volume.gain.setTargetAtTime(mix.gain, context.currentTime, .045);
      track.mix = { gain: mix.gain, rate: track.mix?.rate ?? -1 };
    }
    if (Math.abs(track.mix.rate - mix.rate) >= .01) {
      track.source.playbackRate.setTargetAtTime(mix.rate, context.currentTime, .06);
      track.mix.rate = mix.rate;
    }
  }

  function loop(cue, params = {}) {
    if (!audible() || unavailable.has(cue)) return;
    const mix = controls(params, .24);
    const track = loops.get(cue);
    if (track) { updateLoop(track, mix); return; }
    const current = requests.get(cue);
    if (current) { current.mix = mix; return; }
    const request = { mix };
    requests.set(cue, request);
    void samples(cue).then(takes => {
      if (requests.get(cue) !== request) return;
      requests.delete(cue);
      if (!takes.length) { unavailable.add(cue); return; }
      if (!audible()) return;
      const track = sourceFor(takes[0], request.mix, true);
      loops.set(cue, track);
      track.source.onended = () => { track.source.disconnect(); track.volume.disconnect(); };
      track.source.start();
      updateLoop(track, request.mix);
    }).catch(() => {});
  }

  function stopLoop(cue) {
    requests.delete(cue);
    const track = loops.get(cue);
    if (!track) return;
    loops.delete(cue);
    track.volume.gain.setTargetAtTime(0, context.currentTime, .02);
    track.source.stop(context.currentTime + .085);
  }

  function stopLoops() {
    for (const cue of loops.keys()) stopLoop(cue);
    requests.clear();
  }

  function stopShots() {
    for (const shot of shots) {
      try { shot.stop(); } catch {}
    }
    shots.clear();
  }

  function setActive(next) {
    next = Boolean(next);
    if (active && !next) { epoch++; stopLoops(); stopShots(); }
    active = next;
  }

  for (const button of buttons) button.addEventListener("click", () => {
    setMuted(!muted);
    if (!muted) void unlock();
  });
  updateButtons();

  return { unlock, play, loop, stopLoop, setActive, setMuted };
}
