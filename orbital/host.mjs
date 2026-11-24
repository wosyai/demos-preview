const $ = id => document.getElementById(id);
const canvas = $("view");
let nativeQuality=new URLSearchParams(location.search).get("quality")==="full";
const gl = canvas.getContext("webgl2", {alpha:false, antialias:false, preserveDrawingBuffer:false});
const rendererInfo=gl?.getExtension("WEBGL_debug_renderer_info");
const rendererLabel=rendererInfo?String(gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)):"";
const rasterSoftware=/swiftshader|llvmpipe|swrast|software|warp|basic render driver/i.test(rendererLabel);
const detailHardware=Boolean(rendererLabel&&!rasterSoftware);
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
layout(location=1) in vec4 color;
layout(location=2) in vec2 mat;
layout(location=4) in vec3 openNormal;
layout(location=5) in vec3 closedNormal;
layout(location=6) in vec2 armUVLow;
out vec3 surface;
out vec3 world;
out vec2 material;
out vec3 fittedNormal;
out vec2 armUV;
${view}
${skinVertex}
vec3 loadNormal(float code){
 uint enc=uint(-code)-1u;
 vec2 v=vec2(float(enc/255u),float(enc%255u))/127.-1.;
 vec3 n=vec3(v,1.-abs(v.x)-abs(v.y));
 if(n.z<0.)n.xy=(1.-abs(v.yx))*sign(v.xy+1e-6);
 return normalize(n);
}
void main(){
 vec3 actual=assetPoint(pos);
 vec3 p=toEye(actual);
 gl_Position=vec4(p.x*optics.x,p.y*optics.y,-1.002*p.z-.10,-p.z);
 surface=color.rgb;world=actual;material=armPose.w<0.?mat:vec2(.92,.181);
 fittedNormal=armPose.w<0.?(mat.x<0.?loadNormal(mat.x):vec3(0.)):mix(openNormal,closedNormal,armPose.w);
 uint uvHigh=uint(round(color.a*255.));
 armUV=armPose.w<0.?vec2(0.):(vec2(uvHigh%16u,uvHigh/16u)*256.+armUVLow)/4095.;
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
uniform int detailedShadow;
uniform float renderFraction;
uniform highp sampler2DArray surfaceTile;
uniform bool armSurfaceReady;
uniform bool panelStampReady;
uniform bool pressureStampReady;
uniform int routeLens;
uniform bool routeReach;
${sun}
float shadowAt(vec3 p,vec3 n,float direct){
 if(detailedShadow==0){
   vec3 u=lightClip(p+n*.012)*.5+.5;
   if(any(greaterThan(u,vec3(1.)))||any(lessThan(u,vec3(0.))))return 1.;
   float shade=texture(sunMap,vec3(u.xy,u.z-.00112));
   if(renderFraction>.69){
     vec2 o=vec2(.00115,.00073);
     shade=shade*.50+texture(sunMap,vec3(u.xy+o,u.z-.00132))*.25+texture(sunMap,vec3(u.xy-o,u.z-.00132))*.25;
   }
   return shade;
 }
 float incline=1.-direct;
 vec3 u=lightClip(p+n*(.004+.005*incline))*.5+.5;
 if(any(greaterThan(u,vec3(1.)))||any(lessThan(u,vec3(0.))))return 1.;
 float depth=u.z-(.00021+.00030*incline);
 return texture(sunMap,vec3(u.xy,depth));
}
vec3 sunColor(vec3 n){
 bool steel=material.y>.56 && material.y<.69;
 bool emitter=material.y>.8;
 bool maskedPanel=abs(material.y-.18375)<.0007;
 bool foil=maskedPanel || (material.y>.165 && material.y<.188 && surface.r>.52 && surface.b>surface.r*.78 && abs(n.x)>.86 && world.x<-1.3);
 bool suit=material.x>=0. && dot(fittedNormal,fittedNormal)>.25;
 bool armor=material.y>.705 && material.y<.735;
 bool solar=surface.b>2.*surface.r && material.y>.4 && material.y<.52;
 bool skin=suit&&armSurfaceReady;
 bool stamp=maskedPanel&&panelStampReady;
 bool pressure=pressureStampReady&&abs(material.y-.752)<.0007;
 vec3 lamp=vec3(1.00,.91,.78);
 bool warm=surface.r>surface.b*1.53 && surface.g<surface.r*.86 && !emitter;
 bool blue=surface.b>surface.r*1.20 && surface.g>surface.r*1.08 && !solar;
 bool dark=max(surface.r,max(surface.g,surface.b))<.34;
 float layer=skin?(armUV.x<.5?6.:7.) :pressure?9.:stamp?8.:suit||foil?2.:warm?3.:dark?4.:blue?5.:steel?1.:0.;
 vec3 wall=abs(n);
 vec2 tex=wall.x>max(wall.y,wall.z)?world.zy:wall.y>wall.z?world.xz:world.xy;
 vec2 uv=vec2(armUV.x*2.-(layer==7.?1.:0.),armUV.y);
 vec2 panelUV=vec2(0.),thermalUV=vec2(0.);
 if(foil){
  panelUV=vec2((world.z+11.6)/2.48,(world.y+1.62)/.86);
  bool alternate=mod(floor(panelUV.x)+floor(panelUV.y),2.)>.5;
  thermalUV=alternate?vec2(1.-panelUV.x,panelUV.y):panelUV;
  if(stamp){
   vec2 registered=vec2((world.z+6.64)/2.42,1.-(world.y+.76)/.81);
   thermalUV=clamp(registered,vec2(.002),vec2(.998));
  }
 }
 vec2 grain=skin?uv:pressure?clamp(vec2((world.z+4.16)/2.42,1.-(world.y+.76)/1.72),.002,.998):layer==1.?vec2(world.x*.87,(world.y*.78+world.z*.43)*1.42):
   suit?tex*vec2(13.5,16.):foil?thermalUV:
   layer==4.?tex*1.8:tex*vec2(.91,1.14);
 vec4 texel=texture(surfaceTile,vec3(grain,layer));
 vec3 sheet=texel.rgb;
 float polish=pressure?47.:layer==1.?70.:layer==3.?36.:layer==5.?40.:29.;
 float metal=pressure?.17:layer==1.?.49:layer==3.?.21:solar?.18:.075;
 if(skin){
   vec3 q=cross(dFdy(world),n),p=cross(n,dFdx(world));
   vec2 a=dFdx(uv),b=dFdy(uv);
   vec3 t=q*a.x+p*b.x, k=q*a.y+p*b.y;
   float gain=inversesqrt(max(1.e-8,max(dot(t,t),dot(k,k))));
   vec2 detail=(sheet.gb*2.-1.);
   n=normalize(n+(t*detail.x+k*detail.y)*gain*.80);
   float skinRough=min(1.,texel.a/.85);
   polish=mix(82.,19.,skinRough);metal=mix(.125,.052,skinRough);
 }
 float direct=max(dot(n,sunDir),0.);
 bool doorPlate=abs(material.y-.754)<.0007;
 float shadow=direct>0. ? shadowAt(world+(doorPlate?n*.018:vec3(0.)),n,direct):0.;
 float spec=shadow>0.?pow(max(dot(n,normalize(sunDir+normalize(eye-world))),0.),polish):0.;
 vec3 tint=layer==0.||stamp||pressure?vec3(1.21,1.23,1.25):layer==1.?vec3(1.78,1.80,1.84):
    layer==2.?vec3(1.18,1.23,1.30):layer==3.?vec3(1.22,1.56,2.40):
    layer==4.?vec3(2.70,2.70,2.70):vec3(2.05,1.72,1.59);
 vec3 col=surface*mix(vec3(.87),sheet*tint,suit?.36:foil?.93:.82);
 if(skin){
   float vertexLuma=dot(surface,vec3(.2126,.7152,.0722));
   col=surface*clamp(sheet.r/max(.018,vertexLuma),.25,2.5);
   float trimWeight=smoothstep(.875,.96,texel.a);
   col=mix(col,sheet.r*vec3(1.26,.53,.15),trimWeight);
 }
 if(layer==1.)spec*=.78+.43*sheet.r;
 if(armor){col*=1.045;spec+=.07*direct*sheet.r;}
 if(foil){
    vec2 edgeDelta=abs(fract(panelUV)-.5);
    float binding=smoothstep(.445,.499,max(edgeDelta.x,edgeDelta.y));
    col*=1.-binding*.11;
    spec+=.058*direct*(1.-binding*.74);
 }
 if(solar){
    vec2 uv=world.xy*vec2(9.,7.5);
    vec2 cells=abs(fract(uv)-.5)*2.;
    float width=max(fwidth(uv.x),fwidth(uv.y));
    float thin=smoothstep(.86-width,.98,max(cells.x,cells.y))*(1.-smoothstep(.18,.6,width));
    col=mix(col*(.78+sheet.r*.40),vec3(.42,.33,.21),thin*.89);
 }
 vec3 ambient=mix(vec3(.09,.12,.18),vec3(.23,.39,.51),max(0.,-n.y)*.75+max(0.,n.x)*.19);
 if(layer==1.){
   float skyReflect=smoothstep(-.5,.6,n.y);
   ambient+=mix(vec3(.06,.125,.20),vec3(.026,.028,.022),skyReflect)*(.40+.60*sheet.b);
 }
 vec3 energy=col*(ambient+lamp*direct*shadow*1.44)+metal*spec*shadow*lamp;
 if(material.x>1.)energy+=(material.x-1.)*col*vec3(1.24,.66,.28);
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
in vec2 armUV;
out vec4 pix;
${view}
${exteriorMaterial}
void main(){
 vec3 normal=normalize(cross(dFdx(world),dFdy(world)));
 if(eva==1){
   if(material.y>=1.098){
     int address=int(round((material.y-1.10)*100.))+1;
     vec3 idle=vec3(.15,.23,.24);
     vec3 litLens=address==5?vec3(1.0,.63,.28):address==4?vec3(.40,.81,1.):vec3(.43,.89,.90);
     pix=vec4(address==routeLens?mix(litLens,vec3(.84,1.,.90),routeReach?.48:.0):idle,1.);return;
   }
   if(dot(fittedNormal,fittedNormal)>.2)normal=normalize(fittedNormal);
   if(dot(normal,eye-world)<0.)normal=-normal;
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
 // Magnitudes concentrated below the helmet's daylight exposure.
 vec2 st=vec2(atan(ray.x,-ray.z),asin(ray.y))*118.;
 vec2 stCell=floor(st);
 float occupancy=hash(stCell+13.1);
 vec3 color=vec3(.0018,.0025,.0040)+vec3(.0011,.0017,.0027)*max(0.,-ray.y);
 if(occupancy>.987){
   vec2 center=.23+.54*vec2(hash(stCell+vec2(4.2,71.8)),hash(stCell+vec2(57.1,5.4)));
   vec2 displacement=fract(st)-center;
   float magnitude=hash(stCell+97.1);
   float radius=.052+.104*magnitude*magnitude;
   float psf=exp(-dot(displacement,displacement)/(radius*radius));
   vec3 spectrum=mix(vec3(1.,.81,.64),vec3(.66,.82,1.),hash(stCell+49.7));
   color+=spectrum*psf*(.050+.62*pow(magnitude,3.));
 }
 if(eva==1){
   vec3 planet=normalize(vec3(.64,-1.11,-.48));
   float arc=dot(planet,ray);
   float edge=.605;
   float arcPixel=max(fwidth(arc),.00009);
   float surfaceVisible=smoothstep(edge-arcPixel*.65,edge+arcPixel*.65,arc);
   // Exponential slant-column falloff outside the photographic limb.
   float atmosphere=exp(-max(0.,edge-arc)*780.);
   vec3 air=vec3(.075,.33,.82);
   color=mix(color,air*.63,atmosphere*.66);
   if(arc>=edge-arcPixel){
     float dist=arc-sqrt(max(0.,arc*arc-edge*edge));
     vec3 n=normalize(dist*ray-planet);
     vec3 orb=vec3(.56*n.x-.8285*n.y,.8285*n.x+.56*n.y,n.z);
     vec2 geo=vec2(atan(orb.x,-orb.z)*.15915494+.46,acos(clamp(orb.y,-1.,1.))*.31830989);
     vec3 albedo=photo==1?texture(earthMap,geo).rgb:vec3(.055,.205,.37);
     float density=dot(albedo,vec3(.2126,.7152,.0722));
     float neutrality=1.-(max(albedo.r,max(albedo.g,albedo.b))-min(albedo.r,min(albedo.g,albedo.b)));
     float cloud=smoothstep(.30,.78,density)*smoothstep(.62,.96,neutrality);
     // The VIIRS composite already includes real clouds. Grade the water and
     // weather separately rather than superimposing uncorrelated cloud noise.
     vec3 water=albedo*vec3(.56,.85,1.13);
     vec3 weather=clamp((albedo-vec3(.035))*vec3(1.04,1.04,1.06)+.045,0.,1.);
     vec3 day=mix(water,weather,cloud);
     vec3 lightDir=normalize(vec3(.43,.61,.66));
     float solar=smoothstep(-.10,.70,dot(n,lightDir));
     float facing=max(0.,dot(n,-ray));
     float inner=exp(-facing*7.)*.60;
     float glint=pow(max(0.,dot(reflect(-lightDir,n),-ray)),38.)*(1.-cloud)*.040;
     day=day*(.64+.36*solar)+glint*vec3(.56,.72,1.);
     color=mix(color,mix(day,air,inner),surfaceVisible);
   }
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
 return {p, eye:gl.getUniformLocation(p,"eye"), basis:gl.getUniformLocation(p,"basis"), optics:gl.getUniformLocation(p,"optics"), roll:gl.getUniformLocation(p,"roll"), eva:gl.getUniformLocation(p,"eva"), photo:gl.getUniformLocation(p,"photo"), earth:gl.getUniformLocation(p,"earthMap"), backdrop:gl.getUniformLocation(p,"backdrop"), sunMap:gl.getUniformLocation(p,"sunMap"),armPose:gl.getUniformLocation(p,"armPose"),armSurfaceReady:gl.getUniformLocation(p,"armSurfaceReady"),panelStampReady:gl.getUniformLocation(p,"panelStampReady"),pressureStampReady:gl.getUniformLocation(p,"pressureStampReady"), renderFraction:gl.getUniformLocation(p,"renderFraction"),surfaceTile:gl.getUniformLocation(p,"surfaceTile"), routeLens:gl.getUniformLocation(p,"routeLens"), routeReach:gl.getUniformLocation(p,"routeReach"), detailedShadow:gl.getUniformLocation(p,"detailedShadow")};
}
const coarseShadow=matchMedia("(pointer:coarse)").matches;
const maxShadow=gl?gl.getParameter(gl.MAX_TEXTURE_SIZE):1024;
let shadowSize=0, detailed=false;
function configureShadow(){
 const chooseDetail=nativeQuality&&detailHardware;
 const standard=coarseShadow?1024:1536;
 const desired=Math.min(maxShadow,chooseDetail?(coarseShadow?2048:3584):standard);
 if(shadowSize===desired&&detailed===chooseDetail)return;
 const oldTexture=shadowTexture, oldFbo=shadowFbo;
 [shadowTexture,shadowFbo]=shadowBuffer(desired);
 if(oldTexture)gl.deleteTexture(oldTexture);
 if(oldFbo)gl.deleteFramebuffer(oldFbo);
 shadowSize=desired;detailed=chooseDetail;shadowDirty=true;worldVersion++;
}
let shadowDirty=true;
let renderLoad=1, slowFrames=0, fastFrames=0, stillFrames=0;
let balanced=false, software=rasterSoftware;
let previous=null;
let worldVersion=0,renderVersion=-1,renderYaw=NaN,renderPitch=NaN,renderW=0,renderH=0,renderX=NaN,renderY=NaN,renderZ=NaN,renderGrip=NaN,renderRoute=-1,renderReach=-1;
let scene,space,skyCopy,depth,shadowFbo,shadowTexture,earthTexture,surfaceTexture,earthReady=0,engine,active=false, frame=null, grabbed=null, dx=0, dy=0, last=0, remainder=0, pulse=false, pulseDown=false;
const held=new Set(),touch=new Map();
let actionTouch=null,suppressTouchClick=false;
const bits={KeyA:1,ArrowLeft:1,KeyD:2,ArrowRight:2,KeyW:4,ArrowUp:4,KeyS:8,ArrowDown:8,Space:16,KeyC:32,ShiftLeft:128,ShiftRight:128};
function batch() {
 const vao=gl.createVertexArray(), buffer=gl.createBuffer();
 gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,n,offset] of [[0,3,0],[1,3,12],[2,2,24]]) {gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,offset);}
 return {vao,buffer,num:0};
}
function update(b,ptr,n,usage){
 if(n<0 || n%24!==0 || n/8>19500)throw Error("Invalid orbital mesh");
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
let importedArm=null,armSurfaceReady=false,panelStampReady=false,pressureStampReady=false;
function uploadArm(bytes){
 const dv=new DataView(bytes);const n=dv.getUint32(4,true),elements=dv.getUint32(8,true);
 if(dv.getUint32(0,true)!==0x3356414b || n>40000 || elements>90000 || elements%3 || 12+n*24+elements*2!==bytes.byteLength)throw Error("Unexpected Apollo arm mesh");
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const verts=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,verts);
 gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(bytes,12,n*24),gl.STATIC_DRAW);
 for(const [location,size,type,offset,normalized] of [[0,3,gl.SHORT,0,false],[3,3,gl.SHORT,6,false],[1,4,gl.UNSIGNED_BYTE,12,true],[4,3,gl.BYTE,16,true],[5,3,gl.BYTE,19,true],[6,2,gl.UNSIGNED_BYTE,22,false]]){
   gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,type,normalized,24,offset);
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
 if(renderVersion===worldVersion && renderYaw===heading && renderPitch===pitch && renderW===w && renderH===h && renderX===x && renderY===y && renderZ===z && renderGrip===pose[8] && renderRoute===pose[20] && renderReach===pose[10])return;
 renderVersion=worldVersion;renderYaw=heading;renderPitch=pitch;renderW=w;renderH=h;renderX=x;renderY=y;renderZ=z;renderGrip=pose[8];renderRoute=pose[20];renderReach=pose[10];
 const eva=frame[15]===1;
 if(eva&&shadowDirty){
   shadowDirty=false;
   gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFbo);
   gl.viewport(0,0,shadowSize,shadowSize);gl.enable(gl.DEPTH_TEST);
   gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depth.p);
   gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(detailed?1.1:1.25,detailed?1.3:1.8);
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
 gl.uniform1i(scene.routeLens,pose[20]);gl.uniform1i(scene.routeReach,pose[10]);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(scene.sunMap,2);gl.uniform1i(scene.detailedShadow,Number(detailed));
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);gl.uniform1i(scene.surfaceTile,4);gl.uniform1i(scene.armSurfaceReady,Number(armSurfaceReady));gl.uniform1i(scene.panelStampReady,Number(panelStampReady));gl.uniform1i(scene.pressureStampReady,Number(pressureStampReady));
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
 const eva=frame[15]===1, leg=frame[16], locked=frame[17]===1, align=frame[19];
 let aim=0,compactTip="";
 let objective="Approach the amber rail",tip="Drift forward and get within reach.",action="Grip rail";
 const rails=["Airlock rail","Scaffold rail","Cargo brace"];
 if(eva){
  const rail=rails[leg];
  objective="Approach the "+rail.toLowerCase();
  tip=["Drift along the hull to the silver rail.","Follow the blue collars along the scaffold.","Reach the gold brace ahead of the cargo." ][leg];
  if(locked){
   const cue=frame[18];
   if(align===7){objective="EVA complete";tip="Outer hatch locked. Cargo is secured and the station has your confirmation.";action="Hatch locked";}
   else if(align===6){objective="Airlock handle secured";tip="Lift the locking bar into its upper detent.";action="Lock airlock";}
   else if(align===5&&mode===1){objective="Taking the airlock handle";tip="Holding station.";action="Gripping handle";}
   else if(align===5&&near){objective="Airlock handle in reach";tip="Grip the amber locking bar.";action="Grip hatch";}
   else if(align===5&&cue===3){objective="Brake at the hatch";tip="Hold brake until your drift settles.";action="Brake first";compactTip="Hold BRAKE";}
   else if(align===5&&cue>=4&&cue<8){objective="Face the hatch handle";tip="Drag toward the amber handle.";action="Aim at handle";aim=cue;compactTip="Drag toward handle";}
   else if(align===5||align===4&&mode===3){objective="Return to the airlock";tip="Ride the push back toward the round hatch, then brake.";action="Out of reach";compactTip=cue>=8?"Find round hatch":"Drift to round hatch";aim=cue===8?4:cue===9?5:0;}
   else if(align===4){objective="Cargo transfer complete";tip="Release the console and return to the round airlock hatch.";action="Release & return";}
   else if(align===3){objective="Cargo seated";tip="Close the cradle keepers and release the robot grip.";action="Transfer cargo";compactTip="Close keepers";}
   else if(align===2){objective="Alignment handle secured";tip="Set the handle to lower the load into its shoes.";action="Set alignment";}
   else if(mode===3){objective="Clearing the lock";tip="Drift right to the blue alignment console.";action="Clearing lock";compactTip="Drift right";}
   else if(align===1&&mode===1){objective="Taking the alignment handle";tip="Holding station.";action="Gripping handle";}
   else if(align===1&&near){objective="Alignment handle in reach";tip="Your drift is stopped. Grip the blue handle.";action="Grip handle";}
   else if(align===1&&cue===3){objective="Brake at the console";tip="Hold brake until your drift settles.";action="Brake first";compactTip="Hold BRAKE";}
   else if(align===1&&cue>=4){objective="Face the alignment console";tip="Drag toward its blue light to line up.";action="Aim at light";aim=cue;compactTip="Drag toward blue";}
   else if(align===1){objective="Approach the alignment console";tip="Move right toward the blue light, then brake.";action="Out of reach";compactTip="Drift right toward blue";}
   else {objective="Cargo lock secured";tip="Pin seated. Release toward the blue alignment console.";action="Drift to align";}
  }
  else if(mode===3){objective="Pushing off";tip="Drift toward the next rail.";action="Pushing off";}
  else if(mode===2&&leg===2){objective="Cargo lock in reach";tip="Seat the pin. The amber indicator turns green.";action="Seat cargo lock";}
  else if(mode===2){objective=rail+" secured";tip="Open your hand and push toward the next rail.";action="Release & push";}
  else if(mode===1){objective="Gripping the rail";tip="Your drift is arrested.";}
  else if(near){objective=rail+" in reach";tip="Grip to stop drifting.";}
  if(!locked&&mode===0&&!near)compactTip="Drift to lit rail";
  if(mode===0&&frame[18]===1){tip="Turn back toward the rail.";compactTip="Turn to lit rail";}
  if(mode===0&&frame[18]===2){tip="Ease off thrust or brake to steady the approach.";compactTip="Ease off or brake";}
 }else if(mark===2){objective="Exercise complete";tip="You pushed off. Reset to practice again.";}
 else if(mode===2){objective="Rail secured";tip="Release the rail to push off.";action="Release & push";}
 else if(mode===1){objective="Gripping the handrail";tip="Your drift is arrested.";}
 else if(near){objective="Handrail in reach";tip="Grip to stop drifting.";}
 const routeArrow=Boolean(aim)&&align===5&&frame[18]>=8;
 const reticle=$("reticle"), marker=routeArrow?(aim===4?"❯":"❮"):aim?["+","+","+","+","→","←","↑","↓"][aim]:"+";
 if(reticle.textContent!==marker)reticle.textContent=marker;
 reticle.classList.toggle("aim-cue",Boolean(aim));
 reticle.classList.toggle("route-aim",routeArrow);
 if($("objective").textContent!==objective)$("objective").textContent=objective;
 if($("help").textContent!==tip)$("help").textContent=tip;
 const compact=$("compact-help");
 if(compact.textContent!==compactTip){compact.textContent=compactTip;compact.hidden=!compactTip;}
 $("action").disabled=!active||align===7||!(mode===2||(mode===0&&near===1));
 if($("action").textContent!==action)$("action").textContent=action;
 const task=eva?(align>=5?"EVA / AIRLOCK RETURN":locked?"EVA / CARGO ALIGNMENT":"EVA / "+(leg+1)+" OF 3"):"TRAINING 01 / HANDRAIL";
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
  return /swiftshader|llvmpipe|swrast|software|warp|basic render driver/i.test(r)?"software rasterizer":"renderer not identified as software";
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
   // Preserve a release tick between distinct taps, even at one render per tick.
   const press=pulse&&!pulseDown;
   engine.tick(1/60,mask|(press?64:0),lookX,lookY);
   if(press)pulse=false;
   pulseDown=press;lookX=0;lookY=0;remainder-=1/60;
  }
  hud();
 }else if(!active)remainder=0;
 render(Math.max(0,Math.min(1,remainder*60)));
 if(timing)timing(t);
}
function clear(){held.clear();touch.clear();grabbed=null;actionTouch=null;dx=0;dy=0;pulse=false;pulseDown=false;}
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
window.addEventListener("keydown",e=>{
 if(!active||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.code==="KeyE"){
   e.preventDefault();
   // Like the action button, preserve a press until the next fixed tick.
   if(!e.repeat)pulse=true;
   return;
 }
 if(bits[e.code]){e.preventDefault();held.add(e.code);}
});
window.addEventListener("keyup",e=>held.delete(e.code));
const quality=$("render-quality");
quality.value=nativeQuality?"full":"auto";
quality.addEventListener("change",()=>{
 nativeQuality=quality.value==="full";
 const url=new URL(location.href);
 if(nativeQuality)url.searchParams.set("quality","full");else url.searchParams.delete("quality");
 history.replaceState(null,"",url);
 if(gl)configureShadow();
 worldVersion++;
});
const actionButton=$("action");
actionButton.addEventListener("pointerdown",e=>{
 suppressTouchClick=e.pointerType==="touch";
 if(suppressTouchClick&&!actionButton.disabled)actionTouch={id:e.pointerId,x:e.clientX,y:e.clientY};
});
actionButton.addEventListener("pointerup",e=>{
 if(actionTouch?.id!==e.pointerId)return;
 const start=actionTouch;
 actionTouch=null;
 // Mobile browsers can suppress the compatibility click after a camera drag.
 // Queue a bounded touch release itself, without double-firing a later click.
 const hit=actionButton.getBoundingClientRect();
 if(active&&!actionButton.disabled&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<14&&
    e.clientX>=hit.left&&e.clientX<=hit.right&&e.clientY>=hit.top&&e.clientY<=hit.bottom)pulse=true;
});
for(const type of ["pointercancel","lostpointercapture"])actionButton.addEventListener(type,e=>{
 if(actionTouch?.id===e.pointerId)actionTouch=null;
});
actionButton.onclick=e=>{
 if(active&&!actionButton.disabled&&!(suppressTouchClick&&e.detail>0))pulse=true;
};
function enter(which){
 clear();previous=null;engine.select_deck(which);engine.tick(0,0,0,0);
 active=true;$("intro").hidden=true;$("exercise").textContent=which===1?"EVA 01 / STARBOARD TRUSS":"TRAINING 01 / HANDRAIL";hud();
}
$("reset").onclick=()=>{if(engine)enter(frame[15]);};
$("menu").onclick=()=>{clear();active=false;$("intro").hidden=false;};
$("start").onclick=()=>enter(1);
$("training").onclick=()=>enter(0);
let room,hand;
function shadowBuffer(size){
   const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.texStorage2D(gl.TEXTURE_2D,1,gl.DEPTH_COMPONENT24,size,size);
   for(const mode of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,mode,gl.LINEAR);
   for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_MODE,gl.COMPARE_REF_TO_TEXTURE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_COMPARE_FUNC,gl.LEQUAL);
   const fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,tex,0);
   gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("Sun shadow buffer is unavailable.");
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);
   return [tex,fbo];
 }
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
 configureShadow();
 surfaceTexture=gl.createTexture();
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);
 gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,1,1,10,0,gl.RGBA,gl.UNSIGNED_BYTE,
   new Uint8Array([211,204,193,255,143,142,139,255,216,207,189,255,207,150,82,255,84,83,83,255,117,136,150,255,128,128,128,200,128,128,128,200,217,216,212,255,213,212,209,255]));
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 const surfaces=new Image(), skinMap=new Image(), panelStamp=new Image(), pressureStamp=new Image();
 let stationTextureSide=0,loadingSkin=false;
 function putLayers(source,start,rows,columns,side){
  const tile=document.createElement("canvas");tile.width=side;tile.height=side;
  const ctx=tile.getContext("2d");
  for(let i=0;i<rows*columns;i++){
   ctx.clearRect(0,0,side,side);
   ctx.drawImage(source,(i%columns)*side,Math.floor(i/columns)*side,side,side,0,0,side,side);
   gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,start+i,side,side,1,gl.RGBA,gl.UNSIGNED_BYTE,tile);
  }
 }
 async function uploadSkin(){
  if(loadingSkin||stationTextureSide!==512||!skinMap.complete||skinMap.naturalWidth!==1024||skinMap.naturalHeight!==512)return;
  loadingSkin=true;
  try{
   await skinMap.decode();
   const options={premultiplyAlpha:"none",colorSpaceConversion:"none"};
   const maps=await Promise.all([0,512].map(x=>createImageBitmap(skinMap,x,0,512,512,options)));
   gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);
   for(let i=0;i<2;i++){
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,6+i,512,512,1,gl.RGBA,gl.UNSIGNED_BYTE,maps[i]);
    maps[i].close();
   }
   gl.generateMipmap(gl.TEXTURE_2D_ARRAY);armSurfaceReady=true;worldVersion++;
  }catch(e){loadingSkin=false;console.warn("Apollo material could not be loaded",e);}
 }
 surfaces.onload=()=>{
  const side=surfaces.width/3;
  if(!Number.isInteger(side)||surfaces.height!==2*side)return;
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,side,side,10,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  putLayers(surfaces,0,2,3,side);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  stationTextureSide=side;worldVersion++;uploadSkin();uploadStamp();uploadPressure();
 };
 function uploadStamp(){
  if(panelStampReady||stationTextureSide!==512||!panelStamp.complete||panelStamp.naturalWidth!==512||panelStamp.naturalHeight!==512)return;
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);
  putLayers(panelStamp,8,1,1,512);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  panelStampReady=true;worldVersion++;
 }
 function uploadPressure(){
  if(pressureStampReady||stationTextureSide!==512||!pressureStamp.complete||pressureStamp.naturalWidth!==512||pressureStamp.naturalHeight!==512)return;
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);
  putLayers(pressureStamp,9,1,1,512);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  pressureStampReady=true;worldVersion++;
 }
 pressureStamp.onload=uploadPressure;
 panelStamp.onload=uploadStamp;
 skinMap.onload=uploadSkin;
 surfaces.src=new URL("./surfaces.jpg?v=2",import.meta.url).href;
 skinMap.src=new URL("./apollo-material.png?v=2",import.meta.url).href;
 panelStamp.src=new URL("./thermal-panel.jpg",import.meta.url).href;
 pressureStamp.src=new URL("./pressure-skin.jpg",import.meta.url).href;
 earthTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,earthTexture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 const earth=new Image();
 earth.onload=()=>{
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);
  const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE);
  let earthSource=earth;
  if(earth.width>maxTexture||earth.height>maxTexture){
   const smaller=document.createElement("canvas"), scale=maxTexture/Math.max(earth.width,earth.height);
   smaller.width=Math.round(earth.width*scale);smaller.height=Math.round(earth.height*scale);
   const context=smaller.getContext("2d");
   context.imageSmoothingQuality="high";context.drawImage(earth,0,0,smaller.width,smaller.height);earthSource=smaller;
  }
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,earthSource);
  gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);earthReady=1;worldVersion++;
 };
 earth.src=new URL("./earth.jpg?v=2",import.meta.url).href;
 const response=await fetch(new URL("./orbital.wasm?v=20",import.meta.url));
 if(!response.ok)throw Error("The station engine could not be downloaded.");
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{
  orbital:{
   scenery(p,n){update(room,p,n,gl.STATIC_DRAW);},hands(p,n){update(hand,p,n,gl.DYNAMIC_DRAW);},
   frame(p,n){if(n!==21)throw Error("Unexpected station frame");frame=new Float32Array(engine.memory.buffer,p,n).slice();}
  },
  wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}
 });
 engine=instance.exports;engine._start();engine.select_deck(1);engine.tick(0,0,0,0);
 fetch(new URL("./apollo-arm.bin?v=4",import.meta.url)).then(async r=>{
  if(!r.ok)throw Error("Apollo arm unavailable.");
  uploadArm(await r.arrayBuffer());
 }).catch(e=>console.warn(e.message));
 $("start").disabled=false;$("training").disabled=false;requestAnimationFrame(animate);
}catch(e){$("error").textContent=String(e.message);console.error(e);}
