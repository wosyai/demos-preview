%%start
station = namespace orbital "station.w";
hud = namespace orbital "hud.w";
host = extern wasm "orbital" {
    unsafe unit(*?u8,i32) scenery;
    unsafe unit(*?u8,i32) hull;
    unsafe unit(*?u8,i32) hands;
    unsafe unit(*?u8,i32) frame;
};
f32[8] vertex = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
f32[8][16] page0 = [vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex, vertex];
f32[8][16][16] page1 = [page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0, page0];
f32[8][16][16][16] page2 = [page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1, page1];
f32[8][16][16][16][5] mesh = [page2,page2,page2,page2,page2];
f32[38] state = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
i32 count = 0;
f32 r = 0.0;
f32 g = 0.0;
f32 b = 0.0;
f32 lit = 0.0;
unit(f32,f32,f32,f32) paint = fn(red,green,blue,glow) { r=red; g=green; b=blue; lit=glow; };
unit(f32,f32,f32,f32) pt = fn(x,y,z,shade) {
    if (count<20480) {
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
            if(r1==0.0){pt(px,py+sy*r0,pz+cy*r0,shade);pt(px,py+vy0*r0,pz+cv*r0,shade);pt(ax,ay,az,shade);}else{quad(px,py+sy*r0,pz+cy*r0,px,py+vy0*r0,pz+cv*r0,ax,ay+vy0*r1,az+cv*r1,ax,ay+sy*r1,az+cy*r1,shade);};
        } else {if(ring_axis==1){
            if(r1==0.0){pt(px+cy*r0,py+sy*r0,pz,shade);pt(px+cv*r0,py+vy0*r0,pz,shade);pt(ax,ay,az,shade);}else{quad(px+cy*r0,py+sy*r0,pz,px+cv*r0,py+vy0*r0,pz,ax+cv*r1,ay+vy0*r1,az,ax+cy*r1,ay+sy*r1,az,shade);};
        }else{
            if(r1==0.0){pt(px+cy*r0,py,pz+sy*r0,shade);pt(px+cv*r0,py,pz+vy0*r0,shade);pt(ax,ay,az,shade);}else{quad(px+cy*r0,py,pz+sy*r0,px+cv*r0,py,pz+vy0*r0,ax+cv*r1,ay,az+vy0*r1,ax+cy*r1,ay,az+sy*r1,shade);};
        };
        };
        sweep(px,py,pz,ax,ay,az,r0,r1,ring_axis,n+1,t);
    };
};
f32(f32) abs_cell = fn(a){if(a<0.0){-a}else{a}};
f32(f32) neg_sign = fn(a){if(a<0.0){-1.0}else{1.0}};
f32(f32,f32,f32) packed_normal = fn(x,y,z){
    f32 sum=abs_cell(x)+abs_cell(y)+abs_cell(z);
    f32 u=x/sum;f32 v=y/sum;
    if(z<0.0){
        f32 old=u;u=(1.0-abs_cell(v))*neg_sign(u);v=(1.0-abs_cell(old))*neg_sign(v);
    };
    i32 xi=core.float_to_sint_trunc<i32>(u*127.0+127.5);
    i32 yi=core.float_to_sint_trunc<i32>(v*127.0+127.5);
    -core.sint_to_float<f32>(1+xi*255+yi)
};
unit(f32,f32,f32,f32,f32,f32,f32,i32) shell_point = fn(cx,cy,cz,radius,sn,cs,axial,ring_axis){
    if(ring_axis==0){pt(cx,cy+sn*radius,cz+cs*radius,packed_normal(axial,sn,cs));}
    else{pt(cx+cs*radius,cy+sn*radius,cz,packed_normal(cs,sn,axial));};
};
unit(f32,f32,f32,f32,f32,f32,f32,f32,i32,i32,i32) round_shell = fn(px,py,pz,ax,ay,az,r0,r1,ring_axis,n,t){
    if(n<t){
        f32 a=6.28318531*core.sint_to_float<f32>(n)/core.sint_to_float<f32>(t);
        f32 ang_b=6.28318531*core.sint_to_float<f32>(n+1)/core.sint_to_float<f32>(t);
        if(a>4.6){a=a-6.28318531;};if(ang_b>4.6){ang_b=ang_b-6.28318531;};
        f32 sa=wave(a);f32 ca=cw(a);f32 sb=wave(ang_b);f32 cb=cw(ang_b);
        f32 run=if(ring_axis==0){ax-px}else{az-pz};
        f32 tilt=(r0-r1)/run;
        shell_point(px,py,pz,r0,sa,ca,tilt,ring_axis);shell_point(px,py,pz,r0,sb,cb,tilt,ring_axis);
        shell_point(ax,ay,az,r1,sb,cb,tilt,ring_axis);shell_point(px,py,pz,r0,sa,ca,tilt,ring_axis);
        shell_point(ax,ay,az,r1,sb,cb,tilt,ring_axis);shell_point(ax,ay,az,r1,sa,ca,tilt,ring_axis);
        round_shell(px,py,pz,ax,ay,az,r0,r1,ring_axis,n+1,t);
    };
};
unit(f32,f32,f32) quilt_panel = fn(y,z,billow){
    f32 skin=-1.500; f32 loft=skin+billow;
    f32 h=y+0.81; f32 far=z+2.42;
    f32 lip0=z+0.09;f32 lip1=far-0.11;
    f32 low=y+0.074; f32 high=h-0.083;
    f32 line=y+0.31;
    f32 lo_a=loft-0.014; f32 lo_b=loft+0.005;
    f32 hi_a=loft+0.006; f32 hi_b=loft-0.016;
    f32 ridge=loft-0.024; f32 ridge_b=loft-0.011;
    quad(skin,y,z,skin,y,far,lo_b,low,lip1,lo_a,low,lip0,0.86);
    quad(skin,y,z,lo_a,low,lip0,hi_a,high,lip0,skin,h,z,0.78);
    quad(skin,y,far,skin,h,far,hi_b,high,lip1,lo_b,low,lip1,0.81);
    quad(skin,h,z,hi_a,high,lip0,hi_b,high,lip1,skin,h,far,0.86);
    quad(lo_a,low,lip0,lo_b,low,lip1,ridge_b,line+0.10,lip1,ridge,line,lip0,0.86);
    quad(ridge,line,lip0,ridge_b,line+0.10,lip1,hi_b,high,lip1,hi_a,high,lip0,0.93);
};
unit(i32) blanket = fn(n) {
    if(n<10) {
        f32 yy=core.sint_to_float<f32>(n%3)*0.86-1.62;
        f32 zz=-11.6+core.sint_to_float<f32>(n/3)*2.48;
        f32 tint=0.77+0.027*core.sint_to_float<f32>(n%4);
        paint(tint,tint*0.97,tint*0.90,if(n==7){0.18375}else{0.18});
        quilt_panel(yy,zz,0.031+core.sint_to_float<f32>(n%3)*0.014);
        paint(0.37,0.38,0.39,0.15);
        quad(-1.475,yy,zz,-1.475,yy+0.81,zz,-1.475,yy+0.81,zz+0.027,-1.475,yy,zz+0.027,0.69);
        quad(-1.475,yy+0.76,zz+0.04,-1.475,yy+0.794,zz+0.04,-1.475,yy+0.794,zz+2.38,-1.475,yy+0.76,zz+2.38,0.69);
        paint(0.44,0.39,0.30,0.11);
        quad(-1.442,yy+0.27,zz+0.32,-1.442,yy+0.362,zz+0.32,-1.442,yy+0.362,zz+0.93,-1.442,yy+0.27,zz+0.93,0.69);
        blanket(n+1);
    };
};
unit(f32,f32,f32,f32,f32,i32) solar = fn(px,py,pz,w,h,n){
    if(n<4) {
        f32 x0=px+core.sint_to_float<f32>(n)*w*0.22;
        paint(0.49,0.39,0.21,0.08);box(x0-0.04,py-0.035,pz-0.055,w*0.207,h+0.07,0.08);
        paint(0.035,0.105,0.26,0.46);quad(x0,py,pz+0.04,x0+w*0.188,py,pz+0.04,x0+w*0.188,py+h,pz+0.04,x0,py+h,pz+0.04,0.88);
        solar(px,py,pz,w,h,n+1);
    };
};
unit(i32) truss = fn(n){
    if(n<2){
        f32 base=-7.7+core.sint_to_float<f32>(n)*1.24;
        paint(0.60,0.57,0.50,0.09);
        box(base,1.69,-9.8,0.10,1.0,0.12);
        quad(base,1.77,-9.72,base+0.07,1.71,-9.72,base+1.25,2.64,-9.72,base+1.18,2.70,-9.72,0.71);
        paint(0.91,0.51,0.13,0.30);
        box(base+0.11,2.68,-9.54,1.20,0.042,0.042);
        truss(n+1);
    };
};
unit(i32) station_fasteners = fn(k) {
    if(k<3){
        f32 index=core.sint_to_float<f32>(k);
        f32 zz=-10.82+index*1.19;
        paint(0.25,0.28,0.26,0.105);
        sweep(-1.492,-1.14,zz,-1.462,-1.14,zz,0.044,0.039,0,0,6);
        sweep(-1.492,0.74,zz,-1.462,0.74,zz,0.044,0.039,0,0,6);
        paint(0.45,0.42,0.32,0.095);
        quad(-1.435,0.70,zz+0.13,-1.435,0.86,zz+0.13,-1.435,0.86,zz+0.24,-1.435,0.70,zz+0.24,0.69);
        station_fasteners(k+1);
    };
};
i32 station_leg=0;
bool cargo_locked=false;
i32 alignment_stage=0;
f32 seat_clock=0.0;
i32 seat_pose=0;
f32 transfer_clock=0.0;
i32 transfer_pose=0;
i32 lock_kind=0;
i32 lock_pose=0;
f32 lock_clock=0.0;
f32() lock_blend = fn {
    f32 t=core.sint_to_float<f32>(lock_pose)/4.0;
    t*t*(3.0-2.0*t)
};
f32() cargo_lock_y = fn {if(cargo_locked){-0.45}else{if(lock_kind==1){-0.57+0.12*lock_blend()}else{-0.57}}};
f32() hatch_lock_y = fn {if(alignment_stage==7){-0.03}else{if(lock_kind==2){-0.14+0.11*lock_blend()}else{-0.14}}};
f32(i32) transfer_ease = fn(index){
    f32 t=limit(core.sint_to_float<f32>(index)/3.0,0.0,1.0);
    t*t*(3.0-2.0*t)
};
f32[7] elbow_dx=[0.0,0.005204942,0.014663307,0.017319421,0.005443067,-0.016463812,-0.028937600];
f32[7] elbow_dy=[0.0,-0.003655004,-0.009332873,-0.009841309,-0.004177934,0.002321792,0.004856000];
f32[7] elbow_dz=[0.0,-0.000982262,-0.002095023,-0.001543880,-0.001316310,-0.004557410,-0.007602000];
f32() seat_blend = fn {
    f32 t=core.sint_to_float<f32>(seat_pose)/6.0;
    t*t*(3.0-2.0*t)
};

f32(i32) rail_depth = fn(leg) {if(leg==0){-1.59}else{if(leg==1){-3.43}else{-4.88}}};
f32() align_pin_y = fn {if(alignment_stage>=4){-0.36}else{if(alignment_stage==3){-0.43+0.07*transfer_ease(transfer_pose)}else{-0.54+0.11*seat_blend()}}};
f32() arm_x = fn {if(alignment_stage>=5){-0.94}else{if(alignment_stage>=1){1.09}else{-0.18}}};
f32() arm_y = fn {if(alignment_stage>=5){hatch_lock_y()}else{if(alignment_stage>=1){align_pin_y()}else{cargo_lock_y()}}};
f32() arm_z = fn {if(alignment_stage>=5){-2.48}else{if(alignment_stage>=1){-4.81}else{rail_depth(station_leg)}}};
unit(f32,f32,f32,f32) socket_bolt = fn(x,y,z,radius){
    paint(0.28,0.31,0.33,0.62);
    sweep(x,y,z,x,y,z+0.008,radius,radius*0.86,1,0,6);
    paint(0.63,0.61,0.54,0.62);
    sweep(x,y,z+0.008,x,y,z+0.008,radius*0.86,0.0,1,0,6);
};
unit(f32,f32,f32) rail_foot = fn(x,z,length){
    f32 base=-0.64-length;
    paint(0.22,0.28,0.30,0.62);
    box(x-0.115,base-0.041,z-0.095,0.23,0.065,0.20);
    paint(0.55,0.59,0.60,0.65);
    quad(x-0.104,base,z+0.076,x+0.104,base,z+0.076,x+0.059,-0.636,z+0.081,x-0.059,-0.636,z+0.081,0.87);
    quad(x+0.104,base,z+0.076,x+0.104,base,z-0.056,x+0.059,-0.636,z-0.058,x+0.059,-0.636,z+0.081,0.78);
    quad(x-0.104,base,z-0.056,x-0.104,base,z+0.076,x-0.059,-0.636,z+0.081,x-0.059,-0.636,z-0.058,0.77);
    paint(0.28,0.34,0.37,0.62);
    round_shell(x-0.067,-0.57,z,x-0.045,-0.57,z,0.130,0.137,0,0,10);
    round_shell(x+0.044,-0.57,z,x+0.067,-0.57,z,0.137,0.130,0,0,10);
    socket_bolt(x,base+0.064,z+0.079,0.025);
};
unit(f32,f32,f32,f32) route_lens = fn(x,y,z,address){
    paint(0.15,0.22,0.24,0.62);
    box(x-0.019,y-0.031,z-0.072,0.202,0.073,0.073);
    paint(0.32,0.70,0.79,address);
    quad(x,y,z+0.003,x+0.131,y,z+0.003,x+0.162,y+0.031,z+0.003,x,y+0.031,z+0.003,0.92);
};
unit(i32) traversal_rail = fn(leg) {
    f32 z=rail_depth(leg);
    if(leg<2){
        f32 address=1.10+core.sint_to_float<f32>(leg)*0.01;
        route_lens(0.12,-0.505,z+0.103,address);
        paint(0.82,0.50,0.19,address);
        pt(0.155,-0.467,z+0.106,0.92);
        pt(0.239,-0.467,z+0.106,0.92);
        pt(0.197,-0.426,z+0.106,0.92);
    };
    paint(0.53,0.54,0.54,0.62);
    if(leg==2){
        round_shell(-1.55,-0.57,z,-0.55,-0.57,z,0.087,0.087,0,0,36);
        round_shell(0.30,-0.57,z,0.95,-0.57,z,0.087,0.087,0,0,24);
    }else{round_shell(-1.55,-0.57,z,1.13,-0.57,z,0.087,0.087,0,0,48);};
    if(leg==0){paint(0.95,0.51,0.125,0.30);}else{if(leg==1){paint(0.39,0.73,0.82,0.30);}else{paint(0.96,0.67,0.25,0.30);};};
    round_shell(-1.41,-0.57,z,-1.19,-0.57,z,0.12,0.12,0,0,32);
    round_shell(0.67,-0.57,z,0.84,-0.57,z,0.115,0.115,0,0,32);
    if(leg<2){
        rail_foot(-1.30,z,0.238);
        rail_foot(0.755,z,0.44);
        paint(0.37,0.44,0.46,0.62);
        sweep(-1.54,-0.904,z-0.04,0.779,-1.097,z-0.062,0.046,0.046,0,0,7);
    }else{
        paint(0.19,0.21,0.22,0.08);
        box(-1.41,-0.88,z-0.03,0.22,0.25,0.061);
        box(0.70,-1.10,z-0.03,0.17,0.48,0.061);
    };
};
unit(f32,f32,f32) shoulder_bolt = fn(x,y,z){

    paint(0.68,0.66,0.59,0.62);
    sweep(x,y,z+0.011,x,y,z+0.011,0.021,0.0,1,0,6);
};
unit(f32,f32,f32,f32) pin_z = fn(x,y,z,radius){
    paint(0.22,0.34,0.40,0.29);
    round_shell(x,y,z-0.14,x,y,z,radius*0.91,radius,1,0,20);

    paint(0.74,0.74,0.72,0.62);
    round_shell(x,y,z,x,y,z+0.050,radius,radius*0.89,1,0,20);
    sweep(x,y,z+0.050,x,y,z+0.050,radius*0.89,0.0,1,0,20);
    paint(0.15,0.20,0.23,0.40);
    round_shell(x,y,z+0.054,x,y,z+0.075,radius*0.62,radius*0.54,1,0,12);
    sweep(x,y,z+0.075,x,y,z+0.075,radius*0.54,0.0,1,0,12);
    paint(0.71,0.43,0.13,0.63);
    sweep(x,y,z+0.080,x,y,z+0.097,radius*0.30,radius*0.26,1,0,10);
    sweep(x,y,z+0.097,x,y,z+0.097,radius*0.26,0.0,1,0,10);
    shoulder_bolt(x-radius*0.71,y,z+0.051);
    shoulder_bolt(x+radius*0.71,y,z+0.051);
    shoulder_bolt(x,y+radius*0.71,z+0.051);
};
unit(i32) boom_bays = fn(k){
    if(k<4){
        f32 t=core.sint_to_float<f32>(k);
        f32 x=-0.30+t*0.91;f32 z=-8.45-t*0.46;
        f32 y=1.79+t*0.17;
        paint(0.54,0.60,0.62,0.65);
        sweep(x,y,z,x+0.91,y+0.17,z-0.46,0.071,0.071,0,0,8);
        sweep(x,y+0.52,z,x+0.91,y+0.69,z-0.46,0.071,0.071,0,0,8);
        sweep(x,y,z,x+0.91,y+0.69,z-0.46,0.047,0.047,2,0,8);
        sweep(x,y,z,x,y+0.52,z,0.041,0.041,2,0,8);
        paint(0.80,0.60,0.30,0.62);
        box(x-0.08,y+0.40,z-0.10,0.16,0.19,0.19);
        boom_bays(k+1);
    };
};
f32() load_drop = fn {-0.40*seat_blend()};
f32[8] shell_y = [0.70,1.0,1.0,0.70,-0.70,-1.0,-1.0,-0.70];
f32[8] shell_z = [1.0,0.70,-0.70,-1.0,-1.0,-0.70,0.70,1.0];
unit(f32,f32,f32,f32,f32,i32) cargo_skin = fn(x0,x1,y0,r0,r1,k){
    if(k<8){
        u64 ka=core.int_extend<u64>(k);u64 kb=core.int_extend<u64>((k+1)%8);
        f32 u0=shell_y[ka];f32 u1=shell_y[kb];f32 z0=shell_z[ka];f32 z1=shell_z[kb];
        if(r1==0.0){
          pt(x0,y0+u0*r0,-7.13+z0*r0,0.85);pt(x0,y0+u1*r0,-7.13+z1*r0,0.85);pt(x1,y0,-7.13,0.85);
        }else{
          quad(x0,y0+u0*r0,-7.13+z0*r0,x0,y0+u1*r0,-7.13+z1*r0,
               x1,y0+u1*r1,-7.13+z1*r1,x1,y0+u0*r1,-7.13+z0*r1,0.88);
        };
        cargo_skin(x0,x1,y0,r0,r1,k+1);
    };
};
f32[8] fascia_x=[0.072,0.928,1.0,1.0,0.928,0.072,0.0,0.0];
f32[8] fascia_y=[1.0,1.0,0.8875,0.1125,0.0,0.0,0.1125,0.8875];
unit(f32,f32,f32,f32,f32,i32) fascia_ring = fn(dy,scale0,scale1,z0,z1,k){
    if(k<8){
        u64 i=core.int_extend<u64>(k);u64 j=core.int_extend<u64>((k+1)%8);
        f32 px=fascia_x[i]-0.5; f32 py=(fascia_y[i]-0.5)*0.64;
        f32 qx=fascia_x[j]-0.5; f32 qy=(fascia_y[j]-0.5)*0.64;
        if(scale1==0.0){
            pt(1.22+scale0*px,0.525+dy+scale0*py,z0,0.93);
            pt(1.22+scale0*qx,0.525+dy+scale0*qy,z0,0.93);
            pt(1.22,0.525+dy,z0,0.93);
        }else{
            quad(1.22+scale0*px,0.525+dy+scale0*py,z0,1.22+scale0*qx,0.525+dy+scale0*qy,z0,
                 1.22+scale1*qx,0.525+dy+scale1*qy,z1,1.22+scale1*px,0.525+dy+scale1*py,z1,0.88);
        };
        fascia_ring(dy,scale0,scale1,z0,z1,k+1);
    };
};
unit(f32) cargo_fascia = fn(dy){
    paint(0.24,0.30,0.31,0.66);
    fascia_ring(dy,1.03,1.0,-6.671,-6.614,0);
    f32 tagged=0.75625-dy*0.00625;
    paint(0.62,0.64,0.63,tagged);
    fascia_ring(dy,1.0,0.94,-6.614,-6.579,0);
    fascia_ring(dy,0.94,0.79,-6.579,-6.577,0);
    paint(0.38,0.43,0.46,0.66);
    fascia_ring(dy,0.79,0.753,-6.577,-6.595,0);
    paint(0.61,0.63,0.61,tagged);
    fascia_ring(dy,0.753,0.0,-6.595,-6.595,0);
    paint(0.44,0.50,0.51,0.71);
    box(0.796,0.349+dy,-6.590,0.047,0.342,0.036);
    box(1.596,0.349+dy,-6.590,0.047,0.342,0.036);
    shoulder_bolt(0.820,0.400+dy,-6.555);shoulder_bolt(0.820,0.637+dy,-6.555);
    shoulder_bolt(1.620,0.400+dy,-6.555);shoulder_bolt(1.620,0.637+dy,-6.555);
    paint(0.29,0.34,0.36,0.66);
    box(0.855,0.273+dy,-6.580,0.272,0.024,0.024);
    box(1.313,0.273+dy,-6.580,0.272,0.024,0.024);
};
unit(f32,f32) cargo_band = fn(x,dy){
    paint(0.15,0.20,0.23,0.64);
    cargo_skin(x-0.015,x+0.134,0.53+dy,0.516,0.516,0);
    paint(0.65,0.42,0.19,0.34);
    cargo_skin(x,x+0.025,0.53+dy,0.533,0.533,0);
    cargo_skin(x+0.089,x+0.116,0.53+dy,0.533,0.533,0);
    paint(0.30,0.36,0.38,0.64);
    box(x-0.038,0.933+dy,-6.94,0.165,0.157,0.212);
    paint(0.68,0.62,0.44,0.62);
    box(x-0.019,0.684+dy,-6.618,0.158,0.105,0.058);
    box(x-0.019,0.278+dy,-6.618,0.158,0.104,0.058);
    shoulder_bolt(x+0.056,0.736+dy,-6.558);
    shoulder_bolt(x+0.057,0.327+dy,-6.558);
};
unit(f32,f32,f32,f32) cargo_mark = fn(x,y,w,h){
    quad(x,y,-6.546,x+w,y,-6.546,x+w,y+h,-6.546,x,y+h,-6.546,0.93);
};
unit(f32,f32) cargo_keeper = fn(x,dy){
    paint(0.32,0.40,0.45,0.66);
    box(x,-0.699,-6.740,0.25,0.48,0.124);
    paint(0.75,0.56,0.28,0.34);
    box(x+0.061,-0.286+dy,-6.655,0.120,0.083,0.096);
    f32 jaw=-0.372-0.333*transfer_ease(transfer_pose);
    paint(0.69,0.72,0.68,0.71);
    box(x+0.041,jaw,-6.554,0.160,0.183,0.038);
    box(x+0.041,jaw+0.102,-6.648,0.160,0.052,0.098);
    if(transfer_pose>=3){paint(0.20,1.0,0.57,0.96);}else{paint(1.0,0.51,0.18,0.94);};
    box(x+0.067,-0.469,-6.509,0.108,0.026,0.009);
};
unit() suspended_cargo = fn {
    boom_bays(0);
    f32 dy=load_drop();
    cargo_keeper(0.49,dy);cargo_keeper(1.71,dy);
    paint(0.50,0.56,0.57,0.64);
    cargo_skin(0.20,0.47,0.53+dy,0.27,0.49,0);
    paint(0.58,0.61,0.62,0.62);
    cargo_skin(0.47,1.95,0.53+dy,0.49,0.49,0);
    paint(0.46,0.49,0.50,0.62);
    cargo_skin(1.95,2.17,0.53+dy,0.49,0.30,0);
    cargo_skin(2.17,2.17,0.53+dy,0.30,0.0,0);
    cargo_skin(0.20,0.20,0.53+dy,0.27,0.0,0);
    cargo_band(0.54,dy);cargo_band(1.73,dy);
    paint(0.65,0.39,0.17,0.34);
    cargo_skin(0.21,0.259,0.53+dy,0.290,0.335,0);
    cargo_fascia(dy);
    paint(0.26,0.31,0.34,0.67);
    box(0.879,0.339+dy,-6.602,0.632,0.343,0.048);
    paint(0.82,0.81,0.71,0.62);
    box(0.89,0.35+dy,-6.566,0.61,0.32,0.017);
    paint(0.18,0.24,0.24,0.66);
    cargo_mark(0.97,0.443+dy,0.015,0.144);
    cargo_mark(0.985,0.443+dy,0.095,0.015);
    cargo_mark(0.985,0.572+dy,0.095,0.015);
    cargo_mark(1.111,0.443+dy,0.015,0.144);
    cargo_mark(1.126,0.443+dy,0.073,0.015);
    cargo_mark(1.126,0.572+dy,0.073,0.015);
    cargo_mark(1.199,0.443+dy,0.015,0.144);
    cargo_mark(1.242,0.572+dy,0.116,0.015);
    quad(1.276,0.443+dy,-6.546,1.294,0.443+dy,-6.546,1.358,0.573+dy,-6.546,1.340,0.573+dy,-6.546,0.93);
    paint(0.88,0.56,0.26,0.76);
    box(1.41,0.42+dy,-6.545,0.043,0.15,0.019);
    shoulder_bolt(0.918,0.378+dy,-6.542);shoulder_bolt(1.475,0.620+dy,-6.542);
    paint(0.21,0.32,0.36,0.67);
    box(1.18,0.26+dy,-6.660,0.27,0.07,0.12);
    paint(0.22,0.80,0.82,0.92);
    box(1.22,0.281+dy,-6.534,0.068,0.015,0.008);
    box(1.32,0.281+dy,-6.534,0.068,0.015,0.008);
    paint(0.58,0.62,0.62,0.62);
    sweep(0.61,1.03+dy,-6.80,0.33,1.58+dy,-7.52,0.046,0.046,2,0,8);
    sweep(1.79,1.03+dy,-6.78,1.33,1.58+dy,-7.55,0.046,0.046,2,0,8);
    sweep(0.31,1.58+dy,-7.52,1.46,1.58+dy,-7.55,0.073,0.073,0,0,16);
    sweep(0.31,1.86,-7.52,0.16,1.93,-8.67,0.056,0.056,1,0,8);
    sweep(1.43,1.86,-7.55,1.35,2.11,-9.26,0.056,0.056,1,0,8);
    paint(0.30,0.40,0.47,0.62);
    sweep(0.31,1.53,-7.52,0.31,1.86,-7.52,0.088,0.088,2,0,8);
    sweep(1.43,1.53,-7.55,1.43,1.86,-7.55,0.088,0.088,2,0,8);
    paint(0.70,0.73,0.71,0.62);
    sweep(0.31,1.58+dy,-7.52,0.31,1.80,-7.52,0.049,0.049,2,0,8);
    sweep(1.43,1.58+dy,-7.55,1.43,1.80,-7.55,0.049,0.049,2,0,8);
    paint(0.39,0.48,0.49,0.64);
    sweep(-1.49,-0.53,-7.33,2.10,-0.49,-7.33,0.073,0.073,0,0,10);
    paint(0.77,0.50,0.23,0.34);
    box(0.49,-0.514,-7.45,0.255,0.11,0.56);
    box(1.71,-0.514,-7.45,0.255,0.11,0.56);
};
unit(f32,f32,f32,f32,f32,f32,f32,f32) drive_link = fn(px,py,pz,ax,ay,az,span,thick){
    f32 tangent_x=ax-px;f32 tangent_y=ay-py;
    f32 scale=span/(abs_cell(tangent_x)+abs_cell(tangent_y));
    f32 sx=-tangent_y*scale;f32 sy=tangent_x*scale;
    quad(px-sx,py-sy,pz+thick,ax-sx,ay-sy,az+thick,ax+sx,ay+sy,az+thick,px+sx,py+sy,pz+thick,0.92);
    quad(px+sx,py+sy,pz-thick,ax+sx,ay+sy,az-thick,ax-sx,ay-sy,az-thick,px-sx,py-sy,pz-thick,0.72);
    quad(px+sx,py+sy,pz+thick,ax+sx,ay+sy,az+thick,ax+sx,ay+sy,az-thick,px+sx,py+sy,pz-thick,0.88);
    quad(px-sx,py-sy,pz-thick,ax-sx,ay-sy,az-thick,ax-sx,ay-sy,az+thick,px-sx,py-sy,pz+thick,0.83);
};
unit(f32,f32,f32,f32) actuator_case = fn(x,y,z,radius){
    paint(0.23,0.30,0.33,0.64);
    round_shell(x,y,z-0.354,x,y,z-0.198,radius*0.73,radius*0.98,1,0,16);
    paint(0.65,0.68,0.64,0.71);
    round_shell(x,y,z-0.206,x,y,z-0.103,radius*1.02,radius*1.075,1,0,16);
    paint(0.31,0.36,0.39,0.62);
    round_shell(x,y,z-0.103,x,y,z-0.018,radius*1.075,radius*1.003,1,0,16);
    paint(0.69,0.48,0.23,0.34);
    box(x-radius*0.24,y+radius*0.82,z-0.176,radius*0.52,radius*0.36,0.120);
};
unit() manipulator = fn {
    f32 dy=load_drop();
    u64 pose=core.int_extend<u64>(seat_pose);
    f32 ex=elbow_dx[pose]; f32 ey=elbow_dy[pose]; f32 ez=elbow_dz[pose];
    paint(0.21,0.28,0.31,0.65);
    drive_link(2.76,2.49,-10.07,3.23,1.20,-7.97,0.194,0.121);
    paint(0.59,0.62,0.60,0.71);
    drive_link(2.77,2.46,-9.98,3.21,1.28,-7.85,0.146,0.063);
    paint(0.75,0.51,0.24,0.34);
    drive_link(2.83,2.26,-9.60,3.14,1.45,-7.96,0.032,0.045);
    paint(0.37,0.44,0.48,0.65);
    box(2.60,2.37,-10.13,0.29,0.26,0.24);
    drive_link(3.23,1.20,-7.94,2.88+ex,0.46+ey,-7.01+ez,0.155,0.110);
    drive_link(3.23,1.20,-8.23,2.88+ex,0.46+ey,-7.27+ez,0.101,0.088);
    paint(0.69,0.70,0.66,0.71);
    drive_link(3.205,1.06,-7.75,2.924+ex,0.54+ey,-6.99+ez,0.091,0.046);
    paint(0.48,0.55,0.58,0.64);
    drive_link(2.88+ex,0.46+ey,-7.00+ez,2.24,0.62+dy,-6.74,0.121,0.069);
    paint(0.19,0.25,0.29,0.62);
    sweep(2.88+ex,0.46+ey,-7.29+ez,2.18,0.62+dy,-6.98,0.080,0.074,0,0,10);
    paint(0.63,0.70,0.71,0.62);
    sweep(2.84+ex,0.52+ey+dy*0.08,-6.904+ez,2.43,0.626+dy*0.78,-6.77,0.045,0.045,0,0,14);
    paint(0.19,0.23,0.25,0.39);
    sweep(2.66,0.569+dy*0.4,-6.85,2.60,0.585+dy*0.51,-6.83,0.065,0.065,0,0,12);
    actuator_case(3.23,1.20,-7.81,0.265);
    actuator_case(2.88+ex,0.46+ey,-6.89+ez,0.262);
    pin_z(3.23,1.20,-7.81,0.265);pin_z(2.88+ex,0.46+ey,-6.89+ez,0.262);pin_z(2.20,0.62+dy,-6.62,0.165);
    paint(0.80,0.48,0.18,0.65);
    sweep(3.29,1.16,-7.60,3.16,0.91,-7.24,0.034,0.034,2,0,10);
    sweep(3.16,0.91,-7.24,3.05+ex,0.63+ey,-6.83+ez,0.034,0.034,2,0,10);
    sweep(3.05+ex,0.63+ey,-6.83+ez,2.51,0.58+dy*0.63,-6.52,0.032,0.032,0,0,10);
    paint(0.19,0.24,0.26,0.34);
    sweep(3.23,1.13,-7.61,3.10,0.88,-7.23,0.025,0.025,2,0,10);
    sweep(3.10,0.88,-7.23,2.99+ex,0.58+ey,-6.82+ez,0.025,0.025,2,0,10);
    sweep(2.99+ex,0.58+ey,-6.82+ez,2.48,0.54+dy*0.63,-6.51,0.024,0.024,0,0,10);
    paint(0.62,0.64,0.63,0.62);
    sweep(3.20,1.03,-7.425,3.16,0.95,-7.31,0.055,0.055,2,0,12);
    sweep(2.72,0.57+dy*0.29,-6.65,2.63,0.57+dy*0.41,-6.59,0.057,0.057,0,0,12);
    paint(0.41,0.46,0.48,0.68);
    box(2.13,0.50+dy,-6.88,0.14,0.22,0.25);
    paint(0.19,0.24,0.27,0.62);
    box(2.08,0.36+dy,-6.73,0.28,0.12,0.14);
    if(alignment_stage>=4){paint(0.94,0.62,0.23,0.92);}else{if(alignment_stage==3){paint(0.28,1.0,0.60,0.92);}else{paint(0.28,0.72,0.92,0.92);};};
    box(2.14,0.407+dy,-6.581,0.13,0.033,0.010);
    paint(0.56,0.61,0.61,0.62);
    box(2.16,0.22+dy,-6.892,0.064,0.72,0.092);
    f32 jaw_open=0.14*transfer_ease(transfer_pose-3);
    box(2.04,0.700+dy+jaw_open,-6.889,0.16,0.128,0.140);
    box(2.04,0.415+dy-jaw_open,-6.889,0.16,0.121,0.140);
    paint(0.71,0.50,0.24,0.35);
    box(1.96,0.731+dy+jaw_open,-6.838,0.113,0.066,0.115);
    box(1.96,0.422+dy-jaw_open,-6.838,0.113,0.065,0.115);
};
unit() lock_support = fn {
    paint(0.45,0.48,0.50,0.65);
    sweep(-1.57,-0.88,-5.57,0.36,-0.80,-5.40,0.076,0.076,0,0,20);
    sweep(-1.54,-0.90,-6.03,0.36,-0.80,-5.40,0.051,0.051,0,0,14);
    box(-0.63,-0.83,-5.63,0.99,0.145,0.29);
    sweep(0.23,-0.81,-5.49,0.76,-0.94,-4.93,0.059,0.059,0,0,12);
    paint(0.21,0.25,0.27,0.66);
    box(-0.59,-0.73,-5.65,0.16,0.45,0.25);
    box(0.17,-0.72,-5.65,0.16,0.44,0.25);
    paint(0.80,0.49,0.16,0.66);
    sweep(-1.54,-0.92,-5.36,-0.54,-0.92,-5.31,0.029,0.029,0,0,12);
    sweep(-0.54,-0.92,-5.31,-0.39,-0.75,-5.34,0.029,0.029,2,0,12);
};
unit(f32,f32) captive_bolt = fn(x,y){
    paint(0.17,0.19,0.20,0.60);
    sweep(x,y,-5.126,x,y,-5.105,0.036,0.032,1,0,12);
    paint(0.66,0.65,0.59,0.63);
    sweep(x,y,-5.103,x,y,-5.088,0.022,0.019,1,0,6);
    sweep(x,y,-5.088,x,y,-5.088,0.019,0.0,1,0,6);
};
unit() cargo_fixture = fn {
    f32 z=rail_depth(2);
    f32 pin=cargo_lock_y();
    route_lens(-0.16,-0.234,-5.063,1.12);
    paint(0.26,0.29,0.30,0.66);
    box(-0.59,-0.83,-5.45,0.93,0.62,0.29);
    paint(0.095,0.12,0.13,0.08);
    box(-0.46,-0.72,-5.153,0.65,0.40,0.016);
    paint(0.55,0.57,0.55,0.66);
    box(-0.56,-0.83,-5.162,0.87,0.097,0.053);
    box(-0.56,-0.325,-5.162,0.87,0.107,0.053);
    box(-0.56,-0.74,-5.162,0.096,0.42,0.053);
    box(0.197,-0.74,-5.162,0.111,0.42,0.053);
    paint(0.38,0.404,0.40,0.66);
    quad(-0.464,-0.733,-5.109,-0.433,-0.706,-5.149,-0.433,-0.349,-5.149,-0.464,-0.325,-5.109,0.79);
    quad(0.197,-0.733,-5.109,0.197,-0.325,-5.109,0.163,-0.349,-5.149,0.163,-0.706,-5.149,0.62);
    quad(-0.464,-0.733,-5.109,0.197,-0.733,-5.109,0.163,-0.706,-5.149,-0.433,-0.706,-5.149,0.72);
    quad(-0.464,-0.325,-5.109,-0.433,-0.349,-5.149,0.163,-0.349,-5.149,0.197,-0.325,-5.109,0.92);
    captive_bolt(-0.501,-0.783);captive_bolt(0.254,-0.783);
    captive_bolt(-0.501,-0.272);captive_bolt(0.254,-0.272);
    paint(0.62,0.40,0.13,0.63);
    box(-0.52,-0.685,-5.153,0.114,0.36,0.186);
    box(0.119,-0.685,-5.153,0.114,0.36,0.186);
    paint(0.28,0.30,0.30,0.62);
    sweep(-0.457,-0.673,-4.963,-0.457,-0.368,-4.963,0.027,0.027,2,0,12);
    sweep(0.164,-0.673,-4.963,0.164,-0.368,-4.963,0.027,0.027,2,0,12);
    paint(0.39,0.42,0.43,0.63);
    sweep(-0.465,pin,-4.973,-0.438,pin,z,0.052,0.048,1,0,12);
    sweep(0.165,pin,-4.973,0.166,pin,z,0.052,0.050,1,0,12);
    paint(0.91,0.55,0.16,0.30);
    round_shell(-0.442,pin,z,-0.304,pin,z,0.075,0.074,0,0,30);
    round_shell(0.052,pin,z,0.166,pin,z,0.074,0.075,0,0,30);
    paint(0.51,0.54,0.54,0.62);
    round_shell(-0.307,pin,z,0.055,pin,z,0.087,0.087,0,0,36);
    paint(0.10,0.13,0.14,0.09);
    box(-0.37,-0.288,-5.105,0.46,0.075,0.035);
    if(cargo_locked){paint(0.29,0.96,0.55,0.99);}else{paint(1.0,0.59,0.16,0.99);};
    box(-0.342,-0.266,-5.068,0.405,0.027,0.012);
};
f32[8] console_x=[1.045,1.470,1.53,1.53,1.475,1.045,0.99,0.99];
f32[8] console_y=[-0.16,-0.16,-0.23,-0.63,-0.70,-0.70,-0.63,-0.23];
unit(f32,f32,f32,f32,i32) console_ring = fn(s0,s1,z0,z1,k){
    if(k<8){
        u64 i=core.int_extend<u64>(k);u64 j=core.int_extend<u64>((k+1)%8);
        f32 x=console_x[i]-1.26; f32 y=console_y[i]+0.43;
        f32 u=console_x[j]-1.26; f32 v=console_y[j]+0.43;
        if(s1==0.0){
            pt(1.26+x*s0,y*s0-0.43,z0,0.85);pt(1.26+u*s0,v*s0-0.43,z0,0.85);pt(1.26,-0.43,z0,0.85);
        }else{
            quad(1.26+x*s0,y*s0-0.43,z0,1.26+u*s0,v*s0-0.43,z0,
                 1.26+u*s1,v*s1-0.43,z1,1.26+x*s1,y*s1-0.43,z1,0.83);
        };
        console_ring(s0,s1,z0,z1,k+1);
    };
};
unit(f32) console_guide = fn(x){
    paint(0.34,0.49,0.54,0.64);
    sweep(x,-0.665,-4.936,x,-0.325,-4.936,0.043,0.043,2,0,8);
    paint(0.50,0.50,0.42,0.63);
    sweep(x,-0.663,-4.936,x,-0.620,-4.936,0.055,0.043,2,0,8);
    sweep(x,-0.368,-4.936,x,-0.325,-4.936,0.043,0.054,2,0,8);
};
unit() alignment_console = fn {
    f32 pin=align_pin_y();
    route_lens(1.10,-0.282,-4.84,1.13);
    paint(0.22,0.27,0.32,0.65);
    box(0.73,-0.73,-5.19,0.77,0.19,0.19);
    console_ring(0.92,1.0,-5.15,-5.105,0);
    console_ring(1.0,1.0,-5.105,-4.986,0);
    paint(0.48,0.56,0.57,0.64);
    console_ring(1.0,0.87,-4.986,-4.946,0);
    paint(0.20,0.24,0.27,0.65);
    console_ring(0.87,0.75,-4.946,-4.992,0);
    paint(0.14,0.19,0.21,0.66);
    console_ring(0.75,0.0,-4.992,-4.992,0);
    console_guide(1.04);console_guide(1.49);
    paint(0.43,0.49,0.49,0.64);
    box(1.075,-0.320,-4.980,0.380,0.105,0.098);
    paint(0.58,0.65,0.66,0.62);
    round_shell(0.90,pin,-4.81,1.48,pin,-4.81,0.087,0.087,0,0,26);
    paint(0.29,0.71,0.72,0.61);
    round_shell(1.36,pin,-4.81,1.47,pin,-4.81,0.106,0.106,0,0,20);
    if(alignment_stage>=4){paint(0.27,0.98,0.60,0.99);}else{if(alignment_stage==3){paint(1.0,0.58,0.24,0.99);}else{paint(0.34,0.80,1.0,0.99);};};
    box(1.11,-0.274,-4.864,0.29,0.030,0.010);
};
unit(i32) airlock_bolts = fn(k){
    if(k<8){
        f32 angle=0.37+core.sint_to_float<f32>(k)*0.7853982;
        if(angle>4.6){angle=angle-6.28318531;};
        f32 yy=0.27+wave(angle)*0.733; f32 zz=-2.60+cw(angle)*0.733;
        paint(0.20,0.24,0.25,0.62);
        sweep(-1.234,yy,zz,-1.234,yy,zz,0.037,0.0,0,0,6);
        paint(0.70,0.67,0.58,0.62);
        sweep(-1.226,yy,zz,-1.226,yy,zz,0.026,0.0,0,0,6);
        airlock_bolts(k+1);
    };
};
unit(f32) airlock_locator = fn(y){
    quad(-1.261,y+0.055,-2.785,-1.261,y+0.041,-2.785,-1.261,y,-2.615,-1.261,y+0.016,-2.615,0.92);
    quad(-1.261,y,-2.615,-1.261,y+0.041,-2.449,-1.261,y+0.055,-2.449,-1.261,y+0.016,-2.615,0.92);
};
unit() airlock = fn {
    paint(0.28,0.37,0.40,0.65);
    round_shell(-1.56,0.27,-2.60,-1.39,0.27,-2.60,0.806,0.842,0,0,20);
    paint(0.49,0.53,0.54,0.62);
    round_shell(-1.39,0.27,-2.60,-1.282,0.27,-2.60,0.842,0.814,0,0,20);
    paint(0.66,0.66,0.61,0.71);
    round_shell(-1.282,0.27,-2.60,-1.235,0.27,-2.60,0.814,0.778,0,0,30);
    sweep(-1.235,0.27,-2.60,-1.235,0.27,-2.60,0.778,0.690,0,0,30);
    paint(0.12,0.15,0.17,0.26);
    round_shell(-1.235,0.27,-2.60,-1.265,0.27,-2.60,0.690,0.639,0,0,30);
    paint(0.48,0.52,0.52,0.754);
    sweep(-1.266,0.27,-2.60,-1.266,0.27,-2.60,0.639,0.0,0,0,30);
    paint(0.31,0.34,0.34,0.754);
    sweep(-1.264,0.27,-2.60,-1.264,0.27,-2.60,0.593,0.575,0,0,24);
    airlock_bolts(0);
    paint(0.30,0.35,0.36,0.62);
    box(-1.258,-0.486,-2.74,0.109,0.165,0.27);
    box(-1.258,0.882,-2.74,0.109,0.165,0.27);
    paint(0.62,0.51,0.29,0.62);
    box(-1.154,-0.463,-2.699,0.025,0.111,0.182);
    box(-1.154,0.907,-2.699,0.025,0.111,0.182);
    paint(0.20,0.26,0.31,0.62);
    box(-1.266,0.454,-2.865,0.087,0.237,0.52);
    paint(0.58,0.65,0.62,0.62);
    box(-1.18,0.496,-2.832,0.031,0.158,0.451);
    if(alignment_stage==7){paint(0.28,0.99,0.58,0.96);}
    else{if(alignment_stage>=4){paint(1.0,0.61,0.22,0.96);}else{paint(0.37,0.78,0.69,0.92);};};
    airlock_locator(0.145);airlock_locator(0.207);
    paint(0.43,0.49,0.52,0.71);
    box(-1.23,-0.224,-2.588,0.164,0.296,0.199);
    paint(0.14,0.21,0.25,0.64);
    box(-1.068,-0.204,-2.545,0.015,0.243,0.131);
    paint(0.64,0.67,0.66,0.71);
    box(-1.079,-0.215,-2.575,0.043,0.272,0.028);
    box(-1.079,-0.215,-2.424,0.043,0.272,0.028);
    paint(0.26,0.31,0.32,0.62);
    box(-1.077,-0.221,-2.566,0.059,0.033,0.164);
    box(-1.077,0.023,-2.566,0.059,0.034,0.164);
    paint(0.61,0.63,0.61,0.71);
    sweep(-1.017,0.026,-2.561,-1.003,0.026,-2.561,0.018,0.014,0,0,6);
    sweep(-1.017,-0.195,-2.411,-1.003,-0.195,-2.411,0.018,0.014,0,0,6);
    f32 bolt=hatch_lock_y();
    paint(0.57,0.62,0.63,0.71);
    box(-1.060,bolt-0.038,-2.547,0.048,0.076,0.132);
    paint(0.70,0.60,0.43,0.71);
    round_shell(-1.11,bolt,-2.48,-1.015,bolt,-2.48,0.082,0.082,0,0,16);
    paint(0.47,0.52,0.52,0.62);
    round_shell(-1.015,bolt,-2.48,-0.887,bolt,-2.48,0.082,0.082,0,0,20);
    paint(0.89,0.62,0.22,0.34);
    round_shell(-0.887,bolt,-2.48,-0.866,bolt,-2.48,0.082,0.090,0,0,16);
    round_shell(-0.866,bolt,-2.48,-0.821,bolt,-2.48,0.090,0.090,0,0,16);
    paint(0.57,0.61,0.61,0.71);
    round_shell(-0.821,bolt,-2.48,-0.795,bolt,-2.48,0.090,0.061,0,0,16);
    paint(0.16,0.22,0.25,0.62);
    sweep(-0.794,bolt,-2.48,-0.794,bolt,-2.48,0.061,0.0,0,0,16);
    paint(0.65,0.66,0.59,0.71);
    sweep(-0.792,bolt,-2.48,-0.782,bolt,-2.48,0.032,0.025,0,0,6);
    sweep(-0.782,bolt,-2.48,-0.782,bolt,-2.48,0.025,0.0,0,0,6);
    paint(0.17,0.23,0.25,0.62);
    box(-1.078,0.039,-2.521,0.106,0.081,0.100);
    paint(0.93,0.58,0.25,1.14);
    quad(-0.972,0.047,-2.428,-0.972,0.112,-2.428,-0.972,0.112,-2.514,-0.972,0.047,-2.514,0.92);
    paint(0.23,0.29,0.30,0.62);
    box(-1.05,-0.199,-2.387,0.077,0.081,0.038);
    if(alignment_stage==7){paint(0.27,1.0,0.57,0.97);}else{paint(1.0,0.55,0.23,0.97);};
    box(-0.971,-0.186,-2.381,0.008,0.053,0.029);
    paint(0.46,0.50,0.50,0.62);
    box(-1.265,-0.145,-2.887,0.125,0.138,0.110);
    box(-1.265,-0.145,-2.437,0.125,0.138,0.110);
    paint(0.78,0.49,0.17,0.34);
    round_shell(-1.131,-0.073,-2.82,-1.131,-0.073,-2.386,0.034,0.034,1,0,22);
};
f32(f32,f32,f32) lamp_field = fn(du,dv,dd){
    0.052/(0.109+du*du+dv*dv+dd*dd)
};
unit(f32,f32,f32) port_vertex = fn(u,v,depth){
    f32 exposure=0.88;
    if(depth<0.10 && lit<0.8 && u*u+v*v<0.383){
        f32 bounce=lamp_field(u-0.364,v-0.288,depth+0.47)
                  +lamp_field(u+0.372,v+0.236,depth+0.47)
                  +lamp_field(u,v-0.65,depth-0.16)*0.55
                  +lamp_field(u,v+0.64,depth-0.16)*0.51;
        exposure=1.0+bounce;
    };
    pt(-1.10+u*0.926+depth*0.378,0.20+v,-6.39-u*0.378+depth*0.926,exposure);
};
unit(f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32) port_quad = fn(u0,v0,d0,u1,v1,d1,u2,v2,d2,u3,v3,d3){
    port_vertex(u0,v0,d0);port_vertex(u1,v1,d1);port_vertex(u2,v2,d2);
    port_vertex(u0,v0,d0);port_vertex(u2,v2,d2);port_vertex(u3,v3,d3);
};
unit(f32,f32,f32,f32,i32) port_skin = fn(r0,d0,r1,d1,i){
    if(i<12){
        f32 a0=0.2617994+core.sint_to_float<f32>(i)*0.5235988;
        f32 a1=a0+0.5235988;
        if(a0>4.6){a0=a0-6.28318531;};if(a1>4.6){a1=a1-6.28318531;};
        f32 ux=cw(a0);f32 uy=wave(a0);f32 wx=cw(a1);f32 wy=wave(a1);
        if(r1==0.0){
            port_vertex(ux*r0,uy*r0,d0);port_vertex(wx*r0,wy*r0,d0);port_vertex(0.0,0.0,d1);
        }else{
            port_quad(ux*r0,uy*r0,d0,wx*r0,wy*r0,d0,wx*r1,wy*r1,d1,ux*r1,uy*r1,d1);
        };
        port_skin(r0,d0,r1,d1,i+1);
    };
};
unit(f32,f32,f32,f32,f32) port_plate = fn(cx,cy,w,h,d){
    port_quad(cx,cy,d,cx+w,cy,d,cx+w,cy+h,d,cx,cy+h,d);
};
unit(f32,f32,f32) port_lamp = fn(u,v,d){
    paint(0.18,0.14,0.105,0.65);port_plate(u-0.021,v-0.018,0.164,0.106,d);
    paint(0.92,0.54,0.17,0.64);port_plate(u-0.010,v-0.007,0.144,0.084,d+0.006);
    paint(1.0,0.78,0.40,0.99);port_plate(u,v,0.125,0.070,d+0.012);
};
unit(i32) port_fasteners = fn(k){
    if(k<6){
        f32 angle=0.40+core.sint_to_float<f32>(k)*1.04719755;
        if(angle>4.6){angle=angle-6.28318531;};
        f32 u=cw(angle)*0.743; f32 v=wave(angle)*0.743;
        paint(0.34,0.36,0.36,0.63);
        port_plate(u-0.026,v-0.019,0.052,0.038,0.160);
        paint(0.62,0.61,0.55,0.62);
        port_plate(u-0.015,v-0.010,0.030,0.020,0.164);
        port_fasteners(k+1);
    };
};
unit() transfer_hatch = fn {
    paint(0.37,0.39,0.41,0.67);port_skin(0.91,-0.57,0.91,-0.045,0);
    paint(0.57,0.60,0.61,0.62);port_skin(0.91,-0.045,0.79,0.158,0);
    paint(0.78,0.76,0.67,0.71);port_skin(0.79,0.158,0.64,0.158,0);
    paint(0.12,0.16,0.19,0.62);port_skin(0.64,0.157,0.60,0.096,0);
    paint(0.28,0.24,0.19,0.63);port_skin(0.60,0.096,0.57,-0.65,0);
    paint(0.142,0.139,0.124,0.66);port_skin(0.57,-0.65,0.0,-0.65,0);
    paint(0.29,0.31,0.32,0.62);port_skin(0.568,-0.642,0.44,-0.641,0);
    paint(0.48,0.40,0.28,0.65);port_skin(0.588,-0.265,0.554,-0.286,0);
    paint(0.46,0.35,0.20,0.63);
    port_quad(-0.36,-0.463,0.034,0.36,-0.463,0.034,0.26,-0.454,-0.638,-0.26,-0.454,-0.638);
    paint(0.15,0.18,0.18,0.38);
    port_plate(-0.44,-0.422,-0.048,0.67,-0.48);
    port_plate(0.44,-0.422,0.048,0.67,-0.48);
    paint(0.66,0.42,0.18,0.34);
    port_plate(-0.098,0.659,0.195,0.026,0.165);
    port_plate(-0.098,-0.688,0.195,0.028,0.166);
    port_fasteners(0);
    port_lamp(-0.063,0.611,0.165);
    port_lamp(-0.063,-0.678,0.165);
    port_lamp(-0.432,-0.274,-0.485);
    port_lamp(0.303,0.251,-0.482);
    paint(0.14,0.15,0.15,0.64);port_plate(0.56,-0.285,0.12,0.29,0.171);
    paint(0.15,0.66,0.71,0.93);port_plate(0.586,-0.244,0.061,0.024,0.178);
    paint(0.30,0.28,0.25,0.65);
    port_plate(0.523,0.456,0.023,0.037,0.160);
    port_plate(0.591,0.346,0.025,0.029,0.160);
    port_plate(-0.381,0.623,0.039,0.016,0.160);
};
unit(i32) catwalk = fn(k) {
    if(k<3){
        f32 z=-2.1-0.58*core.sint_to_float<f32>(k);
        paint(0.47,0.48,0.44,0.14);
        box(-1.57,-1.10,z,0.92,0.044,0.051);
        box(-1.53,1.25,z,0.092,0.46,0.08);
        quad(-1.48,1.29,z,-1.40,1.29,z,-0.94,1.68,z-0.58,-1.02,1.68,z-0.58,0.80);
        paint(0.59,0.52,0.32,0.17);
        box(-1.38,1.71,z,0.426,0.050,0.055);
        paint(0.20,0.22,0.23,0.12);
        quad(-0.958,-1.24,z,-0.958,-1.08,z,-0.958,-1.08,z+0.11,-0.958,-1.24,z+0.11,0.75);
        catwalk(k+1);
    };
};
unit(f32) service_seam = fn(z){
    paint(0.29,0.33,0.35,0.62);
    box(-1.487,-0.89,z-0.055,0.049,1.65,0.159);
    paint(0.66,0.68,0.65,0.71);
    quad(-1.438,-0.85,z-0.036,-1.390,-0.85,z-0.016,-1.389,0.72,z-0.016,-1.440,0.72,z-0.036,0.87);
    quad(-1.389,-0.85,z-0.016,-1.389,-0.85,z+0.061,-1.389,0.72,z+0.061,-1.389,0.72,z-0.016,0.95);
    quad(-1.389,-0.85,z+0.061,-1.439,-0.85,z+0.083,-1.439,0.72,z+0.083,-1.389,0.72,z+0.061,0.77);
    paint(0.41,0.36,0.25,0.62);
    sweep(-1.391,0.578,z+0.023,-1.381,0.578,z+0.023,0.026,0.0,0,0,6);
    sweep(-1.391,-0.510,z+0.023,-1.381,-0.510,z+0.023,0.026,0.0,0,0,6);
};
unit(f32,f32) pressure_course = fn(low,high){
    paint(0.76,0.75,0.70,0.752);
    quad(-1.585,low,-4.16,-1.585,high,-4.16,-1.531,high,-3.958,-1.531,low,-3.958,0.89);
    quad(-1.531,low,-3.958,-1.531,high,-3.958,-1.531,high,-1.941,-1.531,low,-1.941,0.93);
    quad(-1.531,low,-1.941,-1.531,high,-1.941,-1.585,high,-1.74,-1.585,low,-1.74,0.86);
};
unit() pressure_skin = fn {
    paint(0.24,0.28,0.30,0.64);
    quad(-1.546,-0.090,-3.96,-1.546,-0.061,-3.96,-1.546,-0.061,-1.94,-1.546,-0.090,-1.94,0.66);
    pressure_course(-0.76,-0.09);
    pressure_course(-0.061,0.96);
    paint(0.45,0.48,0.47,0.62);
    box(-1.554,-0.108,-4.16,0.034,0.066,0.169);
    box(-1.554,-0.108,-1.91,0.034,0.066,0.169);
    paint(0.48,0.39,0.24,0.62);
    sweep(-1.518,-0.072,-4.08,-1.515,-0.072,-4.08,0.019,0.0,0,0,6);
    sweep(-1.518,-0.072,-1.82,-1.515,-0.072,-1.82,0.019,0.0,0,0,6);
};
f32[8] avionics_y=[0.285,0.285,0.221,-0.224,-0.285,-0.285,-0.224,0.221];
f32[8] avionics_z=[-0.179,0.179,0.235,0.235,0.177,-0.177,-0.235,-0.235];
unit(f32,f32,f32,f32,i32) avionics_ring = fn(x0,x1,s0,s1,k){
    if(k<8){
        u64 i=core.int_extend<u64>(k);u64 j=core.int_extend<u64>((k+1)%8);
        f32 y=avionics_y[i]; f32 z=avionics_z[i];
        f32 v=avionics_y[j]; f32 w=avionics_z[j];
        if(s1==0.0){
            pt(x0,0.185+y*s0,-1.545+z*s0,0.88);pt(x0,0.185+v*s0,-1.545+w*s0,0.88);pt(x0,0.185,-1.545,0.88);
        }else{
            quad(x0,0.185+y*s0,-1.545+z*s0,x0,0.185+v*s0,-1.545+w*s0,
                 x1,0.185+v*s1,-1.545+w*s1,x1,0.185+y*s1,-1.545+z*s1,0.78);
        };
        avionics_ring(x0,x1,s0,s1,k+1);
    };
};
unit() avionics_module = fn {
    paint(0.35,0.40,0.41,0.66);
    avionics_ring(-1.50,-1.302,1.0,1.0,0);
    paint(0.62,0.64,0.60,0.64);
    avionics_ring(-1.302,-1.244,1.0,0.81,0);
    paint(0.18,0.25,0.27,0.66);
    avionics_ring(-1.244,-1.244,0.81,0.0,0);
    paint(0.24,0.91,0.81,0.96);
    box(-1.243,0.19,-1.63,0.012,0.055,0.18);
    paint(0.55,0.56,0.49,0.64);
    quad(-1.243,0.111,-1.677,-1.243,0.111,-1.617,-1.243,0.143,-1.617,-1.243,0.143,-1.677,0.78);
    quad(-1.243,0.111,-1.494,-1.243,0.111,-1.427,-1.243,0.143,-1.427,-1.243,0.143,-1.494,0.78);
};
unit(f32) hull_lap_joint = fn(z){
    paint(0.27,0.32,0.32,0.66);
    quad(-1.588,-1.22,z-0.046,-1.588,1.17,z-0.046,-1.548,1.23,z-0.018,-1.548,-1.28,z-0.018,0.78);
    paint(0.48,0.50,0.49,0.64);
    quad(-1.548,-1.28,z-0.018,-1.548,1.23,z-0.018,-1.548,1.23,z+0.040,-1.548,-1.28,z+0.040,0.88);
    paint(0.32,0.37,0.38,0.64);
    quad(-1.548,-1.28,z+0.040,-1.548,1.23,z+0.040,-1.589,1.17,z+0.071,-1.589,-1.22,z+0.071,0.72);
};
unit() exterior_primary_shell = fn {
    f32 back=-3.33; f32 face=-1.59;
    f32 base=-1.83; f32 top=1.87; f32 aft=-13.0; f32 fore=1.80;
    paint(0.32,0.36,0.40,0.11);
    quad(back,base,aft,face,base,aft,face,top,aft,back,top,aft,0.78);
    quad(back,base,fore,back,top,fore,face,top,fore,face,base,fore,0.87);
    quad(back,base,aft,back,top,aft,back,top,fore,back,base,fore,0.61);
    quad(back,top,aft,face,top,aft,face,top,fore,back,top,fore,1.0);
    quad(back,base,aft,back,base,fore,face,base,fore,face,base,aft,0.57);
    paint(0.28,0.32,0.36,0.11);
    quad(face,base,aft,face,base,fore,face,0.084,fore,face,0.084,aft,0.69);
    paint(0.36,0.38,0.37,0.62);
    quad(face,0.084,aft,face,0.084,fore,-1.617,0.141,fore,-1.617,0.141,aft,0.80);
    paint(0.38,0.41,0.42,0.11);
    quad(-1.617,0.141,aft,-1.617,0.141,fore,face,top,fore,face,top,aft,0.69);
};

unit(i32) hull_mat=fn(m){
    if(m==0){paint(0.80,0.80,0.74,0.718);}else{if(m==1){paint(0.48,0.55,0.57,0.630);}else{
    if(m==2){paint(0.72,0.64,0.49,0.695);}else{if(m==3){paint(0.80,0.46,0.16,0.12);}else{
    if(m==4){paint(0.26,0.30,0.32,0.63);}else{if(m==5){paint(0.052,0.146,0.38,0.477);}else{
    if(m==6){paint(0.76,0.79,0.78,0.692);}else{if(m==8){paint(0.046,0.145,0.185,0.697);}else{if(m==10){paint(0.20,0.94,0.75,0.89);}else{paint(0.14,0.15,0.17,0.64);};};};};};};};};};
};
station.Part hull_piece=station.empty;
unit(f32,f32,f32,f32) hull_pt=fn(u,v,w,shade){
    i32 a=hull_piece.axis;
    pt(hull_piece.x+station.xx(a,u,w),hull_piece.y+station.yy(a,u,v,w),hull_piece.z+station.zz(a,u,v,w),shade);
};
unit(i32,i32) hull_sides=fn(i,n){
    if(i<n){
        f32 a=(core.sint_to_float<f32>(i)+0.5)*6.28318531/core.sint_to_float<f32>(n);
        f32 b1=(core.sint_to_float<f32>(i)+1.5)*6.28318531/core.sint_to_float<f32>(n);
        if(a>3.14){a=a-6.28318531;};if(b1>3.14){b1=b1-6.28318531;};
        f32 norm=if(n==4){1.41421356}else{if(n==8){1.08239220}else{1.01959116}};
        f32 a0=cw(a)*norm*hull_piece.u;f32 a1=wave(a)*norm*hull_piece.v;
        f32 b0=cw(b1)*norm*hull_piece.u;f32 bb=wave(b1)*norm*hull_piece.v;
        f32 t=hull_piece.taper;f32 l=hull_piece.l;
        f32 shade=0.85;
        hull_pt(a0,a1,0.0,shade);hull_pt(b0,bb,0.0,shade);hull_pt(b0*t,bb*t,l,shade);
        hull_pt(a0,a1,0.0,shade);hull_pt(b0*t,bb*t,l,shade);hull_pt(a0*t,a1*t,l,shade);
        hull_pt(0.0,0.0,0.0,shade);hull_pt(b0,bb,0.0,shade);hull_pt(a0,a1,0.0,shade);
        hull_pt(0.0,0.0,l,shade);hull_pt(a0*t,a1*t,l,shade);hull_pt(b0*t,bb*t,l,shade);
        hull_sides(i+1,n);
    };
};
unit(i32) hull_mesh=fn(i){if(i<station.total){
    hull_piece=station.at(i);hull_mat(hull_piece.finish);
    hull_sides(0,if(hull_piece.section==0){4}else{if(hull_piece.section==1){8}else{16}});hull_mesh(i+1);
};};
bool hull_uploaded=false;
unit() hull_upload=fn{
    if(!hull_uploaded){
        station.build();count=0;hull_mesh(0);
        unsafe {host.hull(core.pointer_cast<*?u8>(&?mesh[0][0][0][0][0]),count*8);};
        hull_uploaded=true;
    };
};

unit() eva_room = fn {
    hull_upload();count=0;
    exterior_primary_shell();
    hull_lap_joint(-1.28);hull_lap_joint(-0.47);hull_lap_joint(-4.74);hull_lap_joint(-5.86);
    blanket(3);pressure_skin();station_fasteners(0);airlock();catwalk(0);
    paint(0.40,0.44,0.43,0.13);
    box(-1.05,1.68,-5.48,0.078,0.096,3.48);
    box(-1.04,-1.22,-5.51,0.091,0.13,3.52);
    paint(0.61,0.30,0.11,0.15);
    sweep(-1.38,1.55,-1.81,-1.38,1.55,-4.58,0.026,0.026,1,0,12);
    sweep(-1.38,1.55,-4.58,-1.43,1.27,-5.16,0.026,0.025,1,0,12);
    sweep(-1.43,1.27,-5.16,-1.47,0.95,-5.77,0.025,0.025,1,0,12);
    paint(0.51,0.53,0.52,0.11);
    box(-1.48,-1.74,-12.2,0.24,0.18,13.9);
    box(-1.56,1.02,-12.2,0.16,0.24,13.9);
    paint(0.89,0.50,0.17,0.17);
    sweep(-1.46,-1.40,-11.9,-1.46,-1.40,1.9,0.047,0.047,1,0,12);
    sweep(-1.46,0.92,1.9,-1.46,0.92,-4.30,0.041,0.041,1,0,6);
    sweep(-1.46,0.92,-4.30,-1.41,0.89,-4.63,0.041,0.041,1,0,6);
    sweep(-1.41,0.89,-4.63,-1.29,0.71,-4.78,0.041,0.041,1,0,6);
    sweep(-1.29,0.71,-4.78,-1.24,0.65,-5.04,0.041,0.041,1,0,6);
    sweep(-1.24,0.65,-5.04,-1.27,0.61,-5.89,0.041,0.041,1,0,6);
    paint(0.24,0.32,0.36,0.62);
    sweep(-1.50,0.81,-3.24,-1.45,0.80,-4.43,0.031,0.031,1,0,6);
    sweep(-1.45,0.80,-4.43,-1.32,0.55,-4.94,0.031,0.031,1,0,6);
    sweep(-1.32,0.55,-4.94,-1.33,0.50,-5.91,0.031,0.031,1,0,6);
    paint(0.60,0.61,0.55,0.62);
    sweep(-1.465,0.922,-4.07,-1.465,0.922,-4.18,0.060,0.060,1,0,6);
    sweep(-1.252,0.646,-5.22,-1.255,0.642,-5.32,0.063,0.063,1,0,6);
    avionics_module();
    transfer_hatch();service_seam(-4.17);service_seam(-5.27);
    paint(0.53,0.52,0.49,0.105);
    sweep(-1.68,-0.85,-5.5,-0.30,-0.85,-5.5,0.09,0.09,0,0,12);
    paint(0.72,0.54,0.27,0.17);
    sweep(-1.59,-0.88,-5.38,-0.28,-0.88,-5.38,0.03,0.03,0,0,10);
    sweep(-1.59,-0.82,-5.38,-0.27,-0.82,-5.38,0.025,0.025,0,0,10);
    suspended_cargo();manipulator();lock_support();
    traversal_rail(0);traversal_rail(1);traversal_rail(2);cargo_fixture();alignment_console();
    unsafe { host.scenery(core.pointer_cast<*?u8>(&?mesh[0][0][0][0][0]),count*8); };
};
f32 pilot_x=0.0;f32 pilot_y=0.0;f32 pilot_z=0.37;
f32 vx=0.0;f32 vy=0.0;f32 vz=0.0;
f32 yaw=0.0;f32 pitch=0.0;f32 timer=0.0;
f32 grip=0.0; f32 reach=0.0; f32 carry=0.0;f32 carry_y=0.0;f32 carry_z=0.0;
f32 dock_yaw=0.0; f32 dock_pitch=0.0;
f32 dock_vx=0.0; f32 dock_vy=0.0; f32 dock_vz=0.0;
f32 body_yaw=0.0; f32 body_pitch=0.0;
f32 hold_yaw=0.0;f32 hold_pitch=0.0;
f32 stick_x=0.0;f32 stick_forward=0.0;
f32 thrust_x=0.0;f32 thrust_y=0.0;f32 thrust_z=0.0;
bool wall_contact=false;
bool atmosphere=false;
bool reentry_exercise=false;
f32 delta_v=20.0;
f32 rotation_x=0.0;f32 rotation_y=0.0;
unit(f32,f32) set_rotator = fn(x,y){rotation_x=limit(x,-1.0,1.0);rotation_y=limit(y,-1.0,1.0);};
f32 orbit_altitude=390000.0;
f32 orbit_warp=1.0;
f64 orbital_seconds=0.0;
i32 mode=0;i32 mark=0;i32 latch=0;
bool ready=false;
i32 deck=0;
bool external_arm=false;
unit(i32) select_arm = fn(has_mesh){external_arm=has_mesh==1;mesh_deck=-1;};
f32 mesh_x=999.0; f32 mesh_y=999.0; f32 mesh_z=999.0; f32 mesh_grip=999.0; i32 mesh_deck=-1;
f32(f32,f32,f32) limit = fn(a,b1,c) { if(a<b1){b1}else{if(a>c){c}else{a}} };
f32(f32) wrap_yaw = fn(a){if(a>3.14159265){a-6.28318531}else{if(a< -3.14159265){a+6.28318531}else{a}}};
f32(f32) sine = fn(a){wave(a)};
f32(f32) cosine = fn(a){cw(a)};
unit(f32,f32) set_thrust = fn(x,forward){stick_x=limit(x,-1.0,1.0);stick_forward=limit(forward,-1.0,1.0);};
f32 contact_t=2.0;
i32 contact_axis=0;
f32 contact_face=0.0;
f32 trace_x=0.0;f32 trace_y=0.0;f32 trace_z=0.0;
f32 trace_vx=0.0;f32 trace_vy=0.0;f32 trace_vz=0.0;
bool(f32,f32,f32) between = fn(x,lo,hi){x>=lo && x<=hi};
unit(f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,f32,i32) test_face = fn(p,v,f, a0,av,alo,ahi, b0,bv,blo,bhi,d,k){
    f32 t=(f-p)/v;
    if(t>=0.0 && t<=d && t<contact_t && between(a0+av*t,alo,ahi) && between(b0+bv*t,blo,bhi)){
        contact_t=t;contact_axis=k;contact_face=f;
    };
};
unit(f32,f32,f32,f32,f32,f32,f32) collide_box = fn(x0,x1,y0,y1,z0,z1,d){
    if(trace_vx>0.0 && trace_x<=x0){test_face(trace_x,trace_vx,x0,trace_y,trace_vy,y0,y1,trace_z,trace_vz,z0,z1,d,1);};
    if(trace_vx<0.0 && trace_x>=x1){test_face(trace_x,trace_vx,x1,trace_y,trace_vy,y0,y1,trace_z,trace_vz,z0,z1,d,1);};
    if(trace_vy>0.0 && trace_y<=y0){test_face(trace_y,trace_vy,y0,trace_x,trace_vx,x0,x1,trace_z,trace_vz,z0,z1,d,2);};
    if(trace_vy<0.0 && trace_y>=y1){test_face(trace_y,trace_vy,y1,trace_x,trace_vx,x0,x1,trace_z,trace_vz,z0,z1,d,2);};
    if(trace_vz>0.0 && trace_z<=z0){test_face(trace_z,trace_vz,z0,trace_x,trace_vx,x0,x1,trace_y,trace_vy,y0,y1,d,3);};
    if(trace_vz<0.0 && trace_z>=z1){test_face(trace_z,trace_vz,z1,trace_x,trace_vx,x0,x1,trace_y,trace_vy,y0,y1,d,3);};
};

f32 hull_nx=0.0;f32 hull_ny=0.0;f32 hull_nz=0.0;
f32 hit_enter=0.0;f32 hit_exit=0.0;
f32 hit_nx=0.0;f32 hit_ny=0.0;f32 hit_nz=0.0;
f32 piece_hx=0.0;f32 piece_hy=0.0;f32 piece_hz=0.0;
unit(f32,f32,f32,f32) hull_plane=fn(u,v,w,bound){
    f32 norm=core.float_trunc<f32>(scaled_root(core.float_extend<f64>(u*u+v*v+w*w),1.0));
    i32 a=hull_piece.axis;
    f32 x=station.xx(a,u,w);f32 y=station.yy(a,u,v,w);f32 z=station.zz(a,u,v,w);
    f32 gap=bound+0.18*norm-(x*piece_hx+y*piece_hy+z*piece_hz);
    f32 speed=x*trace_vx+y*trace_vy+z*trace_vz;
    if(speed< -0.0000001){
        f32 t=gap/speed;
        if(t>hit_enter){hit_enter=t;hit_nx=x/norm;hit_ny=y/norm;hit_nz=z/norm;};
    }else{if(speed>0.0000001){
        f32 t=gap/speed;if(t<hit_exit){hit_exit=t;};
    }else{if(gap<0.0){hit_exit= -1.0;};};};
};
unit(f32,f32,f32,f32,f32,f32,f32) hull_part_hit=fn(d,ax,ay,az,bx,by,bz){
    i32 a=hull_piece.axis;f32 half=hull_piece.l*0.5;
    f32 x=hull_piece.x;f32 y=hull_piece.y;f32 z=hull_piece.z;
    f32 cx=x+station.xx(a,0.0,half);f32 cy=y+station.yy(a,0.0,0.0,half);f32 cz=z+station.zz(a,0.0,0.0,half);
    f32 t=if(hull_piece.taper>1.0){hull_piece.taper}else{1.0};
    f32 u=hull_piece.u*t;f32 v=hull_piece.v*t;
    f32 ex=abs_cell(station.xx(a,u,0.0))+abs_cell(station.xx(a,0.0,0.0))+abs_cell(station.xx(a,0.0,half))+0.24;
    f32 ey=abs_cell(station.yy(a,u,0.0,0.0))+abs_cell(station.yy(a,0.0,v,0.0))+abs_cell(station.yy(a,0.0,0.0,half))+0.24;
    f32 ez=abs_cell(station.zz(a,u,0.0,0.0))+abs_cell(station.zz(a,0.0,v,0.0))+abs_cell(station.zz(a,0.0,0.0,half))+0.24;
    if(abs_cell(ax-cx)<=ex+bx && abs_cell(ay-cy)<=ey+by && abs_cell(az-cz)<=ez+bz){
        piece_hx=trace_x-x;piece_hy=trace_y-y;piece_hz=trace_z-z;hit_enter= -0.000001;hit_exit=d;
        f32 pu=1.0/hull_piece.u;f32 pv=1.0/hull_piece.v;f32 slope=(1.0-hull_piece.taper)/hull_piece.l;
        hull_plane(0.0,0.0,-1.0,0.0);hull_plane(0.0,0.0,1.0,hull_piece.l);
        hull_plane(pu,0.0,slope,1.0);hull_plane(-pu,0.0,slope,1.0);
        hull_plane(0.0,pv,slope,1.0);hull_plane(0.0,-pv,slope,1.0);
        if(hull_piece.section!=0){
            f32 a1=0.70710678*pu;f32 b1=0.70710678*pv;
            if(hull_piece.section==2){
            f32 ca=0.92387953*pu;f32 sa=0.38268343*pv;
            f32 cb=0.38268343*pu;f32 sb=0.92387953*pv;
            hull_plane(ca,sa,slope,1.0);hull_plane(-ca,sa,slope,1.0);hull_plane(ca,-sa,slope,1.0);hull_plane(-ca,-sa,slope,1.0);
            hull_plane(cb,sb,slope,1.0);hull_plane(-cb,sb,slope,1.0);hull_plane(cb,-sb,slope,1.0);hull_plane(-cb,-sb,slope,1.0);
            };
            hull_plane(a1,b1,slope,1.0);hull_plane(-a1,b1,slope,1.0);hull_plane(a1,-b1,slope,1.0);hull_plane(-a1,-b1,slope,1.0);
        };
        if(hit_enter>=0.0 && hit_enter<=hit_exit && hit_enter<contact_t){
            contact_t=hit_enter;contact_axis=4;hull_nx=hit_nx;hull_ny=hit_ny;hull_nz=hit_nz;
        };
    };
};
unit(i32,f32,f32,f32,f32,f32,f32,f32) hull_trace=fn(i,d,x,y,z,dx,dy,dz){if(i<station.total){
    hull_piece=station.at(i);hull_part_hit(d,x,y,z,dx,dy,dz);hull_trace(i+1,d,x,y,z,dx,dy,dz);
};};

unit(f32) exterior_surfaces = fn(d){
    contact_t=d+1.0;contact_axis=0;
    collide_box(-3.53,-1.37,-2.03,2.07,-13.2,2.00,d);
    collide_box(-1.39,-0.87,-1.02,1.01,-3.43,-1.73,d);
    collide_box(-1.69,-0.68,-1.32,-0.98,-3.47,-1.87,d);
    collide_box(-1.73,-0.76,1.48,1.98,-5.69,-1.81,d);
    collide_box(0.55,1.76,-0.92,0.41,-5.38,-4.68,d);
    collide_box(0.00,2.40,-1.01,1.19,-7.36,-6.34,d);
    collide_box(-0.83,0.52,-1.04,-0.29,-5.83,-5.18,d);
    f32 x=trace_vx*d*0.5;f32 y=trace_vy*d*0.5;f32 z=trace_vz*d*0.5;
    hull_trace(0,d,trace_x+x,trace_y+y,trace_z+z,abs_cell(x),abs_cell(y),abs_cell(z));
};
f32(f32,f32,f32,f32,f32,f32) camera_clip = fn(ax,ay,az,bx,by,bz){
    trace_x=ax;trace_y=ay;trace_z=az;
    trace_vx=bx-ax;trace_vy=by-ay;trace_vz=bz-az;
    exterior_surfaces(1.0);
    if(contact_axis!=0){limit(contact_t-0.04,0.0,1.0)}else{1.0}
};
unit(f32,i32) exterior_sweep = fn(d, budget){
    trace_x=pilot_x;trace_y=pilot_y;trace_z=pilot_z;
    trace_vx=vx;trace_vy=vy;trace_vz=vz;
    exterior_surfaces(d);
    f32 moved=if(contact_axis==0){d}else{contact_t};
    pilot_x=pilot_x+vx*moved;pilot_y=pilot_y+vy*moved;pilot_z=pilot_z+vz*moved;
    if(contact_axis!=0){
        wall_contact=true;
        if(contact_axis==1){pilot_x=contact_face;vx=0.0;};
        if(contact_axis==2){pilot_y=contact_face;vy=0.0;};
        if(contact_axis==3){pilot_z=contact_face;vz=0.0;};
        if(contact_axis==4){
            f32 normal=vx*hull_nx+vy*hull_ny+vz*hull_nz;
            vx=vx-normal*hull_nx;vy=vy-normal*hull_ny;vz=vz-normal*hull_nz;
            pilot_x=pilot_x+0.0001*hull_nx;pilot_y=pilot_y+0.0001*hull_ny;pilot_z=pilot_z+0.0001*hull_nz;
        };
        if(budget>0 && moved<d){exterior_sweep(d-moved,budget-1);};
    };
};
unit(f32) flight_move = fn(d){
    if(deck==1){exterior_sweep(d,2);}else{
        f32 nx=pilot_x+vx*d;f32 ny=pilot_y+vy*d;f32 nz=pilot_z+vz*d;
        pilot_x=limit(nx,-1.39,1.51);pilot_y=limit(ny,-1.09,1.02);pilot_z=limit(nz,-9.34,1.63);
        if(nx!=pilot_x){vx=0.0;wall_contact=true;};
        if(ny!=pilot_y){vy=0.0;wall_contact=true;};
        if(nz!=pilot_z){vz=0.0;wall_contact=true;};
    };
};
f32(i32,i32,i32) axis = fn(m,p,n) {(if((m&p)!=0){1.0}else{0.0})-(if((m&n)!=0){1.0}else{0.0})};
f64(f64,f64) inv_three = fn(q,h){if(q>4.0){inv_three(q*0.25,h*0.125)}else{
    f64 u=1.55-0.25*q;
    u=u*(1.5-0.5*q*u*u);u=u*(1.5-0.5*q*u*u);u=u*(1.5-0.5*q*u*u);
    u=u*(1.5-0.5*q*u*u);u=u*(1.5-0.5*q*u*u);u=u*(1.5-0.5*q*u*u);
    u=u*(1.5-0.5*q*u*u);u=u*(1.5-0.5*q*u*u);u=u*(1.5-0.5*q*u*u);
    h*u*u*u
}};
unit(f32) orbital_gravity = fn(d){
    f64 ox=core.float_extend<f64>(pilot_x)*0.0000001479071143321994;
    f64 oy=1.0+core.float_extend<f64>(pilot_y)*0.0000001479071143321994;
    f64 oz=core.float_extend<f64>(pilot_z)*0.0000001479071143321994;
    f64 radius_sq=ox*ox+oy*oy+oz*oz;
    f64 ratio=inv_three(radius_sq,1.0);
    f64 drift_d=core.float_extend<f64>(d);
    f64 gy=8.719988332817303*(1.0-ratio)*oy-0.002271341727981462*core.float_extend<f64>(vz);
    f64 gz=8.719988332817303*(1.0-ratio)*oz+0.002271341727981462*core.float_extend<f64>(vy);
    vx=vx+core.float_trunc<f32>(-8.719988332817303*ratio*ox*drift_d);
    vy=vy+core.float_trunc<f32>(gy*drift_d);
    vz=vz+core.float_trunc<f32>(gz*drift_d);
};
f64(f64,f64) scaled_root = fn(q,scale){if(q==0.0){0.0}else{if(q<0.25){scaled_root(q*4.0,scale*0.5)}else{if(q>4.0){scaled_root(q*0.25,scale*2.0)}else{
    f64 root=(q+1.0)*0.5;
    root=(root+q/root)*0.5;root=(root+q/root)*0.5;root=(root+q/root)*0.5;
    root=(root+q/root)*0.5;root=(root+q/root)*0.5;
    root*scale
}}}};
unit() measure_altitude = fn {
    f64 rx=core.float_extend<f64>(pilot_x);
    f64 ry=6761000.0+core.float_extend<f64>(pilot_y);
    f64 rz=core.float_extend<f64>(pilot_z);
    f64 q=(rx*rx+ry*ry+rz*rz)*0.000000000000021876514470;
    f64 radius_now=scaled_root(q,6761000.0);
    orbit_altitude=core.float_trunc<f32>(radius_now-6371000.0);
    if(orbit_altitude<=120000.0){atmosphere=true;orbit_warp=1.0;};
};
unit() reset = fn {
    pilot_x=0.0; pilot_y=0.0; pilot_z=0.37;vx=0.0;vy=0.0;vz=0.0;yaw=if(deck==0){0.13}else{-0.03};pitch=if(deck==0){-0.035}else{-0.095};timer=0.0;
    if(reentry_exercise){
        pilot_y=-130000.0;vz=-176.55786;pitch=-0.40;yaw=-0.25;
    };
    delta_v=20.0;orbital_seconds=0.0;set_rotator(0.0,0.0);
    atmosphere=false;orbit_altitude=if(reentry_exercise){260000.0}else{390000.0};orbit_warp=1.0;body_yaw=yaw;body_pitch=pitch;hold_yaw=yaw;hold_pitch=pitch;set_thrust(0.0,0.0);thrust_x=0.0;thrust_y=0.0;thrust_z=0.0;wall_contact=false;
    mode=0;mark=0;grip=0.0;reach=0.0;carry=0.0;latch=0;station_leg=0;
    if(cargo_locked||lock_pose>0){cargo_locked=false;ready=false;};
    lock_kind=0;lock_pose=0;lock_clock=0.0;
    alignment_stage=0;seat_clock=0.0;seat_pose=0;transfer_clock=0.0;transfer_pose=0;
};
unit(i32) select_deck = fn(which){
    i32 choice=if(which==1){1}else{0};
    if(deck!=choice){deck=choice;ready=false;};
    reentry_exercise=false;reset();
};
unit() select_reentry = fn {
    if(deck!=1){deck=1;ready=false;};
    reentry_exercise=true;reset();
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
    f32 px=pilot_x-0.23+(arm_x()-pilot_x+0.23)*grip;
    f32 py=pilot_y-0.40+(arm_y()-pilot_y+0.40)*grip;
    f32 pz=pilot_z-0.80+(arm_z()-pilot_z+0.80)*grip;
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
hud.Cargo cargo_phase=hud.Cargo::rails;
hud.Steering steer_cue=hud.Steering::none;
i32() hud_code = fn{
    hud.Motion motion=hud.flight(mode);
    bool far=pilot_x*pilot_x+pilot_y*pilot_y+pilot_z*pilot_z>22500.0;
    bool burn=thrust_x*thrust_x+thrust_y*thrust_y+thrust_z*thrust_z>0.0001;
    i32 opposite=0;
    if(steer_cue==hud.Steering::slow_rail||steer_cue==hud.Steering::counterthrust){
        f32 sy=sine(yaw);f32 cy=cosine(yaw);f32 sp=sine(pitch);f32 cp=cosine(pitch);
        f32 forward=sy*vx-cy*vz;
        opposite=hud.counter(vx*cy+vz*sy,forward*cp+vy*sp,vy*cp-forward*sp);
    };
    hud.packet(motion,cargo_phase,deck==1,cargo_locked,reach==1.0,reentry_exercise,atmosphere,far,delta_v==0.0,
               burn,orbit_warp>1.0,station_leg,mark,steer_cue,opposite)
};
unit(f32,i32,f32,f32) tick = fn(dt,keys,look_x,look_y) {
    if(!ready){if(deck==0){draw();}else{eva_room();};ready=true;};
    f32 d=limit(dt,0.0,0.032);
    f32 bind=if(mode==2){1.0}else{if(mode==3){grip}else{0.0}};
    f32 yaw_limit=0.94-0.57*bind;
    f32 pitch_limit=0.60-0.31*bind;
    if(mode!=1){
        f32 dyaw=limit(wrap_yaw(yaw-body_yaw)+limit(look_x,-1.65,1.65),-yaw_limit,yaw_limit);
        f32 target=wrap_yaw(body_yaw+dyaw);
        f32 target_pitch=limit(pitch+look_y,body_pitch-pitch_limit,body_pitch+pitch_limit);
        if(mode==2){
            target=wrap_yaw(hold_yaw+limit(wrap_yaw(target-hold_yaw),-0.42,0.42));
            target_pitch=limit(target_pitch,hold_pitch-0.32,hold_pitch+0.32);
        };
        yaw=target;pitch=limit(target_pitch,-1.48,1.48);
    };
    f32 ax=limit(axis(keys,2,1)+stick_x,-1.0,1.0);
    f32 forward=limit(axis(keys,4,8)+stick_forward,-1.0,1.0);
    f32 ay=axis(keys,16,32);
    f32 command_sq=ax*ax+forward*forward+ay*ay;
    f32 diag=if(command_sq>1.0){1.0/core.float_trunc<f32>(scaled_root(core.float_extend<f64>(command_sq),1.0))}else{1.0};
    thrust_x=0.0;thrust_y=0.0;thrust_z=0.0;wall_contact=false;
    orbit_warp=1.0;
    if((mode==0 || mode==3) && !atmosphere){
        thrust_x=diag*(ax*cosine(yaw)+forward*sine(yaw)*cosine(pitch));
        thrust_y=diag*(ay+forward*sine(pitch));
        thrust_z=diag*(ax*sine(yaw)-forward*cosine(yaw)*cosine(pitch));
        f32 power=if((keys&256)!=0){0.42}else{1.52};
        if(deck==1){
            if((keys&512)!=0 && ax==0.0 && forward==0.0 && ay==0.0 && pilot_x*pilot_x+pilot_y*pilot_y+pilot_z*pilot_z>22500.0){orbit_warp=120.0;};
            orbital_gravity(d*orbit_warp);
        };
        f32 effort_sq=thrust_x*thrust_x+thrust_y*thrust_y+thrust_z*thrust_z;
        f32 demand=core.float_trunc<f32>(scaled_root(core.float_extend<f64>(effort_sq),1.0))*power*d;
        f32 available=if(demand>delta_v && deck==1){delta_v/demand}else{1.0};
        if(deck==1){delta_v=limit(delta_v-demand,0.0,20.0);};
        thrust_x=thrust_x*power*available;thrust_y=thrust_y*power*available;thrust_z=thrust_z*power*available;
        vx=vx+d*thrust_x;vy=vy+d*thrust_y;vz=vz+d*thrust_z;
        flight_move(d*orbit_warp);
        if(deck==1){orbital_seconds=orbital_seconds+core.float_extend<f64>(d*orbit_warp);measure_altitude();};
    }else{
        if(deck==1 && !atmosphere){orbital_seconds=orbital_seconds+core.float_extend<f64>(d);};
    };
    bool for_hatch=deck==1 && alignment_stage>=5;
    bool for_alignment=deck==1 && alignment_stage>=1 && !for_hatch;
    f32 dock_x=if(for_hatch){-0.39}else{if(for_alignment){1.04}else{if(deck==0){0.12}else{0.05}}};
    f32 dock_y=if(deck==0){-0.04}else{-0.025};
    f32 dock_z=if(for_hatch){-1.86}else{if(for_alignment){-4.08}else{if(deck==0){-1.26}else{rail_depth(station_leg)+0.71}}};
    f32 reach_limit=if(deck==1 && reach==1.0){0.55}else{0.37};
    f32 distance_sq=(pilot_x-dock_x)*(pilot_x-dock_x)+(pilot_y-dock_y)*(pilot_y-dock_y)+(pilot_z-dock_z)*(pilot_z-dock_z);
    f32 speed_sq=vx*vx+vy*vy+vz*vz;
    bool nearby=distance_sq<reach_limit;
    f32 sight_x=(if(for_hatch){-0.94}else{if(for_alignment){1.255}else{dock_x}})-pilot_x;
    f32 sight_z=pilot_z-(if(for_hatch){-2.48}else{if(for_alignment){-4.864}else{dock_z-0.72}});
    f32 sight_y=(if(for_hatch){-0.14}else{if(for_alignment){-0.260}else{dock_y-0.21}})-pilot_y;
    f32 ahead=sight_x*sine(yaw)+sight_z*cosine(yaw);
    f32 lateral=sight_x*cosine(yaw)-sight_z*sine(yaw);
    f32 vertical=sight_y*cosine(pitch)-ahead*sine(pitch);
    f32 side_error=lateral*lateral;
    f32 height_error=vertical*vertical;
    hud.Steering aim_hint=if(ahead<=0.0 || side_error>=height_error){if(lateral>=0.0){hud.Steering::right}else{hud.Steering::left}}
        else{if(vertical>=0.0){hud.Steering::up}else{hud.Steering::down}};
    hud.Steering travel_hint=hud.Steering::none;
    if(for_alignment || for_hatch){nearby=distance_sq<0.18;};
    if(for_hatch && !nearby && (ahead<=0.0 || side_error>ahead*ahead*0.41)){travel_hint=if(lateral>=0.0){hud.Steering::hatch_right}else{hud.Steering::hatch_left};};
    bool aligned=ahead>0.0 && side_error<ahead*ahead*(if(for_alignment || for_hatch){0.105}else{0.49}) && height_error<ahead*ahead*(if(for_alignment || for_hatch){0.13}else{0.50});
    bool slow=speed_sq<(if(for_alignment || for_hatch){0.063}else{2.25});
    reach=if(nearby&&aligned&&slow){1.0}else{0.0};
    if((keys&64)!=0 && latch==0){
        if(mode==0 && reach==1.0 && !atmosphere){mode=1;mark=1;timer=0.0;carry=pilot_x;carry_y=pilot_y;carry_z=pilot_z;dock_yaw=yaw;dock_pitch=pitch;dock_vx=vx;dock_vy=vy;dock_vz=vz;};
        if(mode==2){
            if(deck==1 && station_leg==2){
                if(!cargo_locked){if(lock_kind==0){lock_kind=1;lock_clock=0.001;};}
                else{if(alignment_stage==0){mode=3;mark=2;vx=0.36;vz=0.035;}
                else{if(alignment_stage==2 && seat_clock==0.0){seat_clock=0.001;}
                else{if(alignment_stage==3 && transfer_clock==0.0){transfer_clock=0.001;}
                else{if(alignment_stage==6){if(lock_kind==0){lock_kind=2;lock_clock=0.001;};}
                else{if(alignment_stage==4){mode=3;mark=2;vx=-0.49;vz=0.76;};};};};};};
            }else{
                mode=3;mark=2;
                vz=if(deck==0){-0.19}else{-0.43};
            };
        };
    };
    latch=if((keys&64)!=0){1}else{0};
    if(lock_kind>0){
        lock_clock=lock_clock+d;
        if(lock_clock>=core.sint_to_float<f32>(lock_pose+1)*0.065){
            lock_pose=lock_pose+1;
            if(lock_pose==4){
                if(lock_kind==1){cargo_locked=true;mark=2;}else{alignment_stage=7;};
                lock_kind=0;lock_pose=0;lock_clock=0.0;
            };
            mesh_grip=-1.0;eva_room();
        };
    };
    if(seat_clock>0.0){
        seat_clock=seat_clock+d;
        if(seat_clock>=core.sint_to_float<f32>(seat_pose+1)*0.08){
            seat_pose=seat_pose+1;
            if(seat_pose==6){seat_clock=0.0;alignment_stage=3;};
            mesh_grip=-1.0;eva_room();
        };
    };
    if(transfer_clock>0.0){
        transfer_clock=transfer_clock+d;
        if(transfer_clock>=core.sint_to_float<f32>(transfer_pose+1)*0.085){
            transfer_pose=transfer_pose+1;
            if(transfer_pose==6){transfer_clock=0.0;alignment_stage=4;};
            mesh_grip=-1.0;eva_room();
        };
    };
    if(mode==1){
        timer=limit(timer+d*2.85,0.0,1.0);
        grip=timer*timer*(3.0-2.0*timer);
        f32 end_heading=if(for_hatch){-0.76}else{if(for_alignment){0.30}else{if(deck==0){0.60}else{if(station_leg==2){-0.015}else{if(station_leg==1){0.13}else{-0.105}}}}};
        f32 end_pitch=if(for_hatch){-0.15}else{if(for_alignment){-0.34}else{if(deck==0){-0.20}else{if(station_leg==2){-0.285}else{if(station_leg==1){-0.13}else{-0.30}}}}};
        yaw=wrap_yaw(dock_yaw+wrap_yaw(end_heading-dock_yaw)*grip);pitch=dock_pitch+(end_pitch-dock_pitch)*grip;
        f32 keep=(1.0-timer);f32 tangent=timer*keep*keep/2.85;
        f32 slope=6.0*timer*keep*2.85;f32 tangent_speed=keep*(1.0-3.0*timer);
        pilot_x=carry+(dock_x-carry)*grip+dock_vx*tangent;pilot_y=carry_y+(dock_y-carry_y)*grip+dock_vy*tangent;pilot_z=carry_z+(dock_z-carry_z)*grip+dock_vz*tangent;
        vx=(dock_x-carry)*slope+dock_vx*tangent_speed;
        vy=(dock_y-carry_y)*slope+dock_vy*tangent_speed;
        vz=(dock_z-carry_z)*slope+dock_vz*tangent_speed;
        if(timer>=1.0){mode=2;hold_yaw=yaw;hold_pitch=pitch;pilot_x=dock_x;pilot_y=dock_y;pilot_z=dock_z;vx=0.0;vy=0.0;vz=0.0;if(for_hatch){alignment_stage=6;}else{if(for_alignment){alignment_stage=2;};};};
    };
    if(mode==3){
        grip=limit(grip-d*(if(deck==0){3.5}else{2.8}),0.0,1.0);
        if(grip==0.0){
            mode=0;
            if(deck==1 && station_leg<2){station_leg=station_leg+1;mark=0;reach=0.0;};
            if(deck==1 && cargo_locked && alignment_stage==0){alignment_stage=1;reach=0.0;};
            if(deck==1 && alignment_stage==4){alignment_stage=5;reach=0.0;};
        };
    };
    state[0]=pilot_x; state[1]=pilot_y; state[2]=pilot_z; state[3]=yaw; state[4]=pitch; state[5]=vx; state[6]=vy; state[7]=vz; state[8]=grip; state[9]=core.sint_to_float<f32>(mode); state[10]=reach; state[11]=core.sint_to_float<f32>(mark); state[12]=if(deck==0){0.745}else{pilot_x-0.23+(arm_x()-pilot_x+0.23)*grip};
    state[13]=if(deck==0){-0.21}else{pilot_y-0.40+(arm_y()-pilot_y+0.40)*grip};
    state[14]=if(deck==0){-1.94}else{pilot_z-0.80+(arm_z()-pilot_z+0.80)*grip}; state[15]=core.sint_to_float<f32>(deck);
    state[16]=core.sint_to_float<f32>(station_leg); state[17]=if(cargo_locked){1.0}else{0.0};
    steer_cue=hud.Steering::none;
    if(deck==1 && mode==0 && (alignment_stage<5 || for_hatch)){
        if(distance_sq<0.73 && !aligned){steer_cue=hud.Steering::face_rail;};
        if(distance_sq<0.94 && aligned && speed_sq>2.25){steer_cue=hud.Steering::slow_rail;};
        if(for_alignment || for_hatch){
            steer_cue=travel_hint;
            if(nearby && !slow){steer_cue=hud.Steering::counterthrust;};
            if(nearby && slow && !aligned){steer_cue=aim_hint;};
        };
    };
    state[18]=hud.guidance_code(steer_cue);
    cargo_phase=hud.cargo(alignment_stage,lock_kind,seat_clock,transfer_clock,transfer_pose);
    state[19]=hud.telemetry_stage(cargo_phase,alignment_stage);
    if((deck==0||!external_arm) && (mesh_x!=pilot_x || mesh_y!=pilot_y || mesh_z!=pilot_z || mesh_grip!=grip || mesh_deck!=deck)){
        if(deck==0){glove();}else{eva_glove();};
        mesh_x=pilot_x;mesh_y=pilot_y;mesh_z=pilot_z;mesh_grip=grip;mesh_deck=deck;
    };
    state[20]=0.0;
    if(deck==1 && mode==0 && !reentry_exercise && !atmosphere){
        state[20]=if(alignment_stage==5){5.0}else{if(alignment_stage==1){4.0}else{if(alignment_stage==0){1.0+core.sint_to_float<f32>(station_leg)}else{0.0}}};
    };
    f32 hold_blend=if(mode==2){1.0}else{if(mode==3){grip}else{0.0}};
    f32 lean_yaw=wrap_yaw(hold_yaw+limit(wrap_yaw(yaw-hold_yaw)*0.20,-0.095,0.095));
    f32 lean_pitch=hold_pitch+limit((pitch-hold_pitch)*0.18,-0.061,0.061);
    f32 body_goal=wrap_yaw(yaw+wrap_yaw(lean_yaw-yaw)*hold_blend);
    f32 pitch_goal=pitch+(lean_pitch-pitch)*hold_blend;
    f32 yaw_rate=0.88-hold_blend*0.51;
    f32 pitch_rate=0.72-hold_blend*0.39;
    body_yaw=wrap_yaw(body_yaw+d*limit(wrap_yaw(body_goal-body_yaw)*3.0,-yaw_rate,yaw_rate));
    body_pitch=body_pitch+d*limit((pitch_goal-body_pitch)*3.0,-pitch_rate,pitch_rate);
    if(mode==1 || mode==2 && bind==0.0){
        f32 settle_yaw=0.94-0.84*grip;
        f32 settle_pitch=0.60-0.52*grip;
        body_yaw=wrap_yaw(yaw-limit(wrap_yaw(yaw-body_yaw),-settle_yaw,settle_yaw));
        body_pitch=pitch-limit(pitch-body_pitch,-settle_pitch,settle_pitch);
    }else{
        f32 safe_yaw=0.94-0.57*hold_blend;
        f32 safe_pitch=0.60-0.31*hold_blend;
        yaw=wrap_yaw(body_yaw+limit(wrap_yaw(yaw-body_yaw),-safe_yaw,safe_yaw));
        pitch=limit(pitch,body_pitch-safe_pitch,body_pitch+safe_pitch);
    };
    state[3]=yaw;state[4]=pitch;
    state[21]=body_yaw;state[22]=body_pitch;
    state[23]=thrust_x;state[24]=thrust_y;state[25]=thrust_z;
    state[26]=if(wall_contact){1.0}else{0.0};
    state[27]=speed_sq;state[28]=orbit_altitude;
    state[29]=if(atmosphere){1.0}else{0.0};state[30]=orbit_warp;
    state[31]=delta_v;state[32]=if(reentry_exercise){1.0}else{0.0};
    state[33]=if(mode==0 || mode==3){ax}else{0.0};state[34]=if(mode==0 || mode==3){forward}else{0.0};
    state[35]=if(mode==1){0.0}else{rotation_x};state[36]=if(mode==1){0.0}else{rotation_y};
    state[37]=core.float_trunc<f32>(orbital_seconds);
    unsafe {host.frame(core.pointer_cast<*?u8>(&?state[0]),38);};
};
%%end
