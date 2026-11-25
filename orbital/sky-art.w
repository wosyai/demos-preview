%%start
math = namespace orbital "presentation.w";
bridge = extern wasm "orbital" { unsafe unit(*?u8,i32) sky_art; };
f64[29] packet=[
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.3,-5.0,6.4,14.0,
    0.76,0.57,-0.31,0.00372906,0.06104854,0.0009869,
    0.8124226,-0.5092981,0.2838750,0.5136543,0.8555399,0.0648896,-0.2759145,0.0930958,0.9566631
];
unit() publish=fn{
    f64 n=math.norm(0.48,0.35,0.80);
    f64 sx=0.48/n;f64 sy=0.35/n;f64 sz=0.80/n;
    f64 side=math.norm(sz,0.0,-sx);
    f64 xx=sz/side;f64 xz=-sx/side;
    packet[0]=sx;packet[1]=sy;packet[2]=sz;
    packet[3]=xx;packet[4]=0.0;packet[5]=xz;
    packet[6]=sy*xz;packet[7]=sz*xx-sx*xz;packet[8]=-sy*xx;
    unsafe {bridge.sky_art(core.pointer_cast<*?u8>(&?packet[0]),29);};
};
%%end
