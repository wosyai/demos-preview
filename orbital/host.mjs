const $ = id => document.getElementById(id);
const canvas = $("view");
const gl = canvas.getContext("webgl2", {alpha:false, antialias:true, preserveDrawingBuffer:false});
const view = `
uniform vec3 eye;
uniform vec4 basis;
uniform vec2 optics;
vec3 toEye(vec3 p) {
  p -= eye;
  vec3 q = vec3(basis.x*p.x+basis.y*p.z,p.y,-basis.y*p.x+basis.x*p.z);
  return vec3(q.x,basis.z*q.y+basis.w*q.z,-basis.w*q.y+basis.z*q.z);
}
`;
const vs = `#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec3 color;
layout(location=2) in vec2 mat;
out vec3 surface;
out vec3 world;
out vec2 material;
${view}
void main(){
 vec3 p=toEye(pos);
 gl_Position=vec4(p.x*optics.x,p.y*optics.y,-1.002*p.z-.10,-p.z);
 surface=color;world=pos;material=mat;
}`;
const fs = `#version 300 es
precision highp float;
in vec3 surface;
in vec3 world;
in vec2 material;
out vec4 pix;
${view}
void main(){
 vec3 normal=normalize(cross(dFdx(world),dFdy(world)));
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
${view}
float hash(vec2 p){return fract(sin(dot(p,vec2(157.1,113.7)))*43758.5453);}
float noise(vec2 p){vec2 q=floor(p),u=fract(p);u=u*u*(3.-2.*u);return mix(mix(hash(q),hash(q+vec2(1,0)),u.x),mix(hash(q+vec2(0,1)),hash(q+vec2(1,1)),u.x),u.y);}
void main(){
 vec3 p=normalize(vec3(screen/optics,-1.));
 vec3 q=vec3(p.x,basis.z*p.y-basis.w*p.z,basis.w*p.y+basis.z*p.z);
 vec3 ray=vec3(basis.x*q.x-basis.y*q.z,q.y,basis.y*q.x+basis.x*q.z);
 vec2 st=vec2(atan(ray.x,-ray.z),asin(ray.y))*160.;
 float star=step(.992,hash(floor(st)))*(1.-smoothstep(.03,.3,length(fract(st)-.5)));
 vec3 color=vec3(.011,.021,.033)+vec3(.64,.81,1.)*star;
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
 return {p, eye:gl.getUniformLocation(p,"eye"), basis:gl.getUniformLocation(p,"basis"), optics:gl.getUniformLocation(p,"optics")};
}
let scene,space,engine,active=false, frame=null, grabbed=null, dx=0, dy=0, last=0, remainder=0, pulse=false;
const held=new Set(),touch=new Map();
const bits={KeyA:1,ArrowLeft:1,KeyD:2,ArrowRight:2,KeyW:4,ArrowUp:4,KeyS:8,ArrowDown:8,Space:16,KeyC:32,KeyE:64,ShiftLeft:128,ShiftRight:128};
function batch() {
 const vao=gl.createVertexArray(), buffer=gl.createBuffer();
 gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,n,offset] of [[0,3,0],[1,3,12],[2,2,24]]) {gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,offset);}
 return {vao,buffer,num:0};
}
function update(b,ptr,n,usage){
 if(n<0 || n%24!==0 || n/8>4096)throw Error("Invalid orbital mesh");
 gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(engine.memory.buffer,ptr,n),usage);b.num=n/8;
}
function render() {
 if(!frame)return;
 const scale=Math.min(devicePixelRatio,1.65,Math.sqrt(1600000/(canvas.clientWidth*canvas.clientHeight)));
 const w=Math.max(1,Math.round(canvas.clientWidth*scale)), h=Math.max(1,Math.round(canvas.clientHeight*scale));
 if(w!==canvas.width || h!==canvas.height){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);
 const [x,y,z,heading,pitch]=frame;
 function bind(o){
  gl.useProgram(o.p);gl.uniform3f(o.eye,x,y,z);
  gl.uniform4f(o.basis,Math.cos(heading),Math.sin(heading),Math.cos(pitch),Math.sin(pitch));
  const f=Math.min(1.45,1.8*w/h);gl.uniform2f(o.optics,f*h/w,f);
 }
 gl.clear(gl.DEPTH_BUFFER_BIT);
 gl.disable(gl.DEPTH_TEST);
 bind(space);gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.DEPTH_TEST);bind(scene);
 for(const b of [room,hand]){gl.bindVertexArray(b.vao);gl.drawArrays(gl.TRIANGLES,0,b.num);}
}
function hud(){
 const [, , , , , , , , ,mode,near,mark]=frame;
 let objective="Approach the amber rail",tip="Drift forward and get within reach.";
 if(mark===2){objective="Exercise complete";tip="You pushed off. Reset to practice again.";}
 else if(mode===2){objective="Rail secured";tip="Release the rail to push off.";}
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
$("reset").onclick=()=>{if(engine){clear();engine.reset();engine.tick(0,0,0,0);hud();}};
$("start").onclick=()=>{active=true;$("intro").hidden=true;hud();};
let room,hand;
try{
 if(!gl)throw Error("WebGL 2 is required to render the station.");
 scene=program(vs,fs);space=program(svs,sfs);room=batch();hand=batch();
 const response=await fetch(new URL("./orbital.wasm?v=1",import.meta.url));
 if(!response.ok)throw Error("The station engine could not be downloaded.");
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{
  orbital:{
   scenery(p,n){update(room,p,n,gl.STATIC_DRAW);},hands(p,n){update(hand,p,n,gl.DYNAMIC_DRAW);},
   frame(p,n){if(n!==16)throw Error("Unexpected station frame");frame=new Float32Array(engine.memory.buffer,p,n).slice();}
  },
  wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}
 });
 engine=instance.exports;engine._start();engine.reset();engine.tick(0,0,0,0);
 $("start").disabled=false;requestAnimationFrame(animate);
}catch(e){$("error").textContent=String(e.message);console.error(e);}
