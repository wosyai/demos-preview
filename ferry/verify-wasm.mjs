import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const binary = new WebAssembly.Module(readFileSync(process.argv[2] ?? new URL("ferry.wasm", import.meta.url)));
assert.deepEqual(WebAssembly.Module.imports(binary).map(({ module, name }) => module+"."+name).sort(),
  ["ferry.frame", "ferry.moving", "ferry.world"]);
assert.deepEqual(WebAssembly.Module.exports(binary).map(({ name }) => name).sort(),
  ["_start", "cancel_action", "map_value", "memory", "reset", "route_selection", "route_value", "tick"]);

let engine, frame, world, moving, worldSends = 0;
let walkingBearingSamples=0, drivingBearingSamples=0;
function normalAngle(a) { return Math.atan2(Math.sin(a),Math.cos(a)); }
function verifyBearing(s) {
  const angle=s[29], active=[0,1,8].includes(s[17]);
  if (!active || s[23]<.25) {
    assert.equal(angle,0,"no turning cue away from a route or inside the arrival radius");
    return;
  }
  const expected=normalAngle(Math.atan2(s[24]-s[26],s[25]-s[27])-s[28]);
  assert(Math.abs(angle)<=Math.PI+.000001,"bearing remains in the principal range");
  const error=Math.abs(normalAngle(angle-expected));
  assert(error<.005, `bearing error ${error} at stage ${s[17]}, driving=${s[16]}`);
  if (s[16]===0) walkingBearingSamples++;
  else drivingBearingSamples++;
}
const WORLD_FLOATS=9*4096*6;
const MOVING_FLOATS=24*256*6;
function view(pointer, count, max, stride) {
  assert(Number.isInteger(pointer) && pointer >= 0 && pointer % 4 === 0);
  assert(Number.isInteger(count) && count > 0 && count <= max && count % stride === 0);
  assert(pointer + count * 4 <= engine.memory.buffer.byteLength);
  return new Float32Array(engine.memory.buffer, pointer, count);
}

engine = new WebAssembly.Instance(binary, { ferry: {
  frame(p,n) { assert.equal(n,30); frame=view(p,n,30,1).slice(); assert(frame.every(Number.isFinite)); verifyBearing(frame); },
  world(p,n) { worldSends++; assert(n>120000); assert(view(p,n,WORLD_FLOATS,18).every(Number.isFinite)); world=[p,n]; },
  moving(p,n) {
    view(p,n,MOVING_FLOATS,18);
    assert(world&&(world[0]+world[1]*4<=p||p+n*4<=world[0]),"reported world and moving callback byte ranges never overlap");
    moving=[p,n];
  },
}}).exports;

const step = 1 / 60;
const tick = (x=0,z=0,flags=0,dt=step,aspect=1.65,lookX=0,lookY=0) => engine.tick(dt,x,z,flags,aspect,lookX,lookY);
const run = (n,x=0,z=0,flags=0,dt=step) => { for(let i=0;i<n;i++) tick(x,z,flags,dt); };
const spot = () => [frame[26],frame[27]];
const rawMoving = () => view(...moving,MOVING_FLOATS,18);
const clamp = (x,lo,hi) => Math.max(lo,Math.min(hi,x));

function guidePoints() {
  const key=engine.route_selection();
  if(!key) return [];
  const length=engine.route_value(key,-1,0);
  assert(length>=2&&length<=10);
  return Array.from({length},(_,i)=>[engine.route_value(key,i,0),engine.route_value(key,i,1)]);
}
function closePoint(actual,expected) {
  assert(actual, "expected a real route point");
  assert(Math.hypot(actual[0]-expected[0],actual[1]-expected[1])<.02);
}

function walkTo(x,z) {
  for(let i=0;i<1450;i++) {
    const dx=x-frame[26],dz=z-frame[27],d=Math.hypot(dx,dz);
    if(d<.11)return;
    tick(dx/Math.max(.28,d),dz/Math.max(.28,d),1);
  }
  assert.fail("Walk blocked at "+spot().join(",")+" trying "+x+","+z);
}
function mount() {
  tick(0,0,2);
  assert.equal(frame[16],1);
}
function answerPhone() {
  assert.equal(frame[17],8);
  assert(frame[23]>2,"phone is a nearby, visible first destination");
  walkTo(3.7,-1.95);
  assert.equal(frame[20],6);
  tick(0,0,2);
  assert.equal(frame[17],0);
  assert.equal(frame[18],90,"answering the phone does not start the clock");
}
function pickup() {
  answerPhone();
  const points=[[3.8,-4.6],[3.8,28.9],[-82,28.9],[-82,36.6]];
  const first=guidePoints();
  assert.equal(first.length,4,"walking after the phone suggests the tested street corridor");
  first.forEach((point,i)=>closePoint(point,points[i]));
  for(let i=0;i<points.length;i++) {
    walkTo(...points[i]);
    const remaining=guidePoints();
    const start=Math.min(i,points.length-2);
    assert.equal(remaining.length,points.length-start);
    remaining.forEach((point,j)=>closePoint(point,points[start+j]));
    assert.equal(frame[18],90,"map guidance does not start the tape timer");
  }
  assert.equal(frame[20],3);
  tick(0,0,2);
  assert.equal(frame[17],1);
  assert.equal(frame[18],90);
}
function driver(target,result,limit=540) {
  const events=[];
  let seq=frame[22];
  for(let i=0;i<limit;i++) {
    const [x,z]=typeof target==="function"?target():target;
    const dx=x-frame[26],dz=z-frame[27],a=Math.atan2(dx,dz)-frame[28];
    const turn=Math.atan2(Math.sin(a),Math.cos(a));
    tick(clamp(turn*3.75,-1,1),Math.abs(turn)>.7&&Math.hypot(dx,dz)<6?.64:1);
    if(frame[22]!==seq){
      seq=frame[22]; events.push(frame[21]);
      if(frame[21]===result)break;
    }
  }
  return events;
}
function ped(i) {
  const vertices=rawMoving(), first=(7*330+(frame[16]===0?210:0)+4*150+i*210)*6;
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity,zmin=Infinity,zmax=-Infinity;
  for(let q=first;q<first+210*6;q+=6) {
    xmin=Math.min(xmin,vertices[q]); xmax=Math.max(xmax,vertices[q]);
    ymin=Math.min(ymin,vertices[q+1]); ymax=Math.max(ymax,vertices[q+1]);
    zmin=Math.min(zmin,vertices[q+2]); zmax=Math.max(zmax,vertices[q+2]);
  }
  return [(xmin+xmax)/2,(zmin+zmax)/2,ymax-ymin];
}

engine._start();
engine.reset(0);
const roads=[
  [-111,25.35,110,7.65],[-111,54.5,112,7.6],[-65,-17,9,91.5],[-111,29.1,8,33.4],
  [-4.45,-20,8.9,94.4],[-18.8,-12,5.8,85.4],[-18.8,27.6,26.2,5.9],[-18.8,57,23.3,5.1],
  [-14,125,50,20],[-63.2,-16.02,68,3.54],[-103.85,20.2,47.79,4.9],
  [-127,25.35,16,7.65],[-143,25.35,16,7.65],[-159,25.35,16,7.65],
  [-127,40,14,5.6],[-143,40,16,5.6],[-159,40,16,5.6],
  [-127,54.5,16,7.6],[-143,54.5,16,7.6],[-159,54.5,16,7.6],
  [-127,27,5.4,33],[-143,27,5.4,33],[-159,27,5,33],[-113,40,5.5,5.6]
];
assert.equal(engine.map_value(-1,0),roads.length);
for(const [row,road] of roads.entries()) {
  for(const [column,expected] of road.entries()) {
    assert.equal(engine.map_value(row,column),(row===9||row===10)&&column===1 ?
      Math.fround(Math.fround(row===9 ? -14.25 : 22.65)+Math.fround(row===9 ? -1.77 : -2.45)) :
      Math.fround(expected),`map road ${row} field ${column}`);
  }
}
assert.equal(engine.map_value(roads.length,0),0);
assert.equal(engine.map_value(0,4),0);
assert.equal(frame[16],0); assert.equal(frame[17],8); assert.equal(frame[18],90); assert.equal(frame[20],1);
assert.equal(worldSends,1);
assert(world[0]+world[1]*4<=moving[0] || moving[0]+moving[1]*4<=world[0]);
const scenery=view(...world,WORLD_FLOATS,18).slice(), prior=rawMoving().slice(), projection=frame[0];
if (process.argv[3]) {
  let previous, base;
  base=new WebAssembly.Instance(new WebAssembly.Module(readFileSync(process.argv[3])),{ferry:{
    frame(){},moving(){},
    world(ptr,count){previous=new Float32Array(base.memory.buffer,ptr,count).slice();}
  }}).exports;
  base._start(); base.reset(0);
  assert(previous && scenery.length>previous.length,"the neighborhood adds drawable geometry");
  assert.equal(scenery.length-previous.length,90*6,"three boxes add only the fixed Pier 8 signal housing");
  for(let i=previous.length;i<scenery.length;i+=6) {
    assert(scenery[i]>14.8 && scenery[i+2]>80.35 && scenery[i+2]<80.85,
      "all new housing stays beside the existing rail");
  }
  assert.deepEqual(scenery.subarray(0,previous.length),previous,
    "the immediate waterfront baseline retains all raw positions, colors and material tags");
}
const materialCount=Array(6).fill(0), bulbs=[], pools=[];
for(let i=0;i<scenery.length;i+=18) {
  const tag=Math.floor(scenery[i+3]/2);
  assert(tag>=0&&tag<materialCount.length);
  for(const j of [0,6,12]) {
    assert.equal(Math.floor(scenery[i+j+3]/2),tag,"one explicit band per triangle");
    assert(scenery[i+j+5]>=0,"static paint does not use the contact-shadow channel");
    if(tag===5) bulbs.push([scenery[i+j],scenery[i+j+1],scenery[i+j+2]]);
  }
  materialCount[tag]++;
  if(tag===4&&scenery[i+4]>.2) pools.push([scenery[i],scenery[i+2]]);
}
assert(materialCount[1]>=48&&materialCount[2]>=60&&materialCount[3]===2);
assert.equal(materialCount[4],48); assert.equal(materialCount[5],60);
assert.equal(pools.length,48,"each light-pool triangle has an illuminated center");
const poolLocations=new Map();
for(const [x,z] of pools) {
  const key=[x,z].join(",");
  poolLocations.set(key,(poolLocations.get(key)??0)+1);
}
assert.equal(poolLocations.size,6,"six different lantern positions cast ground light");
const pairedBulbs=new Set();
for(const [key,triangles] of poolLocations) {
  assert.equal(triangles,8,"each lit position has a full falloff fan");
  const [x,z]=key.split(",").map(Number);
  const matching=bulbs.filter(([bx,y,bz])=>Math.hypot(bx-x,bz-z)<.21&&y>3.2);
  assert.equal(matching.length,30,"each pool is directly under one emissive box (5 faces, 10 triangles, 30 vertex records)");
  assert(matching.every(bulb=>!pairedBulbs.has(bulb)),"separate pools point to separate lamps");
  for(const bulb of matching) pairedBulbs.add(bulb);
}
assert.equal(pairedBulbs.size,180,"every emitted lamp vertex belongs to one of the six distinct matched lamps");
tick(0,0,0,0,.53);
assert.notEqual(frame[0],projection); assert.deepEqual(rawMoving(),prior);
function cameraRoute(wide) {
  engine.reset(0);
  const observations=[];
  for(let i=0;i<120;i++) {
    tick(0,0,wide && i===48 ? 4 : 0,step,i<48 ? .53 : 1.65,wide&&i===0?1.1:0,wide&&i===0?-.14:0);
    observations.push({view:frame.slice(0,16),state:frame.slice(16),count:worldSends,
      moving:(i===23||i===119) ? rawMoving().slice() : null});
  }
  return observations;
}
const closeView=cameraRoute(false), switchedView=cameraRoute(true);
for(let i=0;i<120;i++) {
  assert.deepEqual(switchedView[i].state,closeView[i].state,"camera never changes gameplay/HUD state");
  assert.equal(switchedView[i].count,1,"camera never republishes scenery");
  if(closeView[i].moving) assert.deepEqual(switchedView[i].moving,closeView[i].moving,"camera never changes actors");
}
assert(Math.abs(switchedView[0].view[3]-closeView[0].view[3])<.34,"first orbit frame is smoothed");
assert(switchedView[23].view[3]-closeView[23].view[3]>.5,"free orbit changes heading in portrait");
assert(switchedView[47].view[3]-closeView[47].view[3]>.5,"look direction persists after drag release");
assert(switchedView[119].view.every((v,i)=>Math.abs(v-closeView[119].view[i])<.0001),
  "manual recenter returns to the original projection");
function cameraEye() {
  const v=frame;
  const right=v[0]**2+v[8]**2, up=v[1]**2+v[5]**2+v[9]**2;
  return [0,4,8].map(i=>-(v[12]*v[i]/right+v[13]*v[i+1]/up+v[15]*v[i+3]));
}
const cameraHeading=()=>Math.atan2(frame[3],frame[11]);
function framedWallFoot(wide) {
  engine.reset(0);
  for(const p of [[3.8,-4.6],[3.8,5.0],[9.5,5.0]]) walkTo(...p);
  for(let i=0;i<24;i++) tick(0,0,0,step,.53);
  const before=cameraHeading(), position=spot(), views=[];
  for(let i=0;i<44;i++) {
    tick(i<18?.22:0,0,0,step,.53,wide&&i===0?.30:0,wide&&i===0?.09:0);
    const eye=cameraEye();
    assert(eye[2]>3.65 && eye[2]<frame[27]-.55,"walking camera remains in front of the actual north facade");
    assert(eye[1]>2.2 && eye[1]<2.6,"walking camera uses the constrained pose");
    views.push({state:frame.slice(16),heading:cameraHeading(), eye, route:guidePoints()});
  }
  assert(frame[26]>position[0]+.06,"the walking comparison includes real normal-input motion");
  return {before,views};
}
const tightFoot=framedWallFoot(false), wideFoot=framedWallFoot(true);
assert(Math.abs(wideFoot.views[0].heading-wideFoot.before)<.14,"drag does not snap the heading");
assert(wideFoot.views[43].heading-tightFoot.views[43].heading>.24,"wall-constrained walking camera still visibly orbits");
for(let i=0;i<44;i++) {
  assert.deepEqual(wideFoot.views[i].state,tightFoot.views[i].state,"foot map, mission and direction cue are not camera-dependent");
  assert.deepEqual(wideFoot.views[i].route,tightFoot.views[i].route);
}

engine.reset(1);
assert.equal(frame[17],4,"annex is reachable in free roam");
for(const p of [[3.8,-4.6],[3.8,28.9],[-82,28.9],[-118,28.9]]) walkTo(...p);
assert(frame[26]<-117,"the old west edge really opens at the southern junction");
run(140,0,1,1);
assert(frame[27]>32.90 && frame[27]<=33.01,"ordinary movement stops against the same annex storefront the world draws");
for(const p of [[-124,32.95],[-124,43],[-140,43],[-140,58],[-114,58]]) walkTo(...p);
assert(Math.abs(frame[27]-58)<.11,"ordinary movement uses the connected cross streets");
walkTo(-108,58);
assert(frame[26]>-110.69 && Math.abs(frame[27]-58)<.11,
  "the north junction crosses back into the original city");
walkTo(-118,58);
assert(frame[26]<-117 && Math.abs(frame[27]-58)<.11,
  "the same northern junction allows ordinary re-entry");
assert.equal(frame[17],4);
for(const p of [[-124,58],[-124,43],[-108,43]]) walkTo(...p);
assert(frame[26]>-110.69 && Math.abs(frame[27]-43)<.11,
  "the middle annex avenue crosses into the existing west trunk");
walkTo(-108,39.2);
run(140,-1,0,1);
assert(frame[26]>-110.70,
  "the boundary immediately off the middle avenue is still solid");
for(const p of [[-108,43],[-124,43]]) walkTo(...p);
assert(frame[26]<-117 && Math.abs(frame[27]-43)<.11,
  "the middle annex avenue supports ordinary re-entry");
assert.equal(worldSends,1);
engine.reset(0);
tick(0,0,0,0,.53);
tick(0,0,2,.003); assert.equal(frame[16],0);
engine.cancel_action();
tick(0,0,0,.015); assert.equal(frame[16],0);
tick(0,0,2,.003); tick(0,0,0,0,.53); assert.equal(frame[16],0);
tick(0,0,0,.015); assert.equal(frame[16],1);
run(24); assert.equal(frame[16],1);
tick(0,0,2); assert.equal(frame[16],0);

engine.reset(0);
for(const p of [[3.8,-4.6],[3.8,28.9],[-82,28.9],[-82,36.6]]) walkTo(...p);
assert.equal(frame[20],0,"the tape cannot be collected before the phone call");
tick(0,0,2);
assert.equal(frame[17],8);
assert.equal(frame[18],90);
engine.reset(0); pickup();
for(const p of [[-82,28.9],[3.8,28.9],[3.8,70.6],[11.88,70.6],[11.88,82.1]]) walkTo(...p);
assert.equal(frame[20],4,"reachable pier after the on-foot shortcut");
assert(frame[18]>55 && frame[18]<75,"crossing the expanded map costs real round time");
function checkPierView() {
  const upLength=frame[1]**2+frame[5]**2+frame[9]**2;
  const eyeY=-(frame[13]*frame[5]/upLength+frame[15]*frame[7]);
  assert(eyeY<3.25 && eyeY>2.65,"walking camera fits below the Pier 8 marquee");
  const [x,z]=spot(), y=1.23;
  const h=frame[3]*x+frame[7]*y+frame[11]*z+frame[15];
  const px=frame[0]*x+frame[4]*y+frame[8]*z+frame[12];
  const py=frame[1]*x+frame[5]*y+frame[9]*z+frame[13];
  assert(h>2 && Math.abs(px/h)<.25 && Math.abs(py/h)<.32,"the boarding character remains framed under the marquee");
  assert.equal(frame[20],4,"camera never changes the boarding action");
}
checkPierView();
tick(0,0,0,step,.53,.16,.00);
for(let i=0;i<32;i++) tick(0,0,0,step,.53);
checkPierView();
tick(0,0,0,step,.53,Math.PI-.16,0);
for(let i=0;i<45;i++) tick(0,0,0,step,.53);
assert(cameraEye()[2]>frame[27]+2 && cameraEye()[1]>3.45,
  "orbit away from the actual marquee ray restores the ordinary camera height");
assert.equal(frame[20],4,"looking away leaves the boarding cue available");
tick(0,0,4,step,1.65);
for(let i=0;i<32;i++) tick();
checkPierView();
function wakeVertices() {
  const mesh=rawMoving(), wake=[];
  for(let i=0;i<mesh.length;i+=6) {
    if(Math.floor(mesh[i+3]/2)===6) wake.push([mesh[i],mesh[i+2],mesh[i+4]]);
  }
  return wake;
}
function pierAspect() {
  const points=[];
  const mesh=rawMoving();
  for(let i=0;i<mesh.length;i+=6) {
    if(Math.floor(mesh[i+3]/2)===7) points.push(mesh.subarray(i,i+6));
  }
  assert.equal(points.length,6,"one colored lens follows the state without extra batches");
  for(const [x,y,z] of points) assert(x>14.9&&y>1.8&&z>80.45&&z<80.5);
  const [, , ,red,green,blue]=points[0];
  return [red-14,green,blue];
}
const boardingTimeLeft = {};
function boardAndCross(route) {
  assert.equal(frame[20],4,"the pier offers a boarding action on foot");
  assert.equal(wakeVertices().length,0,"a ferry at its berth has no wake");
  assert(pierAspect()[1]>.95,"green aspect follows the ordinary boarding opportunity");
  const pier=spot(), departureTime=frame[18];
  tick(0,0,2);
  assert.equal(frame[17],5,"boarding starts the playable crossing rather than immediately winning");
  assert.equal(frame[18],departureTime,"tape reaches the ferry before the deadline");
  if (route) boardingTimeLeft[route] = frame[18];
  assert.equal(frame[20],0);
  assert(Math.hypot(frame[26]-pier[0],frame[27]-pier[1])<.5,"boarding starts at the player's pier position");
  run(60);
  assert.equal(frame[17],5);
  assert(frame[27]>pier[1]+2&&frame[27]<88,"the player moves along the ramp");
  assert.equal(wakeVertices().length,0,"walking onto a stationary ferry does not create foam");
  assert(pierAspect()[0]>.95,"boarding changes the pier aspect to amber");
  run(180,0,-1,2);
  assert.equal(frame[17],5,"steering and action cannot leave the ferry in transit");
  assert(frame[27]>93&&frame[27]<116,"the passenger moves across open water with the ferry");
  const movingWake=wakeVertices();
  assert.equal(movingWake.length,24,"two real tapered ribbons follow the ferry");
  assert(movingWake.some(([x])=>x<8)&&movingWake.some(([x])=>x>14));
  assert(movingWake.every(([,z])=>z<frame[27])&&movingWake.map(([,z])=>z).every(Number.isFinite));
  assert(movingWake.some(([, ,opacity])=>opacity>.3)&&movingWake.some(([, ,opacity])=>opacity===0));
  const underwaySignal=pierAspect();
  assert(underwaySignal[2]>underwaySignal[1],"cool moving aspect follows ferry departure");
  run(30);
  assert.notDeepEqual(pierAspect(),underwaySignal,"underway aspect varies with real ferry progress");
  assert(wakeVertices()[0][1]>movingWake[0][1]+1,"foam follows ferry displacement rather than being fixed to the harbor");
  assert.equal(frame[18],departureTime);
  run(300);
  assert.equal(frame[17],6,"arrival waits for a separate disembark action");
  assert.equal(frame[20],5);
  assert.equal(wakeVertices().length,0,"arrived ferry makes no fresh wake");
  assert(pierAspect()[0]>.95,"the origin berth returns to amber once the ferry docks across the canal");
  assert(frame[27]>114&&frame[27]<116&&Math.abs(frame[26]-10.1)<.1);
  const stopped=spot();
  run(120,0,1);
  assert.equal(frame[17],6);
  assert.deepEqual(spot(),stopped,"movement alone does not drop the passenger into the canal");
  tick(0,0,2);
  assert.equal(frame[17],7);
  assert.equal(frame[20],0);
  run(100);
  assert.equal(frame[17],7);
  assert(frame[26]>13.8&&frame[27]>118&&frame[27]<122);
  run(130);
  assert.equal(frame[17],2,"walking onto the far landing completes the delivery");
  assert(frame[26]>13.8&&frame[27]>126.8&&frame[27]<127.3);
  assert.equal(frame[18],departureTime);
}
boardAndCross();

function selectWaterfront() {
  assert.equal(frame[17],1);
  assert.equal(frame[20],8,"tape apron offers one optional waterfront wayfinding cue");
  const origin=spot(), time=frame[18];
  tick(0,0,2);
  assert.deepEqual(spot(),origin,"marking the waterfront never moves the player");
  assert(frame[18]<time&&frame[18]>time-.04,"the same ferry countdown keeps running");
  assert(Math.abs(frame[24]+64.8)<.01&&Math.abs(frame[25]-38.4)<.01);
  assert.equal(guidePoints().length,4);
  guidePoints().forEach((point,i)=>closePoint(point,[[-64.8,38.4],[-64.8,73.45],[8.10,73.55],[11,83]][i]));
}
engine.reset(0); pickup(); selectWaterfront();
walkTo(-82,33.7);
assert.equal(frame[24],11,"leaving the marked route restores ordinary objective guidance");
assert.equal(frame[25],83);
assert.deepEqual(guidePoints(),[],"abandoning the signed route leaves only the objective marker");
assert(frame[18]<90,"turning away does not reset the attempt");

engine.reset(0); pickup(); selectWaterfront();
for(const [x,z] of [[-64.8,38.4],[-64.8,73.45],[8.10,73.55]]) {
  assert(Math.abs(frame[24]-x)<.02&&Math.abs(frame[25]-z)<.02,"waterfront foot stencils and engine guidance share each physical turnout");
  walkTo(frame[24],frame[25]);
  assert.equal(frame[16],0,"the waterfront route stays on foot");
}
assert.equal(frame[24],11);
assert.equal(frame[25],83);
const waterfrontFinal=guidePoints();
assert.equal(waterfrontFinal.length,2,"after reaching the harbor entrance keep the last leg on the map");
closePoint(waterfrontFinal[0],[8.10,73.55]);
closePoint(waterfrontFinal[1],[11,83]);
walkTo(frame[24],frame[25]);
assert.equal(frame[20],4);
assert(frame[18]>0&&frame[18]<90);
boardAndCross("waterfront");

function driveCourse(points) {
  for(const [x,z,radius,speed] of points) {
    let reached=false;
    for(let i=0;i<1700;i++) {
      const dx=x-frame[26], dz=z-frame[27], gap=Math.hypot(dx,dz);
      if(gap<radius){reached=true; break;}
      const angle=Math.atan2(dx,dz)-frame[28];
      const turn=Math.atan2(Math.sin(angle),Math.cos(angle));
      const desired=Math.min(speed,Math.max(1.8,speed-Math.abs(turn)*3.5));
      tick(clamp(turn*3.4,-1,1),clamp(.14+(desired-frame[19]/3.6)*.47,-.35,1),Math.abs(turn)>.95?1:0);
    }
    assert(reached,"Driving blocked at "+spot().join(",")+" going to "+x+","+z);
    assert.equal(frame[16],1);
  }
}
function parkAndExit() {
  run(105,0,0,1);
  tick(0,0,2);
  assert.equal(frame[16],0);
}

function collectWithParkedTaxi(prepare = false) {
  engine.reset(0);
  answerPhone();
  walkTo(2.0,-6.5);
  assert(Math.hypot(frame[26]-2.0,frame[27]+6.5)<.12,"the passenger reaches the side of the relocated car");
  assert.equal(frame[20],1,"the regular Enter car cue appears before mounting");
  mount();
  assert(Math.abs(frame[24])<.01&&Math.abs(frame[25]+14.25)<.01,"the car starts facing the southern bypass");
  driveCourse([[0,-12,.50,3],[-1.8,-14.25,.7,2.5],[-52,-14.25,1.3,7.5]]);
  assert(Math.abs(frame[24]+60.3)<.01&&Math.abs(frame[25]+14.25)<.01,"guide marks the western service-road junction");
  driveCourse([[-57.7,-14.25,.9,4],[-60.3,-11.3,.9,3.8],[-60.3,20.5,1.1,7.0]]);
  assert(Math.abs(frame[24]+60.3)<.01&&Math.abs(frame[25]-22.65)<.01);
  for(let i=0;i<900&&Math.abs(frame[24]+60.3)<.01;i++) {
    const angle=Math.atan2(frame[24]-frame[26],frame[25]-frame[27])-frame[28];
    const turn=Math.atan2(Math.sin(angle),Math.cos(angle));
    tick(clamp(turn*3.4,-1,1),clamp(.14+(3.1-frame[19]/3.6)*.47,-.35,1),Math.abs(turn)>.95?1:0);
    assert(Math.abs(frame[26]+60.3)<2.7&&frame[27]<=25.10,"the taxi approaches within the painted service junction");
  }
  assert(Math.abs(frame[24]+82.0)<.01&&Math.abs(frame[25]-22.65)<.01,"the engine advances to the off-lane pickup guide");
  driveCourse([[frame[24],frame[25],1.5,4.4]]);
  assert(Math.abs(frame[27]-22.65)<2.45,"taxi reaches parking inside the separated service spur");
  if (prepare) {
    driveCourse([[-102,22.65,1.7,5.5],[-107.7,20.8,1.3,3.1],[-108,17.1,1.3,2.8],
      [-104.5,14.85,1.3,2.8],[-100.6,17.65,1.25,2.9],[-98.5,22,1.25,2.9],
      [-92,22.65,.55,3.2],[-85,22.65,.27,2.5],[-79.28,22.65,.20,1.65]]);
    run(105,0,0,1);
    assert(Math.abs(frame[26]+79)<.85 && Math.abs(frame[27]-22.65)<.40);
    assert(Math.abs(Math.cos(frame[28]))<.10 && Math.sin(frame[28])>.994);
    assert(frame[19]<.72);
  }
  parkAndExit();
  if (prepare) {
    walkTo(-75,21);
    walkTo(-75,25);
    walkTo(-79,25.6);
  }
  walkTo(-82,28.9);
  walkTo(-82,36.6);
  assert.equal(frame[20],3);
  assert.equal(frame[18],90,"the same tape timer is untouched by taxi preparation");
  tick(0,0,2);
  assert.equal(frame[17],1);
}

collectWithParkedTaxi();
walkTo(-82,28.9);
walkTo(-81.5,24.4);
assert.equal(frame[20],1,"return to the actual car parked on the separated service spur");
mount();
for(const [x,z,radius,speed] of [[-102.0,22.65,1.9,6.0],[-107.85,32.5,1.5,3.8],[-108.4,52.0,1.33,5.7],
  [-106.0,57.15,1.2,4],[-100.0,58.5,1.25,4],[-9.0,58.6,1.8,7.4],[-5.8,58.6,.85,2.6]]) {
  assert(Math.abs(frame[24]-x)<.02&&Math.abs(frame[25]-z)<.02,"each driven return turn is visibly guided");
  driveCourse([[frame[24],frame[25],radius,speed]]);
}
run(105,0,0,1);
assert(frame[26]<-5.35&&Math.abs(frame[27]-58.6)<1.0,"taxi stops in the signed bay west of traffic");
assert.equal(frame[20],7,"stationary parking unlocks the ordinary curbside Park & walk interaction");
const bay=spot();
tick(0,0,2);
assert.equal(frame[16],0);
assert(frame[27]>bay[1]+1.2,"the passenger exits toward the marked footway, away from the travel lane");
assert(Math.abs(frame[24]+4.55)<.01&&Math.abs(frame[25]-62.10)<.01,"guide starts the curbside footway");
const parkPoints=guidePoints();
assert.equal(parkPoints.length,4);
parkPoints.forEach((point,i)=>closePoint(point,[[-4.55,62.10],[-4.55,73.55],[8.10,73.55],[11,83]][i]));
walkTo(frame[24],frame[25]);
assert(Math.abs(frame[24]+4.55)<.01&&Math.abs(frame[25]-73.55)<.01,"next guide target is the protected harbor crossing");
walkTo(frame[24],frame[25]);
assert(Math.abs(frame[24]-8.10)<.01&&Math.abs(frame[25]-73.55)<.01,"the marked walkway reaches the east pier entrance before pointing north");
walkTo(frame[24],frame[25]);
assert.equal(frame[24],11);
assert.equal(frame[25],83);
const pierPoints=guidePoints();
assert.equal(pierPoints.length,2,"after reaching the harbor entrance keep the last leg on the map");
closePoint(pierPoints[0],[8.10,73.55]);
closePoint(pierPoints[1],[11,83]);
walkTo(frame[24],frame[25]);
assert.equal(frame[20],4);
assert(frame[18]>30,"no collision-induced crawl on the pickup loop");
boardAndCross("service");

function driveAvenue(prepared) {
collectWithParkedTaxi(prepared);
walkTo(-82,28.9);
walkTo(-83.2,24.75);
assert.equal(frame[20],9,"sign by the taxi offers the optional avenue route");
const choice=spot(), progress=frame[18];
tick(0,0,2);
assert.deepEqual(spot(),choice);
assert(frame[18]<progress&&frame[18]>progress-.04,"choosing the avenue does not pause or restart the timer");
walkTo(prepared?-79.8:-81.5,24.4);
assert.equal(frame[20],1,"the ordinary taxi Enter cue remains required");
mount();
const avenue=[[-102.0,22.65,5.5],[-107.7,20.8,3.1],[-108.0,17.1,2.8],[-104.5,14.85,2.8],
  [-100.6,17.65,2.9],[-98.5,22.0,2.9],[-62.8,22.65,6.0],[-59.0,26.9,3.5],[-36.5,27.05,5.7],[-9.5,26.0,6.0]];
for(let k=prepared?6:0;k<avenue.length;k++) {
  const [x,z,speed]=avenue[k];
  const thisLeg=()=>Math.hypot(frame[24]-x,frame[25]-z)<.02;
  assert(thisLeg(),"avenue guide draws each legal turn in order");
  const points=guidePoints();
  assert.equal(points.length,avenue.length-Math.max(0,k-1));
  closePoint(points[k===0?0:1],[x,z]);
  if(k===7) {
    const before=frame[18];
    run(30,0,0,1);
    assert(frame[18]<before,"normal braking to yield at the traffic merge costs mission time");
  }
  for(let i=0;i<980&&thisLeg();i++) {
    const dx=frame[24]-frame[26], dz=frame[25]-frame[27];
    if(k===avenue.length-1 && Math.hypot(dx,dz)<.85) break;
    const heading=Math.atan2(dx,dz)-frame[28];
    const turn=Math.atan2(Math.sin(heading),Math.cos(heading));
    const desired=Math.min(speed,Math.max(2.4,speed-Math.abs(turn)*2.6));
    tick(clamp(turn*3.4,-1,1),clamp(.14+(desired-frame[19]/3.6)*.47,-.35,1),Math.abs(turn)>.62?1:0);
    assert(frame[17]===1 && frame[16]===1,"the live avenue remains a timed drive with normal controls");
  }
  if(k<avenue.length-1) assert(!thisLeg(),"car reached next marked turn: "+spot().join(","));
}
run(105,0,0,1);
assert.equal(frame[20],7,"off-lane bay offers the normal curbside Park & walk action");
tick(0,0,2);
assert.equal(frame[16],0);
const avenueWalkPoints=[[-9.5,30.2],[3.9,30.2],[3.9,70.7],[8.10,73.55],[11,83]];
assert.equal(guidePoints().length,5);
guidePoints().forEach((point,i)=>closePoint(point,avenueWalkPoints[i]));
for(const [x,z] of avenueWalkPoints) {
  assert(Math.hypot(frame[24]-x,frame[25]-z)<.03,"avenue bay foot guidance avoids the building frontage");
  walkTo(frame[24],frame[25]);
}
assert.equal(frame[20],4);
assert(frame[18]>0&&frame[18]<90);
boardAndCross(prepared?"preparedAvenue":"avenue");
}
driveAvenue(false);
driveAvenue(true);

engine.reset(0); pickup(); run(5406);
assert.equal(frame[17],3); assert.equal(frame[18],0);
run(120,0,0,2);
assert.equal(frame[17],3,"late interact cannot embark a missed ferry");
engine.reset(1);
const freePrior=rawMoving().slice();
run(90);
assert.equal(frame[17],4); assert.equal(frame[18],90);

engine.reset(1); mount();
const start=frame[27];
run(72,0,1);
assert(frame[27]>start+3 && frame[19]>18,"acceleration displaces the car");
const speed=frame[19];
run(18,0,0,1); assert(frame[19]<speed*.65);
const last=frame[27];
run(180,0,-1); assert(frame[27]<last-3,"reverse displaces the car backwards");
engine.reset(1); mount(); run(72,0,1);
const at60=spot();
engine.reset(1); mount(); run(144,0,1,0,step/2);
for(let i=0;i<2;i++) assert(Math.abs(spot()[i]-at60[i])<.06,"fixed stepping at 60/120Hz");
assert.deepEqual(view(...world,WORLD_FLOATS,18),scenery,"moving mesh never overwrites scenery");

function trafficCenters() {
  const mesh=rawMoving(), start=330+(frame[16]===0?210:0), centers=[];
  for(let i=0;i<6;i++){
    let xmin=Infinity,xmax=-Infinity,zmin=Infinity,zmax=-Infinity;
    for(let q=(start+i*330)*6;q<(start+(i+1)*330)*6;q+=6){
      xmin=Math.min(xmin,mesh[q]); xmax=Math.max(xmax,mesh[q]);
      zmin=Math.min(zmin,mesh[q+2]); zmax=Math.max(zmax,mesh[q+2]);
    }
    centers.push([(xmin+xmax)/2,(zmin+zmax)/2]);
  }
  return centers;
}
function bodiesSeparated() {
  const mesh=rawMoving(), corner=114*6;
  const x=(mesh[0]+mesh[corner])*.5,z=(mesh[2]+mesh[corner+2])*.5;
  const frontX=mesh[6]-mesh[0],frontZ=mesh[2]-mesh[8];
  const unit=Math.hypot(frontX,frontZ);
  const sin=frontZ/unit,cos=frontX/unit;
  return trafficCenters().every(([tx,tz],i)=>{
    const west=i>=4;
    const dx=west?tz-z:x-tx,dz=west?x-tx:z-tz;
    const s=west?-cos:sin,c=west?sin:cos;
    const halfWidth=.94,halfLength=1.94;
    const crossX=halfWidth+halfWidth*Math.abs(c)+halfLength*Math.abs(s);
    const crossZ=halfLength+halfWidth*Math.abs(s)+halfLength*Math.abs(c);
    return Math.min(crossX-Math.abs(dx),crossZ-Math.abs(dz),
      crossX-Math.abs(dx*c-dz*s),crossZ-Math.abs(dx*s+dz*c))<.045;
  });
}
function lane(lane,throttle=1,flags=0) {
  const steer=clamp((lane-frame[26])*.62-frame[28]*2.22,-1,1);
  tick(steer,throttle,flags);
  assert(bodiesSeparated(),"neither car may step through the other car body");
}
function firstRim() {
  const movingView=rawMoving(), a=30*6,b=31*6;
  return [movingView[b+1]-movingView[a+1],movingView[b+2]-movingView[a+2]];
}
engine.reset(1); mount();
const idleRim=firstRim();
run(24,0,0,1);
assert.deepEqual(firstRim(),idleRim,"parked rim does not spin with elapsed time");
run(42,0,.42);
assert(Math.hypot(...firstRim().map((x,i)=>x-idleRim[i]))>.035,"running wheels rotate with real movement");
run(240,0,0,1);
const parkedRim=firstRim();
run(30,0,0,1);
assert.deepEqual(firstRim(),parkedRim,"stopped rim holds its last physical phase");
engine.reset(1);
assert.deepEqual(firstRim(),idleRim,"restart resets rim phase");
engine.reset(1); mount();
for(let i=0;i<320;i++)lane(0);
assert.equal(frame[22],0,"narrow center-line near misses are not false collisions");
assert(frame[27]>43);
assert(trafficCenters().filter(([x])=>x<-35).length===2,"western district has its own moving traffic");
engine.reset(1); mount();
for(let i=0;i<270;i++)lane(-2);
assert.equal(frame[21],4,"head-on collision reported");
assert(frame[27]<14.5&&frame[19]<1,"sustained throttle cannot tunnel through a stopped car");
assert(frame[22]<=3,"sustained contact does not spam new hits");
const stop=frame[27];
for(let i=0;i<120;i++)lane(-2,-1);
assert(frame[27]<stop-4,"reversing separates the contact cleanly");
engine.reset(1); mount();
let contactFromRest=false, parkedZ=0;
for(let i=0;i<310;i++) {
  const wasStopped=frame[19]<.19 && frame[27]>4.4;
  const before=frame[22];
  const brake=frame[27]>4.4;
  const startZ=frame[27];
  lane(-2,brake?0:1,brake?1:0);
  if(wasStopped && frame[22]>before) {
    parkedZ=startZ;
    contactFromRest=frame[21]===4 && frame[19]>1;
  }
}
assert(contactFromRest,"approaching traffic visibly nudges a stopped player without overlap");
assert(frame[19]<.1 && frame[27]<parkedZ-.07 && frame[27]>parkedZ-.48,"bounded impulse does not creep forever");
engine.reset(1); mount();
for(let i=0;i<170;i++)lane(i>=150?-1.8:0,.66);
for(let i=0;i<80;i++)lane(-1.8,.66);
assert.equal(frame[21],4,"oblique approach collides without overlapping");
const oblique=spot();
for(let i=0;i<65;i++)lane(0,-.7);
assert(Math.hypot(frame[26]-oblique[0],frame[27]-oblique[1])>1.7,"oblique contact can be escaped");

function solidClear(rect) {
  const [x,z]=spot(), [left,right,near,far]=rect;
  const sn=Math.sin(frame[28]),cs=Math.cos(frame[28]);
  for(const axle of [1,0,-.95]) {
    const px=x+axle*sn,pz=z+axle*cs;
    assert(Math.hypot(px-clamp(px,left,right),pz-clamp(pz,near,far))>=.88,
      "vehicle never crosses a tested solid facade or corner");
  }
}

for(const [side,target,wall] of [
  [-1,[-8,0.9],[-11.1,-6,-8,4.6]],
  [1,[9,0.9],[7.8,23.8,-10,3.5]],
]) {
  engine.reset(1); mount();
  assert(driver(target,5,260).includes(5),"normal steering reaches the side facade");
  solidClear(wall);
  const atWall=spot(), firstEvent=frame[22];
  for(let i=0;i<36;i++) {
    tick(side*.23,.70);
    solidClear(wall);
  }
  assert(frame[27]>atWall[1]+.245 && frame[19]>.25,
    "a sustained glancing contact keeps forward travel and does not bog down");
  assert(frame[22]-firstEvent<3,"continuous sideways contact is not reported every frame");
  const along=spot(), lastYaw=frame[28];
  for(let i=0;i<68;i++) {
    tick(-side*.3,-.86);
    solidClear(wall);
  }
  assert(side*(along[0]-frame[26])>1.0,"ordinary reverse separates from either wall");
  assert(Math.abs(normalAngle(frame[28]-lastYaw))>.06,"can steer while reversing from contact");
}
engine.reset(1); mount();
assert(driver([9,4.4],5,350).includes(5),"normal controls reach the east building corner");
const cornerRect=[7.8,23.8,-10,3.5], corner=spot();
assert(Math.hypot(corner[0]-7.8,corner[1]-3.5)<3.1,"the contact is at the real building corner");
for(let i=0;i<83;i++) {
  tick(-.38,-.86);
  solidClear(cornerRect);
}
assert(Math.hypot(frame[26]-corner[0],frame[27]-corner[1])>1.7,"ordinary reverse can exit the corner without reset");

function movingWallCar(wide) {
  engine.reset(1); mount();
  assert(driver([9,4.4],5,350).includes(5),"camera comparison starts at the real building corner");
  const atContact=spot(), before=cameraHeading(), views=[];
  for(let i=0;i<83;i++) {
    tick(-.38,-.86,0,step,.53,wide&&i===0?-.85:0,wide&&i===0?-.09:0);
    solidClear(cornerRect);
    const [x,,z]=cameraEye();
    assert(x<7.8 || x>23.8 || z< -10 || z>3.5,"car camera eye stays out of the tested building");
    views.push({heading:cameraHeading(), state:frame.slice(16), route:guidePoints()});
  }
  assert(Math.hypot(frame[26]-atContact[0],frame[27]-atContact[1])>1.7,"the car comparison includes an ordinary reverse turn");
  return {before,views};
}
const tightCar=movingWallCar(false), wideCar=movingWallCar(true);
assert(Math.abs(normalAngle(wideCar.views[82].heading-tightCar.views[82].heading))>.7,"a drag visibly orbits a reversing car");
for(let i=0;i<83;i++) {
  assert.deepEqual(wideCar.views[i].state,tightCar.views[i].state,"camera tap never changes car collision, speed or direction");
  assert.deepEqual(wideCar.views[i].route,tightCar.views[i].route);
}

engine.reset(1); mount();
const mailboxEvents=driver([3.9,18],1);
assert(mailboxEvents.includes(1),"mailbox contact: "+mailboxEvents);
assert(frame[19]>4,"light mailbox does not stop a car");
const mailRange=()=>rawMoving().slice(7*330*6,(7*330+150)*6);
const hitMail=mailRange();
run(18,0,0,1);
assert.notDeepEqual(mailRange(),hitMail,"mailbox visibly topples");

engine.reset(1); mount();
const treeEvents=driver([-5.1,19],2);
assert(treeEvents.includes(2),"tree contact: "+treeEvents);
assert(Math.hypot(frame[26]+5.1,frame[27]-19)>1.1,"car cannot pass through fixed trunk");
assert(frame[19]<16,"solid tree dissipates the impact");

engine.reset(1); mount();
const standing=ped(0);
const pedEvents=driver(()=>{const [x,z]=ped(0);return [x+.22,z+.22];},3,320);
assert(pedEvents.includes(3),"pedestrian contact: "+pedEvents+" at "+spot());
run(15,0,0,1);
assert(ped(0)[2]<standing[2]*.82,"a polygonal person visibly falls");
run(117,0,0,1);
assert(ped(0)[2]>standing[2]*.92,"the person gets up again");
engine.reset(1);
assert.equal(frame[22],0);
const reset=rawMoving();
const shadowFloatCount=7*8*3*6;
assert.deepEqual(reset.subarray(0,-shadowFloatCount),freePrior.subarray(0,freePrior.length-shadowFloatCount),
  "free roam retry restores traffic, props and people");
assert.deepEqual(reset.subarray(-shadowFloatCount),freePrior.subarray(-shadowFloatCount),
  "free roam retry also restores the full list of shadows");
engine.reset(0);
assert.equal(frame[17],8);
assert.equal(frame[18],90);
assert.deepEqual(rawMoving(),prior,"mission retry restores its distinct initial mesh and shadows");
assert.equal(worldSends,1);
const phoneX=frame[24], phoneZ=frame[25];
for (const [x,z,expected] of [
  [0,-1.2,0], [-1.2,-1.2,Math.PI/4], [-1.2,0,Math.PI/2],
  [-1.2,1.2,3*Math.PI/4], [0,1.2,Math.PI], [1.2,1.2,-3*Math.PI/4],
  [1.2,0,-Math.PI/2], [1.2,-1.2,-Math.PI/4],
]) {
  walkTo(phoneX+x,phoneZ+z);
  assert.equal(frame[17],8);
  assert(Math.abs(normalAngle(frame[29]-expected))<.12,"walk compass reaches every octant");
}
walkTo(phoneX+.16,phoneZ+1.2);
const rearLeft=frame[29];
walkTo(phoneX-.16,phoneZ+1.2);
const rearRight=frame[29];
assert(rearLeft < -2.85 && rearRight > 2.85,"rear bearing wraps between signed halves");
assert(Math.abs(normalAngle(rearRight-rearLeft))<.4,"rear wrap remains visually continuous");
walkTo(phoneX,phoneZ);
assert.equal(frame[29],0,"arrival neutralizes the arrow");
engine.reset(0);
mount();
assert(Math.abs(frame[29])>2.4,"a target behind the car is not shown at ninety degrees");
assert(walkingBearingSamples>0 && drivingBearingSamples>0,"check live route bearings in both movement modes");
console.log("Last Ferry: fixed stepping, expanded mission, reciprocal swept vehicle contact, and all four collision classes passed.");
console.log("Last Ferry mission seconds remaining at boarding:", JSON.stringify(boardingTimeLeft));
