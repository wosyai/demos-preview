from pathlib import Path
import os
import subprocess
import sys

partition, output_dir, _, runtime = map(Path, sys.argv[1:])
start = Path(__file__).with_name("start.ll")
clang = os.environ.get("CLANG", "clang")
linker = os.environ.get("WASM_LD", "wasm-ld")
names = ("_start", "generate", "rebuild", "edit", "pick", "control", "clear_controls",
         "look", "reset_camera", "tick", "edit_view", "select_material", "cycle_material", "place_selected",
         "seed_begin", "seed_code_unit", "seed_end", "default_seed", "pulse_control", "edit_control", "cycle_camera", "start_beacon", "leave_beacon")
sources = ((partition, "main.o"), (start, "start.o"), (runtime, "runtime.o"))
objects = []
for source, name in sources:
    obj = output_dir / name
    subprocess.run([clang, "--target=wasm32-wasi", "-c", "-x", "ir", str(source), "-o", str(obj)], check=True)
    objects.append(str(obj))
subprocess.run(
    [linker, "--no-entry", "--allow-undefined", "--export-memory", "-z", "stack-size=6291456",
     *(f"--export={name}" for name in names), *objects, "-o", str(output_dir / "main")],
    check=True,
)
