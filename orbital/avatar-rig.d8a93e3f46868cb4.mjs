const vec=(row,i)=>[row[i],row[i+1],row[i+2]];
const basis=(x,y,z,p)=>[...x,0,...y,0,...z,0,...p,1];

export function bindAvatarRig(instance, read){
 const checked=(method,count,...args)=>{
  const packet=read(()=>instance[method](...args));
  if(!packet||packet.length!==count)throw Error("Invalid Wosy avatar rig packet");
  return packet;
 };
 const controlRow=(lx,ly,rx,ry,reach)=>{
  const p=checked("avatar_mmu",37,lx,ly,rx,ry,reach);
  const at=(i,fit)=>({fit,stem:vec(p,i),handle:vec(p,i+3),pivot:basis(vec(p,i+6),vec(p,i+9),vec(p,i+12),vec(p,i+15))});
  return [at(0,p[36]),at(18,1)];
 };
 let neutral,grasps;
 const openArticulation=[];
 return {
  neutralControls(){return neutral??=controlRow(0,0,0,0,0);},
  mmuGrasps(){
   return grasps??=(()=>{
    const p=checked("avatar_mmu_grasps",44);
    return [0,22].map(i=>({translation:vec(p,i),orientation:[...p.slice(i+3,i+7)],bends:[...p.slice(i+7,i+21)],opposition:p[i+21]}));
   })();
  },
  stationGrip(frame,apolloFirstRail=false){
   const p=checked("avatar_grip",16,frame[0],frame[1],frame[2],frame[12],frame[13],frame[14],frame[8],frame[19],frame[15]===1&&frame[29]!==1?(apolloFirstRail&&frame[16]===0&&frame[19]===0?2:1):0);
   if(!p[0])return null;
   const wrist=vec(p,6),direction=vec(p,9);
   return {center:vec(p,1),radius:p[4],theta:p[5],wrist,direction,basis:basis([-1,0,0],vec(p,13),direction,wrist),progress:p[12]};
  },
  trainingWrist(rest,endpoint,up,weight){
   return vec(checked("avatar_training_wrist",3,...rest,...endpoint,...up,weight),0);
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
   return controlRow(frame[33]||0,frame[34]||0,frame[35]||0,frame[36]||0,frame[8]||0);
  },
  railArticulation(reach,spanError,registered,side,phase=0,rail=0){
   const authored=()=>{
    const p=checked("avatar_grasp_style",17,reach,spanError,Number(registered),Number(side===0),phase,rail);
    return {collar:p[0],collarBlend:p[1],palm:p[2],flex:[...p.slice(3,8)],heldFingerFlex:[...p.slice(8)]};
   };
   return reach===0?(openArticulation[side]??=authored()):authored();
  },
  elbow(shoulder,wrist,upper,fore,pole){
   const p=checked("avatar_elbow",7,...shoulder,...wrist,upper,fore,...pole);
   return {elbow:vec(p,0),wrist:vec(p,3),wristError:p[6]};
  }
 };
}
