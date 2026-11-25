%%start
bridge = extern wasm "orbital" { unsafe unit(*?u8,i32) earth_tiles; };
math = namespace orbital "presentation.w";
f32[512] tally=[
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
    0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
];
i32[9] IDs=[-1,-1,-1,-1,-1,-1,-1,-1,-1];
f64[19] tiles=[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
f64 next_scan=0.0;
unit(u64) clear_tally=fn(i){
    if(i<512){tally[i]=0.0;clear_tally(i+1);};
};
unit(u64) clear_ids=fn(i){if(i<9){IDs[i]=-1;clear_ids(i+1);};};
u64(i32) slot_for=fn(id){core.int_extend<u64>((id%32)%3+3*((id/32)%3))};
f64(f64) frac=fn(x){f64 z=core.sint_to_float<f64>(core.float_to_sint_trunc<i32>(x));if(x<z){x-z+1.0}else{x-z}};
f64(f64) acos=fn(x){math.atan2(math.root_scaled(math.clamp(1.0-x*x,0.0,1.0),1.0),x)};
unit(i32,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64) sample=fn(i,X,Y,Z,radius,aa,bb,cc,ss,rot_c,rot_s,ox,oy,roll_c,roll_s){
    if(i<63){
        f64 sx=(core.sint_to_float<f64>(i%9)-4.0)*0.245;
        f64 sy=(core.sint_to_float<f64>(i/9)-3.0)*0.325;
        f64 px=sx/ox;f64 py=sy/oy;
        f64 xx=roll_c*px-roll_s*py;f64 yy=roll_s*px+roll_c*py;
        f64 R=1.0/math.norm(px,py,1.0);
        f64 vx=(aa*xx-bb*(ss*yy-cc))*R;f64 vy=(cc*yy+ss)*R;f64 vz=(bb*xx+aa*(ss*yy-cc))*R;
        f64 arc=X*vx+Y*vy+Z*vz;f64 d=arc*arc-(1.0-radius*radius);
        if(arc>=0.0&&d>0.0){
            f64 root=math.root_scaled(d,1.0);f64 t=arc-root;
            f64 nx=(t*vx-X)/radius;f64 ny=(t*vy-Y)/radius;f64 nz=(t*vz-Z)/radius;
            f64 p=0.56*nx-0.8285*ny;f64 h=0.8285*nx+0.56*ny;
            f64 lon=math.atan2(rot_c*p-rot_s*nz,-(rot_s*p+rot_c*nz))/6.283185307179586+0.46;
            i32 ix=core.float_to_sint_trunc<i32>(frac(lon)*32.0);
            i32 iy=core.float_to_sint_trunc<i32>(math.clamp(acos(math.clamp(h,-1.0,1.0))/3.141592653589793*16.0,0.0,15.0));
            u64 id=core.int_extend<u64>(iy*32+ix);
            f64 hit=(1.5-0.45*(sx*sx+sy*sy))*math.clamp(root*5.0,0.0,1.0);
            tally[id]=core.float_trunc<f32>(core.float_extend<f64>(tally[id])+hit);
        };
        sample(i+1,X,Y,Z,radius,aa,bb,cc,ss,rot_c,rot_s,ox,oy,roll_c,roll_s);
    };
};
unit(i32) rank=fn(id){
    if(id<512){
        u64 n=core.int_extend<u64>(id);
        if(tally[n]>0.0){
            u64 slot=slot_for(id);
            if(IDs[slot]<0){IDs[slot]=id;}else{if(tally[n]>tally[core.int_extend<u64>(IDs[slot])]){IDs[slot]=id;};};
        };
        rank(id+1);
    };
};
unit(u64) pack=fn(i){
    if(i<9){
        i32 id=IDs[i];
        tiles[1+i]=core.sint_to_float<f64>(id);
        tiles[10+i]=if(id>=0){core.float_extend<f64>(tally[core.int_extend<u64>(id)])}else{0.0};
        pack(i+1);
    };
};
bool(f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64) scan=fn(now,height,x,y,z,radius,spin,aa,bb,cc,ss,ox,oy,roll_c,roll_s){
    tiles[0]=10430.0/(height*oy);
    if(now<next_scan){false}else{
        next_scan=now+180.0;
        clear_tally(0);clear_ids(0);
        f64 mag=math.norm(x,y,z);
        sample(0,x/mag,y/mag,z/mag,radius,aa,bb,cc,ss,math.cos(spin),math.sin(spin),ox,oy,roll_c,roll_s);
        rank(0);pack(0);
        true
    }
};
unit() publish=fn{unsafe {bridge.earth_tiles(core.pointer_cast<*?u8>(&?tiles[0]),19);};};
i32(i32,i32,i32,f64) choose=fn(slot,mask,best,weight){
    if(slot==9){best}else{
        bool allowed=(mask&(1<<slot))!=0;
        u64 index=core.int_extend<u64>(slot);
        f64 score=tiles[10+index];
        if(allowed&&IDs[index]>=0&&score>weight){choose(slot+1,mask,slot,score)}
        else{choose(slot+1,mask,best,weight)}
    }
};
i32(i32,i32) request=fn(mask,in_flight){if(in_flight>=2){-1}else{choose(0,mask,-1,-1.0)}};
f64(f64) retry=fn(now){now+60000.0};
%%end
