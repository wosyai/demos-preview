# Wosy Arcade audio

The shipped clips were rendered with [Earshot 1.0.0](https://github.com/Leonxlnx/earshot/releases/tag/v1.0.0) (commit `7a7f7c5c70d4a763a1eca4b3666af7c77e313f97`). Its [license statement](https://github.com/Leonxlnx/earshot#licence) permits commercial use of renders without attribution. See Earshot’s [recording credits](https://github.com/Leonxlnx/earshot/blob/v1.0.0/earshot/data/resyn/CREDITS.md). The site serves rendered clips, not Earshot code, models, or source recordings.

Regenerate from the repository root with Earshot 1.0.0 and FFmpeg built with libopus and libmp3lame:

```sh
python3 tools/render-arcade-audio.py --earshot /path/to/earshot
```

`manifest.json` lists each cue’s takes. The mixer tries WebM/Opus first, then MP3 for one-shots or PCM WAV for loops. All files are mono at 24 kHz. Motor beds are stylized, not vehicle recordings.
