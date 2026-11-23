const BREAK = 1, PLACE = 2, PICKUP = 4, PART = 8, STEP = 16, SPLASH = 32;
const BEACON = 64, FAIL = 128, SHORE = 512;
const WATER = {gain: .17};
const SUCCESS = {gain: .63}, FAILURE = {gain: .51};
const CHISEL = {gain: .52}, STACK = {gain: .47};
const WOOD = {gain: .48}, COMPONENT = {gain: .60}, WADING = {gain: .37};
const FOOT = [{gain: .28, rate: .93}, {gain: .31, rate: 1.03}, {gain: .27, rate: .99}, {gain: .29, rate: 1.08}];

export function createPocketAudio(audio) {
  let active = false, shore = false, terminal = false, foot = 0;
  function water(on) {
    if (on) audio.loop("water", WATER);
    else if (shore) audio.stopLoop("water");
    shore = on;
  }
  return {
    setActive(on) {
      if (on === active) return;
      active = on;
      if (!on) water(false);
      audio.setActive(on);
    },
    reset() {
      terminal = false;
      foot = 0;
      water(false);
    },
    snapshot(bits) {
      if (!active || terminal) return;
      if (bits & (BEACON | FAIL)) {
        terminal = true;
        water(false);
        if (bits & BEACON) audio.play("beacon", SUCCESS);
        else audio.play("fail", FAILURE);
        return;
      }
      water(Boolean(bits & SHORE));
      if (bits & BREAK) audio.play("break", CHISEL);
      if (bits & PLACE) audio.play("place", STACK);
      if (bits & PART) audio.play("part", COMPONENT);
      else if (bits & PICKUP) audio.play("pickup", WOOD);
      if (bits & SPLASH) audio.play("splash", WADING);
      else if (bits & STEP) audio.play("step", FOOT[foot++ % FOOT.length]);
    },
  };
}
