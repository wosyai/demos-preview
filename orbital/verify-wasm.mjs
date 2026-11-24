import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const path=process.argv[2] ?? new URL('./orbital.wasm',import.meta.url);
const wasm=new WebAssembly.Module(readFileSync(path));
assert.deepEqual(WebAssembly.Module.imports(wasm).map(e=>e.module+'.'+e.name),['orbital.scenery','orbital.hands','orbital.frame']);
let room,hand,state,engine,roomLoads=0;
function read(p,n){assert.equal(p%4,0);return new Float32Array(engine.memory.buffer,p,n).slice();}
engine=new WebAssembly.Instance(wasm,{orbital:{
 scenery(p,n){room=read(p,n);roomLoads++;},hands(p,n){hand=read(p,n);},
 frame(p,n){assert.equal(n,16);state=read(p,n);}
}}).exports;
engine._start();
const step=(keys=0,yaw=0,pitch=0,dt=1/60)=>engine.tick(dt,keys,yaw,pitch);
const until=(test,keys,cap=400)=>{for(let i=0;i<cap&&!test();i++)step(keys);assert.ok(test(),'state did not arrive');};
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
assert.notDeepEqual(box(initial.slice(16)),box(contact.slice(16)),'contact has its own authored hand volume');
const [x,y,z]=box(contact.slice(16));assert.ok(x[0]<.745 && x[1]>.745 && y[1]>-.21 && z[0]<-1.94 && z[1]>-1.94,'contact mesh wraps the handrail');
step();step(64);assert.equal(state[9],3);assert.equal(state[11],2);assert.ok(state[7]<0);
const before=state[2];until(()=>state[9]===0,0);assert.ok(state[2]<before);
reset();assert.deepEqual(capture(),initial,'reset restores exact initial pose');
until(()=>state[7]<-.65,4);
const velocity=state[7];step();assert.ok(state[7]<-.6,'release thrust retains momentum');for(let n=0;n<35;n++)step(128);
assert.ok(Math.abs(state[7])<Math.abs(velocity)*.15,'brake arrests drift');
until(()=>state[1]>1.019,16);assert.ok(state[1]<=1.02001 && state[6]===0);
assert.equal(roomLoads,1,'static shell is published only once across interactions and reset');
console.log('Orbital WASM: station batch, initial/contact poses, reach/aim gating, trigger latch, held pose, push-off, inertia, braking and boundaries passed.');
