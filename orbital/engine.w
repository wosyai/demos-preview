%%start
host = extern wasm "orbital" {
    unsafe unit(*?u8,i32) scenery;
    unsafe unit(*?u8,i32) hands;
    unsafe unit(*?u8,i32) frame;
};
f32[8] vertex = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
f32[8][16] page0 = [vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex];
f32[8][16][16] page1 = [page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0];
f32[8][16][16][16] page2 = [page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1];
f32[8][16][16][16][4] mesh = [page2,page2,page2,page2];
f32[18] state = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
i32 count = 0;
f32 r = 0.0;
f32 g = 0.0;
f32 b = 0.0;
f32 lit = 0.0;
unit(f32,f32,f32,f32) paint = fn(red,green,blue,glow) { r=red; g=green; b=blue; lit=glow; };
unit(f32,f32,f32,f32) pt = fn(x,y,z,shade) {
    if (count<16384) {
        u64 hi=core.int_extend<u64>(count/4096); u64 a=core.int_extend<u64>((count/256)%16); u64 j=core.int_extend<u64>((count/16)%16); u64 k=core.int_extend<u64>(count%16);
        mesh[hi][a][j][k][0]=x;mesh[hi][a][j][k][1]=y;mesh[hi][a][j][k][2]=z;mesh[hi][a][j][k][3]=r;mesh[hi][a][j][k][4]=g;mesh[hi][a][j][k][5]=b;mesh[hi][a][j][k][6]=shade;mesh[hi][a][j][k][7]=lit;
        count=count+1;
    };
};
unit(f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32) quad = fn(a,b1,c,d,e,f,h,i,j,k,l,m,s) {
    pt(a,b1,c,s);pt(d,e,f,s);pt(h,i,j,s);
    pt(a,b1,c,s);pt(h,i,j,s);pt(k,l,m,s);
};
unit(f32,f32,f32,f32,f32,f32) box = fn(x,y,z,w,h,l) {
    f32 a=x+w;f32 b1=y+h;f32 c=z+l;
    quad(x,y,z,a,y,z,a,b1,z,x,b1,z,0.78);
    quad(x,y,c,x,b1,c,a,b1,c,a,y,c,0.87);
    quad(x,y,z,x,b1,z,x,b1,c,x,y,c,0.61);
    quad(a,y,z,a,y,c,a,b1,c,a,b1,z,0.69);
    quad(x,b1,z,a,b1,z,a,b1,c,x,b1,c,1.0);
    quad(x,y,z,x,y,c,a,y,c,a,y,z,0.57);
};
unit(i32) rib = fn(n) {
    if (n<6) {
        f32 z=core.sint_to_float<f32>(n)*1.78-9.4;
        paint(0.28,0.38,0.42,0.0);
        box(-2.28,-1.76,z,0.21,3.52,0.22);
        box(2.07,-1.76,z,0.21,3.52,0.22);
        box(-2.06,1.51,z,4.12,0.2,0.22);
        box(-2.06,-1.71,z,4.12,0.2,0.22);
        paint(0.48,0.91,0.93,0.9);
        box(-1.09,1.5,z+0.03,2.18,0.035,0.10);
        paint(0.93,0.38,0.11,0.3);
        box(-2.03,-0.85,z+0.06,0.04,0.44,0.1);
        box(1.99,-0.85,z+0.06,0.04,0.44,0.1);
        rib(n+1);
    };
};
unit(i32) rack = fn(n) {
    if(n<6){
        f32 j=core.sint_to_float<f32>(n);
        f32 z=-8.3+j*0.69;
        paint(0.17,0.24,0.27,0.0);
        box(-2.06,-1.17,z,0.30,2.13,0.60);
        paint(0.34,0.45,0.48,0.0);
        box(-1.76,0.02,z+0.04,0.038,0.71,0.51);
        paint(0.30,0.89,0.82,0.68);
        box(-1.71,0.49,z+0.11,0.014,0.10,0.28);
        paint(0.96,0.62,0.31,0.60);
        box(-1.71,0.31,z+0.12,0.015,0.035,0.13);
        rack(n+1);
    };
};
unit() draw = fn {
    count=0;
    paint(0.26,0.34,0.38,0.0);
    box(-2.26,-1.78,-10.1,4.52,0.1,12.4);
    box(-2.26,1.72,-10.1,4.52,0.12,12.4);
    box(-2.28,-1.78,-10.1,0.11,3.50,12.4);
    paint(0.19,0.27,0.35,0.0);
    box(2.16,-1.78,-10.1,0.12,0.83,12.4);
    box(2.16,1.12,-10.1,0.12,0.62,12.4);
    box(-2.28,-1.75,-10.25,4.56,3.55,0.18);
    paint(0.095,0.14,0.18,0.0);
    box(-0.89,-1.24,-10.04,1.78,2.58,0.15);
    paint(0.36,0.51,0.58,0.0);
    box(-0.68,-0.97,-9.88,1.36,2.08,0.05);
    paint(0.07,0.12,0.15,0.0);
    box(-0.26,0.31,-9.82,0.52,0.51,0.02);
    paint(0.98,0.60,0.22,0.72);
    box(-0.055,-0.16,-9.8,0.11,0.47,0.018);
    paint(0.15,0.22,0.23,0.0);
    box(-0.44,-1.655,-10.07,0.88,0.025,12.17);
    paint(0.30,0.59,0.66,0.37);
    box(-0.53,-1.623,-9.9,0.031,0.012,11.9);
    box(0.48,-1.623,-9.9,0.031,0.012,11.9);
    rib(0);rack(0);
    paint(0.30,0.46,0.52,0.0);
    box(-1.60,1.46,-9.75,0.073,0.08,10.45);
    box(-1.45,1.46,-9.75,0.047,0.08,10.45);
    paint(0.76,0.47,0.24,0.08);
    box(-1.53,1.42,-9.7,0.05,0.027,10.31);
    paint(0.23,0.34,0.38,0.0);
    box(-0.75,-1.17,-9.76,0.10,2.52,0.06);
    box(0.65,-1.17,-9.76,0.10,2.52,0.06);
    paint(0.16,0.25,0.26,0.0);
    box(-0.32,-1.609,-3.88,0.64,0.028,1.18);
    paint(0.62,0.61,0.44,0.20);
    box(-0.24,-1.58,-3.73,0.11,0.008,0.72);
    box(0.13,-1.58,-3.73,0.11,0.008,0.72);
    paint(0.29,0.40,0.44,0.0);
    box(1.15,-0.96,-3.85,0.89,0.13,1.44);
    box(1.68,-0.84,-3.60,0.32,0.63,0.64);
    paint(0.035,0.29,0.29,0.45);
    box(1.64,-0.69,-3.53,0.045,0.37,0.49);
    paint(0.52,0.98,0.92,0.88);
    box(1.60,-0.47,-3.48,0.042,0.025,0.29);
    box(1.60,-0.55,-3.39,0.042,0.025,0.27);
    box(1.60,-0.62,-3.48,0.042,0.025,0.20);
    paint(0.91,0.37,0.10,0.0);
    box(0.69,-0.32,-3.0,0.125,0.115,1.30);
    box(0.69,-0.32,-3.0,0.47,0.115,0.11);
    box(0.69,-0.32,-1.81,0.47,0.115,0.11);
    paint(1.0,0.70,0.25,0.34);
    box(0.68,-0.21,-2.99,0.11,0.025,1.28);
    unsafe { host.scenery(core.pointer_cast<*?u8>(&?mesh[0][0][0][0][0]),count*8); };
};

f32(f32) wave = fn(a) {
    f32 u=if(a>3.14159265){a-6.28318531}else{if(a< -3.14159265){a+6.28318531}else{a}};
    f32 q=if(u>1.57079633){3.14159265-u}else{if(u< -1.57079633){-3.14159265-u}else{u}};
    q*(1.0-q*q*(0.16666667-q*q*(0.00833333-q*q*0.000198413)))
};
f32(f32) cw = fn(a){wave(a+1.57079633)};
unit(f32,f32,f32,f32,f32,f32,f32,f32,i32,i32,i32) sweep = fn(px,py,pz,ax,ay,az,r0,r1,ring_axis,n,t){
    if(n<t){
        f32 s=6.28318531*core.sint_to_float<f32>(n)/core.sint_to_float<f32>(t);
        f32 v=6.28318531*core.sint_to_float<f32>(n+1)/core.sint_to_float<f32>(t);
        if(s>4.6){s=s-6.28318531;};if(v>4.6){v=v-6.28318531;};
        f32 sy=wave(s);f32 cy=cw(s);f32 vy0=wave(v);f32 cv=cw(v);
        f32 shade=0.79+0.17*wave(s+0.36);
        if(ring_axis==0) {
            quad(px,py+sy*r0,pz+cy*r0,px,py+vy0*r0,pz+cv*r0,ax,ay+vy0*r1,az+cv*r1,ax,ay+sy*r1,az+cy*r1,shade);
        } else {
            quad(px+cy*r0,py+sy*r0,pz,px+cv*r0,py+vy0*r0,pz,ax+cv*r1,ay+vy0*r1,az,ax+cy*r1,ay+sy*r1,az,shade);
        };
        sweep(px,py,pz,ax,ay,az,r0,r1,ring_axis,n+1,t);
    };
};
unit(i32) blanket = fn(n) {
    if(n<12) {
        f32 yy=core.sint_to_float<f32>(n%3)*0.86-1.62;
        f32 zz=-11.6+core.sint_to_float<f32>(n/3)*2.48;
        f32 tint=0.69+0.025*core.sint_to_float<f32>(n%4);
        paint(tint,tint*0.97,tint*0.90,0.18);
        box(-1.58,yy,zz,0.08,0.81,2.42);
        paint(0.24,0.26,0.27,0.04);
        box(-1.493,yy,zz,0.018,0.81,0.042);
        box(-1.493,yy+0.76,zz+0.04,0.018,0.034,2.34);
        paint(0.44,0.39,0.30,0.11);
        box(-1.469,yy+0.27,zz+0.32,0.027,0.092,0.61);
        blanket(n+1);
    };
};
unit(f32,f32,f32,f32,f32,i32) solar = fn(px,py,pz,w,h,n){
    if(n<5) {
        f32 x0=px+core.sint_to_float<f32>(n)*w*0.22;
        paint(0.49,0.39,0.21,0.08);box(x0-0.04,py-0.035,pz-0.055,w*0.207,h+0.07,0.08);
        paint(0.035,0.105,0.26,0.46);box(x0,py,pz,w*0.188,h,0.04);
        solar(px,py,pz,w,h,n+1);
    };
};
unit(i32) truss = fn(n){
    if(n<8){
        f32 base=-7.7+core.sint_to_float<f32>(n)*1.24;
        paint(0.60,0.57,0.50,0.09);
        box(base,1.69,-9.8,0.10,1.0,0.12);
        quad(base,1.77,-9.72,base+0.07,1.71,-9.72,base+1.25,2.64,-9.72,base+1.18,2.70,-9.72,0.71);
        paint(0.91,0.51,0.13,0.30);
        box(base+0.11,2.68,-9.54,1.20,0.042,0.042);
        truss(n+1);
    };
};
unit(i32) radiator = fn(n){
    if(n<9) {
        f32 row=-0.81+core.sint_to_float<f32>(n)*0.192;
        paint(0.46,0.50,0.52,0.10);
        sweep(-0.36,row,-5.62,1.57,row,-5.62,0.075,0.075,0,0,8);
        radiator(n+1);
    };
};
unit(i32) station_fasteners = fn(k) {
    if(k<10){
        f32 index=core.sint_to_float<f32>(k);
        f32 zz=-10.82+index*1.19;
        paint(0.25,0.28,0.26,0.105);
        sweep(-1.492,-1.14,zz,-1.462,-1.14,zz,0.044,0.039,0,0,8);
        sweep(-1.492,0.74,zz,-1.462,0.74,zz,0.044,0.039,0,0,8);
        paint(0.45,0.42,0.32,0.095);
        box(-1.456,0.70,zz+0.13,0.021,0.16,0.11);
        station_fasteners(k+1);
    };
};
i32 station_leg=0;
bool cargo_locked=false;
f32(i32) rail_depth = fn(leg) {if(leg==0){-1.59}else{if(leg==1){-3.43}else{-4.88}}};
unit(i32) traversal_rail = fn(leg) {
    f32 z=rail_depth(leg);
    paint(0.53,0.54,0.54,0.62);
    sweep(-1.55,-0.57,z,1.13,-0.57,z,0.087,0.087,0,0,32);
    if(leg==0){paint(0.95,0.51,0.125,0.30);}else{if(leg==1){paint(0.39,0.73,0.82,0.30);}else{paint(0.96,0.67,0.25,0.30);};};
    sweep(-1.41,-0.57,z,-1.19,-0.57,z,0.12,0.12,0,0,20);
    sweep(0.67,-0.57,z,0.84,-0.57,z,0.115,0.115,0,0,20);
    paint(0.19,0.21,0.22,0.08);
    box(-1.41,-0.88,z-0.03,0.22,0.25,0.061);
    box(0.70,-1.10,z-0.03,0.17,0.48,0.061);
};
unit(f32,f32,f32,f32,f32,f32) brace_xz = fn(ax,ay,az,bx,by,bz) {
    sweep(ax,ay,az,bx,by,bz,0.055,0.055,1,0,10);
    sweep(ax,ay,az,ax+0.015,ay,az+0.092,0.094,0.094,1,0,10);
    sweep(bx,by,bz,bx+0.012,by,bz+0.088,0.087,0.087,1,0,10);
};
unit(i32) ferrules = fn(k) {
    if(k<5){
        f32 z=-6.88+core.sint_to_float<f32>(k)*0.268;
        paint(0.40,0.42,0.43,0.12);
        sweep(1.86,-0.42,z,1.99,-0.42,z,0.075,0.075,0,0,10);
        paint(0.25,0.27,0.26,0.12);
        box(1.87,-0.48,z-0.07,0.096,0.12,0.14);
        ferrules(k+1);
    };
};
unit() cargo_yoke = fn {
    paint(0.43,0.46,0.46,0.71);
    brace_xz(-1.44,2.28,-7.74,-0.63,1.34,-6.03);
    brace_xz(-0.31,2.56,-8.38,1.74,1.05,-6.23);
    paint(0.51,0.51,0.46,0.13);
    box(-0.78,1.19,-6.30,2.51,0.144,0.30);
    paint(0.22,0.24,0.24,0.12);
    box(-0.43,0.96,-6.22,0.16,0.24,0.17);
    box(1.26,0.96,-6.22,0.16,0.24,0.17);
    paint(0.65,0.51,0.27,0.18);
    sweep(-0.54,1.21,-6.07,1.50,1.21,-6.07,0.055,0.055,0,0,14);
    paint(0.22,0.25,0.24,0.14);
    box(-0.52,0.96,-5.64,0.29,0.13,0.22);
    box(1.30,0.96,-5.64,0.29,0.13,0.22);
    paint(0.57,0.58,0.53,0.71);
    quad(-0.57,-1.00,-5.78,-0.40,-0.82,-5.44,-0.40,0.75,-5.44,-0.57,0.91,-5.78,0.94);
    quad(1.74,-1.00,-5.77,1.58,-0.82,-5.45,1.58,0.75,-5.45,1.74,0.94,-5.77,0.85);
    quad(-0.56,0.97,-5.81,1.74,0.97,-5.81,1.58,0.78,-5.47,-0.41,0.78,-5.47,0.91);
    quad(-0.56,-1.04,-5.81,1.74,-1.04,-5.81,1.58,-0.84,-5.47,-0.41,-0.84,-5.47,0.71);
    paint(0.16,0.18,0.19,0.09);
    box(1.81,-0.70,-7.0,0.19,0.43,1.55);
    paint(0.80,0.49,0.145,0.20);
    sweep(1.92,-0.42,-7.14,1.92,-0.42,-5.48,0.031,0.031,1,0,12);
    sweep(1.92,-0.42,-5.48,1.80,-0.70,-5.33,0.031,0.031,1,0,12);
    sweep(1.80,-0.70,-5.33,1.47,-0.78,-5.34,0.031,0.031,0,0,12);
    ferrules(0);
};
unit() cargo_fixture = fn {
    f32 key=if(cargo_locked){0.16}else{0.0};
    paint(0.22,0.24,0.24,0.094);
    box(-0.18,-0.28,-5.43,0.57,0.46,0.27);
    paint(0.56,0.59,0.55,0.71);
    box(-0.156,-0.263,-5.159,0.52,0.421,0.026);
    paint(0.11,0.13,0.13,0.13);
    box(-0.073,-0.21,-5.126,0.31,0.30,0.018);
    paint(0.90,0.56,0.17,0.22);
    box(-0.112,-0.218,-5.123,0.052,0.34,0.021);
    box(0.223,-0.218,-5.123,0.052,0.34,0.021);
    paint(0.53,0.54,0.49,0.62);
    sweep(-0.062,-0.151+key,-5.093,0.236,-0.151+key,-5.093,0.029,0.029,0,0,18);
    paint(0.99,0.59,0.14,0.21);
    box(0.016,-0.193+key,-5.110,0.145,0.082,0.087);
    paint(0.16,0.19,0.18,0.12);
    box(-0.048,0.061,-5.116,0.26,0.063,0.031);
    if(cargo_locked){paint(0.29,0.96,0.55,0.99);}else{paint(1.0,0.59,0.16,0.99);};
    box(-0.026,0.080,-5.078,0.213,0.026,0.023);
    if(cargo_locked){paint(0.38,0.91,0.60,0.94);}else{paint(0.77,0.33,0.10,0.93);};
    box(0.270,-0.132,-5.099,0.043,0.043,0.012);
};
unit() airlock = fn {
    paint(0.27,0.29,0.31,0.14);
    sweep(-1.53,0.27,-2.60,-1.28,0.27,-2.60,0.81,0.79,0,0,16);
    paint(0.62,0.63,0.56,0.19);
    sweep(-1.28,0.27,-2.60,-1.24,0.27,-2.60,0.79,0.69,0,0,16);
    paint(0.14,0.17,0.18,0.12);
    sweep(-1.24,0.27,-2.60,-1.28,0.27,-2.60,0.69,0.56,0,0,16);
    paint(0.29,0.34,0.34,0.16);
    sweep(-1.283,0.27,-2.60,-1.283,0.27,-2.60,0.56,0.0,0,0,16);
    paint(0.59,0.53,0.36,0.16);
    box(-1.267,-0.45,-2.70,0.071,0.14,0.24);
    box(-1.267,0.88,-2.69,0.071,0.14,0.24);
    paint(0.58,0.65,0.62,0.14);
    box(-1.27,0.51,-2.83,0.045,0.16,0.47);
    paint(0.37,0.78,0.69,0.92);
    box(-1.214,0.56,-2.80,0.01,0.052,0.11);
    paint(0.71,0.48,0.16,0.19);
    sweep(-1.17,-0.07,-2.84,-1.17,-0.07,-2.42,0.037,0.037,1,0,12);
};
unit(i32) catwalk = fn(k) {
    if(k<6){
        f32 z=-2.1-0.58*core.sint_to_float<f32>(k);
        paint(0.47,0.48,0.44,0.14);
        box(-1.57,-1.10,z,0.92,0.044,0.051);
        box(-1.53,1.25,z,0.092,0.46,0.08);
        quad(-1.48,1.29,z,-1.40,1.29,z,-0.94,1.68,z-0.58,-1.02,1.68,z-0.58,0.80);
        paint(0.59,0.52,0.32,0.17);
        box(-1.38,1.71,z,0.426,0.050,0.055);
        paint(0.20,0.22,0.23,0.12);
        box(-1.03,-1.24,z,0.072,0.16,0.11);
        catwalk(k+1);
    };
};
unit() eva_room = fn {
    count=0;
    paint(0.32,0.36,0.40,0.11);
    box(-3.33,-1.83,-13.0,1.74,3.70,14.8);
    blanket(0);station_fasteners(0);airlock();catwalk(0);
    paint(0.40,0.44,0.43,0.13);
    box(-1.05,1.68,-5.48,0.078,0.096,3.48);
    box(-1.04,-1.22,-5.51,0.091,0.13,3.52);
    paint(0.61,0.30,0.11,0.15);
    sweep(-1.38,1.55,-1.81,-1.38,1.55,-4.58,0.026,0.026,1,0,12);
    sweep(-1.38,1.55,-4.58,-1.15,1.26,-5.16,0.026,0.025,1,0,12);
    sweep(-1.15,1.26,-5.16,-0.84,0.21,-5.66,0.025,0.025,1,0,12);
    paint(0.51,0.53,0.52,0.11);
    box(-1.48,-1.74,-12.2,0.24,0.18,13.9);
    box(-1.56,1.02,-12.2,0.16,0.24,13.9);
    paint(0.89,0.50,0.17,0.17);
    sweep(-1.46,-1.40,-11.9,-1.46,-1.40,1.9,0.047,0.047,1,0,12);
    sweep(-1.46,0.92,-11.9,-1.46,0.92,1.9,0.048,0.048,1,0,12);
    paint(0.67,0.66,0.62,0.11);
    box(-1.49,-0.13,-1.78,0.21,0.63,0.47);
    paint(0.18,0.22,0.20,0.12);
    box(-1.27,-0.03,-1.73,0.04,0.35,0.37);
    paint(0.24,0.91,0.81,0.96);
    box(-1.225,0.19,-1.63,0.012,0.055,0.18);
    paint(0.53,0.52,0.49,0.11);
    sweep(-1.87,0.22,-7.86,-1.04,0.22,-6.85,1.18,1.18,0,0,16);
    paint(0.70,0.65,0.54,0.13);
    sweep(-1.86,0.20,-6.82,-0.93,0.20,-6.82,1.20,1.07,0,0,16);
    paint(0.06,0.08,0.10,0.09);
    box(-1.05,-0.61,-7.17,0.24,1.52,0.11);
    paint(0.53,0.52,0.49,0.105);
    sweep(-1.68,-0.85,-5.5,-0.30,-0.85,-5.5,0.09,0.09,0,0,12);
    paint(0.72,0.54,0.27,0.17);
    sweep(-1.59,-0.88,-5.38,-0.28,-0.88,-5.38,0.03,0.03,0,0,10);
    sweep(-1.59,-0.82,-5.38,-0.27,-0.82,-5.38,0.025,0.025,0,0,10);
    paint(0.70,0.70,0.65,0.08);
    box(-6.2,1.63,-9.97,9.6,0.125,0.31);
    box(-6.2,2.69,-9.97,9.6,0.125,0.31);
    truss(0);
    paint(0.28,0.31,0.33,0.10);
    box(-3.45,2.68,-9.20,5.67,0.14,0.24);
    paint(0.56,0.58,0.61,0.11);
    box(1.78,1.37,-9.35,0.32,3.51,0.49);
    solar(-0.13,3.14,-10.3,5.70,2.37,0);
    solar(-3.11,-3.29,-9.3,3.46,1.72,0);
    paint(0.41,0.44,0.46,0.08);
    box(-0.52,-1.01,-7.4,2.30,1.95,1.74);
    paint(0.67,0.66,0.60,0.11);
    box(-0.57,-1.02,-5.74,0.34,2.01,0.26);
    box(1.35,-1.02,-5.74,0.34,2.01,0.26);
    box(-0.52,0.81,-5.64,2.19,0.21,0.14);
    box(-0.52,-1.02,-5.64,2.19,0.21,0.14);
    radiator(0);
    paint(0.26,0.27,0.27,0.10);
    box(-0.49,-0.81,-5.455,0.16,1.52,0.09);
    box(1.42,-0.81,-5.455,0.16,1.52,0.09);
    paint(0.86,0.78,0.58,0.19);
    box(-0.534,0.73,-5.502,0.31,0.18,0.15);
    box(-0.534,-1.02,-5.502,0.31,0.18,0.15);
    box(1.35,0.73,-5.502,0.32,0.18,0.15);
    box(1.35,-1.02,-5.502,0.32,0.18,0.15);
    paint(0.68,0.32,0.095,0.18);
    sweep(-0.13,-1.11,-5.63,1.37,-1.11,-5.63,0.039,0.039,0,0,10);
    sweep(-0.13,-1.11,-5.61,-0.39,-0.75,-5.56,0.039,0.038,1,0,10);
    paint(0.34,0.37,0.39,0.11);
    sweep(1.77,0.19,-7.18,3.20,0.19,-7.34,0.18,0.18,0,0,16);
    paint(0.58,0.61,0.63,0.12);
    sweep(2.07,0.19,-7.22,2.27,0.19,-7.23,0.32,0.32,0,0,16);
    sweep(2.66,0.19,-7.31,2.81,0.19,-7.32,0.32,0.32,0,0,16);
    sweep(3.20,0.19,-7.35,3.29,0.19,-7.36,0.41,0.33,0,0,16);
    paint(0.89,0.48,0.13,0.24);
    box(1.55,-0.38,-5.40,0.24,0.56,0.18);
    paint(0.37,0.89,0.91,0.94);
    box(1.59,-0.22,-5.19,0.095,0.22,0.02);
    paint(0.64,0.62,0.61,0.11);
    sweep(0.76,1.94,-8.59,0.08,3.06,-7.02,0.21,0.21,1,0,14);
    sweep(0.08,3.06,-7.02,-1.56,2.14,-5.20,0.24,0.24,1,0,14);
    paint(0.32,0.34,0.35,0.07);
    sweep(-0.18,3.06,-7.02,0.36,3.06,-7.02,0.37,0.37,0,0,14);
    cargo_yoke();traversal_rail(0);traversal_rail(1);traversal_rail(2);cargo_fixture();
    unsafe { host.scenery(core.pointer_cast<*?u8>(&?mesh[0][0][0][0][0]),count*8); };
};
f32 pilot_x=0.0;f32 pilot_y=0.0;f32 pilot_z=0.37;
f32 vx=0.0;f32 vy=0.0;f32 vz=0.0;
f32 yaw=0.0;f32 pitch=0.0;f32 timer=0.0;
f32 grip=0.0; f32 reach=0.0; f32 carry=0.0;
f32 dock_yaw=0.0; f32 dock_pitch=0.0;
i32 mode=0;i32 mark=0;i32 latch=0;
bool ready=false;
i32 deck=0;
bool external_arm=false;
unit(i32) select_arm = fn(has_mesh){external_arm=has_mesh==1;mesh_deck=-1;};
f32 mesh_x=999.0; f32 mesh_y=999.0; f32 mesh_z=999.0; f32 mesh_grip=999.0; i32 mesh_deck=-1;
f32(f32,f32,f32) limit = fn(a,b1,c) { if(a<b1){b1}else{if(a>c){c}else{a}} };
f32(f32) sine = fn(a){a*(1.0-a*a*(0.1666667-a*a*0.0083333))};
f32(f32) cosine = fn(a){1.0-a*a*(0.5-a*a*0.0416667)};
f32(i32,i32,i32) axis = fn(m,p,n) {if((m&p)!=0){1.0}else{if((m&n)!=0){-1.0}else{0.0}}};
unit() reset = fn {
    pilot_x=0.0; pilot_y=0.0; pilot_z=0.37;vx=0.0;vy=0.0;vz=0.0;yaw=if(deck==0){0.13}else{-0.03};pitch=if(deck==0){-0.035}else{-0.095};timer=0.0;
    mode=0;mark=0;grip=0.0;reach=0.0;carry=0.0;latch=0;station_leg=0;
    if(cargo_locked){cargo_locked=false;ready=false;};
};
unit(i32) select_deck = fn(which){
    i32 choice=if(which==1){1}else{0};
    if(deck!=choice){deck=choice;ready=false;};
    reset();
};
unit() glove = fn {
    count=0;
    f32 hx=pilot_x+0.49+(0.605-pilot_x-0.49)*grip;
    f32 hy=pilot_y-0.53+(-0.268-pilot_y+0.53)*grip;
    f32 hz=pilot_z-0.64+(-1.91-pilot_z+0.64)*grip;
    paint(0.24,0.31,0.34,0.0);
    box(hx-0.055,hy-0.27,hz+0.124,0.19,0.22,0.40);
    paint(0.37,0.47,0.49,0.0);
    box(hx-0.064,hy-0.22,hz+0.14,0.19,0.16,0.075);
    paint(0.51,0.68,0.68,0.0);
    box(hx-0.054,hy-0.20,hz+0.215,0.18,0.14,0.055);
    paint(0.68,0.75,0.72,0.0);
    box(hx-0.034,hy-0.09,hz-0.112,0.167,0.155,0.27);
    paint(0.25,0.37,0.41,0.0);
    box(hx-0.027,hy-0.054,hz+0.06,0.123,0.12,0.12);
    paint(0.43,0.89,0.84,0.65);
    box(hx-0.013,hy+0.067,hz+0.083,0.093,0.016,0.072);
    paint(0.79,0.79,0.65,0.0);
    box(hx-0.093,hy-0.05,hz-0.176,0.085,0.16,0.145);
    box(hx+0.008,hy+0.04,hz-0.215,0.038,0.12-grip*0.035,0.119);
    box(hx+0.056,hy+0.042,hz-0.239,0.038,0.135-grip*0.043,0.135);
    box(hx+0.104,hy+0.039,hz-0.223,0.037,0.123-grip*0.041,0.13);
    box(hx+0.151,hy+0.031,hz-0.195,0.031,0.101-grip*0.037,0.109);
    if(grip>0.7){
        paint(0.76,0.77,0.64,0.0);
        box(hx+0.051,hy+0.055,hz-0.205,0.18,0.048,0.029);
        box(hx+0.055,hy+0.055,hz-0.160,0.18,0.047,0.029);
        box(hx+0.054,hy+0.054,hz-0.115,0.17,0.044,0.028);
        box(hx+0.05,hy+0.053,hz-0.071,0.16,0.041,0.026);
    };
    unsafe { host.hands(core.pointer_cast<*?u8>(&?mesh[0][0][0][0][0]),count*8); };
};
unit(f32,f32,f32,f32,f32,f32,f32,f32,f32,i32) phalanx = fn(cx,cy,cz,ry,rz,q0,q1,rad,thickness,n){
    if(n<8){
        f32 t0=core.sint_to_float<f32>(n)*0.78539816;
        f32 t1=core.sint_to_float<f32>(n+1)*0.78539816;
        if(t0>4.6){t0=t0-6.28318531;};if(t1>4.6){t1=t1-6.28318531;};
        f32 a0=cw(q0);f32 b0=wave(q0);f32 a1=cw(q1);f32 b1=wave(q1);
        f32 u0=rad+cw(t0)*thickness;f32 u1=rad+cw(t1)*thickness;
        quad(cx+wave(t0)*thickness,cy+ry*a0*u0,cz+rz*b0*u0,
             cx+wave(t1)*thickness,cy+ry*a0*u1,cz+rz*b0*u1,
             cx+wave(t1)*thickness,cy+ry*a1*u1,cz+rz*b1*u1,
             cx+wave(t0)*thickness,cy+ry*a1*u0,cz+rz*b1*u0,0.84);
        phalanx(cx,cy,cz,ry,rz,q0,q1,rad,thickness,n+1);
    };
};
unit(f32,f32,f32,i32) glove_fingers = fn(px,py,pz,finger){
    if(finger<4){
        f32 digit=core.sint_to_float<f32>(finger);
        f32 xx=px+digit*0.051;
        f32 distal=-0.69+digit*0.09+0.64*(1.0-grip);
        f32 thick=0.024-digit*0.0011;
        paint(0.56,0.55,0.49,0.18);
        phalanx(xx,py,pz,1.0,1.0,1.18,0.72,0.119,thick,0);
        paint(0.19,0.21,0.20,0.14);
        phalanx(xx,py,pz,1.0,1.0,0.72,0.50,0.119,thick*0.95,0);
        paint(0.66,0.64,0.57,0.18);
        phalanx(xx,py,pz,1.0,1.0,0.50,0.16,0.114,thick,0);
        paint(0.18,0.19,0.18,0.14);
        phalanx(xx,py,pz,1.0,1.0,0.16,-0.01,0.113,thick*0.93,0);
        paint(0.46,0.45,0.40,0.19);
        phalanx(xx,py,pz,1.0,1.0,-0.01,distal,0.108,thick*0.84,0);
        glove_fingers(px,py,pz,finger+1);
    };
};
unit() eva_glove = fn {
    count=0;
    f32 px=pilot_x-0.23+(-0.18-pilot_x+0.23)*grip;
    f32 py=pilot_y-0.40+(-0.57-pilot_y+0.40)*grip;
    f32 pz=pilot_z-0.80+(rail_depth(station_leg)-pilot_z+0.80)*grip;
    f32 shoulder_x=pilot_x-0.37;
    f32 shoulder_y=pilot_y-0.63;
    f32 shoulder_z=pilot_z-0.17;
    paint(0.74,0.71,0.64,0.18);
    sweep(shoulder_x,shoulder_y,shoulder_z,px+0.06,py-0.094,pz+0.31,0.183,0.105,1,0,22);
    paint(0.89,0.37,0.10,0.32);
    sweep(px+0.051,py-0.118,pz+0.48,px+0.063,py-0.113,pz+0.43,0.116,0.113,1,0,22);
    paint(0.40,0.41,0.38,0.62);
    sweep(px+0.056,py-0.085,pz+0.31,px+0.067,py-0.086,pz+0.245,0.113,0.105,1,0,22);
    paint(0.15,0.17,0.17,0.14);
    sweep(px+0.066,py-0.084,pz+0.245,px+0.067,py-0.032,pz+0.171,0.092,0.089,1,0,20);
    paint(0.61,0.59,0.53,0.18);
    sweep(px+0.067,py-0.036,pz+0.20,px+0.078,py+0.012,pz+0.105,0.088,0.103,1,0,20);
    sweep(px+0.078,py+0.012,pz+0.105,px+0.078,py+0.059,pz+0.081,0.103,0.071,1,0,20);
    paint(0.20,0.23,0.22,0.13);
    box(px+0.020,py+0.046,pz+0.139,0.083,0.020,0.050);
    paint(0.33,0.91,0.81,0.92);
    box(px+0.031,py+0.066,pz+0.146,0.062,0.005,0.032);
    paint(0.54,0.53,0.47,0.18);
    sweep(px-0.021,py-0.01,pz+0.13,px-0.042,py-0.015,pz+0.042,0.047,0.031,1,0,14);
    glove_fingers(px,py,pz,0);
    unsafe {host.hands(core.pointer_cast<*?u8>(&?mesh[0][0][0][0][0]),count*8);};
};
unit(f32,i32,f32,f32) tick = fn(dt,keys,look_x,look_y) {
    if(!ready){if(deck==0){draw();}else{eva_room();};ready=true;};
    f32 d=limit(dt,0.0,0.032);
    if(mode!=1){yaw=limit(yaw+look_x,-1.25,1.25); pitch=limit(pitch+look_y,-0.92,0.92);};
    f32 ax=axis(keys,2,1); f32 az=axis(keys,8,4);f32 ay=axis(keys,16,32);
    f32 diag=if(ax*ax+az*az+ay*ay>1.0){0.67}else{1.0};
    if(mode==0 || mode==3){
        f32 drag=if((keys&128)!=0){3.9}else{0.24};
        vx=limit(vx*(1.0-d*drag)+diag*(ax*cosine(yaw)-az*sine(yaw))*d*1.82,-1.55,1.55);
        vz=limit(vz*(1.0-d*drag)+diag*(az*cosine(yaw)+ax*sine(yaw))*d*1.82,-1.55,1.55);
        vy=limit(vy*(1.0-d*drag)+diag*ay*d*1.66,-1.35,1.35);
        pilot_x=pilot_x+vx*d; pilot_y=pilot_y+vy*d; pilot_z=pilot_z+vz*d;
        f32 hull_limit=if(deck==1 && pilot_z>-3.42 && pilot_z< -1.75){-1.09}else{-1.39};
        if(pilot_x<hull_limit || pilot_x>1.51){pilot_x=limit(pilot_x,hull_limit,1.51);vx=0.0;};
        if(pilot_y< -1.09 || pilot_y>1.02){pilot_y=limit(pilot_y,-1.09,1.02);vy=0.0;};
        f32 bulkhead=if(deck==0){-9.34}else{-4.72};
        if(pilot_z<bulkhead || pilot_z>1.63){pilot_z=limit(pilot_z,bulkhead,1.63);vz=0.0;};
    };
    f32 dock_x=if(deck==0){0.12}else{0.05};
    f32 dock_y=if(deck==0){-0.04}else{-0.025};
    f32 dock_z=if(deck==0){-1.26}else{rail_depth(station_leg)+0.71};
    f32 reach_limit=if(deck==1 && reach==1.0){0.55}else{0.37};
    bool nearby=(pilot_x-dock_x)*(pilot_x-dock_x)+(pilot_y-dock_y)*(pilot_y-dock_y)+(pilot_z-dock_z)*(pilot_z-dock_z)<reach_limit;
    bool aligned=yaw> -0.46 && yaw<0.71 && pitch> -0.73 && pitch<0.33;
    reach=if(nearby&&aligned){1.0}else{0.0};
    if((keys&64)!=0 && latch==0){
        if(mode==0 && reach==1.0){mode=1;mark=1;timer=0.0;carry=pilot_x;dock_yaw=yaw;dock_pitch=pitch;};
        if(mode==2){
            if(deck==1 && station_leg==2){
                if(!cargo_locked){cargo_locked=true;mark=2;eva_room();};
            }else{
                mode=3;mark=2;
                vz=if(deck==0){-0.19}else{-0.43};
            };
        };
    };
    latch=if((keys&64)!=0){1}else{0};
    if(mode==1){
        timer=limit(timer+d*2.85,0.0,1.0);
        grip=timer*timer*(3.0-2.0*timer);
        f32 end_heading=if(deck==0){0.60}else{if(station_leg==2){-0.015}else{-0.105}};
        f32 end_pitch=if(deck==0){-0.20}else{if(station_leg==2){-0.285}else{-0.30}};
        yaw=dock_yaw+(end_heading-dock_yaw)*grip;pitch=dock_pitch+(end_pitch-dock_pitch)*grip;
        pilot_x=carry+(dock_x-carry)*grip;pilot_y=pilot_y+(dock_y-pilot_y)*d*12.0;pilot_z=pilot_z+(dock_z-pilot_z)*d*12.0;
        vx=0.0;vy=0.0;vz=0.0;
        if(timer>=1.0){mode=2;pilot_y=dock_y;pilot_z=dock_z;};
    };
    if(mode==3){
        grip=limit(grip-d*(if(deck==0){3.5}else{2.8}),0.0,1.0);
        if(grip==0.0){
            mode=0;
            if(deck==1 && station_leg<2){station_leg=station_leg+1;mark=0;reach=0.0;};
        };
    };
    state[0]=pilot_x; state[1]=pilot_y; state[2]=pilot_z; state[3]=yaw; state[4]=pitch; state[5]=vx; state[6]=vy; state[7]=vz; state[8]=grip; state[9]=core.sint_to_float<f32>(mode); state[10]=reach; state[11]=core.sint_to_float<f32>(mark); state[12]=if(deck==0){0.745}else{pilot_x-0.23+(-0.18-pilot_x+0.23)*grip};
    state[13]=if(deck==0){-0.21}else{pilot_y-0.40+(-0.57-pilot_y+0.40)*grip};
    state[14]=if(deck==0){-1.94}else{pilot_z-0.80+(rail_depth(station_leg)-pilot_z+0.80)*grip}; state[15]=core.sint_to_float<f32>(deck);
    state[16]=core.sint_to_float<f32>(station_leg); state[17]=if(cargo_locked){1.0}else{0.0};
    if((deck==0||!external_arm) && (mesh_x!=pilot_x || mesh_y!=pilot_y || mesh_z!=pilot_z || mesh_grip!=grip || mesh_deck!=deck)){
        if(deck==0){glove();}else{eva_glove();};
        mesh_x=pilot_x;mesh_y=pilot_y;mesh_z=pilot_z;mesh_grip=grip;mesh_deck=deck;
    };
    unsafe {host.frame(core.pointer_cast<*?u8>(&?state[0]),18);};
};
%%end
