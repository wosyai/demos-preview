import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPocketAudio } from "./audio.mjs";

const calls = [];
let audible = false, playing = false;
const listener = createPocketAudio({
  play(cue, {rate} = {}) { calls.push(["play", cue, rate]); },
  loop(cue) {
    if (!audible || playing) return;
    playing = true;
    calls.push(["loop", cue]);
  },
  stopLoop(cue) {
    if (!playing) return;
    playing = false;
    calls.push(["stop", cue]);
  },
  setActive(value) { calls.push(["active", value]); },
});
listener.snapshot(1 | 512);
assert.deepEqual(calls, [], "inactive worlds are silent");
listener.setActive(true);
listener.snapshot(512);
assert.deepEqual(calls, [["active", true]], "locked audio cannot start water");
audible = true;
listener.snapshot(512 | 1 | 2 | 4 | 8 | 16 | 32);
listener.snapshot(512);
assert.deepEqual(calls, [
  ["active", true], ["loop", "water"],
  ["play", "break", undefined], ["play", "place", undefined],
  ["play", "part", undefined], ["play", "splash", undefined],
], "significant cues win over simultaneous steps or minor pickups without restarting the loop");
audible = false;
playing = false;
listener.snapshot(512);
assert.equal(playing, false, "mute stops the active loop");
audible = true;
listener.snapshot(512);
listener.snapshot(512);
assert.deepEqual(calls.filter(([type]) => type === "loop"), [
  ["loop", "water"], ["loop", "water"],
], "unmute restarts the loop exactly once without moving from the shore");
listener.snapshot(512 | 16);
listener.snapshot(512 | 16);
assert.notEqual(calls.at(-1)[2], calls.at(-2)[2], "walking uses varied rates");
listener.snapshot(512 | 64 | 16);
listener.snapshot(512 | 16);
assert.deepEqual(calls.slice(-2), [["stop", "water"], ["play", "beacon", undefined]]);
listener.setActive(false);
listener.reset();
listener.setActive(true);
listener.snapshot(512 | 4);
listener.setActive(false);
assert.deepEqual(calls.slice(-5), [
  ["active", true], ["loop", "water"], ["play", "pickup", undefined], ["stop", "water"], ["active", false],
]);

const binary = new WebAssembly.Module(readFileSync(process.argv[2]));
let game, frame;
game = new WebAssembly.Instance(binary, {
  showcase: {
    aim() {}, atlas() {}, horizon() {}, mesh() {}, outline() {}, player() {}, water() {},
    frame(pointer) { frame = new Float32Array(game.memory.buffer, pointer, 44).slice(); },
  },
  wasi_snapshot_preview1: { proc_exit(code) { assert.fail("Wosy exited: " + code); } },
}).exports;
const tick = (dt=.05) => game.tick(dt, .53, 1);
const sound = () => game.audio_snapshot() & 255;
game._start();
game.generate(42);
assert(game.start_beacon() > 0);
tick(0);
assert.equal(sound(), 0, "starting a fresh island has no pending action cues");
const pitch = Math.atan2(5 - frame[17], frame[18] - 40.5);
game.look(0, (frame[19] - pitch) / .0034);
tick(0);
assert.equal(game.edit_control(0, 2), -4);
assert.equal(sound(), 0, "rejected edit never sounds");
assert.equal(game.edit_control(1, 2), 1);
assert.equal(sound(), 2, "successful real placement sounds once");
assert.equal(sound(), 0, "reading drains one-shots");
tick(0);
assert.equal(game.edit_control(0, 2), 1);
assert.equal(sound(), 1, "successful real break sounds independently");
game.control(0, 1);
let heard = 0;
for (let i = 0; i < 30; i++) { tick(); heard |= sound(); }
game.control(0, 0);
assert(heard & 4, "collecting the loose wood produces an actual pickup");
assert(heard & 16, "walking distance, not key press, drives footsteps");
for (let i = 0; i < 15; i++) { tick(); assert.equal(sound() & 16, 0); }
assert(game.start_beacon() > 0);
tick(0);
const walk = (button, axis, goal, sign) => {
  game.control(button, 1);
  for (let i = 0; i < 80 && (goal - frame[axis]) * sign > 0; i++) { tick(); heard |= sound(); }
  game.control(button, 0);
};
heard = 0;
walk(0, 18, 33.42, -1);
walk(3, 16, 28.5, 1);
walk(0, 18, 26.5, -1);
assert(heard & 32, "the actual water entry publishes one splash");
assert.equal(game.audio_snapshot() & 512, 512, "local sea state persists independently of one-shot drain");
assert.equal(sound() & 32, 0, "staying in water does not repeat the splash");
