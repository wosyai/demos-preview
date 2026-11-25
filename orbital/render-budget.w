%%start
bridge = extern wasm "orbital" { unsafe unit(*?u8,i32) render_budget; };
math = namespace orbital "presentation.w";
f64 fraction=1.0;
i32 slow=0;
i32 fast=0;
i32 still=0;
bool bootstrapped=false;
f64[3] raster=[1.0,1.0,1.0];
unit(f64,bool,bool,bool) adapt=fn(period,full,software,moving){
    if(period>0.0){
        if(!bootstrapped){
            if(software){fraction=0.65;};
            bootstrapped=true;
        };
        if(full){still=0;}else{if(moving){
            still=0;
            if(period>90.0){slow=slow+4;fast=0;}else{if(period>28.0){slow=slow+1;fast=0;}else{if(period<19.0){
                fast=fast+1;if(slow>0){slow=slow-1;};
            };};};
            if(slow>=7){fraction=math.clamp(fraction*0.79,0.45,1.0);slow=0;};
            if(fast>=120){fraction=math.clamp(fraction*1.08,0.45,1.0);fast=0;};
        }else{if(still<=14){still=still+1;};};};
    };
};
unit(f64,f64,f64,bool,bool) plan=fn(w,h,dpr,full,software){
    f64 cap=if(full){1.65}else{1.55};
    f64 pixels=if(full){2750000.0}else{if(software){1100000.0}else{2100000.0}};
    f64 area=w*h;
    f64 max_fit=if(area>0.0){math.root_scaled(pixels/area,1.0)}else{cap};
    f64 limit=if(max_fit<cap){max_fit}else{cap};
    f64 current=if(full||still>14){1.0}else{fraction};
    f64 scale=math.clamp(dpr,0.0,limit)*current;
    f64 rw=core.sint_to_float<f64>(core.float_to_sint_trunc<i32>(w*scale+0.5));
    f64 rh=core.sint_to_float<f64>(core.float_to_sint_trunc<i32>(h*scale+0.5));
    raster[0]=if(rw<1.0){1.0}else{rw};raster[1]=if(rh<1.0){1.0}else{rh};
    raster[2]=current;
    unsafe {bridge.render_budget(core.pointer_cast<*?u8>(&?raster[0]),3);};
};
i32(bool,bool,bool,i32) shadow=fn(full,hardware,coarse,maximum){
    bool rich=full&&hardware;
    i32 goal=if(rich){if(coarse){2048}else{3584}}else{if(coarse){1024}else{1536}};
    i32 width=if(maximum<goal){maximum}else{goal};
    width*2+(if(rich){1}else{0})
};
%%end
