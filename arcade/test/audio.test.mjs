import test from "node:test";
import assert from "node:assert/strict";
import { createGameAudio } from "../audio.mjs";

const drain = () => new Promise(resolve => setImmediate(resolve));
const parameter = (value = 0) => ({ value, calls: [], setTargetAtTime(...args) { this.calls.push(args); } });
function graph(object = {}) { return Object.assign({ connect: next => next, disconnect() {} }, object); }
function harness() {
  const contexts = [], fetched = [], buttons = [], stored = new Map();
  class Audio {
    constructor() { this.state = "suspended"; this.currentTime = 0; this.sources = []; contexts.push(this); }
    resume() { this.state = "running"; }
    createGain() { return graph({ gain: parameter() }); }
    createDynamicsCompressor() { return graph({ threshold: parameter(), ratio: parameter() }); }
    createBufferSource() {
      const source = graph({ playbackRate: parameter(), started: 0, stopped: 0,
        start() { this.started++; }, stop() { this.stopped++; this.onended?.(); } });
      this.sources.push(source);
      return source;
    }
    decodeAudioData(data) {
      if (data.endsWith(".webm")) throw Error("unsupported format");
      return data;
    }
  }
  const browser = {
    localStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    document: { querySelectorAll: () => [{
      setAttribute(key, value) { this[key] = value; },
      addEventListener(_, fn) { this.click = fn; buttons.push(this); }
    }] }
  };
  const fetch = async url => {
    const name = url.pathname.split("/").at(-1);
    fetched.push(name);
    return { ok: true, arrayBuffer: async () => name, json: async () => ({
      test: {
        hit: { takes: [["hit-a.webm", "hit-a.mp3"], ["hit-b.mp3"]] },
        motor: { takes: [["motor.webm", "motor.wav"]] }
      }
    }) };
  };
  return { mixer: createGameAudio("test", { browser, AudioContext: Audio, fetch }), contexts, fetched, buttons };
}

test("the game stays silent and does not fetch until a user unlocks audio", async () => {
  const { mixer, contexts, fetched } = harness();
  mixer.play("hit");
  mixer.loop("motor");
  await drain();
  assert.equal(contexts.length, 0);
  assert.deepEqual(fetched, []);
  assert.equal(await mixer.unlock(), true);
  mixer.play("hit");
  await drain();
  assert.equal(contexts[0].sources[0].buffer, "hit-a.mp3");
  assert.deepEqual(fetched.filter(name => name === "hit-a.mp3"), ["hit-a.mp3"]);
  contexts[0].currentTime = .07;
  mixer.play("hit");
  await drain();
  assert.equal(contexts[0].sources[1].buffer, "hit-b.mp3");
});

test("a loop is reusable, smoothly modulated, and stops on pause or mute", async () => {
  const { mixer, contexts, buttons } = harness();
  await mixer.unlock();
  mixer.loop("motor", { gain: .2, rate: .91 });
  await drain();
  mixer.loop("motor", { gain: .3, rate: 1.1 });
  mixer.loop("motor", { gain: .3, rate: 1.1 });
  const [motor] = contexts[0].sources;
  assert.equal(contexts[0].sources.length, 1);
  assert.equal(motor.buffer, "motor.wav");
  assert.equal(motor.loop, true);
  assert.deepEqual(motor.playbackRate.calls.map(args => args[0]), [.91, 1.1]);
  mixer.setActive(false);
  assert.equal(motor.stopped, 1);
  mixer.setActive(true);
  buttons[0].click();
  assert.equal(buttons[0]["aria-pressed"], "true");
  mixer.play("hit");
  await drain();
  assert.equal(contexts[0].sources.length, 1);
});

test("a pending shot never plays across a pause and resume", async () => {
  const { mixer, contexts } = harness();
  await mixer.unlock();
  mixer.play("hit");
  mixer.setActive(false);
  mixer.setActive(true);
  await drain();
  assert.equal(contexts[0].sources.length, 0);
});
