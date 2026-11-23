from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import sys

ferry = Path(__file__).resolve().parent.parent
wosy = Path(sys.argv[1]).resolve()
startup = (ferry.parent / "tools" / "start.ll").resolve()

with TemporaryDirectory(prefix="ferry-collision-") as directory:
    fixture = Path(directory)
    source = (ferry / "engine.w").read_text()
    boundary_probe = """
    f32(f32,f32) touch_probe = fn(dx,dz) {
        contact_x=0.0; contact_z=1.0;
        f32 t=vehicle_sweep(1.88,0.0,dx,dz,0.0,1.0,false);
        if (contact_x==1.0 && contact_z==0.0) { t } else { -1.0 }
    };
    """
    assert source.rstrip().endswith("%%end")
    (fixture / "engine.w").write_text(
        source.rsplit("%%end", 1)[0] + boundary_probe + "\n%%end\n"
    )
    (fixture / "wosy.toml").write_bytes((ferry / "wosy.toml").read_bytes())
    builder = (ferry / "build-wasm.py").read_text().replace(
        'Path(__file__).resolve().parent.parent / "tools" / "start.ll"',
        f"Path({str(startup)!r})",
    ).replace('"navigation_point")', '"navigation_point", "touch_probe")')
    (fixture / "build-wasm.py").write_text(builder)
    subprocess.run([str(wosy), "build", "app"], cwd=fixture, check=True)
    subprocess.run(
        ["node", "--input-type=module", "-e", """
            import assert from "node:assert/strict";
            import {readFileSync} from "node:fs";
            const {instance:{exports:e}}=await WebAssembly.instantiate(
                readFileSync(process.argv[1]), {ferry:{world(){},moving(){},frame(){}}});
            assert.equal(e.touch_probe(-.000002,0),0,"exact touch rejects inward motion");
            assert.equal(e.touch_probe(.025,0),2,"exact touch allows outward motion");
            assert.equal(e.touch_probe(0,.025),2,"exact touch allows tangential motion");
            console.log("Last Ferry: exact contact selects its own normal and resolves inward, outward and tangent translations.");
        """, str(fixture / ".wosy/artifacts/app/dev/main/main")],
        cwd=fixture,
        check=True,
    )
