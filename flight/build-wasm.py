from pathlib import Path
import os
import subprocess
import sys

partition, output, _, runtime = map(Path, sys.argv[1:])
startup = Path(__file__).resolve().parent.parent / "tools" / "start.ll"
names = ("_start", "reset", "tick", "input_version", "cancel_drop", "ghost_begin", "ghost_byte", "ghost_end")
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
