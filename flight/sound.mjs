// Read only the authoritative Wosy flight frame; never infer a cue from a key press.
export function flightSound(audio) {
  let last = null;
  let engine = false, wind = false;
  const stop = () => {
    if (engine) audio.stopLoop("engine");
    if (wind) audio.stopLoop("wind");
    engine = wind = false;
  };

  return {
    reset() { last = null; stop(); },
    update(frame) {
      const course = frame[16], speed = frame[18], phase = frame[20], result = frame[22];
      const rough = frame[26] === 13, sprayed = frame[31], gates = frame[32], film = frame[36];
      const flying = phase !== 3 && phase !== 6 && phase !== 8 && phase !== 9 && phase !== 10;
      const live = result === 0 && film !== 1;
      if (live) {
        const motion = Math.max(0, Math.min(1, speed / 45));
        // Continuous speed gain/rate are presentation controls, not game state.
        audio.loop("engine", { gain: 0.12 + motion * 0.16, rate: 0.78 + motion * 0.54 });
        engine = true;
        if (flying) {
          audio.loop("wind", { gain: motion * 0.17, rate: 0.86 + motion * 0.28 });
          wind = true;
        } else if (wind) { audio.stopLoop("wind"); wind = false; }
      } else stop();
      if (last) {
        if (film === 1 && last.film !== 1) audio.play("crash", { gain: 0.55 });
        else {
          if (phase !== last.phase) {
            if (last.phase === 9 && phase === 10) audio.play("cargo", { gain: 0.42 });
            else if (last.phase === 1 && phase === 5) audio.play("drop", { gain: 0.44 });
            else if (last.phase === 5 && phase === 2) audio.play("delivered", { gain: 0.45 });
            else if (last.phase === 5 && phase === 1) audio.play("missed", { gain: 0.32 });
            else if (phase === 3 || phase === 8) audio.play(rough ? "rough-touchdown" : "touchdown", { gain: 0.52 });
          }
          if (gates > last.gates) audio.play("gate", { gain: 0.35 });
          if (course === 0 && sprayed > last.sprayed) audio.play("spray", { gain: 0.42 });
        }
      }
      last = { phase, sprayed, gates, film };
    },
  };
}
