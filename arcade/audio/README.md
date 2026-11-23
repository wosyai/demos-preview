# Wosy Arcade audio

These files are first-party renders of the
[Earshot 1.0.0 catalogue and synthesis tools](https://github.com/Leonxlnx/earshot/releases/tag/v1.0.0)
(commit `7a7f7c5c70d4a763a1eca4b3666af7c77e313f97`). No original source recording,
Earshot model, or runtime library is served. Earshot's
[license statement](https://github.com/Leonxlnx/earshot#licence) permits any use
of its renders, including commercial use, without required credit. Its catalog
maintains recording
[credits](https://github.com/Leonxlnx/earshot/blob/v1.0.0/earshot/data/resyn/CREDITS.md)
and separate credits for ambience textures. Its code is MIT; no Earshot code is
embedded here.

`tools/render-arcade-audio.py` is the source of the cue names, design IDs, recipe
parameters, seeds, and take counts. It renders each game's cues as one set,
then encodes only the shipped formats. The light propeller, city car, and ferry
motor beds are **stylized sound design**, not recordings of historical
vehicles. The airframe crash layers low dirt impact, wood knock, and a brief
crumble. Steps use six variations per ground palette.

Regenerate from the repository root with Earshot 1.0.0 and FFmpeg with libopus
and libmp3lame support:

```sh
python3 tools/render-arcade-audio.py --earshot /path/to/earshot
```

The mixer reads `manifest.json` and chooses WebM/Opus first, with MP3 fallback
for one-shots and PCM WAV fallback for loops (no MP3 padding at the wrap).
All deliveries are mono, 24 kHz. Custom motor loops use a 200 ms overlap in PCM
before both formats are written. The renderer verifies Earshot's audit,
decodability, non-silence, peak safety, and fallback duration. Neither these
measurements nor the file formats establish handset playback or perceived
realism; those need listening in an actual game.
