const vec=(row,i)=>[row[i],row[i+1],row[i+2]];
const basis=(x,y,z,p)=>[...x,0,...y,0,...z,0,...p,1];

export function bindAvatarRig(instance, read){
 const checked=(method,count,...args)=>{
  const packet=read(()=>instance[method](...args));
  if(!packet||packet.length!==count)throw Error("Invalid Wosy avatar rig packet");
  return packet;
 };
 const controlRow=(lx,ly,rx,ry)=>{
  const p=checked("avatar_mmu",36,lx,ly,rx,ry);
  const at=i=>({stem:vec(p,i),handle:vec(p,i+3),pivot:basis(vec(p,i+6),vec(p,i+9),vec(p,i+12),vec(p,i+15))});
  return [at(0),at(18)];
 };
 let neutral;
 return {
  neutralControls(){return neutral??=controlRow(0,0,0,0);},
  stationGrip(frame){
   const p=checked("avatar_grip",16,frame[0],frame[1],frame[2],frame[12],frame[13],frame[14],frame[8],frame[19],Number(frame[15]===1&&frame[29]!==1));
   if(!p[0])return null;
   const wrist=vec(p,6),direction=vec(p,9);
   return {center:vec(p,1),radius:p[4],theta:p[5],wrist,direction,basis:basis([-1,0,0],vec(p,13),direction,wrist),progress:p[12]};
  },
  approach(rest,c,weight,releasing){
   return vec(checked("avatar_approach",3,...rest,...c.center,...c.wrist,c.progress,weight,c.radius,Number(releasing)),0);
  },
  axes(frame){
   const p=checked("avatar_facing",18,frame[21]??frame[3],frame[22]??frame[4],frame[3],frame[4]);
   const at=i=>({forward:vec(p,i),up:vec(p,i+3),right:vec(p,i+6)});
   return {body:at(0),head:at(9)};
  },
  controls(frame){
   return controlRow(frame[33]||0,frame[34]||0,frame[35]||0,frame[36]||0);
  },
  elbow(shoulder,wrist,upper,fore,pole){
   const p=checked("avatar_elbow",7,...shoulder,...wrist,upper,fore,...pole);
   return {elbow:vec(p,0),wrist:vec(p,3),wristError:p[6]};
  }
 };
}
