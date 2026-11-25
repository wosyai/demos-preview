%%start
math = namespace orbital "presentation.w";
i32 physical=0;
bool queued=false;
bool pressed=false;
bool coasting=false;
bool seen=false;
f64 dx=0.0;
f64 dy=0.0;
f64 thrust_x=0.0; f64 thrust_y=0.0;
f64 head_x=0.0; f64 head_y=0.0;
i32(u64) binding=fn(physical_slot){
    i32[12] masks=[1,1,2,2,4,4,8,8,16,32,256,256];
    masks[physical_slot]
};
i32(i32,i32) logical=fn(i,mask){
    if(i<12){
        i32 b=if((physical&(1<<i))!=0){binding(core.int_extend<u64>(i))}else{0};
        logical(i+1,mask|b)
    }else{mask}
};
unit(i32,i32) key=fn(slot,held){
    if(slot>=0&&slot<12){
        i32 mask=1<<slot;
        if(held==0){physical=physical&(-1-mask);}else{physical=physical|mask;};
    };
};
unit(i32) action=fn(command){
    if(command==0){queued=true;};
    if(command==1){coasting=!coasting;};
    if(command==2){coasting=false;};
};
unit() clear=fn{
    physical=0;queued=false;pressed=false;coasting=false;dx=0.0;dy=0.0;
    thrust_x=0.0;thrust_y=0.0;head_x=0.0;head_y=0.0;
};
unit(i32) release=fn(zone){
    if(zone==0){thrust_x=0.0;thrust_y=0.0;}else{head_x=0.0;head_y=0.0;};
};
unit(f64,f64,i32) pointer=fn(x,y,touch){
    if(touch==1&&math.abs(x)+math.abs(y)>3.0){seen=true;};
    dx=dx+x*0.0033;dy=dy-y*0.0033;
};
unit(i32,f64,f64,f64) stick=fn(zone,width,dx0,dy0){
    f64 radius=math.clamp(width*0.105,32.0,48.0);
    f64 x=dx0/radius;f64 y=dy0/radius;
    f64 length=math.norm(x,y,0.0);
    f64 amount=math.clamp((length-0.10)/0.90,0.0,1.0);
    f64 x0=if(length==0.0){0.0}else{x/length*amount};
    f64 y0=if(length==0.0){0.0}else{y/length*amount};
    if(zone==0){thrust_x=x0;thrust_y=y0;}else{
        head_x=x0;head_y=y0;
        if(amount>0.08){seen=true;};
    };
};
i32() status=fn{
    (if(seen){1}else{0})|(if(coasting){2}else{0})|(if(dx!=0.0||dy!=0.0||head_x!=0.0||head_y!=0.0){4}else{0})
};
i32() command_mask=fn{
    i32 mask=logical(0,0);
    if((mask&63)!=0||math.norm(thrust_x,thrust_y,0.0)>0.01){coasting=false;};
    if(coasting){mask|512}else{mask}
};
i32() contact_pulse=fn{
    bool edge=queued&&!pressed;
    if(edge){queued=false;};
    pressed=edge;
    if(edge){64}else{0}
};
f64(i32) axis=fn(lane){
    if(lane==0){thrust_x}else{if(lane==1){-thrust_y}else{
    if(lane==2){math.clamp(dx/0.045+head_x,-1.0,1.0)}else{if(lane==3){math.clamp(dy/0.045-head_y,-1.0,1.0)}else{
    if(lane==4){dx+head_x*0.033}else{dy-head_y*0.027}}}}}
};
unit() consume_pointer=fn{dx=0.0;dy=0.0;};
%%end
