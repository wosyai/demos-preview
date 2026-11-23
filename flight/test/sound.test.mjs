import test from "node:test";
import assert from "node:assert/strict";
import { flightSound } from "../sound.mjs";

function harness() {
  const cues = [], calls = [];
  const adapter = flightSound({
    play: cue => cues.push(cue),
    loop: (cue, parameters) => calls.push(["loop", cue, parameters]),
    stopLoop: cue => calls.push(["stop", cue]),
  });
  return { adapter, cues, calls };
}

function frame({ course = 1, speed = 22, phase = 1, result = 0, rough = false,
  sprayed = 0, gates = 0, film = 0 } = {}) {
  const row = new Float32Array(41);
  Object.assign(row, { 16: course, 18: speed, 20: phase, 22: result, 26: rough ? 13 : 0,
    31: sprayed, 32: gates, 36: film });
  return row;
}

test("mail events play exactly once per authoritative transition, including misses and retries", () => {
  const { adapter, cues } = harness();
  for (const phase of [9, 10, 10, 0, 1, 1, 5, 5, 1, 1, 5, 2, 2, 3, 3]) {
    adapter.update(frame({ phase }));
  }
  assert.deepEqual(cues, ["cargo", "drop", "missed", "drop", "delivered", "touchdown"]);
});

test("gate, completed crop rows, and rough landings follow the engine; stop both loops at impact", () => {
  const { adapter, cues, calls } = harness();
  for (const state of [
    { phase: 6, speed: 0 },
    { phase: 11, gates: 1, sprayed: 1 },
    { phase: 11, gates: 1, sprayed: 1, speed: 38 },
    { phase: 11, gates: 1, sprayed: 2 },
    { phase: 3, gates: 1, sprayed: 2, rough: true },
    { phase: 11, gates: 1, sprayed: 2 },
    { phase: 11, gates: 1, sprayed: 2, result: 8, film: 1 },
    { phase: 11, gates: 1, sprayed: 2, result: 8, film: 1 },
  ]) adapter.update(frame({ course: 0, ...state }));
  assert.deepEqual(cues, ["gate", "spray", "spray", "rough-touchdown", "crash"]);
  assert.deepEqual(calls.slice(-2), [["stop", "engine"], ["stop", "wind"]]);
  const engineRates = calls.filter(([method, cue]) => method === "loop" && cue === "engine");
  assert(engineRates[0][2].rate < engineRates[2][2].rate);
  adapter.reset();
  adapter.update(frame({ course: 0, gates: 1, sprayed: 1, film: 0 }));
  assert.equal(cues.length, 5, "reset establishes a baseline, without replaying stale events");
});
