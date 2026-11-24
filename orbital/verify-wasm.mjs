import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=process.argv[2] ?? new URL('./orbital.wasm',import.meta.url);
const wasm=new WebAssembly.Module(readFileSync(path));
assert.deepEqual(WebAssembly.Module.imports(wasm).map(e=>e.module+'.'+e.name),['orbital.scenery','orbital.hands','orbital.frame']);
let room,hand,state,engine,roomLoads=0,handLoads=0;
function read(p,n){assert.equal(p%4,0);return new Float32Array(engine.memory.buffer,p,n).slice();}
engine=new WebAssembly.Instance(wasm,{orbital:{
 scenery(p,n){room=read(p,n);roomLoads++;},hands(p,n){hand=read(p,n);handLoads++;},
 frame(p,n){assert.equal(n,18);state=read(p,n);}
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
assert.notDeepEqual(box(initial.slice(18)),box(contact.slice(18)),'contact has its own authored hand volume');
const [x,y,z]=box(contact.slice(18));assert.ok(x[0]<.745 && x[1]>.745 && y[1]>-.21 && z[0]<-1.94 && z[1]>-1.94,'contact mesh wraps the handrail');
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
assert.equal(state[15],1);assert.ok(evaRoom.length>=5400*8 && evaRoom.length<=16384*8 && evaRoom.length%24===0);
assert.ok(evaRoom.every(Number.isFinite) && hand.every(Number.isFinite));
assert.notDeepEqual(initial.slice(18),evaStart.slice(18),'EVA uses a separately authored pressurized glove');
assert.ok(evaRoom.some((x,i)=>i%8===4 && x<.14),'station includes the dark solar cell trim');
step(64);assert.equal(state[9],0);step();
until(()=>state[10]===1,4);
step(0,1.15);assert.equal(state[10],0);step(64);assert.equal(state[9],0);
step(0,-1.15);assert.equal(state[10],1);
step(64);until(()=>state[9]===2,64);
const evaContact=capture();
assert.deepEqual(evaContact.slice(5,10),[0,0,0,1,2]);
assert.notDeepEqual(evaStart.slice(18),evaContact.slice(18));
const extents=box(evaContact.slice(18));
assert.ok(extents[1][1]>-.472 && extents[2][0]<-1.665 && extents[2][1]>-1.50,'fingers are authored both above and behind the rounded rail');
const heldUploads=handLoads;
for(let i=0;i<85;i++)step(64|16|2);assert.deepEqual(capture(),evaContact);
assert.equal(handLoads,heldUploads,'a still grip does not re-upload meshes or invalidate cached shadows');
step();
step(64);assert.equal(state[11],2);assert.ok(state[7]<0);
until(()=>state[9]===0,0);
assert.equal(state[16],1);assert.equal(state[17],0);
step(64);assert.equal(state[9],0,'cannot trigger the next rail as soon as released');step();
until(()=>state[10]===1,4);
step(64);until(()=>state[9]===2,64);
assert.equal(state[16],1);assert.equal(state[17],0);
assert.equal(state[14].toFixed(2),'-3.43');
step();step(64);until(()=>state[9]===0,0);
assert.equal(state[16],2);
until(()=>state[10]===1,4);
step(64);until(()=>state[9]===2,64);
const beforeLatch=room, countBeforeLatch=roomLoads;
assert.equal(state[14].toFixed(2),'-4.88');
for(let i=0;i<120;i++)step(64);
assert.equal(state[17],0,'holding grip does not seat the latch automatically');
step();step(64);
assert.equal(state[17],1);assert.equal(state[9],2,'latch is secured with the glove still braced');
assert.equal(roomLoads,countBeforeLatch+1);
assert.notDeepEqual(room,beforeLatch,'the contact lever and status light visibly change');
function luminanceCode(mesh){
 const found=[];
 for(let i=0;i<mesh.length;i+=8){
  if(mesh[i]>-.03&&mesh[i]<.20&&mesh[i+1]>.062&&mesh[i+1]<.112&&mesh[i+2]>-5.09&&mesh[i+2]<-5.05&&mesh[i+7]>.98)
   found.push([mesh[i+3],mesh[i+4],mesh[i+5]]);
 }
 return found;
}
assert.ok(luminanceCode(beforeLatch).some(rgb=>rgb[0]>.9&&rgb[1]<.65),'physical latch light starts amber');
assert.ok(luminanceCode(room).some(rgb=>rgb[0]<.4&&rgb[1]>.90),'physical latch light ends green');
step();step(64);assert.equal(roomLoads,countBeforeLatch+1,'the seated latch cannot fire again');
reset();assert.deepEqual(capture(),evaStart,'reset restores the current exercise');
assert.deepEqual(room,evaRoom);
until(()=>state[2]<-4.719,4);
assert.ok(state[2]>-4.721 && state[7]===0,'EVA cannot pass into the radiator');
step(64);assert.equal(state[17],0,'skipping the rails cannot lock cargo');
engine.select_deck(0);step(0,0,0,0);
assert.deepEqual(capture(),initial,'indoor mode round-trips without exterior state');
assert.equal(roomLoads,5,'only deck changes, latch and reset republish stationary geometry');
console.log('EVA WASM: geometry, distinct grip, eligibility and release, exterior bulkhead, reset and indoor round-trip passed.');

const raw=readFileSync(new URL('./apollo-arm.bin',import.meta.url));
assert.equal(raw.toString('ascii',0,4),'KAV2');
const vn=raw.readUInt32LE(4), ni=raw.readUInt32LE(8);
assert.ok(vn<=40000 && ni%3===0 && ni>=24000 && ni<=32000 && raw.length<200000);
assert.equal(raw.length,12+vn*24+ni*2);
const phase=(i,o)=>raw.readInt16LE(12+i*24+o)/10000;
let wrapped=0,intersect=0,fittedNormals=0;
for(let i=0;i<vn;i++){
 const y=phase(i,8),z=phase(i,10);
 const radius=Math.hypot(y,z);
 if(z<-.023 && radius>.082 && radius<.119)wrapped++;
 if(radius<.08)intersect++;
 if(Math.hypot(...[16,17,18].map(c=>raw.readInt8(12+i*24+c)))>110)fittedNormals++;
}
assert.ok(wrapped>0.08*vn && intersect<0.02*vn,'baked fingers wrap the rear rail without material collision');
assert.ok(fittedNormals>vn*.98,'export carries authored normals');
for(let i=0;i<ni;i++)assert.ok(raw.readUInt16LE(12+vn*24+i*2)<vn);
assert.deepEqual(evaContact.slice(12,15).map(x=>x.toFixed(2)),['-0.18','-0.57','-1.59']);
console.log('Apollo forearm: two indexed authored poses, contact fit, normals, index bounds and compact asset passed.');

engine.select_deck(1);step(0,0,0,0);
engine.select_arm(1);
const uploadsForExternal=handLoads;
until(()=>state[10]===1,4);
step(64);until(()=>state[9]===2,64);
assert.equal(handLoads,uploadsForExternal,'a loaded arm omits Wosy fallback tessellation and uploads');
engine.select_arm(0);step();
assert.equal(handLoads,uploadsForExternal+1,'the authored mesh can be restored without resetting EVA');
assert.equal(state[9],2);
console.log('EVA renderer: no procedural arm work while the fitted asset is present, fallback keeps the same Wosy grip.');
