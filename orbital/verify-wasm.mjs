import {hudText} from './hud-text.mjs';
import {stationGrip,ProceduralPose} from './apollo-body.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=process.argv[2] ?? new URL('./orbital.wasm',import.meta.url);
const wasm=new WebAssembly.Module(readFileSync(path));
const imports=WebAssembly.Module.imports(wasm);
const actual=imports.map(({module,name,kind})=>`${module}.${name}:${kind}`).sort();
const orbitalImports=['orbital.frame:function','orbital.hands:function','orbital.hull:function','orbital.scenery:function'];
const procExit='wasi_snapshot_preview1.proc_exit:function';
assert.deepEqual(actual,actual.includes(procExit)?[...orbitalImports,procExit]:orbitalImports,
 'expected the exact browser import contract (Orbital callbacks and optional WASI proc_exit)');
let hull,hullLoads=0,room,hand,state,engine,roomLoads=0,handLoads=0,roomSpan;
const roomPatches=[];
function read(p,n){assert.equal(p%4,0);return new Float32Array(engine.memory.buffer,p,n).slice();}
engine=new WebAssembly.Instance(wasm,{orbital:{
 hull(p,n){hull=read(p,n);hullLoads++;},
 scenery(p,n){
  const start=engine.scenery_motion(0),len=engine.scenery_motion(1);
  assert.ok(start>=0&&len>=0&&start%24===0&&len%24===0);
  if(engine.scenery_motion(2)){
    assert.deepEqual([start,len],roomSpan,'partial room segment matches the last full indexed upload');
    assert.ok(n===len&&len>0&&start+len<room.length);
    const next=room.slice(),moving=read(p+start*4,n);
    assert.ok(moving.every(Number.isFinite));
    next.set(moving,start);room=next;roomPatches.push({start,len,n});
  }else{
    assert.ok(start+len<=n&&Boolean(start)===Boolean(len));
    room=read(p,n);roomSpan=[start,len];
  }
  roomLoads++;
 },hands(p,n){hand=read(p,n);handLoads++;},
 frame(p,n){assert.equal(n,38);state=read(p,n);}
},wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}}).exports;
engine._start();
const captureFrames=[];
const hint=()=>hudText(engine.hud_code(),state[16],false);
function hudIs(objective,interact,marker="+"){
 const view=hint();
 assert.equal(view.objective,objective);assert.equal(view.interact,interact);assert.equal(view.marker,marker);
}
const step=(keys=0,yaw=0,pitch=0,dt=1/60)=>{
 engine.tick(dt,keys,yaw,pitch);
 if(state[15]===1&&state[8]>.004&&[1,2,3].includes(state[9]))captureFrames.push([...state]);
};
const until=(test,keys,cap=400)=>{for(let i=0;i<cap&&!test();i++)step(keys);assert.ok(test(),'state did not arrive '+[...state]);};
let initial,contact;
const capture=()=>[...state.slice(0,21),...new Array(17).fill(0),...hand];
function reset(){engine.reset();step(0,0,0,0);}
reset();
initial=capture();
 hudIs("Approach the amber rail",false);
assert.ok(room.length>=2500*8 && room.length<=4096*8 && room.length%24===0);
assert.ok(room.every(Number.isFinite));assert.ok(hand.every(Number.isFinite));
step(64);assert.equal(state[9],0,'cannot grip from spawn');step();
until(()=>state[10]===1,260);
step(0,1.25);assert.equal(state[10],0,'cannot grip when facing away');step(64);assert.equal(state[9],0);
step(0,-1.25);assert.equal(state[10],1);
step(64);assert.equal(state[9],1);
until(()=>state[9]===2,64);
contact=capture();
for(let i=0;i<90;i++)step(64|4|2|16);
assert.deepEqual(capture(),contact,'held action/thrust cannot exit the frozen handrail pose');
assert.deepEqual(contact.slice(5,10),[0,0,0,1,2]);
const box = (m) => [0,1,2].map(i=>{const a=m.filter((_,j)=>j%8===i);return [Math.min(...a),Math.max(...a)];});
assert.notDeepEqual(box(initial.slice(38)),box(contact.slice(38)),'contact has its own authored hand volume');
const [x,y,z]=box(contact.slice(38));assert.ok(x[0]<.745 && x[1]>.745 && y[1]>-.21 && z[0]<-1.94 && z[1]>-1.94,'contact mesh wraps the handrail');
step();step(64);assert.equal(state[9],3);assert.equal(state[11],2);assert.ok(state[7]<0);
const before=state[2];until(()=>state[9]===0,0);assert.ok(state[2]<before);
reset();assert.deepEqual(capture(),initial,'reset restores exact initial pose');
until(()=>state[7]<-.65,4);
const velocity=state[7];step();assert.equal(state[7],velocity,'release retains momentum exactly');
while(state[7]<-.015)step(8);
assert.ok(Math.abs(state[7])<.028,'opposite thrust neutralizes drift without a brake');
until(()=>state[1]>1.019,16);assert.ok(state[1]<=1.02001 && state[6]===0);
assert.equal(roomLoads,1,'static shell is published only once across interactions and reset');
console.log('Orbital WASM: station batch, initial/contact poses, reach/aim gating, trigger latch, held pose, push-off, inertia, counterthrust and indoor boundaries passed.');

engine.select_deck(1);step(0,0,0,0);
const evaStart=capture(),evaRoom=room;
 hudIs("Approach the airlock rail",false);
 assert.equal(hint().section,"EVA / 1 OF 3");
assert.equal(state[20],1,'the Wosy route starts with only the first grip visible as active');
const lenses=Array.from({length:5},(_,i)=>1.10+i*.01);
for(const material of lenses)assert.ok(evaRoom.some((n,i)=>i%8===7&&Math.abs(n-material)<.0001),'every cue has actual tagged 3D geometry');
assert.ok(evaRoom.length/24<6680,'route indicators and console details stay within the static batch budget');
assert.equal(state[15],1);assert.ok(evaRoom.length>=5400*8 && evaRoom.length<6680*24 && evaRoom.length%24===0);
assert.ok(evaRoom.every(Number.isFinite) && hand.every(Number.isFinite));
const airlockLid=[];
for(let i=0;i<hull.length;i+=8)if(Math.abs(hull[i+7]-.754)<.0001)airlockLid.push(hull.slice(i,i+8));
assert.equal(airlockLid.length,90,'closed pressure lid is one immutable 30-segment bowl');
assert.ok(airlockLid.every(v=>v[0]>=-1.2781&&v[0]<=-1.2659
 &&Math.hypot(v[1]-.27,v[2]+2.60)<.527),'lid stays behind the physical latch and route locators');
const maskedPanel=[];
for(let i=0;i<evaRoom.length;i+=8)if(Math.abs(evaRoom[i+7]-.18375)<.0001)maskedPanel.push(evaRoom.slice(i,i+8));
assert.equal(maskedPanel.length,84,'only the formed faces of thermal panel n=7 are registered');
assert.ok(maskedPanel.every(v=>v[0]<-1.41&&v[0]>-1.51&&v[1]>-.761&&v[1]<.051&&v[2]>-6.641&&v[2]<-4.219));
const pressurePanel=[];
for(let i=0;i<hull.length;i+=8)if(Math.abs(hull[i+7]-.752)<.0001)pressurePanel.push(hull.slice(i,i+8));
assert.equal(pressurePanel.length,42,'generated pressure albedo belongs to seven raised faces across two immutable courses');
assert.ok(pressurePanel.every(v=>v[0]>=-1.485&&v[0]<=-1.483&&v[1]>=-.761&&v[1]<=.961&&v[2]>=-4.161&&v[2]<=-1.739));
assert.ok(pressurePanel.every(v=>v[1]<=-.089||v[1]>=-.062),'pressure seam is open in actual mesh');

const unpackStationNormal=(code)=>{
 const n=-code-1,u=Math.floor(n/255)/127-1,v=(n%255)/127-1,z=1-Math.abs(u)-Math.abs(v);
 return z<0?[(1-Math.abs(v))*Math.sign(u+1e-6),(1-Math.abs(u))*Math.sign(v+1e-6),z]:[u,v,z];
};
const encodedStationNormals=evaRoom.filter((_,i)=>i%8===6).filter(x=>x<0);
assert.ok(encodedStationNormals.length>1100&&encodedStationNormals.length<evaRoom.length/16,'only curved station skins carry authored normals');
assert.ok(encodedStationNormals.every(n=>Number.isInteger(n)&&n>=-65025));
const railNormal=evaRoom.findIndex((x,i)=>i%8===0&&Math.abs(x+1.55)<.001&&Math.abs(evaRoom[i+1]+.57)<.001&&Math.abs(evaRoom[i+2]+3.343)<.001);
assert.ok(railNormal>=0 && unpackStationNormal(evaRoom[railNormal+6])[2]>.98,'rail skin normal follows the outside cylinder; caps remain separate');
assert.ok(evaRoom.some((v,i)=>i%8===0&&v<-1.13&&v>-1.29&&Math.abs(evaRoom[i+1]+.57)<.003&&Math.abs(evaRoom[i+2]+1.59-.137)<.003),'rail mount split collar clears the original rail without interpenetration');
const narrowFlange=evaRoom.filter((v,i)=>i%8===0&&Math.abs(v+1.367)<.001&&Math.abs(evaRoom[i+1]+.57)<.002&&Math.abs(evaRoom[i+2]+1.59-.130)<.001);
assert.ok(narrowFlange.length>0&&.130*Math.cos(Math.PI/10)>.120,'the blue/gold inscribed shoulder faces protrude beyond the base collars without poking through');


const hatchPoint=(u,v,d,lit)=>evaRoom.some((value,i)=>i%8===0&&
 Math.abs(value-(-1.10+.926*u+.378*d))<.0001&&Math.abs(evaRoom[i+1]-(.20+v))<.0001&&
 Math.abs(evaRoom[i+2]-(-6.39-.378*u+.926*d))<.0001&&(!lit||evaRoom[i+7]>.98));
assert.ok(hatchPoint(0,0,-.635,false),'the hatch has a recessed bulkhead, not a flat painted aperture');
const capEdge=(r,d)=>hatchPoint(r*Math.cos(Math.PI/12),r*Math.sin(Math.PI/12),d,false);
assert.ok(capEdge(.57,-.65)&&capEdge(.473,-.637)&&capEdge(.373,-.635),
 'rear cap joins the casing, recess and central pressure plate on original radial edges');
assert.ok(!capEdge(.44,-.641)&&!hatchPoint(0,0,-.65,false),
 'replaced annulus and background disk do not persist behind the closed cap');
assert.ok(!hatchPoint(0,0,.158,false),'the apertural front ring is open');
assert.ok(hatchPoint(-.063,.611,.177,true)&&hatchPoint(-.432,-.274,-.473,true),'warm lamp fixtures are present at the rim and inside the recess');
assert.ok(hatchPoint(-.239,-.429,.041,false)&&hatchPoint(.239,-.429,.041,false),
 'raised paired sill runners sit below the aperture');
assert.ok(hatchPoint(.514*Math.cos(Math.PI/12),.514*Math.sin(Math.PI/12),-.403,false)
 &&hatchPoint(.373*Math.cos(Math.PI/12),.373*Math.sin(Math.PI/12),-.635,false),
 'retaining ring and recessed pressure flange retain distinct section depths');
assert.ok(hatchPoint(.64*Math.cos(Math.PI/12),.64*Math.sin(Math.PI/12),.168,false),
 'new chamfer matches the liner and leaves the fixture in front');
const back=evaRoom.findIndex((x,i)=>i%8===0&&Math.abs(x-(-1.10-.635*.378))<.0001
 &&Math.abs(evaRoom[i+1]-.20)<.0001&&Math.abs(evaRoom[i+2]-(-6.39-.635*.926))<.0001);
assert.ok(back>=0&&evaRoom[back+3]>evaRoom[back+4]&&evaRoom[back+4]>evaRoom[back+5],
 'rear pressure plate gets an authored warm reflection instead of an unlit disk');
const localBounce=[];
for(let i=0;i<evaRoom.length;i+=8)if(evaRoom[i+6]>1)localBounce.push(evaRoom.slice(i,i+8));
assert.ok(localBounce.length>=200&&localBounce.length<500,'practical warmth is baked only into the hatch interior');
assert.ok(localBounce.every(v=>v[0]<-.51&&v[0]>-1.95&&v[2]<-6.06&&v[2]>-7.23&&v[7]<.8));



assert.notDeepEqual(initial.slice(38),evaStart.slice(38),'EVA uses a separately authored pressurized glove');
assert.ok(evaRoom.some((x,i)=>i%8===4 && x<.14),'station includes the dark solar cell trim');
step(64);assert.equal(state[9],0);step();
until(()=>state[10]===1,260);
step(0,1.15);assert.equal(state[10],0);assert.equal(state[18],1,"an off-axis approach gets the optional re-aim cue");step(64);assert.equal(state[9],0);
step(0,-1.15);assert.equal(state[10],1);
assert.equal(state[18],0,"a reachable EVA handrail does not ask for counterthrust");
const startEase=[...state.slice(0,5)], incoming=[...state.slice(5,8)];
step(64);
const targetEase=[0.05,-0.025,-0.88,-0.105,-0.30];
for(let i=1;i<=9;i++){
   const t=i*2.85/60, blend=t*t*(3-2*t), tangent=t*(1-t)**2/2.85;
   for(let axis=0;axis<5;axis++){
      const expected=startEase[axis]+(targetEase[axis]-startEase[axis])*blend+(incoming[axis]??0)*(tangent+(1-blend)/60);
      assert.ok(Math.abs(state[axis]-expected)<.0005,'reach settles continuously from the actual incoming pose and momentum');
   }
   step(64);
}
until(()=>state[9]===2,64);
const evaContact=capture();
 hudIs("Airlock rail secured",true);
assert.deepEqual(evaContact.slice(5,10),[0,0,0,1,2]);
assert.notDeepEqual(evaStart.slice(38),evaContact.slice(38));
const extents=box(evaContact.slice(38));
assert.ok(extents[1][1]>-.472 && extents[2][0]<-1.665 && extents[2][1]>-1.50,'fingers are authored both above and behind the rounded rail');
const heldUploads=handLoads;
for(let i=0;i<85;i++)step(64|16|2);assert.deepEqual(capture(),evaContact);
assert.equal(handLoads,heldUploads,'a still grip does not re-upload meshes or invalidate cached shadows');
step();
step(64);assert.equal(state[11],2);assert.ok(state[7]<0);
until(()=>state[9]===0,0);
assert.equal(state[16],1);assert.equal(state[17],0);assert.equal(state[20],2);
step(64);assert.equal(state[9],0,'cannot trigger the next rail as soon as released');step();
until(()=>state[10]===1,260);
step(64);until(()=>state[9]===2,64);
assert.equal(state[16],1);assert.equal(state[17],0);assert.equal(state[20],0);
assert.equal(state[14].toFixed(2),'-3.43');
assert.equal(state[3].toFixed(2),'0.13','the scaffold settle frames the outboard suspended load');
assert.equal(state[4].toFixed(2),'-0.13');
const scaffoldBatches=roomLoads;
for(let i=0;i<8;i++)step(64);
assert.equal(roomLoads,scaffoldBatches,'looking out at the cargo never republishes the stationary world');
step();step(64);until(()=>state[9]===0,0);
assert.equal(state[16],2);
until(()=>state[10]===1,260);
step(64);until(()=>state[9]===2,64);
const beforeLatch=room, countBeforeLatch=roomLoads;
const openPin=[...state.slice(12,15)], openGlove=hand, openHandLoads=handLoads;
assert.ok(room.length<6680*24,'exterior geometry fits without clipping the assembly batch');
assert.equal(state[14].toFixed(2),'-4.88');
for(let i=0;i<120;i++)step(64);
assert.equal(state[17],0,'holding grip does not seat the latch automatically');
step();step(64);
assert.equal(state[19],.5);
 hudIs("Seating cargo pin",false);
const cargoLockCamera=[...state.slice(0,8)], cargoLockPoses=[];
for(let i=0;i<24&&state[17]===0;i++){
 const seen=roomLoads;step(i===0||i===2?0:64);
 if(seen!==roomLoads)cargoLockPoses.push({m:room,w:[...state.slice(12,15)],locked:state[17]});
 assert.deepEqual([...state.slice(0,8)],cargoLockCamera);
}
assert.equal(state[17],1);assert.equal(state[9],2,'latch is secured with the glove still braced');
assert.equal(roomLoads,countBeforeLatch+4);
assert.notDeepEqual(room,beforeLatch,'the contact lever and status light visibly change');
const seatedPin=[...state.slice(12,15)];
assert.ok(Math.abs(seatedPin[1]-openPin[1]-.12)<1e-5,'Wosy moves the held wrist exactly with the detent');
assert.equal(seatedPin[0],openPin[0]);assert.equal(seatedPin[2],openPin[2]);
assert.notDeepEqual(hand,openGlove,'fallback glove reaches the same seated endpoint');
assert.equal(handLoads,openHandLoads+4,'fallback uploads only the four pin poses');
function pinVertices(mesh,pose){
 return mesh.filter((v,i)=>i%8===1&&Math.abs(mesh[i-1]-pose[0])<.16&&
   Math.abs(v-pose[1])<.088&&Math.abs(mesh[i+1]-pose[2])<.088&&
   Math.abs(mesh[i+2]-.51)<1e-5&&Math.abs(mesh[i+6]-.62)<1e-5).length;
}
assert.ok(pinVertices(beforeLatch,openPin)>30 && pinVertices(room,seatedPin)>30,'wrist and exposed lock shaft share the same physical anchor in both endpoints');
function luminanceCode(mesh){
 const found=[];
 for(let i=0;i<mesh.length;i+=8){
  if(mesh[i]>-.03&&mesh[i]<.20&&mesh[i+1]>-.275&&mesh[i+1]<-.23&&mesh[i+2]>-5.074&&mesh[i+2]<-5.05&&mesh[i+7]>.98)
   found.push([mesh[i+3],mesh[i+4],mesh[i+5]]);
 }
 return found;
}
assert.ok(luminanceCode(beforeLatch).some(rgb=>rgb[0]>.9&&rgb[1]<.65),'physical latch light starts amber');
assert.equal(cargoLockPoses.length,4);
for(const [i,{m,w,locked}] of cargoLockPoses.entries()){
 const t=(i+1)/4;
 assert.ok(Math.abs(w[1]-(-.57+.12*t*t*(3-2*t)))<.0001&&pinVertices(m,w)>30,'cargo pin and hand share every timed pose');
 assert.equal(locked,+(i===3));
 assert.ok(luminanceCode(m).some(rgb=>i===3?rgb[0]<.4&&rgb[1]>.9:rgb[0]>.9&&rgb[1]<.65));
}
assert.ok(luminanceCode(room).some(rgb=>rgb[0]<.4&&rgb[1]>.90),'physical latch light ends green');
step();step(64);
assert.equal(roomLoads,countBeforeLatch+4,'releasing the seated lock does not regenerate the station');
assert.equal(state[9],3);
until(()=>state[19]===1,0);assert.equal(state[10],0);
until(()=>state[0]>.77,0);
assert.equal(state[18],3);assert.equal(state[10],0,'drifting through reach is not sufficient');
 hudIs("Match speed at the console",false);assert.equal(hint().short,"Thrust left");
step(64);assert.equal(state[9],0);
engine.set_thrust(-1,0);while(state[5]>.08)step(256);engine.set_thrust(0,0);step();
assert.equal(state[18],4);assert.equal(state[10],0,'counterthrust does not bypass aim');
 hudIs("Face the alignment console",false,"→");
step(64);assert.equal(state[9],0);
step(0,1.00);assert.equal(state[18],5,'overshooting the light reverses the Wosy reticle cue');
 hudIs("Face the alignment console",false,"←");
step(0,-.65);assert.equal(state[10],1);assert.equal(state[18],0);
step(64);until(()=>state[19]===2,64);
 hudIs("Alignment handle secured",true);assert.ok(hint().console);
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['1.09','-0.54','-4.81']);
for(let i=0;i<60;i++)step(64);assert.equal(state[19],2,'holding the grip never seats the alignment handle');
const suspended=room;
const seatStartCamera=[...state.slice(0,8)], seatBatches=roomLoads;
step();step(64);
assert.equal(state[19],2.5);
const seatMeshes=[];
for(let n=0;n<36&&state[19]===2.5;n++){
 const previousBatch=roomLoads;step(n===0||n===2?0:64);
 if(roomLoads!==previousBatch)seatMeshes.push({room,contact:state[13]});
 assert.deepEqual([...state.slice(0,8)],seatStartCamera,'seating preserves the docked camera');
}
assert.equal(state[19],3);
assert.equal(roomLoads,seatBatches+6);
assert.equal(seatMeshes.length,6);
const nearEq=(x,y)=>Math.abs(x-y)<.0001;
const hasVertex=(m,x,y,z)=>m.some((v,i)=>i%8===0&&nearEq(x,v)&&nearEq(y,m[i+1])&&nearEq(z,m[i+2]));
assert.ok(hasVertex(suspended,2.17,.53,-7.13)&&hasVertex(room,2.17,.13,-7.13),'capsule travels from suspension to the capture shoes');
assert.ok(hasVertex(suspended,.47,.873,-6.64)&&hasVertex(room,.47,.473,-6.64),'freight shell bevel moves with the same registered cargo stroke');
assert.ok(hasVertex(suspended,2.20,.62,-6.523)&&hasVertex(room,2.20,.22,-6.523),'the captive wrist tracks the same travel');
assert.ok(hasVertex(suspended,.49,-.404,-7.45)&&hasVertex(room,.49,-.404,-7.45),'capture shoes remain fixed to the truss');
const elbowOffsets=[
 [.005204942,-.003655004,-.000982262],[.014663307,-.009332873,-.002095023],
 [.017319421,-.009841309,-.001543880],[.005443067,-.004177934,-.001316310],
 [-.016463812,.002321792,-.004557410],[-.028937600,.004856000,-.007602000]
];
for(const [i,{room:m,contact}] of seatMeshes.entries()){
 const t=(i+1)/6,a=t*t*(3-2*t), y=-.4*a, p=elbowOffsets[i].map((n,j)=>n+[2.88,.46,-6.89][j]);
 assert.ok(nearEq(contact,-.54+.11*a)&&hasVertex(m,2.17,.53+y,-7.13)&&hasVertex(m,2.20,.62+y,-6.523),'cargo, captive wrist and glove follow the shared clock');
 assert.ok(hasVertex(m,.49,-.404,-7.45)&&hasVertex(m,p[0],p[1],p[2]+.097),'fixed shoes and authored elbow pose are present');
 assert.ok(nearEq(Math.hypot(p[0]-3.23,p[1]-1.20,p[2]+7.81),1.231462545)&&nearEq(Math.hypot(p[0]-2.2,p[1]-.62-y,p[2]+6.62),.748932574),'intermediate robot links retain physical lengths');
}
const span=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const sh=[3.23,1.20,-7.81], elbow=[2.88,.46,-6.89], finalElbow=[2.8510624,.464856,-6.897602],
startW=[2.20,.62,-6.62], endW=[2.20,.22,-6.62];
assert.ok(hasVertex(suspended,...elbow.map((v,i)=>i===2?v+.097:v))&&hasVertex(room,...finalElbow.map((v,i)=>i===2?v+.097:v)),'elbow geometry uses the validated endpoint coordinates');
assert.ok(nearEq(span(sh,elbow),span(sh,finalElbow)) && nearEq(span(elbow,startW),span(finalElbow,endW)),'both physical arm links retain their lengths');
const wristIndicator=(m)=>m.some((f,i)=>i%8===4&&f>.95&&m[i-4]>2.12&&m[i-4]<2.28&&m[i-3]>0&&m[i-3]<.05&&m[i-2]>-6.59&&m[i-2]<-6.56&&m[i+3]>.9);
assert.equal(wristIndicator(beforeLatch),false);
assert.equal(wristIndicator(room),true,'the local seating endpoint changes the remote gripper status');
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['1.09','-0.43','-4.81']);
assert.equal(roomLoads,countBeforeLatch+10,'seating updates only the six authored timed poses');
const cradleSeated=room, handoffCamera=[...state.slice(0,8)];
for(let i=0;i<60;i++)step(64);
assert.equal(state[19],3,'held seat input never commands the transfer');
assert.equal(roomLoads,countBeforeLatch+10);
step();step(64);assert.equal(state[19],3.25);
 hudIs("Closing cradle keepers",false);
const transferBatches=roomLoads, transferMeshes=[],patchStart=roomPatches.length;
for(let n=0;n<90&&state[19]<4;n++){
 const previousBatch=roomLoads;step(n===0||n===2?0:64);
 assert.deepEqual([...state.slice(0,8)],handoffCamera,'the docked eye and velocity do not change');
 if(roomLoads!==previousBatch)transferMeshes.push({room,stage:state[19],contact:state[13]});
 if(state[19]===3.75)hudIs("Robot arm clearing",false);
}
assert.equal(state[19],4);
assert.equal(roomLoads,transferBatches+15);
const patches=roomPatches.slice(patchStart);
assert.equal(patches.length,8,'the eight intermediate parking poses issue robot-only updates');
const {start:patchFirst,len:patchCount}=patches[0];
assert.ok(patchCount/room.length<.26,'room pool updates are restricted to the robot');
const whole=transferMeshes[5].room;
for(const {room:current} of transferMeshes.slice(6,-1)){
 assert.deepEqual(current.subarray(0,patchFirst),whole.subarray(0,patchFirst),'visible and shadow indices outside the robot stay shared');
 assert.deepEqual(current.subarray(patchFirst+patchCount),whole.subarray(patchFirst+patchCount),'all landed station geometry remains bit-identical');
}
assert.deepEqual(transferMeshes.map(v=>v.stage),[3.25,3.25,3.5,3.5,3.5,3.75,3.75,3.75,3.75,3.75,3.75,3.75,3.75,3.75,4]);
const ease=t=>t*t*(3-2*t);
const armVertex=(i,x,y,z)=>{
 const a=64*Math.PI/180*ease(Math.max(0,(i-8)/6)),px=2.8510624,py=.464856;
 x+=.30*ease(Math.min(1,Math.max(0,(i-5)/3)));
 return [px+(x-px)*Math.cos(a)-(y-py)*Math.sin(a),py+(x-px)*Math.sin(a)+(y-py)*Math.cos(a),z];
};
for(const [i,{room:m,contact}] of transferMeshes.entries()){
 const k=ease(Math.min((i+1)/3,1)), j=ease(Math.min(1,Math.max((i-2)/3,0)));
 for(const x of [.49,1.71]){
  assert.ok(hasVertex(m,x+.041,-.372-.333*k,-6.554),'both keeper jaws close before robot release');
  assert.ok(hasVertex(m,x+.061,-.686,-6.655),'landed lugs are fixed throughout');
  assert.ok(m.some((v,n)=>n%8===0&&nearEq(v,x+.067)&&nearEq(m[n+1],-.469)&&nearEq(m[n+2],-6.509)&&nearEq(m[n+4],i>=2?1:.51)),'keeper confirmation changes only on the fully closed pose');
 }
 assert.ok(hasVertex(m,...armVertex(i,1.96,.331+.14*j,-6.838))&&hasVertex(m,...armVertex(i,1.96,.022-.14*j,-6.838)),'robot jaws stay closed until the cradle is seated');
 assert.ok(hasVertex(m,2.17,.13,-7.13)&&hasVertex(m,...armVertex(i,2.20,.22,-6.523)),'the landed cargo is fixed and the wrist follows the elbow arc');

 if(i>=8){
  // The two open jaws and wrist housing are convex boxes. Every corner is
  // beyond the cargo end plane before rotation, so their entire sweep is clear.
  for(const [x,y,z,w,h,d] of [[2.04,.44,-6.889,.16,.128,.140],[2.04,-.125,-6.889,.16,.121,.140],
    [1.96,.471,-6.838,.113,.066,.115],[1.96,-.118,-6.838,.113,.065,.115],[2.13,.10,-6.88,.14,.22,.25]]){
   for(const xx of [x,x+w])for(const yy of [y,y+h])for(const zz of [z,z+d]){
    const point=armVertex(i,xx,yy,zz);
    assert.ok(point[0]>2.17+.07&&hasVertex(m,...point),'each jaw/wrist corner clears the cargo cap plane before turning');
   }
  }
 }
 assert.ok(nearEq(contact,-.43+.07*k),'the glove stays attached to the lever');
}

assert.deepEqual([...state.slice(0,8)],handoffCamera,'handoff keeps the restrained eye and aim fixed');
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['1.09','-0.36','-4.81']);
for(const x of [.49,1.71]){
    assert.ok(hasVertex(cradleSeated,x+.041,-.372,-6.554)&&hasVertex(room,x+.041,-.705,-6.554),'cradle keepers slide down their guides');
    assert.ok(hasVertex(cradleSeated,x+.061,-.686,-6.655)&&hasVertex(room,x+.061,-.686,-6.655),'both landed cargo lugs stay fixed');
}
assert.ok(hasVertex(cradleSeated,1.96,.331,-6.838)&&hasVertex(room,...armVertex(14,1.96,.471,-6.838)),'upper gripper jaw opens away from cargo');
assert.ok(hasVertex(cradleSeated,1.96,.022,-6.838)&&hasVertex(room,...armVertex(14,1.96,-.118,-6.838)),'lower gripper jaw opens away from cargo');
assert.ok(hasVertex(room,2.17,.13,-7.13)&&hasVertex(room,...armVertex(14,2.20,.22,-6.523)),'the load remains fixed as the elbow clears the wrist');
for(let i=0;i<60;i++)step(64);
assert.equal(roomLoads,countBeforeLatch+25,'the handoff publishes only a bounded fifteen world poses');
assert.equal(state[19],4,'held transfer does not push off');
step();step(64);until(()=>state[19]===5,0);
assert.equal(state[18],0,"release never advertises a stale console speed cue as the hatch");
assert.equal(state[20],5,'hatch guidance is selected after release');
step();assert.equal(state[18],9,'the still-offscreen hatch gets a left cue before counterthrust');
step(64);assert.equal(state[9],0,'cargo is too far from hatch to grip');
assert.equal(state[10],0);
until(()=>state[18]===3,0,480);
assert.equal(state[10],0,'coasting past the hatch does not count as a grip');
step(64);assert.equal(state[9],0);
step(0,.272,.34);
while(Math.hypot(state[5],state[7])>.16)step(4);
// Turn back toward the hatch long enough for the free body to catch up.
for(let i=0;i<115&&state[10]!==1;i++)step(0,-.81-state[3],-.15-state[4]);
step();
assert.equal(state[10],1,[...state].join(","));
step(64);until(()=>state[19]===6,64);
 hudIs("Airlock handle secured",true);assert.equal(hint().section,"EVA / AIRLOCK RETURN");
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['-0.94','-0.14','-2.48']);
for(let i=0;i<60;i++)step(64);assert.equal(state[19],6,'holding a capture does not lock it');
const openHatch=room, lockEye=[...state.slice(0,8)];
function locatorColor(m){
 for(let i=0;i<m.length;i+=8){
  if(nearEq(m[i],-1.261)&&nearEq(m[i+1],.2)&&nearEq(m[i+2],-2.785))return [...m.slice(i+3,i+6)].map(x=>x.toFixed(2));
 }
 assert.fail('double-chevron locator must be mounted on the closed hatch');
}
assert.deepEqual(locatorColor(evaRoom),['0.37','0.78','0.69']);
assert.deepEqual(locatorColor(openHatch),['1.00','0.61','0.22']);
step();step(64);assert.equal(state[19],6.5);
 hudIs("Moving hatch bar",false);
const lockHatchPoses=[];
for(let i=0;i<24&&state[19]===6.5;i++){
 const seen=roomLoads;step(i===0||i===2?0:64);
 if(seen!==roomLoads)lockHatchPoses.push({m:room,y:state[13],stage:state[19]});
 assert.deepEqual([...state.slice(0,8)],lockEye);
}
assert.equal(state[19],7);
 hudIs("EVA complete",false);
assert.equal(lockHatchPoses.length,4);
for(const [i,{m,y,stage}] of lockHatchPoses.entries()){
 const t=(i+1)/4;
 assert.ok(nearEq(y,-.14+.11*t*t*(3-2*t))&&hasVertex(m,-1.11,y,-2.398)&&hasVertex(m,-1.015,y,-2.398),'hatch bar and wrist stay in contact with the original radius');
 assert.equal(stage,i===3?7:6.5);
 assert.ok(m.some((v,n)=>n%8===0&&nearEq(v,-.971)&&nearEq(m[n+1],-.186)&&nearEq(m[n+2],-2.381)&&nearEq(m[n+3],i===3?.27:1)&&nearEq(m[n+4],i===3?1:.55)),'hatch confirmation changes only at its final stop');
}
assert.deepEqual([...state.slice(0,8)],lockEye);
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['-0.94','-0.03','-2.48']);
assert.ok(hasVertex(openHatch,-1.11,-.14,-2.398)&&hasVertex(room,-1.11,-.03,-2.398),'actual hatch bar and glove rise together');
assert.ok(hasVertex(openHatch,-1.015,-.14,-2.398)&&hasVertex(room,-1.015,-.03,-2.398),"the machined grip keeps the authored glove radius");
assert.ok(hasVertex(room,2.17,.13,-7.13)&&hasVertex(room,.49+.041,-.705,-6.554),'cargo stays seated under its closed keepers');
assert.deepEqual(locatorColor(room),['0.28','0.99','0.58']);
for(let i=0;i<30;i++){step();step(64);}
assert.equal(state[19],7);
assert.equal(roomLoads,countBeforeLatch+29,'only the four hatch poses republish geometry');
reset();assert.deepEqual(capture(),evaStart,'reset restores the current exercise');
assert.deepEqual(room,evaRoom);
// Old outboard barrier is gone. Coast through it without a reset or a hidden brake.
for(let i=0;i<60;i++)step(2);
assert.ok(state[0]>0.6);const drift=state[5];
for(let i=0;i<90;i++)step();
assert.ok(state[0]>1.51 && Math.abs(state[5]-drift)<.001 && state[19]===0);
reset();assert.deepEqual(capture(),evaStart);
step(0,.9,.45);
assert.ok(Math.abs(state[21]+.03)<.02 && state[3]>.8,'body trails head turn');
engine.set_thrust(0,.5);step();
assert.ok(state[23]>.30 && state[24]>.16 && state[25]<-.24,'analog forward thrust has head-relative x/y/z components');
engine.set_thrust(0,0);step();assert.deepEqual([...state.slice(23,26)],[0,0,0]);
reset();
for(let i=0;i<200;i++)step(1);
assert.ok(state[0]>-1.371&&state[0]<-1.369&&state[5]===0&&state[26]===1,'hull stops a direct inward burn');
assert.ok(state[7]>0,'station contact preserves tangential translation');
step(64);assert.equal(state[17],0,'skipping the rails cannot lock cargo');
engine.select_deck(0);step(0,0,0,0);
assert.deepEqual(capture(),initial,'indoor mode round-trips without exterior state');
assert.equal(roomLoads,33,'only deck changes, locks, authored alignment poses and reset republish geometry');
console.log('EVA WASM: geometry, distinct grip, eligibility and release, exterior bulkhead, reset and indoor round-trip passed.');

const raw=readFileSync(new URL('./apollo-arm.bin',import.meta.url));
assert.equal(raw.toString('ascii',0,4),'KAV3');
const vn=raw.readUInt32LE(4), ni=raw.readUInt32LE(8);
assert.ok(vn<=40000 && ni%3===0 && ni>=24000 && ni<=32000 && raw.length<200000);
assert.equal(raw.length,12+vn*24+ni*2);
const phase=(i,o)=>raw.readInt16LE(12+i*24+o)/10000;
let wrapped=0,intersect=0,fittedNormals=0,sleeveTexels=0,gloveTexels=0;
for(let i=0;i<vn;i++){
 const y=phase(i,8),z=phase(i,10);
 const radius=Math.hypot(y,z);
 if(z<-.023 && radius>.082 && radius<.119)wrapped++;
 if(radius<.08)intersect++;
 if(Math.hypot(...[16,17,18].map(c=>raw.readInt8(12+i*24+c)))>110)fittedNormals++;
 const uvBits=raw.readUInt8(12+i*24+15), u=(uvBits%16)*256+raw.readUInt8(12+i*24+22);
 const v=Math.floor(uvBits/16)*256+raw.readUInt8(12+i*24+23);
 assert.ok(u>0&&u<4095&&v>0&&v<4095,'UVs remain inside their padded layers');
 if(u<2048)gloveTexels++;else sleeveTexels++;

}
assert.ok(wrapped>0.08*vn && intersect<0.02*vn,'baked fingers wrap the rear rail without material collision');
assert.ok(fittedNormals>vn*.98,'export carries authored normals');
assert.ok(gloveTexels>1800&&sleeveTexels>1000,'UV lanes select both Apollo material tiles');
for(let i=0;i<ni;i++)assert.ok(raw.readUInt16LE(12+vn*24+i*2)<vn);
assert.deepEqual(evaContact.slice(12,15).map(x=>x.toFixed(2)),['-0.18','-0.57','-1.59']);
console.log('Apollo forearm: two indexed authored poses, contact fit, normals, index bounds and compact asset passed.');

engine.select_deck(1);step(0,0,0,0);
engine.select_arm(1);
const uploadsForExternal=handLoads;
until(()=>state[10]===1,260);
step(64);until(()=>state[9]===2,64);
assert.equal(handLoads,uploadsForExternal,'a loaded arm omits Wosy fallback tessellation and uploads');
for (let next=1;next<3;next++) {
 step();step(64);until(()=>state[9]===0,0);
 until(()=>state[10]===1,260);
 step(64);until(()=>state[9]===2,64);
 assert.equal(state[16],next);
}
assert.deepEqual([...state.slice(12,15)],openPin);
step();step(64);until(()=>state[17]===1,0);
assert.deepEqual([...state.slice(12,15)],seatedPin,'the imported forearm receives the same exact pre/post seating endpoints');
assert.equal(handLoads,uploadsForExternal,'seating the imported forearm never calls the mesh fallback');
engine.select_arm(0);step();
assert.equal(handLoads,uploadsForExternal+1,'the authored mesh can be restored without resetting EVA');
assert.equal(state[9],2);
console.log('EVA renderer: no procedural arm work while the fitted asset is present, fallback keeps the same Wosy grip.');

// Ordinary EVA starts in a near-circular 390 km reference orbit. Even a
// complete retrograde tank burn must not magically trigger atmospheric entry.
engine.select_deck(1);step(0,.03,.095,0);engine.select_arm(1);
for(let i=0;i<1500;i++)step(8);
assert.equal(state[29],0);
assert.equal(state[31],0,'finite tank limits total impulse');
assert.equal(state[25],0,'a depleted tank produces no actual acceleration');
assert.ok(state[7]>19&&state[7]<21,'full retrograde tank contributes about 20 m/s');
let lowest=state[28];
for(let i=0;i<6500;i++){step(512);lowest=Math.min(lowest,state[28]);}
assert.ok(lowest>300000&&state[29]===0,'realistic suit impulse is insufficient for atmospheric entry from EVA orbit');
engine.select_reentry();step(0,0,0,0);
assert.equal(state[28],260000);assert.equal(state[32],1);
let warpTicks=0,lastAbove=state[28];
for(;warpTicks<2000&&state[29]===0;warpTicks++){
  lastAbove=state[28];step(512);
  if(state[29]===0)assert.equal(state[30],120);
}
assert.ok(warpTicks>700&&warpTicks<1450);
assert.ok(Math.abs(state[37]-warpTicks*2)<.01);
assert.ok(lastAbove>120000&&state[28]<=120000&&state[29]===1&&state[30]===1,'a distinct low-perigee orbit crosses threshold and exits warp on the crossing tick');
const entryPos=[...state.slice(0,3)];
step(4|64);assert.deepEqual([...state.slice(0,3)],entryPos,'entry is terminal until player reset');
reset();assert.equal(state[28],260000);assert.equal(state[29],0);assert.equal(state[30],1);assert.equal(state[31],20);
engine.select_deck(1);step(0,0,0,0);
assert.equal(state[28],390000);assert.equal(state[32],0);
console.log('Orbital dynamics: full retrograde EVA tank remains above '+(lowest/1000).toFixed(0)+' km; separate low-perigee case crosses 120 km after '+warpTicks*2+' orbital seconds; reset passed.');
const cameraBefore=[...state];
assert.equal(engine.camera_clip(0,0,0,3,0,3),1,'unobstructed chase boom keeps its full length');
assert.ok(Math.abs(engine.camera_clip(0,0,0,-3,0,0)-(-1.37/-3-.04))<.0001,'chase boom clips using the same station hull');
step(0,0,0,0);assert.deepEqual([...state],cameraBefore,'camera clipping has no lasting simulation input or pose effects');
console.log('Camera: unobstructed and hull-obstructed chase sweeps leave Wosy flight state unchanged.');

// Independently test the drawn rigid-digit transforms against the cylindrical
// rail, using real capture/hold/release poses from the existing mission above.
// Bound each pressure digit by its largest radial envelope along its long axis.
// The wide-phone playback can press Grip sooner than the deterministic
// keyboard mission above. Keep its first observed fixed-tick pose as a guard.
const fastLandscapeReach=new Float32Array(38);
fastLandscapeReach.set([-.038953826,-.12249782,-.94724554,-.03049158,-.09634365],0);
fastLandscapeReach.set([.006554406,1,1,1,-.26837078,-.52280921,-1.74621487,1],8);
fastLandscapeReach.set([-.03002458,-.09506718],21);
captureFrames.push(fastLandscapeReach);
// The hatch approach can come in below the handle on desktop.
const lowHatchReach=new Float32Array(38);
lowHatchReach.set([-0.3595730364,-0.02891877852,-1.90815413,-0.7693254352,-0.1500000209],0);
lowHatchReach.set([0.5337272882,1,0,1,-0.7766054273,-0.2747149467,-2.586382151,1],8);
lowHatchReach.set([5,0,0.381921947,-0.07271004468],19);
captureFrames.push(lowHatchReach);
const handPose=new ProceduralPose();
const phalanges=[[.047,.041,.032],[.050,.044,.034],[.047,.042,.033],[.041,.038,.029]];
let gripClearance=Infinity,heldSamples=0,sweepSamples=0;
for(const frame of captureFrames){
 const grip=stationGrip(frame);
 if(!grip)continue;
 const {palette,joints}=handPose.solve(frame);
 const nearest=(joint,beg,end,radius)=>{
  const m=palette.subarray(joint*16,joint*16+16);
  const [dy,dz]=[m[13]-grip.center[1],m[14]-grip.center[2]], py=m[9],pz=m[10];
  const d=py*py+pz*pz, t=Math.max(beg,Math.min(end,d?-(dy*py+dz*pz)/d:beg));
  return Math.hypot(dy+py*t,dz+pz*t)-radius-grip.radius;
 };
 for(const [i,digit] of phalanges.entries())for(const [k,l] of digit.entries())
  gripClearance=Math.min(gripClearance,nearest(12+i*3+k,-.05*l,1.05*l,.0124-k*.0016-i*.0004));
 gripClearance=Math.min(gripClearance,nearest(24,-.005,.041,.015),nearest(25,-.005,.037,.013));
 if(frame[9]===2&&frame[8]===1){
  heldSamples++;
  assert.ok(joints.Left.error<=.001,'glove wrist can reach its fitted contact without stretching its limb lengths');
 }else sweepSamples++;
}
assert.ok(heldSamples>5&&sweepSamples>60);
assert.ok(gripClearance>=0,'digit volume must not penetrate any modeled bar during the mission sweep: '+gripClearance);
console.log('Grip render: '+sweepSamples+' transition and '+heldSamples+' held samples. Minimum conservative clearance '+(gripClearance*1000).toFixed(2)+' mm.');

// The free body catches the gaze around a signed wrapping boundary. The
// anchored stance preserves world contacts under sustained excessive input.
const az=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
engine.select_arm(1);engine.select_deck(1);step(0,0,0,0);
let seams=0;
for(const direction of [1,-1]){
 let lastHead=state[3],lastBody=state[21];
 for(let i=0;i<620;i++){
  step(0,direction*.035,i<220?direction*.032:0);
  if(Math.abs(state[3]-lastHead)>3)seams++;
  assert.ok(Math.abs(az(state[3],state[21]))<=.9401&&Math.abs(state[4]-state[22])<=.6001,'free neck stays within its signed envelope');
  assert.ok(direction*az(state[3],lastHead)>-.0001&&Math.abs(az(state[3],lastHead))<.075,'continued turning keeps direction across the seam');
  assert.ok(Math.abs(az(state[21],lastBody))<=.015,'free body follows at its slower physical rate');
  lastHead=state[3];lastBody=state[21];
 }
}
assert.ok(seams>=2,'free look crossed the signed yaw seam in both directions');
for(let i=0;i<180;i++)step();
assert.ok(Math.abs(az(state[3],state[21]))<.025&&Math.abs(state[4]-state[22])<.025,'free body catches up without new input');
reset();until(()=>state[10]===1,260);
step(64);until(()=>state[9]===2,0);
const railEye=[...state.slice(0,3)], railHand=[...state.slice(12,15)], anchor=[state[3],state[4]];
for(const direction of [1,-1,1]){
 for(let i=0;i<180;i++){
  step(0,direction*1.7,direction*1.6);
  assert.ok(Math.abs(az(state[3],state[21]))<=.3701&&Math.abs(state[4]-state[22])<=.2901,'held neck stays within reduced envelope');
  assert.ok(Math.abs(az(state[3],anchor[0]))<=.4201&&Math.abs(state[4]-anchor[1])<=.3201,'held camera cannot wind around the grip');
  assert.ok(Math.abs(az(state[21],anchor[0]))<=.101&&Math.abs(state[22]-anchor[1])<=.081,'held torso stays within its small anchored lean');
  assert.deepEqual([...state.slice(0,3)],railEye);
  assert.deepEqual([...state.slice(12,15)],railHand);
 }
}
step();let beforeTurn=state[3];step(64,.025);
for(let i=0;i<25;i++){
 assert.ok(Math.abs(az(state[3],beforeTurn))<.085,'release widens the angular envelope without a snap');
 beforeTurn=state[3];step(0,.025);
}
assert.equal(state[9],0,'head continues turning after release');
console.log('Head and torso: free signed seam crossings, catch-up, smaller held envelope, immutable held contact anchors and gradual release passed.');

// The remote support skeleton is immutable across all cargo/rail poses.
assert.equal(hullLoads,1);
assert.equal(hull.length%24,0);assert.ok(hull.length/24<6200&&hull.every(Number.isFinite));
engine.select_deck(1);step(0,0,0,0);
const clip=(a,b)=>engine.camera_clip(...a,...b);
assert.ok(clip([-14,6,-12],[-14,1,-12])<.75,'concrete outer power blanket stops a sweep');
assert.equal(clip([-11.5,6,-12],[-11.5,1,-12]),1,'free space between blankets has no proxy blocker');
assert.ok(clip([-4.69,1,-25],[-4.69,1,-21])<.6,'aft freighter has a physical shield');
assert.ok(clip([-15,-.30,-5.8],[-10,-.30,-5.8])<.6,'port observation bay has a physical end cap');
assert.ok(clip([-4.69,6,2.5],[-4.69,4,2.5])<.3,'communications feed is solid');
assert.equal(clip([5.84,2.30,-11],[5.84,2.30,-9.0]),1,'a real window between diagonal truss members is passable');
console.log('Complete station: immutable batch, port lab, aft freighter, antenna, power blankets, navigable gaps passed.');
// Pilot the real EVA integrator to the wing. These are ordinary suit
// thruster commands, not writes into WASM memory or alternate collision code.
function reachPoint(dest){
 let carry=0;
 const dt=1/60;
 engine.tick(0,0,0,-state[4]);
 for(let i=0;i<3100;i++){
  const delta=dest.map((v,k)=>v-state[k]),distance=Math.hypot(...delta);
  if(distance<.14&&Math.hypot(...state.slice(5,8))<.075)return;
  const cruise=Math.min(2.4,.50*distance);
  const accel=delta.map((v,k)=>1.8*(v*cruise/Math.max(.01,distance)-state[5+k]));
  const yaw=state[3],sy=Math.sin(yaw),cy=Math.cos(yaw);
  const a=Math.max(-1,Math.min(1,accel[1]/1.52));
  carry+=a;
  const ay=carry>.5?1:carry<-.5?-1:0;
  carry-=ay;
  engine.set_thrust((accel[0]*cy+accel[2]*sy)/1.52,(accel[0]*sy-accel[2]*cy)/1.52);
  engine.tick(dt,ay>0?16:ay<0?32:0,0,0);
 }
 assert.fail('unreachable EVA waypoint '+dest+'; eye '+state.slice(0,3));
}
for(const [x,solid] of [[-14,true],[-11.50,false]]){
 engine.select_deck(1);engine.tick(0,0,0,0);reachPoint([1,7.4,1]);reachPoint([x,6,-12]);
 engine.set_thrust(0,0);let touched=false;
 for(let i=0;i<120;i++){engine.tick(.032,32,0,0);touched||=Boolean(state[26]);}
 assert.equal(touched,solid);
 if(solid){assert.ok(state[1]>2.90&&state[1]<2.95&&Math.abs(state[6])<.001,'suit rests at real panel height + clearance');}
 else{assert.ok(state[1]<1,'suit crossed the actual gap');}
}
console.log('EVA flight: descended on the power blanket and through the open adjacent channel.');

engine.select_deck(1);step(0,0,0,0);
until(()=>state[18]===2,4,120);
hudIs("Approach the airlock rail",false);
assert.equal(hint().action,"Slow down");assert.equal(hint().short,"Thrust back");
assert.ok(hint().burn);
console.log("Wosy HUD: exercise labels, actionable stages, off-axis reticle, and counterthrust cues passed.");
