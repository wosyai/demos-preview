from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import sys

ferry = Path(__file__).resolve().parent.parent
wosy = Path(sys.argv[1]).resolve()
startup = ferry.parent / "tools/start.ll"

with TemporaryDirectory(prefix="ferry-pedestrian-") as directory:
    fixture = Path(directory)
    source = (ferry / "engine.w").read_text()
    probe = """
    i32(f32,f32) corner_probe = fn(x,z) {
        if (body_distance_sq(0.0,0.0,x,z,0.0,1.0)>1.38 && ped_vehicle_box(x,z,0.0,1.0)) { 1 } else { 0 }
    };
    i32(f32,f32,i32) wall_probe = fn(x,z,preferred) {
        i32 resolved=choose_ped_fall(x,z,preferred);
        if (!ped_world_roll_clear(x,z,preferred) && ped_world_roll_clear(x,z,resolved)) { resolved } else { -1 }
    };
    f32(bool) rise_probe = fn(clear) {
        car_x=if (clear) { 20.0 } else { 0.0 };
        car_z=if (clear) { -9.0 } else { 0.0 };
        car_yaw=0.0;
        peds[0].x=0.90; peds[0].z=1.90;
        peds[0].fall_axis=4;
        peds[0].stun_seconds=ped_rise_time;
        move_peds(0);
        peds[0].stun_seconds
    };
    """
    assert source.rstrip().endswith("%%end")
    (fixture / "engine.w").write_text(source.rsplit("%%end", 1)[0] + probe + "\n%%end\n")
    (fixture / "wosy.toml").write_bytes((ferry / "wosy.toml").read_bytes())
    builder = (ferry / "build-wasm.py").read_text()
    assert builder.count('"navigation_point")') == 1
    (fixture / "build-wasm.py").write_text(builder.replace(
        'Path(__file__).resolve().parent.parent / "tools" / "start.ll"', f"Path({str(startup)!r})"
    ).replace('"navigation_point")', '"navigation_point", "corner_probe", "wall_probe", "rise_probe")'))
    subprocess.run([str(wosy), "build", "app"], cwd=fixture, check=True)
    subprocess.run(["node", "--input-type=module", "-e", """
      import assert from "node:assert/strict";
      import {readFileSync} from "node:fs";
      const {instance:{exports:e}}=await WebAssembly.instantiate(readFileSync(process.argv[1]),
        {ferry:{world(){},moving(){},frame(){}}});
      e._start();
      e.reset(1);
      assert.equal(e.corner_probe(.90,1.90),1,"front corner excluded by the old capsule blocks the get-up");
      assert.equal(e.corner_probe(1.51,1.90),0,"space beyond the expanded body remains free");
      assert.equal(e.wall_probe(5.50,57.0,1),2,"a building blocks eastward roll but permits a northward get-up");
      assert(Math.abs(e.rise_probe(0)-.40)<1e-6,"a body at the actual corner waits on the ground");
      assert(e.rise_probe(1)<.40,"same ground contact can rise after the car clears");
      console.log("Last Ferry: conservative vehicle corners, actual wall alternative and wait/clear recovery passed.");
    """, str(fixture / ".wosy/artifacts/app/dev/main/main")], cwd=fixture, check=True)
