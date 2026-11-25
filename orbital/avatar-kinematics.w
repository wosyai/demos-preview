%%start
math = namespace orbital "presentation.w";
bridge = extern wasm "orbital" { unsafe unit(*?u8,i32) avatar_rig; };
struct copy Vec { f64 x; f64 y; f64 z; }
struct copy Axes { Vec forward; Vec up; Vec right; }
struct copy Arm { Vec elbow; Vec wrist; f64 error; }
struct copy Grip { bool active; Vec center; f64 radius; f64 theta; Vec wrist; Vec inward; f64 progress; }
Vec(f64,f64,f64) v=fn(x,y,z){Vec value={.x=x;.y=y;.z=z;};value};
Vec(Vec,Vec) add=fn(a,b){v(a.x+b.x,a.y+b.y,a.z+b.z)};
Vec(Vec,Vec) sub=fn(a,b){v(a.x-b.x,a.y-b.y,a.z-b.z)};
Vec(Vec,f64) mul=fn(a,k){v(a.x*k,a.y*k,a.z*k)};
f64(Vec,Vec) dot=fn(a,b){a.x*b.x+a.y*b.y+a.z*b.z};
Vec(Vec,Vec) cross=fn(a,b){v(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x)};
f64(Vec) length=fn(a){math.norm(a.x,a.y,a.z)};
Vec(Vec) normalized=fn(a){f64 n=length(a);mul(a,if(n==0.0){1.0}else{1.0/n})};
Vec(Vec,Vec,f64) mix=fn(a,b,t){add(a,mul(sub(b,a),t))};
f64(f64) smooth=fn(x){f64 t=math.clamp(x,0.0,1.0);t*t*(3.0-2.0*t)};
Axes(f64,f64) facing=fn(yaw,pitch){
    f64 sy=math.sin(yaw);f64 cy=math.cos(yaw);f64 sp=math.sin(pitch);f64 cp=math.cos(pitch);
    Axes value={.forward=v(sy*cp,sp,-cy*cp);.up=v(-sy*sp,cp,cy*sp);.right=v(cy,0.0,sy);};value
};
Vec(Vec,f64,f64,f64) radial=fn(center,x,r,theta){add(center,v(x,r*math.cos(theta),r*math.sin(theta)))};
Grip(Vec,Vec,f64,f64,bool) grip=fn(eye,anchor,weight,stage,valid){
    bool active=valid&&weight>=0.004;
    if(active){
        Vec rest=sub(eye,v(0.23,0.40,0.80));
        Vec center=add(rest,mul(sub(anchor,rest),1.0/weight));
        f64 radius=if(stage>=5.0){0.082}else{0.087};f64 theta=if(stage>=5.0){0.61}else{0.365};
        Vec inward=v(0.0,math.sin(theta),-math.cos(theta));
        Vec knuckle=radial(center,0.023,radius+0.020,theta);
        Grip value={.active=true;.center=center;.radius=radius;.theta=theta;.wrist=sub(knuckle,mul(inward,0.066));.inward=inward;.progress=smooth((weight-0.69)/0.31);};value
    }else{
        Grip value={.active=false;.center=v(0.0,0.0,0.0);.radius=0.0;.theta=0.0;.wrist=v(0.0,0.0,0.0);.inward=v(0.0,0.0,0.0);.progress=0.0;};value
    }
};
Vec(Vec,Grip,f64,bool) approach=fn(rest,contact,weight,releasing){
    if(!contact.active){rest}else{
        Vec last=sub(contact.wrist,contact.center);Vec start=sub(rest,contact.center);
        f64 a=math.atan2(start.z,start.y);f64 b=math.atan2(last.z,last.y);
        f64 r=math.norm(0.0,last.y,last.z);f64 h=r+0.084;
        if(weight>=0.69){radial(contact.center,last.x,r+(h-r)*(1.0-contact.progress),b)}
        else{
            f64 q=smooth(weight/0.69);f64 angle=a+math.wrap(b-a)*q;
            f64 r0=math.norm(0.0,start.y,start.z);
            f64 rr=r0+(h-r0)*q+0.095*math.sin(3.141592653589793*q)+(if(releasing){0.096}else{0.060})*smooth(weight/0.040)*(1.0-q);
            radial(contact.center,start.x+(last.x-start.x)*q,rr,angle)
        }
    }
};
struct copy Control { Vec stem; Vec handle; Vec right; Vec up; Vec depth; Vec offset; }
Vec(Vec,Vec,Vec,Vec) transform_basis=fn(right,up,depth,p){add(add(mul(right,p.x),mul(up,p.y)),mul(depth,p.z))};
Control(f64,f64,f64) control=fn(side,horizontal,vertical){
    f64 x=math.clamp(horizontal,-1.0,1.0);f64 y=math.clamp(vertical,-1.0,1.0);
    Vec axis=v(y,-x,0.0);f64 amount=length(axis);
    f64 angle=math.clamp(amount,0.0,1.0)*0.17;
    Vec q=mul(normalized(axis),math.sin(angle));f64 w=math.cos(angle);
    Vec right=v(1.0-2.0*q.y*q.y,2.0*q.x*q.y,-2.0*q.y*w);
    Vec up=v(2.0*q.x*q.y,1.0-2.0*q.x*q.x,2.0*q.x*w);
    Vec depth=v(2.0*q.y*w,-2.0*q.x*w,1.0-2.0*(q.x*q.x+q.y*q.y));
    Vec stem=v(side*0.285*0.90,-0.255+0.040,-0.425-0.095);
    Vec tip=v(side*0.285*0.90,-0.307+0.040,-0.50-0.095);
    Vec offset=sub(stem,transform_basis(right,up,depth,stem));
    Control value={.stem=stem;.handle=add(transform_basis(right,up,depth,tip),offset);.right=right;.up=up;.depth=depth;.offset=offset;};value
};
Arm(Vec,Vec,f64,f64,Vec) elbow=fn(shoulder,wrist,upper,fore,pole){
    Vec d=sub(wrist,shoulder);f64 requested=length(d);
    Vec dir=if(requested>0.00001){normalized(d)}else{v(0.0,0.0,-1.0)};
    f64 reach=math.clamp(requested,math.abs(upper-fore)+0.0005,upper+fore-0.0005);
    Vec normal=sub(pole,mul(dir,dot(pole,dir)));
    if(length(normal)<0.00001){
        Vec backup=if(math.abs(dir.y)<0.9){v(0.0,-1.0,0.0)}else{v(1.0,0.0,0.0)};
        normal=sub(backup,mul(dir,dot(backup,dir)));
    };
    f64 run=(upper*upper-fore*fore+reach*reach)/(2.0*reach);
    f64 rise=math.root_scaled(math.clamp(upper*upper-run*run,0.0,1.0e30),1.0);
    Arm value={.elbow=add(shoulder,add(mul(dir,run),mul(normalized(normal),rise)));.wrist=add(shoulder,mul(dir,reach));.error=math.abs(requested-reach);};value
};
f64[36] packet=[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
unit(i32) send=fn(n){unsafe {bridge.avatar_rig(core.pointer_cast<*?u8>(&?packet[0]),n);};};
unit(u64,Vec) write_vec=fn(i,value){
    packet[i]=value.x;packet[i+1]=value.y;packet[i+2]=value.z;
};
unit(f64,f64,f64,f64,f64,f64,f64,f64,i32) publish_grip=fn(ex,ey,ez,ax,ay,az,weight,stage,valid){
    Grip contact=grip(v(ex,ey,ez),v(ax,ay,az),weight,stage,valid==1);
    packet[0]=if(contact.active){1.0}else{0.0};
    if(contact.active){
        write_vec(1,contact.center);packet[4]=contact.radius;packet[5]=contact.theta;
        write_vec(6,contact.wrist);write_vec(9,contact.inward);packet[12]=contact.progress;
        write_vec(13,cross(contact.inward,v(-1.0,0.0,0.0)));
    };
    send(16);
};
unit(f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,i32) publish_approach=fn(rx,ry,rz,cx,cy,cz,wx,wy,wz,progress,weight,radius,releasing){
    Grip contact={.active=true;.center=v(cx,cy,cz);.radius=radius;.theta=0.0;.wrist=v(wx,wy,wz);.inward=v(0.0,0.0,0.0);.progress=progress;};
    write_vec(0,approach(v(rx,ry,rz),contact,weight,releasing==1));
    send(3);
};
unit(f64,f64,f64,f64) publish_facing=fn(body_yaw,body_pitch,head_yaw,head_pitch){
    Axes body=facing(body_yaw,body_pitch);Axes head=facing(head_yaw,head_pitch);
    write_vec(0,body.forward);write_vec(3,body.up);write_vec(6,body.right);
    write_vec(9,head.forward);write_vec(12,head.up);write_vec(15,head.right);
    send(18);
};
unit(u64,Control) write_control=fn(i,value){
    write_vec(i,value.stem);write_vec(i+3,value.handle);write_vec(i+6,value.right);
    write_vec(i+9,value.up);write_vec(i+12,value.depth);write_vec(i+15,value.offset);
};
unit(f64,f64,f64,f64) publish_mmu=fn(lx,ly,rx,ry){
    write_control(0,control(-1.0,lx,ly));write_control(18,control(1.0,rx,ry));send(36);
};
unit(f64,f64,f64,f64,f64,f64,f64,f64,f64,f64,f64) publish_elbow=fn(sx,sy,sz,wx,wy,wz,upper,fore,px,py,pz){
    Arm arm=elbow(v(sx,sy,sz),v(wx,wy,wz),upper,fore,v(px,py,pz));
    write_vec(0,arm.elbow);write_vec(3,arm.wrist);packet[6]=arm.error;send(7);
};
%%end
