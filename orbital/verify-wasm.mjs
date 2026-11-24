import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=process.argv[2] ?? new URL('./orbital.wasm',import.meta.url);
const wasm=new WebAssembly.Module(readFileSync(path));
assert.deepEqual(WebAssembly.Module.imports(wasm).map(e=>e.module+'.'+e.name),['orbital.scenery','orbital.hands','orbital.frame']);
let room,hand,state,engine,roomLoads=0,handLoads=0;
function read(p,n){assert.equal(p%4,0);return new Float32Array(engine.memory.buffer,p,n).slice();}
engine=new WebAssembly.Instance(wasm,{orbital:{
 scenery(p,n){room=read(p,n);roomLoads++;},hands(p,n){hand=read(p,n);handLoads++;},
 frame(p,n){assert.equal(n,21);state=read(p,n);}
}}).exports;
engine._start();
const step=(keys=0,yaw=0,pitch=0,dt=1/60)=>engine.tick(dt,keys,yaw,pitch);
const until=(test,keys,cap=400)=>{for(let i=0;i<cap&&!test();i++)step(keys);assert.ok(test(),'state did not arrive '+[...state]);};
let initial,contact;
const capture=()=>[...state,...hand];
function reset(){engine.reset();step(0,0,0,0);}
reset();
initial=capture();
assert.ok(room.length>=2500*8 && room.length<=4096*8 && room.length%24===0);
assert.ok(room.every(Number.isFinite));assert.ok(hand.every(Number.isFinite));
step(64);assert.equal(state[9],0,'cannot grip from spawn');step();
until(()=>state[10]===1,4);
step(0,1.25);assert.equal(state[10],0,'cannot grip when facing away');step(64);assert.equal(state[9],0);
step(0,-1.25);assert.equal(state[10],1);
step(64);assert.equal(state[9],1);
until(()=>state[9]===2,64);
contact=capture();
for(let i=0;i<90;i++)step(64|4|2|16);
assert.deepEqual(capture(),contact,'held action/thrust cannot exit the frozen handrail pose');
assert.deepEqual(contact.slice(5,10),[0,0,0,1,2]);
const box = (m) => [0,1,2].map(i=>{const a=m.filter((_,j)=>j%8===i);return [Math.min(...a),Math.max(...a)];});
assert.notDeepEqual(box(initial.slice(21)),box(contact.slice(21)),'contact has its own authored hand volume');
const [x,y,z]=box(contact.slice(21));assert.ok(x[0]<.745 && x[1]>.745 && y[1]>-.21 && z[0]<-1.94 && z[1]>-1.94,'contact mesh wraps the handrail');
step();step(64);assert.equal(state[9],3);assert.equal(state[11],2);assert.ok(state[7]<0);
const before=state[2];until(()=>state[9]===0,0);assert.ok(state[2]<before);
reset();assert.deepEqual(capture(),initial,'reset restores exact initial pose');
until(()=>state[7]<-.65,4);
const velocity=state[7];step();assert.ok(state[7]<-.6,'release thrust retains momentum');for(let n=0;n<35;n++)step(128);
assert.ok(Math.abs(state[7])<Math.abs(velocity)*.15,'brake arrests drift');
until(()=>state[1]>1.019,16);assert.ok(state[1]<=1.02001 && state[6]===0);
assert.equal(roomLoads,1,'static shell is published only once across interactions and reset');
console.log('Orbital WASM: station batch, initial/contact poses, reach/aim gating, trigger latch, held pose, push-off, inertia, braking and boundaries passed.');

engine.select_deck(1);step(0,0,0,0);
const evaStart=capture(),evaRoom=room;
assert.equal(state[20],1,'the Wosy route starts with only the first grip visible as active');
const lenses=Array.from({length:5},(_,i)=>1.10+i*.01);
for(const material of lenses)assert.ok(evaRoom.some((n,i)=>i%8===7&&Math.abs(n-material)<.0001),'every cue has actual tagged 3D geometry');
assert.ok(evaRoom.length/24<6350,'route indicators stay within the original static batch');
assert.equal(state[15],1);assert.ok(evaRoom.length>=5400*8 && evaRoom.length<=19000*8 && evaRoom.length%24===0);
assert.ok(evaRoom.every(Number.isFinite) && hand.every(Number.isFinite));
const maskedPanel=[];
for(let i=0;i<evaRoom.length;i+=8)if(Math.abs(evaRoom[i+7]-.18375)<.0001)maskedPanel.push(evaRoom.slice(i,i+8));
assert.equal(maskedPanel.length,36,'only the relief faces of thermal panel n=7 are registered');
assert.ok(maskedPanel.every(v=>v[0]<-1.41&&v[0]>-1.51&&v[1]>-.761&&v[1]<.051&&v[2]>-6.641&&v[2]<-4.219));
const pressurePanel=[];
for(let i=0;i<evaRoom.length;i+=8)if(Math.abs(evaRoom[i+7]-.752)<.0001)pressurePanel.push(evaRoom.slice(i,i+8));
assert.equal(pressurePanel.length,36,'generated pressure albedo belongs to exactly two formed courses');
assert.ok(pressurePanel.every(v=>v[0]>=-1.586&&v[0]<=-1.530&&v[1]>=-.761&&v[1]<=.961&&v[2]>=-4.161&&v[2]<=-1.739));
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
assert.ok(hatchPoint(0,0,-.65,false),'the hatch has a recessed bulkhead, not a flat painted aperture');
assert.ok(!hatchPoint(0,0,.158,false),'the apertural front ring is open');
assert.ok(hatchPoint(-.063,.611,.177,true)&&hatchPoint(-.432,-.274,-.473,true),'warm lamp fixtures are present at the rim and inside the recess');
const localBounce=[];
for(let i=0;i<evaRoom.length;i+=8)if(evaRoom[i+6]>1)localBounce.push(evaRoom.slice(i,i+8));
assert.ok(localBounce.length>=200&&localBounce.length<500,'practical warmth is baked only into the hatch interior');
assert.ok(localBounce.every(v=>v[0]<-.51&&v[0]>-1.95&&v[2]<-6.06&&v[2]>-7.23&&v[7]<.8));



assert.notDeepEqual(initial.slice(21),evaStart.slice(21),'EVA uses a separately authored pressurized glove');
assert.ok(evaRoom.some((x,i)=>i%8===4 && x<.14),'station includes the dark solar cell trim');
step(64);assert.equal(state[9],0);step();
until(()=>state[10]===1,4);
step(0,1.15);assert.equal(state[10],0);assert.equal(state[18],1,"an off-axis approach gets the optional re-aim cue");step(64);assert.equal(state[9],0);
step(0,-1.15);assert.equal(state[10],1);
assert.equal(state[18],2,"a fast but eligible EVA gets the brake cue");
step(64);
const startEase=[...state.slice(0,5)], weight=state[8];
const targetEase=[0.05,-0.025,-0.88,-0.105,-0.30];
for(let i=0;i<8;i++){
   step(64);
   for(let axis=0;axis<5;axis++){
      const currentRatio=(1-state[8])/(1-weight);
      assert.ok(Math.abs(state[axis]-targetEase[axis]-(startEase[axis]-targetEase[axis])*currentRatio)<1e-5,'position and aim share one camera easing curve');
   }
}
until(()=>state[9]===2,64);
const evaContact=capture();
assert.deepEqual(evaContact.slice(5,10),[0,0,0,1,2]);
assert.notDeepEqual(evaStart.slice(21),evaContact.slice(21));
const extents=box(evaContact.slice(21));
assert.ok(extents[1][1]>-.472 && extents[2][0]<-1.665 && extents[2][1]>-1.50,'fingers are authored both above and behind the rounded rail');
const heldUploads=handLoads;
for(let i=0;i<85;i++)step(64|16|2);assert.deepEqual(capture(),evaContact);
assert.equal(handLoads,heldUploads,'a still grip does not re-upload meshes or invalidate cached shadows');
step();
step(64);assert.equal(state[11],2);assert.ok(state[7]<0);
until(()=>state[9]===0,0);
assert.equal(state[16],1);assert.equal(state[17],0);assert.equal(state[20],2);
step(64);assert.equal(state[9],0,'cannot trigger the next rail as soon as released');step();
until(()=>state[10]===1,4);
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
until(()=>state[10]===1,4);
step(64);until(()=>state[9]===2,64);
const beforeLatch=room, countBeforeLatch=roomLoads;
const openPin=[...state.slice(12,15)], openGlove=hand, openHandLoads=handLoads;
assert.ok(room.length<=19000*8,'exterior geometry fits without clipping the assembly batch');
assert.equal(state[14].toFixed(2),'-4.88');
for(let i=0;i<120;i++)step(64);
assert.equal(state[17],0,'holding grip does not seat the latch automatically');
step();step(64);
assert.equal(state[17],1);assert.equal(state[9],2,'latch is secured with the glove still braced');
assert.equal(roomLoads,countBeforeLatch+1);
assert.notDeepEqual(room,beforeLatch,'the contact lever and status light visibly change');
const seatedPin=[...state.slice(12,15)];
assert.ok(Math.abs(seatedPin[1]-openPin[1]-.12)<1e-5,'Wosy moves the held wrist exactly with the detent');
assert.equal(seatedPin[0],openPin[0]);assert.equal(seatedPin[2],openPin[2]);
assert.notDeepEqual(hand,openGlove,'fallback glove reaches the same seated endpoint');
assert.equal(handLoads,openHandLoads+1,'fallback uploads the hand exactly once for seating');
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
assert.ok(luminanceCode(room).some(rgb=>rgb[0]<.4&&rgb[1]>.90),'physical latch light ends green');
step();step(64);
assert.equal(roomLoads,countBeforeLatch+1,'releasing the seated lock does not regenerate the station');
assert.equal(state[9],3);
until(()=>state[19]===1,0);assert.equal(state[10],0);
until(()=>state[0]>.77,0);
assert.equal(state[18],3);assert.equal(state[10],0,'drifting through reach is not sufficient');
step(64);assert.equal(state[9],0);step(128);
until(()=>state[18]===4,128);
assert.equal(state[10],0,'braking does not bypass aim');
assert.deepEqual([...state.slice(5,8)],[0,0,0],'alignment brake stops residual drift rather than making the player chase a moving target');
step(64);assert.equal(state[9],0);
step(0,1.00);assert.equal(state[18],5,'overshooting the light reverses the Wosy reticle cue');
step(128,-.65);assert.equal(state[10],1);assert.equal(state[18],0);
step(64);until(()=>state[19]===2,64);
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['1.09','-0.54','-4.81']);
for(let i=0;i<60;i++)step(64);assert.equal(state[19],2,'holding the grip never seats the alignment handle');
const suspended=room;
step();step(64);
assert.equal(state[19],3);
const nearEq=(x,y)=>Math.abs(x-y)<.0001;
const hasVertex=(m,x,y,z)=>m.some((v,i)=>i%8===0&&nearEq(x,v)&&nearEq(y,m[i+1])&&nearEq(z,m[i+2]));
assert.ok(hasVertex(suspended,2.17,.53,-7.13)&&hasVertex(room,2.17,.13,-7.13),'capsule travels from suspension to the capture shoes');
assert.ok(hasVertex(suspended,.47,.873,-6.64)&&hasVertex(room,.47,.473,-6.64),'freight shell bevel moves with the same registered cargo stroke');
assert.ok(hasVertex(suspended,2.20,.62,-6.523)&&hasVertex(room,2.20,.22,-6.523),'the captive wrist tracks the same travel');
assert.ok(hasVertex(suspended,.49,-.404,-7.45)&&hasVertex(room,.49,-.404,-7.45),'capture shoes remain fixed to the truss');
const span=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
const sh=[3.23,1.20,-7.81], elbow=[2.88,.46,-6.89], finalElbow=[2.8510624,.464856,-6.897602],
startW=[2.20,.62,-6.62], endW=[2.20,.22,-6.62];
assert.ok(hasVertex(suspended,...elbow.map((v,i)=>i===2?v+.097:v))&&hasVertex(room,...finalElbow.map((v,i)=>i===2?v+.097:v)),'elbow geometry uses the validated endpoint coordinates');
assert.ok(nearEq(span(sh,elbow),span(sh,finalElbow)) && nearEq(span(elbow,startW),span(finalElbow,endW)),'both physical arm links retain their lengths');
const wristIndicator=(m)=>m.some((f,i)=>i%8===4&&f>.95&&m[i-4]>2.12&&m[i-4]<2.28&&m[i-3]>0&&m[i-3]<.05&&m[i-2]>-6.59&&m[i-2]<-6.56&&m[i+3]>.9);
assert.equal(wristIndicator(beforeLatch),false);
assert.equal(wristIndicator(room),true,'the local seating endpoint changes the remote gripper status');
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['1.09','-0.43','-4.81']);
assert.equal(roomLoads,countBeforeLatch+2,'only the new seated handle updates the cached alignment piece');
const cradleSeated=room, handoffCamera=[...state.slice(0,8)];
for(let i=0;i<60;i++)step(64);
assert.equal(state[19],3,'held seat input never commands the transfer');
assert.equal(roomLoads,countBeforeLatch+2);
step();step(64);assert.equal(state[19],4);
assert.deepEqual([...state.slice(0,8)],handoffCamera,'handoff keeps the restrained eye and aim fixed');
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['1.09','-0.36','-4.81']);
for(const x of [.49,1.71]){
    assert.ok(hasVertex(cradleSeated,x+.041,-.372,-6.554)&&hasVertex(room,x+.041,-.705,-6.554),'cradle keepers slide down their guides');
    assert.ok(hasVertex(cradleSeated,x+.061,-.686,-6.655)&&hasVertex(room,x+.061,-.686,-6.655),'both landed cargo lugs stay fixed');
}
assert.ok(hasVertex(cradleSeated,1.96,.331,-6.838)&&hasVertex(room,1.96,.471,-6.838),'upper gripper jaw opens away from cargo');
assert.ok(hasVertex(cradleSeated,1.96,.022,-6.838)&&hasVertex(room,1.96,-.118,-6.838),'lower gripper jaw opens away from cargo');
assert.ok(hasVertex(room,2.17,.13,-7.13)&&hasVertex(room,2.20,.22,-6.523),'the load and robot wrist hold steady through the handoff');
for(let i=0;i<60;i++)step(64);
assert.equal(roomLoads,countBeforeLatch+3,'handoff invalidates cached world once');
assert.equal(state[19],4,'held transfer does not push off');
step();step(64);until(()=>state[19]===5,0);
assert.equal(state[18],0,"release never advertises a stale console brake cue as the hatch");
assert.equal(state[20],5,'hatch guidance is selected after release');
step();assert.equal(state[18],9,'the still-offscreen hatch gets a left cue before braking');
step(64);assert.equal(state[9],0,'cargo is too far from hatch to grip');
assert.equal(state[10],0);
until(()=>state[18]===3,0,480);
assert.equal(state[10],0,'coasting past the hatch does not count as a grip');
step(64);assert.equal(state[9],0);
until(()=>state[18]===5,128);
assert.equal(state[10],0,'stopping alone does not count as facing the hatch');
step(128,-1.43,.20);
assert.equal(state[10],1,[...state].join(","));
step(64);until(()=>state[19]===6,64);
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['-0.94','-0.14','-2.48']);
for(let i=0;i<60;i++)step(64);assert.equal(state[19],6,'holding a capture does not lock it');
const openHatch=room, lockEye=[...state.slice(0,8)];
step();step(64);assert.equal(state[19],7);
assert.deepEqual([...state.slice(0,8)],lockEye);
assert.deepEqual([...state.slice(12,15)].map(n=>n.toFixed(2)),['-0.94','-0.03','-2.48']);
assert.ok(hasVertex(openHatch,-1.11,-.14,-2.398)&&hasVertex(room,-1.11,-.03,-2.398),'actual hatch bar and glove rise together');
assert.ok(hasVertex(room,2.17,.13,-7.13)&&hasVertex(room,.49+.041,-.705,-6.554),'cargo stays seated under its closed keepers');
for(let i=0;i<30;i++){step();step(64);}
assert.equal(state[19],7);
assert.equal(roomLoads,countBeforeLatch+4,'only the hatch endpoint republishes geometry');
reset();assert.deepEqual(capture(),evaStart,'reset restores the current exercise');
assert.deepEqual(room,evaRoom);
until(()=>state[2]<-4.719,4);
assert.ok(state[2]>-4.721 && state[7]===0,'EVA cannot pass into the radiator');
step(64);assert.equal(state[17],0,'skipping the rails cannot lock cargo');
engine.select_deck(0);step(0,0,0,0);
assert.deepEqual(capture(),initial,'indoor mode round-trips without exterior state');
assert.equal(roomLoads,8,'only deck changes, lock, alignment and reset republish stationary geometry');
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
until(()=>state[10]===1,4);
step(64);until(()=>state[9]===2,64);
assert.equal(handLoads,uploadsForExternal,'a loaded arm omits Wosy fallback tessellation and uploads');
for (let next=1;next<3;next++) {
 step();step(64);until(()=>state[9]===0,0);
 until(()=>state[10]===1,4);
 step(64);until(()=>state[9]===2,64);
 assert.equal(state[16],next);
}
assert.deepEqual([...state.slice(12,15)],openPin);
step();step(64);
assert.deepEqual([...state.slice(12,15)],seatedPin,'the imported forearm receives the same exact pre/post seating endpoints');
assert.equal(handLoads,uploadsForExternal,'seating the imported forearm never calls the mesh fallback');
engine.select_arm(0);step();
assert.equal(handLoads,uploadsForExternal+1,'the authored mesh can be restored without resetting EVA');
assert.equal(state[9],2);
console.log('EVA renderer: no procedural arm work while the fitted asset is present, fallback keeps the same Wosy grip.');
