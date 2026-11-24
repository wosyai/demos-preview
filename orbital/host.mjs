const $ = id => document.getElementById(id);
const canvas = $("view");
const gl = canvas.getContext("webgl2", {alpha:false, antialias:true, preserveDrawingBuffer:false});
const view = `
uniform vec3 eye;
uniform vec4 basis;
uniform vec2 optics;
uniform vec2 roll;
vec3 toEye(vec3 p) {
  p -= eye;
  vec3 q = vec3(basis.x*p.x+basis.y*p.z,p.y,-basis.y*p.x+basis.x*p.z);
  vec3 a=vec3(q.x,basis.z*q.y+basis.w*q.z,-basis.w*q.y+basis.z*q.z);
 return vec3(roll.x*a.x+roll.y*a.y,-roll.y*a.x+roll.x*a.y,a.z);
}
`;
const skinVertex=`
layout(location=3) in vec3 posClosed;
uniform vec4 armPose;
vec3 assetPoint(vec3 p){return armPose.w<0.?p:mix(p,posClosed,armPose.w)*.0001+armPose.xyz;}
`;
const vs = `#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec3 color;
layout(location=2) in vec2 mat;
layout(location=4) in vec3 openNormal;
layout(location=5) in vec3 closedNormal;
out vec3 surface;
out vec3 world;
out vec2 material;
out vec3 fittedNormal;
${view}
${skinVertex}
void main(){
 vec3 actual=assetPoint(pos);
 vec3 p=toEye(actual);
 gl_Position=vec4(p.x*optics.x,p.y*optics.y,-1.002*p.z-.10,-p.z);
 surface=color;world=actual;material=armPose.w<0.?mat:vec2(.92,.181);
 fittedNormal=armPose.w<0.?vec3(0.):mix(openNormal,closedNormal,armPose.w);
}`;
const sun = `
const vec3 sunDir=vec3(.5674,.6110,.5521);
vec3 lightClip(vec3 p){
 vec3 q=p-vec3(0.,.3,-5.);
 return vec3(dot(q,vec3(.6976,0.,-.7165))/6.4,
             dot(q,vec3(-.4378,.7920,-.4262))/6.4,
            -dot(q,sunDir)/14.);
}
`;
const depthVS=`#version 300 es
layout(location=0) in vec3 pos;
${sun}
${skinVertex}
void main(){gl_Position=vec4(lightClip(assetPoint(pos)),1.);}
`;
const depthFS=`#version 300 es
precision mediump float;
void main(){}
`;
const exteriorMaterial=`
uniform int eva;
uniform highp sampler2DShadow sunMap;
${sun}
float noise3(vec3 p){
 vec3 v=sin(p*vec3(1.14,1.83,1.31));
 return .5+.25*(sin(v.x+v.z)*sin(v.y-v.z))+ .25*sin(v.x*3.+v.y)*sin(v.z*2.);
}
float shadowAt(vec3 p,vec3 n){
 vec3 u=lightClip(p+n*.012)*.5+.5;
 if(any(greaterThan(u,vec3(1.)))||any(lessThan(u,vec3(0.))))return 1.;
 return texture(sunMap,vec3(u.xy,u.z-.00112));
}
vec3 sunColor(vec3 n){
 bool steel=material.y>.56 && material.y<.69;
 bool emitter=material.y>.8;
 bool foil=material.y>.165 && material.y<.188 && surface.r>.52 && abs(n.x)>.86 && world.x<-1.3;
 bool solar=surface.b>2.*surface.r && material.y>.4 && material.y<.52;
 vec3 lamp=vec3(1.00,.91,.78);
 vec3 viewDir=normalize(eye-world);
 float shadow=shadowAt(world,n);
 float direct=max(dot(n,sunDir),0.);
 vec3 halfV=normalize(sunDir+viewDir);
 float spec=pow(max(dot(n,halfV),0.),steel?72.:24.);
 float metal=steel?.49:solar?.18:.075;
 float size=max(length(dFdx(world)),length(dFdy(world)));
 float detail=1.-smoothstep(.012,.057,size);
 vec3 col=surface;
 if(steel){
    float scratches=sin(world.z*810.+world.y*670.+0.37*sin(world.x*17.));
    col*=.975+.025*scratches*detail;
 }else{
    float coarse=noise3(world*18.);
    float fine=noise3(world*307.);
    col*=.85+.25*coarse+.13*(fine-.5)*detail;
 }
 if(foil){
    vec2 uv=vec2(world.z*.88,world.y*1.16);
    vec2 lines=abs(fract(uv)-.5)*2.;
    float seam=smoothstep(.88,.984,max(lines.x,lines.y));
    float drape=sin(world.z*13.2+2.*sin(world.y*4.3))*sin(world.y*27.3+world.z*2.3);
    col*=.97+.070*drape-.23*seam;
    spec+=.18*max(0.,drape)*direct;
 }
 if(solar){
    vec2 cells=abs(fract(world.xy*vec2(9.,7.5))-.5)*2.;
    float thin=smoothstep(.86,.98,max(cells.x,cells.y));
    col=mix(col*(.69+noise3(world*9.)*.53),vec3(.44,.33,.18),thin*.93);
 }
 vec3 ambient=mix(vec3(.09,.12,.18),vec3(.23,.39,.51),max(0.,-n.y)*.75+max(0.,n.x)*.19);
 vec3 energy=col*(ambient+lamp*direct*shadow*1.44)+metal*spec*shadow*lamp;
 if(emitter) energy+=col*.53;
 return pow(max(vec3(0.),energy/(energy*.48+vec3(.85))),vec3(.79));
}
`;
const fs = `#version 300 es
precision highp float;
in vec3 surface;
in vec3 world;
in vec2 material;
in vec3 fittedNormal;
out vec4 pix;
${view}
${exteriorMaterial}
void main(){
 vec3 normal=normalize(cross(dFdx(world),dFdy(world)));
 if(eva==1){
   if(dot(fittedNormal,fittedNormal)>.2)normal=normalize(fittedNormal);
   if(dot(normal,eye-world)<0.)normal=-normal;
   if(material.y>.56 && material.y<.69 && abs(world.y+.57)<.095 && abs(world.z+1.59)<.095)
      normal=normalize(vec3(0.,world.y+.57,world.z+1.59));
   pix=vec4(sunColor(normal),1.);return;
 }
 float overhead=smoothstep(-1.2,1.52,world.y);
 float local=smoothstep(.0,1.,.65+.35*cos((world.z+9.4)*3.53));
 float amber=exp(-.76*dot(world-vec3(.85,-.23,-2.2),world-vec3(.85,-.23,-2.2)));
 float west=smoothstep(-.3,2.0,world.x);
 vec3 light=vec3(.35,.46,.51)+vec3(.28,.34,.36)*(overhead*.48+local*.42)+vec3(.34,.30,.19)*amber+vec3(.06,.19,.24)*west;
 float angle=abs(dot(normal,normalize(vec3(.34,.83,-.24))));
 float haze=smoothstep(4.,14.,distance(world,eye));
 vec3 col=surface*(light+.18*angle)*material.x+surface*material.y*.64;
 col=mix(col,vec3(.056,.115,.137),haze*.37);
 pix=vec4(pow(clamp(col,0.,1.),vec3(.79)),1.);
}`;
const svs=`#version 300 es
out vec2 screen;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));screen=p*2.-1.;gl_Position=vec4(screen,.9999,1.);}
`;
const sfs=`#version 300 es
precision highp float;
in vec2 screen;
out vec4 pix;
uniform int eva;
uniform int photo;
uniform sampler2D earthMap;
${view}
float hash(vec2 p){return fract(sin(dot(p,vec2(157.1,113.7)))*43758.5453);}
float noise(vec2 p){vec2 q=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(hash(q),hash(q+vec2(1,0)),u.x),mix(hash(q+vec2(0,1)),hash(q+vec2(1,1)),u.x),u.y);}
void main(){
 vec3 p=normalize(vec3(screen/optics,-1.));
 p.xy=vec2(roll.x*p.x-roll.y*p.y,roll.y*p.x+roll.x*p.y);
 vec3 q=vec3(p.x,basis.z*p.y-basis.w*p.z,basis.w*p.y+basis.z*p.z);
 vec3 ray=vec3(basis.x*q.x-basis.y*q.z,q.y,basis.y*q.x+basis.x*q.z);
 vec2 st=vec2(atan(ray.x,-ray.z),asin(ray.y))*160.;
 float star=step(.992,hash(floor(st)))*(1.-smoothstep(.03,.3,length(fract(st)-.5)));
 vec3 color=vec3(.011,.021,.033)+vec3(.64,.81,1.)*star;
 if(eva==1){
   vec3 planet=normalize(vec3(.64,-1.11,-.48));
   float arc=dot(planet,ray);
   float edge=.605;
   if(arc>edge){
     float dist=arc-sqrt(max(0.,arc*arc-edge*edge));
     vec3 n=normalize(dist*ray-planet);
     vec3 orb=vec3(.56*n.x-.8285*n.y,.8285*n.x+.56*n.y,n.z);
     vec2 geo=vec2(atan(orb.x,-orb.z)*.15915494+.79,acos(clamp(orb.y,-1.,1.))*.31830989);
     vec3 day;
     if(photo==1){day=texture(earthMap,geo).rgb;day=clamp(day*vec3(.93,1.10,1.30),0.,1.);}
     else{
       vec2 q0=geo*vec2(170.,93.);float massif=noise(q0*.093)+.22*noise(q0*.27);
       float cloud=noise(q0+3.*vec2(noise(q0*.26),noise(q0*.21+7.)));
       cloud=cloud*.59+.27*noise(q0*2.5)+.14*noise(q0*5.1);
       float bank=smoothstep(.55,.71,cloud)*smoothstep(.16,.68,noise(q0*.11));
       float land=smoothstep(.62,.71,massif);
       day=mix(mix(vec3(.084,.30,.57),vec3(.17,.34,.48),land),vec3(.92,.96,1.),bank);
     }
     float solar=max(0.,dot(n,normalize(vec3(.38,.55,.83))));
     float rim=pow(1.-max(0.,dot(n,-ray)),3.15);
     color=mix(day*(.79+.21*solar),vec3(.16,.49,.90),rim*.79);
   }else color+=vec3(.10,.37,.86)*exp(-max(0.,edge-arc)*438.)*.57;
   pix=vec4(color,1.);return;
 }
 vec3 up=normalize(vec3(.70,-.32,-.57));
 float arc=dot(up,ray);
 if(arc>.929){
  float radial=sqrt(max(0.,(1.-arc)/.071));
  vec2 geo=vec2(ray.x,ray.y)*25.+vec2(ray.z*12.,0.);
  float land=noise(geo*.49)*.68+noise(geo*1.56)*.23+noise(geo*3.3)*.09;
  float storm=noise(geo*vec2(1.,4.)+.66*noise(geo.yy*4.))*noise(geo*.49+8.);
  vec3 soil=mix(vec3(.20,.49,.55),vec3(.36,.57,.33),smoothstep(.51,.61,land));
  color=mix(vec3(.08,.30,.49),soil,.66);
  color=mix(color,vec3(.64,.80,.90),smoothstep(.25,.61,storm)*.85);
  float rim=smoothstep(.76,1.,radial);
  color=mix(color*.88,vec3(.40,.71,.89),rim*.68);
 }else if(arc>.916){color+=vec3(.07,.22,.37)*smoothstep(.916,.929,arc)*.61;}
 pix=vec4(color,1.);
}
`;
function program(a,b) {
 const p=gl.createProgram();
 for(const [type,source] of [[gl.VERTEX_SHADER,a],[gl.FRAGMENT_SHADER,b]]) {
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
  gl.attachShader(p,s);gl.deleteShader(s);
 }
 gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 return {p, eye:gl.getUniformLocation(p,"eye"), basis:gl.getUniformLocation(p,"basis"), optics:gl.getUniformLocation(p,"optics"), roll:gl.getUniformLocation(p,"roll"), eva:gl.getUniformLocation(p,"eva"), photo:gl.getUniformLocation(p,"photo"), earth:gl.getUniformLocation(p,"earthMap"), sunMap:gl.getUniformLocation(p,"sunMap"),armPose:gl.getUniformLocation(p,"armPose")};
}
const shadowSize=matchMedia("(pointer:coarse)").matches ? 1024 : 1536;
let shadowDirty=true;
let worldVersion=0,renderVersion=-1,renderYaw=NaN,renderPitch=NaN,renderW=0,renderH=0;
let scene,space,depth,shadowFbo,shadowTexture,earthTexture,earthReady=0,engine,active=false, frame=null, grabbed=null, dx=0, dy=0, last=0, remainder=0, pulse=false;
const held=new Set(),touch=new Map();
const bits={KeyA:1,ArrowLeft:1,KeyD:2,ArrowRight:2,KeyW:4,ArrowUp:4,KeyS:8,ArrowDown:8,Space:16,KeyC:32,KeyE:64,ShiftLeft:128,ShiftRight:128};
function batch() {
 const vao=gl.createVertexArray(), buffer=gl.createBuffer();
 gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,n,offset] of [[0,3,0],[1,3,12],[2,2,24]]) {gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,offset);}
 return {vao,buffer,num:0};
}
function update(b,ptr,n,usage){
 if(n<0 || n%24!==0 || n/8>16384)throw Error("Invalid orbital mesh");
 shadowDirty=true;worldVersion++;gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(engine.memory.buffer,ptr,n),usage);b.num=n/8;
}
let importedArm=null;
function uploadArm(bytes){
 const dv=new DataView(bytes);const n=dv.getUint32(4,true),elements=dv.getUint32(8,true);
 if(dv.getUint32(0,true)!==0x3256414b || n>40000 || elements>90000 || elements%3 || 12+n*24+elements*2!==bytes.byteLength)throw Error("Unexpected Apollo arm mesh");
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const verts=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,verts);
 gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(bytes,12,n*24),gl.STATIC_DRAW);
 for(const [location,type,offset,normalized] of [[0,gl.SHORT,0,false],[3,gl.SHORT,6,false],[1,gl.UNSIGNED_BYTE,12,true],[4,gl.BYTE,16,true],[5,gl.BYTE,19,true]]){
   gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,type,normalized,24,offset);
 }
 const indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
 gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint8Array(bytes,12+n*24),gl.STATIC_DRAW);
 importedArm={vao,elements};worldVersion++;shadowDirty=true;
}
function meshes(program,eva){
 gl.uniform4f(program.armPose,0,0,0,-1);
 gl.bindVertexArray(room.vao);gl.drawArrays(gl.TRIANGLES,0,room.num);
 if(eva&&importedArm){
   gl.uniform4f(program.armPose,frame[12],frame[13],frame[14],frame[8]);
   gl.bindVertexArray(importedArm.vao);gl.drawElements(gl.TRIANGLES,importedArm.elements,gl.UNSIGNED_SHORT,0);
 }else{
   gl.bindVertexArray(hand.vao);gl.drawArrays(gl.TRIANGLES,0,hand.num);
 }
}
function render() {
 if(!frame)return;
 const scale=Math.min(devicePixelRatio,1.65,Math.sqrt(1600000/(canvas.clientWidth*canvas.clientHeight)));
 const w=Math.max(1,Math.round(canvas.clientWidth*scale)), h=Math.max(1,Math.round(canvas.clientHeight*scale));
 if(w!==canvas.width || h!==canvas.height){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);
 const [x,y,z,heading,pitch]=frame;
 if(renderVersion===worldVersion && renderYaw===heading && renderPitch===pitch && renderW===w && renderH===h)return;
 renderVersion=worldVersion;renderYaw=heading;renderPitch=pitch;renderW=w;renderH=h;
 const eva=frame[15]===1;
 if(eva&&shadowDirty){
   shadowDirty=false;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFbo);
   gl.viewport(0,0,shadowSize,shadowSize);gl.enable(gl.DEPTH_TEST);
   gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depth.p);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.25,1.8);
   meshes(depth,eva);
   gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
 }
 function bind(o){
  gl.useProgram(o.p);gl.uniform3f(o.eye,x,y,z);
  gl.uniform4f(o.basis,Math.cos(heading),Math.sin(heading),Math.cos(pitch),Math.sin(pitch));
  const f=Math.min(eva ? 1.36 : 1.45,(eva?2.05:1.8)*w/h);gl.uniform2f(o.optics,f*h/w,f);
  gl.uniform1i(o.eva,Number(eva));gl.uniform2f(o.roll,eva?.99449:1.,eva?-.10481:0.);
 }
 gl.clear(gl.DEPTH_BUFFER_BIT);
 gl.disable(gl.DEPTH_TEST);
 bind(space);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.uniform1i(space.earth,1);gl.uniform1i(space.photo,earthReady);
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.DEPTH_TEST);bind(scene);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(scene.sunMap,2);
 meshes(scene,eva);
}
function hud(){
 const [, , , , , , , , ,mode,near,mark]=frame;
 const eva=frame[15]===1;
 let objective=eva?"Approach the silver rail":"Approach the amber rail",tip="Drift forward and get within reach.";
 if(mark===2){objective="Exercise complete";tip="You pushed off. Reset to practice again.";}
 else if(mode===2){objective="Rail secured";tip=eva?"Take in the view, then release to push off.":"Release the rail to push off.";}
 else if(mode===1){objective="Gripping the handrail";tip="Your drift is arrested.";}
 else if(near){objective="Handrail in reach";tip="Grip to stop drifting.";}
 if($("objective").textContent!==objective)$("objective").textContent=objective;
 if($("help").textContent!==tip)$("help").textContent=tip;
 $("action").disabled=!active || !(mode===2 || (mode===0 && near===1));
 $("action").textContent=mode===2?"Release & push":"Grip rail";
}
function animate(t){
 requestAnimationFrame(animate);
 if(!last)last=t;
 remainder+=Math.min((t-last)/1000,.09);last=t;
 if(active && remainder>=1/60) {
  let mask=0;for(const k of held)mask|=bits[k];for(const b of touch.values())mask|=b;
  let lookX=dx,lookY=dy;dx=0;dy=0;
  while(remainder>=1/60){
   engine.tick(1/60,mask|(pulse?64:0),lookX,lookY);
   pulse=false;lookX=0;lookY=0;remainder-=1/60;
  }
  hud();
 }else if(!active)remainder=0;
 render();
}
function clear(){held.clear();touch.clear();grabbed=null;dx=0;dy=0;pulse=false;}
canvas.addEventListener("pointerdown",e=>{
 if(!active||grabbed!==null)return;grabbed={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
 if(grabbed?.id!==e.pointerId)return;
 dx+=(e.clientX-grabbed.x)*.0033;dy-=(e.clientY-grabbed.y)*.0033;
 grabbed={id:e.pointerId,x:e.clientX,y:e.clientY};
});
for(const event of ["pointerup","pointercancel","lostpointercapture"]){
 canvas.addEventListener(event,e=>{if(grabbed?.id===e.pointerId)grabbed=null;});
}
for(const button of document.querySelectorAll("[data-mask]")){
 button.addEventListener("pointerdown",e=>{button.setPointerCapture(e.pointerId);touch.set(e.pointerId,Number(button.dataset.mask));});
 for(const event of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(event,e=>touch.delete(e.pointerId));
}
window.addEventListener("blur",clear);
document.addEventListener("visibilitychange",()=>{if(document.hidden)clear();});
window.addEventListener("keydown",e=>{if(active&&bits[e.code] && !e.altKey && !e.ctrlKey && !e.metaKey){e.preventDefault();held.add(e.code);}});
window.addEventListener("keyup",e=>held.delete(e.code));
$("action").onclick=()=>{pulse=true;};
function enter(which){
 clear();engine.select_deck(which);engine.tick(0,0,0,0);
 active=true;$("intro").hidden=true;$("exercise").textContent=which===1?"EVA 01 / STARBOARD TRUSS":"TRAINING 01 / HANDRAIL";hud();
}
$("reset").onclick=()=>{if(engine)enter(frame[15]);};
$("menu").onclick=()=>{clear();active=false;$("intro").hidden=false;};
$("start").onclick=()=>enter(1);
$("training").onclick=()=>enter(0);
let room,hand;
try{
 if(!gl)throw Error("WebGL 2 is required to render the station.");
 scene=program(vs,fs);space=program(svs,sfs);depth=program(depthVS,depthFS);room=batch();hand=batch();
 shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
 gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,shadowSize,shadowSize);
 for(const mode of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,mode,gl.LINEAR);
 for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
 shadowFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFbo);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);
 gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("Sun shadow buffer is unavailable.");
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 earthTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,earthTexture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 const earth=new Image();
 earth.onload=()=>{
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,earth);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);earthReady=1;worldVersion++;
 };
 earth.src=new URL("./earth.jpg",import.meta.url).href;
 const response=await fetch(new URL("./orbital.wasm?v=3",import.meta.url));
 if(!response.ok)throw Error("The station engine could not be downloaded.");
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{
  orbital:{
   scenery(p,n){update(room,p,n,gl.STATIC_DRAW);},hands(p,n){update(hand,p,n,gl.DYNAMIC_DRAW);},
   frame(p,n){if(n!==16)throw Error("Unexpected station frame");frame=new Float32Array(engine.memory.buffer,p,n).slice();}
  },
  wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}
 });
 engine=instance.exports;engine._start();engine.select_deck(1);engine.tick(0,0,0,0);
 fetch(new URL("./apollo-arm.bin?v=2",import.meta.url)).then(async r=>{
  if(!r.ok)throw Error("Apollo arm unavailable.");
  uploadArm(await r.arrayBuffer());
 }).catch(e=>console.warn(e.message));
 $("start").disabled=false;$("training").disabled=false;requestAnimationFrame(animate);
}catch(e){$("error").textContent=String(e.message);console.error(e);}
