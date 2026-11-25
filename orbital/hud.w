%%start
enum Motion { floating; taking; held; pushing; }
enum Cargo { rails; pin; approach; aligning; lowering; seated; closing; opening; parking; delivered; return_hatch; handle; locking; complete; }
enum Steering { none; face_rail; slow_rail; counterthrust; right; left; up; down; hatch_right; hatch_left; ease_hatch; ease_console; }
f32(Steering) guidance_code=fn(steering){
    f32 wire=0.0;
    if(steering==Steering::face_rail){wire=1.0;};
    if(steering==Steering::slow_rail){wire=2.0;};
    if(steering==Steering::counterthrust){wire=3.0;};
    if(steering==Steering::right){wire=4.0;};
    if(steering==Steering::left){wire=5.0;};
    if(steering==Steering::up){wire=6.0;};
    if(steering==Steering::down){wire=7.0;};
    if(steering==Steering::hatch_right){wire=8.0;};
    if(steering==Steering::hatch_left){wire=9.0;};
    if(steering==Steering::ease_hatch){wire=10.0;};
    if(steering==Steering::ease_console){wire=11.0;};
    wire
};

Motion(i32) flight=fn(mode){
    if(mode==0){Motion::floating}else{if(mode==1){Motion::taking}else{if(mode==2){Motion::held}else{Motion::pushing}}}
};
Cargo(i32,i32,f32,f32,i32) cargo=fn(alignment,lock_kind,seat_clock,transfer_clock,transfer_pose){
    Cargo stage=Cargo::rails;
    if(alignment==1){stage=Cargo::approach;};
    if(alignment==2){stage=Cargo::aligning;};
    if(alignment==3){stage=Cargo::seated;};
    if(alignment==4){stage=Cargo::delivered;};
    if(alignment==5){stage=Cargo::return_hatch;};
    if(alignment==6){stage=Cargo::handle;};
    if(alignment==7){stage=Cargo::complete;};
    if(transfer_clock>0.0){stage=if(transfer_pose<3){Cargo::closing}else{if(transfer_pose<6){Cargo::opening}else{Cargo::parking}};};
    if(seat_clock>0.0){stage=Cargo::lowering;};
    if(lock_kind==2){stage=Cargo::locking;};
    if(lock_kind==1){stage=Cargo::pin;};
    stage
};
f32(Cargo,i32) telemetry_stage=fn(stage,alignment){
    f32 wire=core.sint_to_float<f32>(alignment);
    if(stage==Cargo::pin){wire=0.5;};
    if(stage==Cargo::lowering){wire=2.5;};
    if(stage==Cargo::closing){wire=3.25;};
    if(stage==Cargo::opening){wire=3.5;};
    if(stage==Cargo::parking){wire=3.75;};
    if(stage==Cargo::locking){wire=6.5;};
    wire
};
i32(Motion,bool,Steering) rail=fn(motion,reach,cue){
    i32 message=0;
    if(motion==Motion::pushing){message=1;}
    else{if(motion==Motion::held){message=2;}
    else{if(motion==Motion::taking){message=3;}
    else{if(reach){message=4;}else{
        if(cue==Steering::face_rail){message=5;};
        if(cue==Steering::slow_rail){message=6;};
    };};};};
    message
};
bool(Steering) aim_to_target=fn(cue){cue==Steering::right||cue==Steering::left||cue==Steering::up||cue==Steering::down};
i32(Motion,Cargo,bool,bool,Steering,i32) outside=fn(motion,stage,locked,reach,cue,leg){
    i32 message=rail(motion,reach,cue);
    if(!locked){
        if(message==2 && leg==2){message=7;};
        if(stage==Cargo::pin){message=8;};
    }else{
        message=9;
        if(motion==Motion::pushing){message=10;};
        if(stage==Cargo::approach && motion!=Motion::pushing){
            message=11;
            if(motion==Motion::taking){message=12;}
            else{if(reach){message=13;}
            else{if(cue==Steering::counterthrust){message=14;}
            else{if(aim_to_target(cue)){message=15;}else{if(cue==Steering::ease_console){message=45;};};};};};
        };
        if(stage==Cargo::aligning){message=16;};
        if(stage==Cargo::lowering){message=17;};
        if(stage==Cargo::seated){message=18;};
        if(stage==Cargo::closing){message=19;};
        if(stage==Cargo::opening){message=20;};
        if(stage==Cargo::parking){message=41;};
        if(stage==Cargo::delivered){message=if(motion==Motion::pushing){22}else{21};};
        if(stage==Cargo::return_hatch){
            message=if(cue==Steering::hatch_right){23}else{if(cue==Steering::hatch_left){24}else{22}};
            if(motion==Motion::taking){message=25;}
            else{if(reach){message=26;}
            else{if(cue==Steering::counterthrust){message=27;}
            else{if(aim_to_target(cue)){message=28;}else{if(cue==Steering::ease_hatch){message=44;};};};};};
        };
        if(stage==Cargo::handle){message=29;};
        if(stage==Cargo::locking){message=30;};
        if(stage==Cargo::complete){message=31;};
    };
    message
};
i32(Motion,bool,i32) training=fn(motion,reach,mark){
    i32 message=32;
    if(reach){message=33;};
    if(motion==Motion::taking){message=34;};
    if(motion==Motion::held){message=35;};
    if(mark==2){message=36;};
    message
};
i32(bool) flag=fn(value){if(value){1}else{0}};
f32(f32) abs=fn(value){if(value<0.0){-value}else{value}};
i32(f32,f32,f32) counter=fn(right,ahead,up){
    f32 u=abs(up);f32 a=abs(ahead);f32 r=abs(right);
    f32 max_horizontal=if(a>r){a}else{r};
    f32 minimum=max_horizontal*0.45;
    if(u>max_horizontal*0.95){
        if(up>0.0){1}else{2}
    }else{
        (if(a>minimum){if(ahead>0.0){4}else{8}}else{0})+
        (if(r>minimum){if(right>0.0){16}else{32}}else{0})
    }
};
i32(Motion,Cargo,bool,bool,bool,bool,bool,bool,bool,bool,bool,i32,i32,Steering,i32) packet=
fn(motion,stage,eva,locked,reach,reentry,entry,far,depleted,burn,warping,leg,mark,cue,opposite){
    i32 message=if(eva){outside(motion,stage,locked,reach,cue,leg)}else{training(motion,reach,mark)};
    i32 aim=0;bool hatch=false;
    if(message==15||message==28){aim=core.float_to_sint_trunc<i32>(guidance_code(cue));};
    if(message==23||message==24){aim=if(cue==Steering::hatch_right){4}else{5};hatch=stage==Cargo::return_hatch;};
    if(reentry){message=37;};
    if(far&&eva&&!reentry){message=if(warping){39}else{38};};
    if(entry){message=40;aim=0;hatch=false;};
    bool airlock=stage==Cargo::return_hatch||stage==Cargo::handle||stage==Cargo::locking||stage==Cargo::complete;
    bool console=eva&&motion==Motion::held&&stage!=Cargo::rails&&stage!=Cargo::pin&&stage!=Cargo::approach&&!airlock;
    bool animating=stage==Cargo::pin||stage==Cargo::lowering||stage==Cargo::closing||stage==Cargo::opening||stage==Cargo::parking||stage==Cargo::locking||stage==Cargo::complete;
    bool interact=!entry&&!far&&!animating&&(motion==Motion::held||(motion==Motion::floating&&reach));
    i32 section=if(reentry){6}else{if(eva){if(airlock){5}else{if(locked){4}else{leg+1}}}else{0}};
    message | (aim<<6) | (flag(hatch)<<9) | (flag(interact)<<10) | (flag(console)<<11) |
    (flag(far&&eva&&!entry)<<12) | (flag(far)<<13) | (flag(depleted&&eva&&!reentry&&motion==Motion::floating&&!entry&&!far)<<14) |
    (flag(burn)<<15) | (section<<16) | (opposite<<19)
};
enum CopyIntent { ordinary; counterthrust; arrival_pulse; empty_tank; }
i32(i32) copy_intent=fn(code){
    i32 message=code&63;
    CopyIntent intent=if((code&16384)!=0){CopyIntent::empty_tank}
        else{if(message==44||message==45){CopyIntent::arrival_pulse}
        else{if(message==6||message==14||message==27){CopyIntent::counterthrust}
        else{CopyIntent::ordinary}}};
    if(intent==CopyIntent::empty_tank){3}else{if(intent==CopyIntent::arrival_pulse){2}
    else{if(intent==CopyIntent::counterthrust){1}else{0}}}
};
%%end
