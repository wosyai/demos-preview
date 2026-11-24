const $ = id => document.getElementById(id);
const canvas = $("view");
let nativeQuality=new URLSearchParams(location.search).get("quality")==="full";
const gl = canvas.getContext("webgl2", {alpha:false, antialias:false, preserveDrawingBuffer:false});
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
uniform float renderFraction;
uniform sampler2D surfaceTile;
${sun}
float shadowAt(vec3 p,vec3 n){
 vec3 u=lightClip(p+n*.012)*.5+.5;
 if(any(greaterThan(u,vec3(1.)))||any(lessThan(u,vec3(0.))))return 1.;
 float shade=texture(sunMap,vec3(u.xy,u.z-.00112));
 if(renderFraction>.69){
  vec2 o=vec2(.00115,.00073);
  shade=shade*.50+texture(sunMap,vec3(u.xy+o,u.z-.00132))*.25+texture(sunMap,vec3(u.xy-o,u.z-.00132))*.25;
 }
 return shade;
}
vec3 sunColor(vec3 n){
 bool steel=material.y>.56 && material.y<.69;
 bool emitter=material.y>.8;
 bool foil=material.y>.165 && material.y<.188 && surface.r>.52 && abs(n.x)>.86 && world.x<-1.3;
 bool armor=material.y>.705 && material.y<.735;
 bool solar=surface.b>2.*surface.r && material.y>.4 && material.y<.52;
 vec3 lamp=vec3(1.00,.91,.78);
 vec3 viewDir=normalize(eye-world);
 float shadow=shadowAt(world,n);
 float direct=max(dot(n,sunDir),0.);
 vec3 halfV=normalize(sunDir+viewDir);
 float spec=pow(max(dot(n,halfV),0.),steel?72.:24.);
 float metal=steel?.45:solar?.18:.075;
 vec3 wall=abs(n);
 vec2 tex=wall.x>max(wall.y,wall.z)?world.zy:wall.y>wall.z?world.xz:world.xy;
 vec3 sheet=texture(surfaceTile,tex*vec2(.56,.82)).rgb;
 vec3 col=surface*(.84+.26*sheet.r);
 if(steel) col=surface*(.91+.16*sheet.b);
 if(armor){col*=.92+.14*sheet.g;spec+=.14*direct*sheet.r;}
 if(foil){
    vec2 uv=vec2(world.z*.88,world.y*1.16);
    vec2 lines=abs(fract(uv)-.5)*2.;
    float seam=smoothstep(.88,.984,max(lines.x,lines.y));
    col*=.91+.22*sheet.g-.17*seam;
    spec+=.13*sheet.g*direct;
 }
 if(solar){
    vec2 uv=world.xy*vec2(9.,7.5);
    vec2 cells=abs(fract(uv)-.5)*2.;
    float width=max(fwidth(uv.x),fwidth(uv.y));
    float thin=smoothstep(.86-width,.98,max(cells.x,cells.y))*(1.-smoothstep(.18,.6,width));
    col=mix(col*(.78+sheet.r*.40),vec3(.42,.33,.21),thin*.89);
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
   if(material.y>.56 && material.y<.69 && abs(world.y+.57)<.095 && min(min(abs(world.z+1.59),abs(world.z+3.43)),abs(world.z+4.88))<.095){
      float rail=world.z>-2.51?-1.59:world.z>-4.155?-3.43:-4.88;
      normal=normalize(vec3(0.,world.y+.57,world.z-rail));
   }
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
// Reproject the static planet only when the helmet turns or the canvas
// changes size. Most thrust frames keep the same view direction.
const skyCopyFS=`#version 300 es
precision mediump float;
in vec2 screen;
uniform sampler2D backdrop;
out vec4 pix;
void main(){pix=texture(backdrop,screen*.5+.5);}
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
 return {p, eye:gl.getUniformLocation(p,"eye"), basis:gl.getUniformLocation(p,"basis"), optics:gl.getUniformLocation(p,"optics"), roll:gl.getUniformLocation(p,"roll"), eva:gl.getUniformLocation(p,"eva"), photo:gl.getUniformLocation(p,"photo"), earth:gl.getUniformLocation(p,"earthMap"), backdrop:gl.getUniformLocation(p,"backdrop"), sunMap:gl.getUniformLocation(p,"sunMap"),armPose:gl.getUniformLocation(p,"armPose"), renderFraction:gl.getUniformLocation(p,"renderFraction"),surfaceTile:gl.getUniformLocation(p,"surfaceTile")};
}
const shadowSize=matchMedia("(pointer:coarse)").matches ? 1024 : 1536;
let shadowDirty=true;
let renderLoad=1, slowFrames=0, fastFrames=0, stillFrames=0;
let balanced=false, software=false;
let previous=null;
let worldVersion=0,renderVersion=-1,renderYaw=NaN,renderPitch=NaN,renderW=0,renderH=0,renderX=NaN,renderY=NaN,renderZ=NaN,renderGrip=NaN;
let scene,space,skyCopy,depth,shadowFbo,shadowTexture,earthTexture,surfaceTexture,earthReady=0,engine,active=false, frame=null, grabbed=null, dx=0, dy=0, last=0, remainder=0, pulse=false;
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
 const payload=new Float32Array(engine.memory.buffer,ptr,n);
 worldVersion++;
 gl.bindVertexArray(b.vao);gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);
 if(usage===gl.STATIC_DRAW){
  shadowDirty=true;
  const seen=new Map(), packed=[],index=new Uint16Array(n/8);
  for(let at=0;at<n;at+=8){
    const v=payload.subarray(at,at+8);
    const token=v.join(",");
    let found=seen.get(token);
    if(found===undefined){found=packed.length/8;seen.set(token,found);packed.push(...v);}
    index[at/8]=found;
  }
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(packed),usage);
  b.indices??=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,index,usage);
 }else gl.bufferData(gl.ARRAY_BUFFER,payload,usage);
 b.num=n/8;
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
 importedArm={vao,elements};engine.select_arm(1);worldVersion++;
}
function meshes(program,eva,pose,onlyStatic=false){
 gl.uniform4f(program.armPose,0,0,0,-1);
 gl.bindVertexArray(room.vao);
 if(room.indices)gl.drawElements(gl.TRIANGLES,room.num,gl.UNSIGNED_SHORT,0);
 else gl.drawArrays(gl.TRIANGLES,0,room.num);
 if(onlyStatic)return;
 if(eva&&importedArm){
   gl.uniform4f(program.armPose,pose[12],pose[13],pose[14],pose[8]);
   gl.bindVertexArray(importedArm.vao);gl.drawElements(gl.TRIANGLES,importedArm.elements,gl.UNSIGNED_SHORT,0);
 }else{
   gl.bindVertexArray(hand.vao);gl.drawArrays(gl.TRIANGLES,0,hand.num);
 }
}
let skyFbo, skyTexture, priorHeading=NaN, priorPitch=NaN, skyW=0, skyH=0, skyHeading=NaN, skyPitch=NaN, skyDeck=-1, skyPhoto=-1;
function bakeBackdrop(bind,w,h,eva,heading,pitch){
 const wide=skyW!==w || skyH!==h;
 if(!wide && Math.abs(skyHeading-heading)<.001 && Math.abs(skyPitch-pitch)<.001
    && skyDeck===Number(eva) && skyPhoto===earthReady)return;
 if(wide){skyW=w;skyH=h;}
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);
 if(wide)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.bindFramebuffer(gl.FRAMEBUFFER,skyFbo);
 gl.disable(gl.DEPTH_TEST);bind(space);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.uniform1i(space.earth,1);gl.uniform1i(space.photo,earthReady);
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 skyHeading=heading;skyPitch=pitch;skyDeck=Number(eva);skyPhoto=earthReady;
}
function render(alpha) {
 if(!frame)return;
 const fraction=nativeQuality||stillFrames>14?1:renderLoad;
 const scale=nativeQuality?Math.min(devicePixelRatio,1.65,Math.sqrt(2750000/(canvas.clientWidth*canvas.clientHeight))):Math.min(devicePixelRatio,1.55,Math.sqrt((software?1100000:2100000)/(canvas.clientWidth*canvas.clientHeight)))*fraction;
 const w=Math.max(1,Math.round(canvas.clientWidth*scale)), h=Math.max(1,Math.round(canvas.clientHeight*scale));
 if(w!==canvas.width || h!==canvas.height){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);
 const pose=previous&&frame[15]===previous[15] ? frame.map((n,i)=>i<5||i===8||(i>=12&&i<=14)?previous[i]+(n-previous[i])*alpha:n):frame;
 const [x,y,z,heading,pitch]=pose;
 if(renderVersion===worldVersion && renderYaw===heading && renderPitch===pitch && renderW===w && renderH===h && renderX===x && renderY===y && renderZ===z && renderGrip===pose[8])return;
 renderVersion=worldVersion;renderYaw=heading;renderPitch=pitch;renderW=w;renderH=h;renderX=x;renderY=y;renderZ=z;renderGrip=pose[8];
 const eva=frame[15]===1;
 if(eva&&shadowDirty){
   shadowDirty=false;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFbo);
   gl.viewport(0,0,shadowSize,shadowSize);gl.enable(gl.DEPTH_TEST);
   gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depth.p);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.25,1.8);
   meshes(depth,eva,pose,true);
   gl.disable(gl.POLYGON_OFFSET_FILL);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
 }
 function bind(o){
  gl.useProgram(o.p);gl.uniform3f(o.eye,x,y,z);
  gl.uniform4f(o.basis,Math.cos(heading),Math.sin(heading),Math.cos(pitch),Math.sin(pitch));
  const aspect=w/h;
  // Crop less tightly on portrait. World-space contacts and touch aim never
  // move when the viewport decides how much of the helmet view to show.
  const eyeRelief=eva&&aspect<.72 ? 1.40+.45*Math.min(1.,Math.max(0.,(aspect-.49)/.23)) : 1.90;
  const f=Math.min(eva ? 1.42 : 1.45,(eva?eyeRelief:1.8)*aspect);gl.uniform2f(o.optics,f/aspect,f);
  gl.uniform1i(o.eva,Number(eva));gl.uniform1f(o.renderFraction,fraction);gl.uniform2f(o.roll,eva?.99449:1.,eva?-.10481:0.);
 }
 const holdingAngle=Math.abs(priorHeading-heading)<.001&&Math.abs(priorPitch-pitch)<.001;
 priorHeading=heading;priorPitch=pitch;
 if(holdingAngle)bakeBackdrop(bind,w,h,eva,heading,pitch);
 gl.clear(gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST);bind(scene);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(scene.sunMap,2);
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,surfaceTexture);gl.uniform1i(scene.surfaceTile,4);
 meshes(scene,eva,pose);
 // The background lies behind the mesh; early depth rejects the sky and globe
 // across the station rather than shading those pixels and drawing over them.
 gl.depthMask(false);
 if(holdingAngle){
   gl.useProgram(skyCopy.p);
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);gl.uniform1i(skyCopy.backdrop,3);
 }else{
   bind(space);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);
   gl.uniform1i(space.earth,1);gl.uniform1i(space.photo,earthReady);
 }
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true);
}
function hud(){
 const [, , , , , , , , ,mode,near,mark]=frame;
 const eva=frame[15]===1, leg=frame[16], locked=frame[17]===1;
 let objective="Approach the amber rail",tip="Drift forward and get within reach.",action="Grip rail";
 const rails=["Airlock rail","Scaffold rail","Cargo brace"];
 if(eva){
  const rail=rails[leg];
  objective="Approach the "+rail.toLowerCase();
  tip=["Drift along the hull to the silver rail.","Follow the blue collars along the scaffold.","Reach the gold brace ahead of the cargo." ][leg];
  if(locked){objective="Cargo lock secured";tip="Green light confirmed. Traverse complete.";action="Lock secured";}
  else if(mode===3){objective="Pushing off";tip="Drift toward the next rail.";action="Pushing off";}
  else if(mode===2&&leg===2){objective="Cargo lock in reach";tip="Seat the pin. The amber indicator turns green.";action="Seat cargo lock";}
  else if(mode===2){objective=rail+" secured";tip="Open your hand and push toward the next rail.";action="Release & push";}
  else if(mode===1){objective="Gripping the rail";tip="Your drift is arrested.";}
  else if(near){objective=rail+" in reach";tip="Grip to stop drifting.";}
  if(mode===0&&frame[18]===1)tip="Turn back toward the rail.";
  if(mode===0&&frame[18]===2)tip="Ease off thrust or brake to steady the approach.";
 }else if(mark===2){objective="Exercise complete";tip="You pushed off. Reset to practice again.";}
 else if(mode===2){objective="Rail secured";tip="Release the rail to push off.";action="Release & push";}
 else if(mode===1){objective="Gripping the handrail";tip="Your drift is arrested.";}
 else if(near){objective="Handrail in reach";tip="Grip to stop drifting.";}
 if($("objective").textContent!==objective)$("objective").textContent=objective;
 if($("help").textContent!==tip)$("help").textContent=tip;
 $("action").disabled=!active||locked||!(mode===2||(mode===0&&near===1));
 if($("action").textContent!==action)$("action").textContent=action;
 const task=eva?"EVA / "+(leg+1)+" OF 3":"TRAINING 01 / HANDRAIL";
 if($("exercise").textContent!==task)$("exercise").textContent=task;
}
const timing=new URLSearchParams(location.search).get("debug")==="timing"?setupTiming():null;
function setupTiming(){
 const panel=document.createElement("aside");
 panel.setAttribute("aria-label","Local timing diagnostics");
 panel.className="orbital-timing";
 const readout=document.createElement("output"), start=document.createElement("button"), save=document.createElement("button");
 start.type=save.type="button";start.textContent="Record trace";save.textContent="Save trace";save.disabled=true;
 panel.append(readout,start,save);document.querySelector("main").append(panel);
 let samples=[],on=false,epoch=0,prev=0,refresh=0,buffer=[];
 const size=()=>[canvas.width,canvas.height];
 const device=()=>{
  const ext=gl?.getExtension("WEBGL_debug_renderer_info");
  if(!ext)return "renderer not reported";
  const r=String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
  return /swiftshader|llvmpipe|software/i.test(r)?"software rasterizer":"renderer not identified as software";
 };
 const kind=device();
 start.onclick=()=>{
   if(on){on=false;start.textContent="Record trace";save.disabled=!samples.length;}
   else{samples=[];epoch=0;on=true;start.textContent="Stop trace";save.disabled=true;}
 };
 save.onclick=()=>{
   const url=URL.createObjectURL(new Blob([JSON.stringify({
     format:"orbital-raf-v1",rendererClass:kind, samples,
     columns:["elapsedMs","rafDeltaMs","backingWidth","backingHeight","deck","leg","phase","locked"]
   })],{type:"application/json"}));
   const a=document.createElement("a");a.href=url;a.download="orbital-frame-trace.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 return t=>{
   const dt=t-prev;prev=t;
   if(dt>0&&dt<1000){buffer.push(dt);if(buffer.length>60)buffer.shift();}
   const [w,h]=size();
   if(on&&active&&frame&&samples.length<18000){
    if(!epoch)epoch=t;
    samples.push([Math.round((t-epoch)*10)/10,Math.round(dt*10)/10,w,h,frame[15],frame[16],frame[9],frame[17]]);
    if(samples.length===18000)start.click();
   }
   if(t-refresh>400){
    refresh=t;
    const sorted=buffer.slice().sort((a,b)=>a-b);
    const p90=sorted.length?sorted[Math.floor((sorted.length-1)*.9)].toFixed(1):"—";
    readout.textContent=w+"×"+h+" backing · rAF P90 "+p90+" ms";
   }
 };
}
function animate(t){
 requestAnimationFrame(animate);
 if(!last)last=t;
 const period=t-last;
 remainder+=Math.min(period/1000,.20);last=t;
 if(active&&frame&&frame[15]===1&&period>0){
   if(!balanced){
     // Common software implementations report ANGLE / SwiftShader or llvmpipe.
     // Seed their moving resolution lower; normal GPUs start at full budget.
     const debug=gl.getExtension("WEBGL_debug_renderer_info");
     const name=debug?String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)):"";
     software=/swiftshader|llvmpipe|software/i.test(name);
     if(software)renderLoad=.65;
     balanced=true;
   }
   // Adapt only during movement/camera updates, not while the renderer is idle.
   if(nativeQuality){stillFrames=0;}
   else if(Math.abs(frame[5])+Math.abs(frame[6])+Math.abs(frame[7])>.025||frame[9]===1||frame[9]===3||dx||dy){
     stillFrames=0;
     if(period>90){slowFrames+=4;fastFrames=0;}else if(period>28){slowFrames++;fastFrames=0;}else if(period<19){fastFrames++;slowFrames=Math.max(0,slowFrames-1);}
     if(slowFrames>=7){renderLoad=Math.max(.45,renderLoad*.79);slowFrames=0;}
     if(fastFrames>=120){renderLoad=Math.min(1,renderLoad*1.08);fastFrames=0;}
   }else{stillFrames++;}
 }
 if(active && remainder>=1/60) {
  let mask=0;for(const k of held)mask|=bits[k];for(const b of touch.values())mask|=b;
  let lookX=dx,lookY=dy;dx=0;dy=0;
  while(remainder>=1/60){
   previous=frame;
   engine.tick(1/60,mask|(pulse?64:0),lookX,lookY);
   pulse=false;lookX=0;lookY=0;remainder-=1/60;
  }
  hud();
 }else if(!active)remainder=0;
 render(Math.max(0,Math.min(1,remainder*60)));
 if(timing)timing(t);
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
const quality=$("render-quality");
quality.value=nativeQuality?"full":"auto";
quality.addEventListener("change",()=>{
 nativeQuality=quality.value==="full";
 const url=new URL(location.href);
 if(nativeQuality)url.searchParams.set("quality","full");else url.searchParams.delete("quality");
 history.replaceState(null,"",url);
 worldVersion++;
});
$("action").onclick=()=>{pulse=true;};
function enter(which){
 clear();previous=null;engine.select_deck(which);engine.tick(0,0,0,0);
 active=true;$("intro").hidden=true;$("exercise").textContent=which===1?"EVA 01 / STARBOARD TRUSS":"TRAINING 01 / HANDRAIL";hud();
}
$("reset").onclick=()=>{if(engine)enter(frame[15]);};
$("menu").onclick=()=>{clear();active=false;$("intro").hidden=false;};
$("start").onclick=()=>enter(1);
$("training").onclick=()=>enter(0);
let room,hand;
try{
 if(!gl)throw Error("WebGL 2 is required to render the station.");
 scene=program(vs,fs);space=program(svs,sfs);skyCopy=program(svs,skyCopyFS);depth=program(depthVS,depthFS);room=batch();hand=batch();
 skyTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,skyTexture);
 for(const mode of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,mode,gl.LINEAR);
 for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 skyFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,skyFbo);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,skyTexture,0);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("Orbit backdrop buffer is unavailable.");
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
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
 surfaceTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,surfaceTexture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([132,132,132]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 const surfaces=new Image();
 surfaces.onload=()=>{
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,surfaceTexture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,surfaces);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);worldVersion++;
 };
 surfaces.src=new URL("./surfaces.png?v=1",import.meta.url).href;
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
 const response=await fetch(new URL("./orbital.wasm?v=6",import.meta.url));
 if(!response.ok)throw Error("The station engine could not be downloaded.");
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{
  orbital:{
   scenery(p,n){update(room,p,n,gl.STATIC_DRAW);},hands(p,n){update(hand,p,n,gl.DYNAMIC_DRAW);},
   frame(p,n){if(n!==19)throw Error("Unexpected station frame");frame=new Float32Array(engine.memory.buffer,p,n).slice();}
  },
  wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}
 });
 engine=instance.exports;engine._start();engine.select_deck(1);engine.tick(0,0,0,0);
 fetch(new URL("./apollo-arm.bin?v=3",import.meta.url)).then(async r=>{
  if(!r.ok)throw Error("Apollo arm unavailable.");
  uploadArm(await r.arrayBuffer());
 }).catch(e=>console.warn(e.message));
 $("start").disabled=false;$("training").disabled=false;requestAnimationFrame(animate);
}catch(e){$("error").textContent=String(e.message);console.error(e);}
