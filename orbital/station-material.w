%%start
bridge = extern wasm "orbital" { unsafe unit(*?u8,i32) material_art; };
f64[75] profile=[
    0.6205,0.18375,0.18525,0.752,0.75625,
    -1.10,0.20,-6.39,0.926,0.378,
    1.22,1.18,-0.95,0.79,-0.67,0.32,1.248,
    0.80,1.19,-0.672,-0.629,0.17,
    -0.001,0.646,0.177,0.0,-0.77,-0.64,0.108,
    -0.001,-0.643,0.177,0.0,0.77,-0.64,0.116,
    -0.3695,-0.239,-0.473,0.34,0.29,0.89,0.082,
    0.3655,0.286,-0.470,-0.31,-0.27,0.91,0.086,
    -0.063,0.611,0.165,-0.063,-0.678,0.165,
    -0.432,-0.274,-0.485,0.303,0.251,-0.482,
    6.64,2.42,-0.10,0.76,0.81,
    4.16,1.72,0.72,0.205,160.0,0.40,0.64,0.00625
];
f32(u64) value=fn(lane){core.float_trunc<f32>(profile[lane])};
f32() walk_rail=fn{value(0)};
f32() blanket_lower=fn{value(1)};
f32() blanket_upper=fn{value(2)};
f32() pressure_skin=fn{value(3)};
f32() cargo_fascia=fn{value(4)};
f32() fascia_step=fn{value(74)};
f32(u64) port_frame=fn(axis){value(5+axis)};
f32(u64,u64) housing=fn(fixture,axis){value(50+fixture*3+axis)};
unit() publish=fn{unsafe {bridge.material_art(core.pointer_cast<*?u8>(&?profile[0]),75);};};
%%end
