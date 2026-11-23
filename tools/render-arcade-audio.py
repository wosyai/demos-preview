#!/usr/bin/env python3
"""Generate the Wosy Arcade sound bank offline with Earshot 1.0.0 and FFmpeg."""

import argparse
from array import array
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 24000


def sound(name, design, seed, **options):
    return {"name": name, "sound": design, "seed": seed, **options}


def motor(name, description, seed, rpm_tone, cutoff, pulse, rumble):
    return {
        "name": name,
        "recipe": {
            "name": f"arcade_{name}_{rpm_tone}",
            "says": description,
            "kind": "ambience",
            "space": "dry",
            "dur": 5.2,
            "layers": [
                {"source": "sine", "hz": rpm_tone, "dur": 5.2, "gain": -10},
                {"source": "sine", "hz": rpm_tone * 2, "dur": 5.2, "gain": -18},
                {"source": "noise", "color": rumble, "dur": 5.2, "highpass": 45,
                 "lowpass": cutoff, "gain": -6,
                 "spin": {"rate": pulse, "depth": .53, "shape": "smooth"}},
            ],
        },
        "seed": seed,
        "lufs": -24,
    }


SETS = {
    "pocket": [
        sound("water", "waves/rocks", 0, dur=12.5, loop=True),
        sound("break", "break/rock", 12, n=2, dur=.42),
        sound("place", "knock/wood", 20, n=2),
        sound("pickup", "pickup/blip", 31),
        sound("part", "leather/grab", 0),
        sound("step", "step/lawn", 0, n=6, events=1, dur=.30),
        sound("splash", "splash/small", 0, n=2),
        sound("beacon", "success/triad", 26),
        sound("fail", "error/fall", 19),
    ],
    "flight": [
        motor("engine", "a stylized light propeller engine with fast airy pulses", 103, 46, 1150, 28, "pink"),
        sound("wind", "wind/open", 0, dur=12.5, loop=True),
        sound("gate", "success/fifth", 45, dur=.40),
        sound("cargo", "leather/grab", 1),
        sound("drop", "pass/air", 17, dur=.55),
        sound("delivered", "success/rise", 44),
        sound("missed", "error/fall", 12),
        sound("spray", "spray_can/spray", 0, n=2),
        sound("touchdown", "land/grass", 0, n=2),
        sound("rough-touchdown", "land/dirt", 0, n=2),
        {"name": "crash", "recipe": {
            "name": "arcade_light_airframe_ground_impact",
            "says": "a wooden aircraft striking dirt and splintering",
            "space": "dry",
            "layers": [
                {"sound": "land/dirt", "pitch": -4, "gain": 0},
                {"sound": "hit/wood", "at": .06, "pitch": -5, "gain": -4},
                {"sound": "break/rock", "at": .12, "cut": [0, .38], "gain": -8},
            ],
        }, "seed": 73},
    ],
    "ferry": [
        motor("engine", "a stylized compact car engine with a close low midrange buzz", 177, 56, 640, 19, "brown"),
        motor("ferry", "a stylized ferry motor with low soft pulses", 194, 33, 290, 8, "brown"),
        sound("footstep", "step/concrete", 0, n=6, events=1, dur=.28),
        sound("door", "car_door/slam", 0),
        sound("impact", "impact/car", 3, n=2),
        sound("phone", "phone/vibrate", 0, dur=.7),
        sound("tape", "paper/card", 0),
        sound("board", "step/floorboard", 0, events=1),
        sound("delivered", "success/shutter", 1),
        sound("missed", "error/knock", 1),
    ],
}
LOOPS = {"pocket": {"water"}, "flight": {"engine", "wind"}, "ferry": {"engine", "ferry"}}


def process(*args):
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE).stdout


def ffmpeg(source, target, *encoding):
    process("ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source), "-map_metadata", "-1", "-fflags", "+bitexact",
            "-flags:a", "+bitexact", "-ac", "1", "-ar", str(RATE),
            *encoding, str(target))


def stitch(wav):
    """Overlap the last fifth of a second with the head, preserving a real wrap."""
    with wave.open(str(wav), "rb") as reader:
        assert (reader.getnchannels(), reader.getsampwidth(), reader.getframerate()) == (1, 2, RATE)
        signal = array("h")
        signal.frombytes(reader.readframes(reader.getnframes()))
    if sys.byteorder != "little":
        signal.byteswap()
    n = RATE // 5
    assert len(signal) > n * 4
    tail = len(signal) - n
    for i in range(n):
        alpha = i / (n - 1)
        signal[i] = round(signal[tail + i] * (1 - alpha) + signal[i] * alpha)
    del signal[tail:]
    if sys.byteorder != "little":
        signal.byteswap()
    with wave.open(str(wav), "wb") as writer:
        writer.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        writer.writeframes(signal.tobytes())


def audit(path):
    samples = subprocess.check_output([
        "ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", str(path),
        "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-",
    ])
    pcm = array("h")
    pcm.frombytes(samples)
    if sys.byteorder != "little":
        pcm.byteswap()
    assert pcm, f"no decoded audio: {path}"
    assert 20 < max(max(pcm), -min(pcm)) < 32767, f"silent or clipping: {path}"
    return len(pcm)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--earshot", default="earshot")
    parser.add_argument("--out", type=Path, default=ROOT / "arcade/audio")
    args = parser.parse_args()
    version = process(args.earshot, "--version").strip()
    assert version == "earshot 1.0.0", version
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    with tempfile.TemporaryDirectory(prefix="arcade-assets-") as temporary:
        temp = Path(temporary)
        for game, entries in SETS.items():
            spec = temp / f"{game}.json"
            spec.write_text(json.dumps({"mono": True, "sounds": entries}))
            src = temp / game
            print(process(args.earshot, "make", "--spec", str(spec), "--format", "wav", "-o", str(src)), end="")
            rows = json.loads((src / "manifest.json").read_text())["sounds"]
            names = {entry["name"] for entry in entries}
            target = out / game
            target.mkdir(exist_ok=True)
            cues = {name: {"takes": []} for name in sorted(names)}
            for row in rows:
                stem = Path(row["file"]).stem
                name = stem.rsplit("_", 1)[0] if stem not in names else stem
                loop = name in LOOPS[game]
                assert row["ok"], f"Earshot audit did not pass: {game}/{stem}"
                assert 0.04 <= row["dur_s"] <= 21, f"unexpected duration: {game}/{stem}"
                original = src / row["file"]
                if loop:
                    pcm = target / f"{stem}.wav"
                    ffmpeg(original, pcm, "-c:a", "pcm_s16le")
                    if not row["loop"]:
                        stitch(pcm)
                    fallback = pcm
                    original = pcm
                else:
                    fallback = target / f"{stem}.mp3"
                    ffmpeg(original, fallback, "-c:a", "libmp3lame", "-b:a", "48k")
                opus = target / f"{stem}.webm"
                ffmpeg(original, opus, "-c:a", "libopus", "-b:a", "32k" if loop else "36k", "-application", "audio")
                length_a, length_b = audit(opus), audit(fallback)
                assert abs(length_a - length_b) <= RATE // 15, f"duration diverged: {game}/{stem}"
                cues[name]["takes"].append([f"{game}/{opus.name}", f"{game}/{fallback.name}"])
            assert all(entry["takes"] for entry in cues.values()), game
            manifest[game] = cues
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    sources = sum(len(cue["takes"]) for cues in manifest.values() for cue in cues.values())
    print(f"{sources} takes decoded in two formats each; manifest written")


if __name__ == "__main__":
    main()
