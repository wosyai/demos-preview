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
f32[8][16][16][16] mesh = page2;
f32[16] state = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
i32 count = 0;
f32 r = 0.0;
f32 g = 0.0;
f32 b = 0.0;
f32 lit = 0.0;
unit(f32,f32,f32,f32) paint = fn(red,green,blue,glow) { r=red; g=green; b=blue; lit=glow; };
unit(f32,f32,f32,f32) pt = fn(x,y,z,shade) {
    if (count<4096) {
        u64 a=core.int_extend<u64>(count/256); u64 j=core.int_extend<u64>((count/16)%16); u64 k=core.int_extend<u64>(count%16);
        mesh[a][j][k][0]=x;mesh[a][j][k][1]=y;mesh[a][j][k][2]=z;mesh[a][j][k][3]=r;mesh[a][j][k][4]=g;mesh[a][j][k][5]=b;mesh[a][j][k][6]=shade;mesh[a][j][k][7]=lit;
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
    unsafe { host.scenery(core.pointer_cast<*?u8>(&?mesh[0][0][0][0]),count*8); };
};

f32 pilot_x=0.0;f32 pilot_y=0.0;f32 pilot_z=0.37;
f32 vx=0.0;f32 vy=0.0;f32 vz=0.0;
f32 yaw=0.0;f32 pitch=0.0;f32 timer=0.0;
f32 grip=0.0; f32 reach=0.0; f32 carry=0.0;
f32 dock_yaw=0.0; f32 dock_pitch=0.0;
i32 mode=0;i32 mark=0;i32 latch=0;
bool ready=false;
f32(f32,f32,f32) limit = fn(a,b1,c) { if(a<b1){b1}else{if(a>c){c}else{a}} };
f32(f32) sine = fn(a){a*(1.0-a*a*(0.1666667-a*a*0.0083333))};
f32(f32) cosine = fn(a){1.0-a*a*(0.5-a*a*0.0416667)};
f32(i32,i32,i32) axis = fn(m,p,n) {if((m&p)!=0){1.0}else{if((m&n)!=0){-1.0}else{0.0}}};
unit() reset = fn {
    pilot_x=0.0; pilot_y=0.0; pilot_z=0.37;vx=0.0;vy=0.0;vz=0.0;yaw=0.13;pitch=-0.035;timer=0.0;
    mode=0;mark=0;grip=0.0;reach=0.0;carry=0.0;latch=0;
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
    unsafe { host.hands(core.pointer_cast<*?u8>(&?mesh[0][0][0][0]),count*8); };
};
unit(f32,i32,f32,f32) tick = fn(dt,keys,look_x,look_y) {
    if(!ready){draw();ready=true;};
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
        if(pilot_x< -1.39 || pilot_x>1.51){pilot_x=limit(pilot_x,-1.39,1.51);vx=0.0;};
        if(pilot_y< -1.09 || pilot_y>1.02){pilot_y=limit(pilot_y,-1.09,1.02);vy=0.0;};
        if(pilot_z< -9.34 || pilot_z>1.63){pilot_z=limit(pilot_z,-9.34,1.63);vz=0.0;};
    };
    bool nearby=(pilot_x-0.12)*(pilot_x-0.12)+(pilot_y+0.04)*(pilot_y+0.04)+(pilot_z+1.26)*(pilot_z+1.26)<0.37;
    bool aligned=yaw> -0.22 && yaw<0.80 && pitch> -0.61 && pitch<0.36;
    reach=if(nearby&&aligned){1.0}else{0.0};
    if((keys&64)!=0 && latch==0){
        if(mode==0 && reach==1.0){mode=1;mark=1;timer=0.0;carry=pilot_x;dock_yaw=yaw;dock_pitch=pitch;};
        if(mode==2){mode=3;mark=2;vz=-0.19;};
    };
    latch=if((keys&64)!=0){1}else{0};
    if(mode==1){
        timer=limit(timer+d*2.85,0.0,1.0);
        grip=timer*timer*(3.0-2.0*timer);
        yaw=dock_yaw+(0.60-dock_yaw)*grip;pitch=dock_pitch+(-0.20-dock_pitch)*grip;
        pilot_x=carry+(0.12-carry)*grip;pilot_y=pilot_y+(-0.04-pilot_y)*d*12.0;pilot_z=pilot_z+(-1.26-pilot_z)*d*12.0;
        vx=0.0;vy=0.0;vz=0.0;
        if(timer>=1.0){mode=2;pilot_y=-0.04;pilot_z=-1.26;};
    };
    if(mode==3){
        grip=limit(grip-d*3.5,0.0,1.0);
        if(grip==0.0){mode=0;};
    };
    state[0]=pilot_x; state[1]=pilot_y; state[2]=pilot_z; state[3]=yaw; state[4]=pitch; state[5]=vx; state[6]=vy; state[7]=vz; state[8]=grip; state[9]=core.sint_to_float<f32>(mode); state[10]=reach; state[11]=core.sint_to_float<f32>(mark); state[12]=0.745; state[13]=-0.21; state[14]=-1.94; state[15]=timer;
    glove();
    unsafe {host.frame(core.pointer_cast<*?u8>(&?state[0]),16);};
};
%%end
