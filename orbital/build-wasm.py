from pathlib import Path
import os
import subprocess
import sys

partition, output, _, runtime = map(Path, sys.argv[1:])
startup = Path(__file__).resolve().parent.parent / "tools" / "start.ll"
names = ("_start", "reset", "tick", "select_deck", "select_arm", "set_thrust", "set_rotator", "select_reentry", "camera_clip", "hud_code", "scenery_motion", "entry_flow", "project_visual", "camera_mode", "globe_tiles", "reentry_shell", "reentry_visual", "input_key", "input_action", "input_clear", "input_release", "input_pointer", "input_stick", "input_status", "input_advance", "quality_adapt", "quality_plan", "quality_shadow")
objects = []
for source, name in ((partition, "main.o"), (startup, "start.o"), (runtime, "runtime.o")):
    obj = output / name
    subprocess.run([os.environ.get("CLANG", "clang"), "--target=wasm32-wasi",
                    "-c", "-O2", "-x", "ir", str(source), "-o", str(obj)], check=True)
    objects.append(str(obj))
subprocess.run([os.environ.get("WASM_LD", "wasm-ld"), "--no-entry", "--allow-undefined",
                "--export-memory", "-z", "stack-size=8388608",
                *(f"--export={name}" for name in names), *objects, "-o", str(output / "main")],
               check=True)
