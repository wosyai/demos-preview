import {hudText} from "./hud-text.mjs?v=1";
import {earthDetail} from "./earth-detail.mjs";
import {exteriorSky} from "./exterior-sky.mjs?v=2";
import {chaseView,loadApolloBody,loadProceduralSuit,stationGrip} from "./apollo-body.mjs?v=14";
const $ = id => document.getElementById(id);
const canvas = $("view");
const main = canvas.parentElement;
const options=new URLSearchParams(location.search);
let nativeQuality=options.get("quality")==="full";
const wantsApollo=options.get("suit")!=="procedural";
const upgradedSky=options.get("sky")!=="legacy";
const upgradedPractical=options.get("practical")!=="legacy";
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
uniform int lightingUpgrade;
uniform bool practicalLighting;
uniform vec3 earthBounceDir;
uniform vec4 gripContact;
uniform float gripRadius;
uniform float renderFraction;
uniform highp sampler2DArray surfaceTile;
uniform bool armSurfaceReady;
uniform bool panelStampReady;
uniform bool pressureStampReady;
uniform bool fasciaStampReady;
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
// Wosy transfer_hatch lamp-centre coordinates (right, up, depth).
// Top and bottom rim fixtures face inward/down; recessed lamps throw forward
// through the cavity. The local baffle suppresses light behind the pressure skin.
vec2 practicalSource(vec3 P, vec3 N, vec3 V, vec3 source, vec3 axis, float power, float roughness) {
  vec3 d=source-P;
  float rr=dot(d,d);
  if(rr>.77)return vec2(0.);
  vec3 L=d*inversesqrt(max(rr,.0001));
  float receive=max(dot(N,L),0.);
  float cosine=dot(-L,axis);
  if(cosine<-.23)return vec2(0.);
  float beam=smoothstep(-.23,.58,cosine);
  float range=1.-smoothstep(.29,.77,rr);
  float a=power*beam*range/(rr+.026);
  vec3 H=normalize(L+V);
  float soft=pow(max(dot(N,H),0.),mix(54.,12.,roughness));
  return vec2(receive+.11,receive*soft)*a;
}
vec2 servicePractical(vec3 p,vec3 n,vec3 viewDir,float roughness,out bool inPort) {
  inPort=false;
  vec3 r=p-vec3(-1.10,.20,-6.39);
  if(abs(r.x)>1.22||abs(r.y)>1.18||r.z<-.95||r.z>.79)return vec2(0.);
  vec3 xAxis=vec3(.926,0.,-.378),zAxis=vec3(.378,0.,.926);
  vec3 P=vec3(dot(r,xAxis),r.y,dot(r,zAxis));
  float radius2=dot(P.xy,P.xy);
  if(P.z<-.67||P.z>.32||radius2>1.248)return vec2(0.);
  inPort=true;
  vec3 N=vec3(dot(n,xAxis),n.y,dot(n,zAxis));
  vec3 V=normalize(vec3(dot(viewDir,xAxis),viewDir.y,dot(viewDir,zAxis)));
  float mask=(1.-smoothstep(.80,1.19,radius2))*smoothstep(-.672,-.629,P.z)*(1.-smoothstep(.17,.32,P.z));
  vec2 C=practicalSource(P,N,V,vec3(-.001,.646,.177),vec3(0.,-.77,-.64),.108,roughness);
  C+=practicalSource(P,N,V,vec3(-.001,-.643,.177),vec3(0.,.77,-.64),.116,roughness);
  C+=practicalSource(P,N,V,vec3(-.3695,-.239,-.473),vec3(.34,.29,.89),.082,roughness);
  C+=practicalSource(P,N,V,vec3(.3655,.286,-.470),vec3(-.31,-.27,.91),.086,roughness);
  return min(vec2(.89,.48),C*mask);
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
 bool fascia=fasciaStampReady && material.y>.7558 && material.y<.7592;
 vec3 lamp=vec3(1.00,.91,.78);
 bool warm=surface.r>surface.b*1.53 && surface.g<surface.r*.86 && !emitter;
 bool blue=surface.b>surface.r*1.20 && surface.g>surface.r*1.08 && !solar;
 bool dark=max(surface.r,max(surface.g,surface.b))<.34;
 float layer=skin?(armUV.x<.5?6.:7.) :fascia?10.:pressure?9.:stamp?8.:suit||foil?2.:warm?3.:dark?4.:blue?5.:steel?1.:0.;
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
 vec2 grain=skin?uv:fascia?clamp(vec2(world.x-.72,1.-(world.y-.205+clamp((material.y-.75625)*160.,0.,.40))/.64),.003,.997):pressure?clamp(vec2((world.z+4.16)/2.42,1.-(world.y+.76)/1.72),.002,.998):layer==1.?vec2(world.x*.87,(world.y*.78+world.z*.43)*1.42):
   suit?tex*vec2(13.5,16.):foil?thermalUV:
   layer==4.?tex*1.8:tex*vec2(.91,1.14);
 vec4 texel=texture(surfaceTile,vec3(grain,layer));
 vec3 sheet=texel.rgb;
 float polish=pressure?47.:layer==1.?70.:layer==3.?36.:layer==5.?40.:29.;
 float metal=pressure?.17:layer==1.?.49:layer==3.?.21:solar?.18:.075;
 float roughness=.60;
 if(practicalLighting&&steel&&layer==1.&&!foil&&!suit){
   // Oxide patches vary the highlight on the same sampled weathering map,
   // not by placing a color filter over the material or the sunlight.
   float burnish=smoothstep(.29,.73,texel.r);
   roughness=mix(.74,.28,burnish);
   polish=mix(25.,81.,burnish);
   metal*=mix(.82,1.18,burnish);
 }
 if(practicalLighting&&foil){roughness=.73;polish=19.;metal*=.72;}
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
 vec3 tint=layer==0.||stamp||pressure||fascia?vec3(1.21,1.23,1.25):layer==1.?vec3(1.78,1.80,1.84):
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
    vec2 uv=tex*vec2(4.5,6.0);
    vec2 cells=abs(fract(uv)-.5)*2.;
    float width=max(fwidth(uv.x),fwidth(uv.y));
    float thin=smoothstep(.86-width,.98,max(cells.x,cells.y))*(1.-smoothstep(.18,.6,width));
    float bus=1.-smoothstep(.018,.018+max(fwidth(tex.x),.002),abs(fract(tex.x*1.50+.5)-.5));
    vec3 photovoltaic=mix(col*(.84+sheet.r*.3),vec3(.19,.32,.63),.22);
    col=mix(photovoltaic,vec3(.55,.51,.38),max(thin*.79,bus*.64));
    if(n.y<-.45)col=mix(col,vec3(.30,.28,.215)*(.76+.32*sheet.r),.85);
 }
 if(abs(material.y-.697)<.0005){
    float fresnel=pow(1.-abs(dot(n,normalize(eye-world))),3.);
    col=mix(vec3(.016,.054,.080),vec3(.20,.36,.47),.16+.72*fresnel);
    spec+=pow(max(0.,dot(reflect(-sunDir,n),normalize(eye-world))),120.)*.8;
 }
 if(abs(material.y-.695)<.0005){
    vec2 quilt=tex*vec2(1.32,1.74);
    vec2 seam=abs(fract(quilt)-.5);float stitch=smoothstep(.447,.497,max(seam.x,seam.y));
    float crease=texture(surfaceTile,vec3(tex*1.65,2.)).r;
    col*=.70+.38*crease-.20*stitch;spec+=.12*crease*direct;
 }
 if(abs(material.y-.692)<.0005){
    float groove=abs(fract(tex.x*4.)-.5);
    float ink=1.-smoothstep(.04,.04+max(fwidth(tex.x*4.),.02),groove);
    col*=1.-.34*ink;
 }
 vec3 ambient=mix(vec3(.09,.12,.18),vec3(.23,.39,.51),max(0.,-n.y)*.75+max(0.,n.x)*.19);
 if(lightingUpgrade==1){
   float bounce=max(dot(n,normalize(earthBounceDir)),0.);
   ambient=vec3(.055,.075,.115)+vec3(.168,.281,.390)*bounce;
 }
 if(layer==1.){
   float skyReflect=smoothstep(-.5,.6,n.y);
   ambient+=mix(vec3(.06,.125,.20),vec3(.026,.028,.022),skyReflect)*(.40+.60*sheet.b);
 }
 vec3 energy=col*(ambient+lamp*direct*shadow*1.44)+metal*spec*shadow*lamp;
 if(gripContact.w>0.){
   // Profile-local contact occlusion on the bar. Existing station shadows
   // remain authoritative for projected structures; no new render pass.
   vec3 d=world-gripContact.xyz;
   if(abs(d.x-.023)<.068&&abs(d.z)<.088&&d.y>-.025&&d.y<.115){
     float across=1.-smoothstep(.035,.068,abs(d.x-.023));
     float surface=1.-smoothstep(.0007,.0045,abs(dot(d.yz,d.yz)-gripRadius*gripRadius));
     float cover=smoothstep(-.025,.045,d.y)*(1.-smoothstep(.037,.088,abs(d.z)));
     energy*=1.-.46*gripContact.w*surface*across*cover;
   }
 }
 bool inPort=false;
 if(practicalLighting){
   vec2 warm=servicePractical(world,n,eye-world,roughness,inPort);
   energy+=col*vec3(1.34,.55,.22)*warm.x+vec3(.90,.41,.14)*metal*warm.y;
 }
 if(material.x>1.)energy+=(material.x-1.)*col*vec3(1.24,.66,.28)*(inPort?.18:1.);
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
     vec3 litLens=address<=2?vec3(1.,.57,.14):address==5?vec3(1.0,.63,.28):address==4?vec3(.40,.81,1.):vec3(.43,.89,.90);
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
${sun}
${exteriorSky}
uniform int upgradedSky;
uniform vec4 orbitCenter;
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
 if(eva==1&&upgradedSky==1){
   vec3 stars=starReady==1?color*.81+orbitalStars(ray)*.31:color;
   pix=vec4(orbitalExterior(ray,stars,orbitCenter.xyz,orbitCenter.w),1.);return;
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
 return {p, eye:gl.getUniformLocation(p,"eye"), basis:gl.getUniformLocation(p,"basis"), optics:gl.getUniformLocation(p,"optics"), roll:gl.getUniformLocation(p,"roll"), eva:gl.getUniformLocation(p,"eva"), photo:gl.getUniformLocation(p,"photo"), earth:gl.getUniformLocation(p,"earthMap"),starMap:gl.getUniformLocation(p,"starMap"),starReady:gl.getUniformLocation(p,"starReady"),upgradedSky:gl.getUniformLocation(p,"upgradedSky"),orbitCenter:gl.getUniformLocation(p,"orbitCenter"),earthAngle:gl.getUniformLocation(p,"earthAngle"), backdrop:gl.getUniformLocation(p,"backdrop"), sunMap:gl.getUniformLocation(p,"sunMap"),armPose:gl.getUniformLocation(p,"armPose"),armSurfaceReady:gl.getUniformLocation(p,"armSurfaceReady"),panelStampReady:gl.getUniformLocation(p,"panelStampReady"),pressureStampReady:gl.getUniformLocation(p,"pressureStampReady"),fasciaStampReady:gl.getUniformLocation(p,"fasciaStampReady"), renderFraction:gl.getUniformLocation(p,"renderFraction"),surfaceTile:gl.getUniformLocation(p,"surfaceTile"), routeLens:gl.getUniformLocation(p,"routeLens"), routeReach:gl.getUniformLocation(p,"routeReach"), detailedShadow:gl.getUniformLocation(p,"detailedShadow"),lightingUpgrade:gl.getUniformLocation(p,"lightingUpgrade"),practicalLighting:gl.getUniformLocation(p,"practicalLighting"),earthBounceDir:gl.getUniformLocation(p,"earthBounceDir"),gripContact:gl.getUniformLocation(p,"gripContact"),gripRadius:gl.getUniformLocation(p,"gripRadius")};
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
let scene,space,skyCopy,depth,shadowFbo,shadowTexture,earthTexture,starTexture,surfaceTexture,earthReady=0,starReady=0,engine,active=false, frame=null, grabbed=null, dx=0, dy=0, last=0, remainder=0, pulse=false, pulseDown=false;
const held=new Set();
let coast=false,apolloBody=null,apolloModelActive=false,thirdPerson=false,chaseBlend=0;
let avatarMotion="",renderSkySpin=NaN;
// Wosy frame: [0..4] eye/aim, [5..7] velocity, [8..20] mission/contact;
// [21..22] body aim, [23..25] applied acceleration, [26] contact,
// [27] pre-grip speed², [28..32] altitude/entry/time/fuel/scenario,
// [33..36] translational and rotational controller commands, [37] simulated orbital seconds.
const sticks={move:{id:null,x:0,y:0},look:{id:null,x:0,y:0}};
let actionTouch=null,suppressTouchClick=false;
const bits={KeyA:1,ArrowLeft:1,KeyD:2,ArrowRight:2,KeyW:4,ArrowUp:4,KeyS:8,ArrowDown:8,Space:16,KeyC:32,ShiftLeft:256,ShiftRight:256};
function batch() {
 const vao=gl.createVertexArray(), buffer=gl.createBuffer();
 gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,n,offset] of [[0,3,0],[1,3,12],[2,2,24]]) {gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,offset);}
 return {vao,buffer,num:0};
}
function update(b,ptr,n,usage){
 if(n<0 || n%24!==0 || n/24>=6680)throw Error("Invalid orbital mesh");
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
let importedArm=null,armSurfaceReady=false,panelStampReady=false,pressureStampReady=false,fasciaStampReady=false;
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
 // The body uses an integer joint default in generic slot 3. Station
 // VAOs disable that slot, but their shared float shader still reads it.
 gl.vertexAttrib4f(3,0,0,0,1);
 gl.uniform4f(program.armPose,0,0,0,-1);
 gl.bindVertexArray(room.vao);
 if(room.indices)gl.drawElements(gl.TRIANGLES,room.num,gl.UNSIGNED_SHORT,0);
 else gl.drawArrays(gl.TRIANGLES,0,room.num);
 if(eva && hull.num){gl.bindVertexArray(hull.vao);gl.drawElements(gl.TRIANGLES,hull.num,gl.UNSIGNED_SHORT,0);}
 if(onlyStatic)return;
 if(eva&&importedArm){
   gl.uniform4f(program.armPose,pose[12],pose[13],pose[14],pose[8]);
   gl.bindVertexArray(importedArm.vao);gl.drawElements(gl.TRIANGLES,importedArm.elements,gl.UNSIGNED_SHORT,0);
 }else{
   gl.bindVertexArray(hand.vao);gl.drawArrays(gl.TRIANGLES,0,hand.num);
 }
}
let skyFbo, skyTexture, priorHeading=NaN, priorPitch=NaN, skyW=0, skyH=0, skyHeading=NaN, skyPitch=NaN, skyDeck=-1, skyPhoto=-1, skyRoll=0, skyStars=-1, skySpin=NaN, skyOrbit=null;
let fineEarth;
function bindOrbit(frame){
 fineEarth.bind();
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.uniform1i(space.earth,1);gl.uniform1i(space.photo,earthReady);
 gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,starTexture);gl.uniform1i(space.starMap,7);gl.uniform1i(space.starReady,starReady);
 gl.uniform1i(space.upgradedSky,Number(upgradedSky));gl.uniform1f(space.earthAngle,frame.spin);gl.uniform4fv(space.orbitCenter,frame.center);
}
function skyState(pose){
 const spin=((pose[32]===1?1.35:0)+pose[37]*0.00007292115)%(2*Math.PI);
 const [x,y,z]=pose,span=Math.hypot(x,y,z);
 const blend=pose[32]===1||pose[29]===1?1:Math.min(1,Math.max(0,(span-1000)/18000));
 const n=Math.hypot(x,6761000+y,z);
 const n0=Math.hypot(.64,1.11,.48);
 return {spin,center:[.64/n0*(1-blend)-x/n*blend,-1.11/n0*(1-blend)-(6761000+y)/n*blend,-.48/n0*(1-blend)-z/n*blend,Math.sqrt(1-.605*.605)*(1-blend)+6371000/(6371000+Math.max(0,pose[28]))*blend]};
}
function bakeBackdrop(bind,w,h,eva,heading,pitch,roll,orbit){
 const wide=skyW!==w || skyH!==h;
 if(!wide && Math.abs(skyHeading-heading)<.001 && Math.abs(skyPitch-pitch)<.001
    && skyDeck===Number(eva) && skyPhoto===earthReady && skyRoll===roll[1]
    && (!eva||!upgradedSky||(skyStars===starReady&&Math.abs(orbit.spin-skySpin)<.0006
      && orbit.center.every((n,i)=>Math.abs(n-skyOrbit[i])<.0006))))return;
 if(wide){skyW=w;skyH=h;}
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);
 if(wide)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.bindFramebuffer(gl.FRAMEBUFFER,skyFbo);
 gl.disable(gl.DEPTH_TEST);bind(space);
 bindOrbit(orbit);
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 skyHeading=heading;skyPitch=pitch;skyDeck=Number(eva);skyPhoto=earthReady;skyRoll=roll[1];skyStars=starReady;skyOrbit=orbit.center;skySpin=orbit.spin;
}
function render(alpha) {
 if(!frame)return;
 const fraction=nativeQuality||stillFrames>14?1:renderLoad;
 const scale=nativeQuality?Math.min(devicePixelRatio,1.65,Math.sqrt(2750000/(canvas.clientWidth*canvas.clientHeight))):Math.min(devicePixelRatio,1.55,Math.sqrt((software?1100000:2100000)/(canvas.clientWidth*canvas.clientHeight)))*fraction;
 const w=Math.max(1,Math.round(canvas.clientWidth*scale)), h=Math.max(1,Math.round(canvas.clientHeight*scale));
 if(w!==canvas.width || h!==canvas.height){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);
 const discreteContact=stage=>stage===0.5||stage===2.5||stage===3.25||stage===3.5||stage===6.5;
 const seatContact=discreteContact(frame[19])||discreteContact(previous?.[19]);
 const interpolate=previous&&frame[15]===previous[15]&&frame[32]===previous[32];
 const mixAngle=(a,b)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*alpha;
 const pose=interpolate ? frame.map((n,i)=>i===3||i===21?mixAngle(previous[i],n):i<5||i===8||i===22||(!seatContact&&i>=12&&i<=14)?previous[i]+(n-previous[i])*alpha:n):frame;
 const eva=pose[15]===1, body=eva&&apolloBody;
 const immersed={eye:[...pose.slice(0,3)],yaw:pose[3],pitch:pose[4]};
 const chase=Boolean(body&&thirdPerson);
 const to=chase?1:0;
 if(Math.abs(chaseBlend-to)>.005)chaseBlend+=(to-chaseBlend)*.22;else chaseBlend=to;
 const camera=chaseBlend>0&&body ? chaseView(pose,{blend:chaseBlend,clip:(from,to)=>engine.camera_clip(...from,...to)}) : immersed;
 const [x,y,z]=camera.eye,{yaw:heading,pitch}=camera;
 const drawBody=Boolean(body&&(chase||chaseBlend>.03)&&Math.hypot(x-pose[0],y-pose[1],z-pose[2])>.8);
 const orbit=skyState(pose);
 const aspect=w/h;
 const eyeRelief=eva&&aspect<.72 ? 1.40+.45*Math.min(1.,Math.max(0.,(aspect-.49)/.23)) : 1.90;
 const f=Math.min(eva ? 1.42 : 1.45,(eva?eyeRelief:1.8)*aspect);
 const optics=[f/aspect,f],roll=eva&&!drawBody?[.99449,-.10481]:[1,0];
 if(eva&&upgradedSky&&earthReady&&$("intro").hidden)fineEarth.update(orbit,heading,pitch,optics,roll,h);
 const skyMoved=eva&&upgradedSky&&!(Math.abs(orbit.spin-renderSkySpin)<.0006);
 const motion=body?[pose[21],pose[22],...pose.slice(23,26),...pose.slice(33,37),drawBody].join(","):"";
 if(renderVersion===worldVersion && renderYaw===heading && renderPitch===pitch && renderW===w && renderH===h && Math.abs(renderX-x)<.00002 && Math.abs(renderY-y)<.00002 && Math.abs(renderZ-z)<.00002 && renderGrip===pose[8] && renderRoute===pose[20] && renderReach===pose[10] && avatarMotion===motion && !skyMoved)return;
 renderVersion=worldVersion;renderYaw=heading;renderPitch=pitch;renderW=w;renderH=h;renderX=x;renderY=y;renderZ=z;renderGrip=pose[8];renderRoute=pose[20];renderReach=pose[10];avatarMotion=motion;if(skyMoved)renderSkySpin=orbit.spin;
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
  gl.uniform2fv(o.optics,optics);
  gl.uniform1i(o.eva,Number(eva));gl.uniform1f(o.renderFraction,fraction);gl.uniform2fv(o.roll,roll);
 }
 const holdingAngle=Math.abs(priorHeading-heading)<.001&&Math.abs(priorPitch-pitch)<.001;
 priorHeading=heading;priorPitch=pitch;
 if(holdingAngle)bakeBackdrop(bind,w,h,eva,heading,pitch,roll,orbit);
 gl.clear(gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST);bind(scene);
 gl.uniform1i(scene.practicalLighting,Number(upgradedPractical));gl.uniform1i(scene.lightingUpgrade,Number(upgradedSky));gl.uniform3fv(scene.earthBounceDir,orbit.center.slice(0,3));
 // Both suit solvers use this same Wosy-derived rail anchor; shade only in contact.
 const contact=body&&(!apolloModelActive||upgradedPractical)?stationGrip(pose):null;
 if(contact){gl.uniform4f(scene.gripContact,...contact.center,contact.progress);gl.uniform1f(scene.gripRadius,contact.radius);}
 else gl.uniform4f(scene.gripContact,0,0,0,0);
 gl.uniform1i(scene.routeLens,pose[20]);gl.uniform1i(scene.routeReach,pose[10]);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(scene.sunMap,2);gl.uniform1i(scene.detailedShadow,Number(detailed));
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);gl.uniform1i(scene.surfaceTile,4);gl.uniform1i(scene.armSurfaceReady,Number(armSurfaceReady));gl.uniform1i(scene.panelStampReady,Number(panelStampReady));gl.uniform1i(scene.pressureStampReady,Number(pressureStampReady));gl.uniform1i(scene.fasciaStampReady,Number(fasciaStampReady));
 meshes(scene,eva,pose,Boolean(body));
 if(body)apolloBody.draw(pose,{camera,optics,thirdPerson:drawBody,roll});
 // The background lies behind the mesh; early depth rejects the sky and globe
 // across the station rather than shading those pixels and drawing over them.
 gl.depthMask(false);
 if(holdingAngle){
   gl.useProgram(skyCopy.p);
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);gl.uniform1i(skyCopy.backdrop,3);
 }else{
   bind(space);bindOrbit(orbit);
 }
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true);
}
let touchLookSeen=false;
function hud(){
 const [vx,vy,vz]=frame.slice(5,8);
 const [,,,heading,pitch]=frame;
 const driftRight=vx*Math.cos(heading)+vz*Math.sin(heading);
 const driftAhead=(vx*Math.sin(heading)-vz*Math.cos(heading))*Math.cos(pitch)+vy*Math.sin(pitch);
 const speed=Math.hypot(vx,vy,vz);
 const eva=frame[15]===1, contact=frame[26]===1;
 const view=hudText(engine.hud_code(),frame[16],touchLookSeen);
 const coastButton=$("coast");
 coastButton.hidden=!active||!view.coast;
 if(coastButton.hidden)coast=false;
 coastButton.setAttribute("aria-pressed",String(coast));
 const cameraButton=$("camera");
 cameraButton.hidden=!apolloBody||!eva;
 cameraButton.disabled=!active||cameraButton.hidden;
 cameraButton.setAttribute("aria-label",thirdPerson?"Switch to first-person camera":"Switch to third-person camera");
 cameraButton.setAttribute("aria-pressed",String(thirdPerson));
 const instrument=$("flight-instrument");
 instrument.hidden=!active;
 instrument.classList.toggle("burn",view.burn);
 instrument.classList.toggle("contact",contact);
 const readout=(frame[30]>1?"×120 · ":"")+(contact?"HULL CONTACT · ":view.burn?"THRUST · ":"DRIFT · ")+speed.toFixed(1)+" m/s"+(eva?" · Δv "+frame[31].toFixed(1)+" m/s":"")+(view.far?" · "+(frame[28]/1000).toFixed(0)+" km":"");
 text("flight-speed",readout);
 const vector=$("drift-vector");
 vector.style.opacity=String(speed>.08?1:0);
 vector.style.transform="rotate("+Math.atan2(driftRight,driftAhead)+"rad)";
 main.classList.toggle("console-hud",view.console);
 const reticle=$("reticle");
 text("reticle",view.marker);
 reticle.classList.toggle("aim-cue",view.aim);
 reticle.classList.toggle("route-aim",view.route);
 text("objective",view.objective);
 text("help",view.tip);
 text("compact-help",view.short);
 $("compact-help").hidden=!view.short;
 $("action").disabled=!active||!view.interact;
 text("action",view.action);
 text("exercise",view.section);
}
function text(id,value){const node=$(id);if(node.textContent!==value)node.textContent=value;}
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
   else if(Math.abs(frame[5])+Math.abs(frame[6])+Math.abs(frame[7])>.025||frame[9]===1||frame[9]===3||dx||dy||sticks.look.x||sticks.look.y||(chaseBlend>0&&chaseBlend<1)){
     stillFrames=0;
     if(period>90){slowFrames+=4;fastFrames=0;}else if(period>28){slowFrames++;fastFrames=0;}else if(period<19){fastFrames++;slowFrames=Math.max(0,slowFrames-1);}
     if(slowFrames>=7){renderLoad=Math.max(.45,renderLoad*.79);slowFrames=0;}
     if(fastFrames>=120){renderLoad=Math.min(1,renderLoad*1.08);fastFrames=0;}
   }else{stillFrames++;}
 }
 if(active && remainder>=1/60) {
  let mask=0;for(const k of held)mask|=bits[k];
  if((mask&63)||Math.hypot(sticks.move.x,sticks.move.y)>.01)coast=false;
  if(coast)mask|=512;
  let lookX=dx,lookY=dy;dx=0;dy=0;
  engine.set_thrust(sticks.move.x,-sticks.move.y);
  while(remainder>=1/60){
   previous=frame;
   // Preserve a release tick between distinct taps, even at one render per tick.
   const press=pulse&&!pulseDown;
   engine.set_rotator(Math.max(-1,Math.min(1,lookX/.045+sticks.look.x)),Math.max(-1,Math.min(1,lookY/.045-sticks.look.y)));
   engine.tick(1/60,mask|(press?64:0),lookX+sticks.look.x*.033,lookY-sticks.look.y*.027);
   if(press)pulse=false;
   pulseDown=press;lookX=0;lookY=0;remainder-=1/60;
  }
  hud();
 }else if(!active)remainder=0;
 render(Math.max(0,Math.min(1,remainder*60)));
 if(timing)timing(t);
}
function clear(){coast=false;held.clear();for(const stick of Object.values(sticks))releaseStick(stick);grabbed=null;actionTouch=null;dx=0;dy=0;pulse=false;pulseDown=false;}
canvas.addEventListener("pointerdown",e=>{
 if(!active||grabbed!==null)return;grabbed={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
 if(grabbed?.id!==e.pointerId)return;
 if(e.pointerType==="touch"&&(Math.abs(e.clientX-grabbed.x)+Math.abs(e.clientY-grabbed.y)>3))touchLookSeen=true;
 dx+=(e.clientX-grabbed.x)*.0033;dy-=(e.clientY-grabbed.y)*.0033;
 grabbed={id:e.pointerId,x:e.clientX,y:e.clientY};
});
for(const event of ["pointerup","pointercancel","lostpointercapture"]){
 canvas.addEventListener(event,e=>{if(grabbed?.id===e.pointerId)grabbed=null;});
}
function releaseStick(stick){
 stick.id=null;stick.x=stick.y=0;
}
for(const [name,stick] of Object.entries(sticks)){
 const node=stick.node=$(`${name}-stick`);
 const locate=e=>{
  const radius=Math.max(32,Math.min(48,innerWidth*.105));
  const x=(e.clientX-stick.startX)/radius,y=(e.clientY-stick.startY)/radius;
  const len=Math.hypot(x,y), amount=Math.min(1,Math.max(0,(len-.10)/.90));
  stick.x=len?x/len*amount:0;stick.y=len?y/len*amount:0;
  if(name==="look"&&amount>.08)touchLookSeen=true;
 };
 node.addEventListener("pointerdown",e=>{
  if(!active||stick.id!==null||e.pointerType!=="touch")return;
  stick.id=e.pointerId;stick.startX=e.clientX;stick.startY=e.clientY;node.setPointerCapture(e.pointerId);
 });
 node.addEventListener("pointermove",e=>{if(stick.id===e.pointerId)locate(e);});
 for(const type of ["pointerup","pointercancel","lostpointercapture"])node.addEventListener(type,e=>{if(stick.id===e.pointerId)releaseStick(stick);});
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
 clear();previous=null;if(which===0){thirdPerson=false;chaseBlend=0;}if(which===2)engine.select_reentry();else engine.select_deck(which);engine.tick(0,0,0,0);
 active=true;$("intro").hidden=true;hud();
}
$("camera").onclick=()=>{if(active&&apolloBody&&frame[15]===1){thirdPerson=!thirdPerson;worldVersion++;hud();}};
$("coast").onclick=()=>{if(active&&!$("coast").hidden)coast=!coast;};
$("reset").onclick=()=>{if(engine)enter(frame[32]===1?2:frame[15]);};
$("menu").onclick=()=>{clear();active=false;$("intro").hidden=false;};
$("start").onclick=()=>enter(1);
$("training").onclick=()=>enter(0);
$("reentry").onclick=()=>enter(2);
let room,hand,hull;
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
 scene=program(vs,fs);space=program(svs,sfs);skyCopy=program(svs,skyCopyFS);depth=program(depthVS,depthFS);room=batch();hand=batch();hull=batch();
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
 gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,1,1,11,0,gl.RGBA,gl.UNSIGNED_BYTE,
   new Uint8Array([211,204,193,255,143,142,139,255,216,207,189,255,207,150,82,255,84,83,83,255,117,136,150,255,128,128,128,200,128,128,128,200,217,216,212,255,213,212,209,255,207,211,210,255]));
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 const surfaces=new Image(), skinMap=new Image(), panelStamp=new Image(), pressureStamp=new Image(), fasciaStamp=new Image();
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
  gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,side,side,11,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  putLayers(surfaces,0,2,3,side);gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  stationTextureSide=side;worldVersion++;uploadSkin();uploadStamp();uploadPressure();uploadFascia();
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
 function uploadFascia(){
  if(fasciaStampReady||stationTextureSide!==512||!fasciaStamp.complete||fasciaStamp.naturalWidth!==512||fasciaStamp.naturalHeight!==512)return;
  const tile=document.createElement("canvas"), ctx=tile.getContext("2d");
  gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);
  // Write only the new layer's already-allocated mip chain, not all station materials.
  for(let mip=0, side=512;side>=1;mip++,side>>=1){
    tile.width=tile.height=side;
    ctx.drawImage(fasciaStamp,0,0,side,side);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,mip,0,0,10,side,side,1,gl.RGBA,gl.UNSIGNED_BYTE,tile);
  }
  fasciaStampReady=true;worldVersion++;
 }
 fasciaStamp.onload=uploadFascia;
 pressureStamp.onload=uploadPressure;
 panelStamp.onload=uploadStamp;
 skinMap.onload=uploadSkin;
 surfaces.src=new URL("./surfaces.jpg?v=2",import.meta.url).href;
 skinMap.src=new URL("./apollo-material.png?v=2",import.meta.url).href;
 panelStamp.src=new URL("./thermal-panel.jpg",import.meta.url).href;
 pressureStamp.src=new URL("./pressure-skin.jpg",import.meta.url).href;
 fasciaStamp.src=new URL("./cargo-fascia.jpg?v=1",import.meta.url).href;
 fineEarth=earthDetail(gl,space.p,()=>{worldVersion++;skyPhoto=-1;});
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
 starTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,starTexture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0]));
 if(upgradedSky){
  const stars=new Image();
  stars.onload=()=>{
   gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,starTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,stars);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
   starReady=1;worldVersion++;
  };
  stars.src=new URL("./starfield.jpg?v=1",import.meta.url).href;
 }
 const response=await fetch(new URL("./orbital.wasm?v=36",import.meta.url));
 if(!response.ok)throw Error("The station engine could not be downloaded.");
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{
  orbital:{
   hull(p,n){update(hull,p,n,gl.STATIC_DRAW);},
   scenery(p,n){update(room,p,n,gl.STATIC_DRAW);},hands(p,n){update(hand,p,n,gl.DYNAMIC_DRAW);},
   frame(p,n){if(n!==38)throw Error("Unexpected station frame");frame=new Float32Array(engine.memory.buffer,p,n).slice();}
  },
  wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}
 });
 engine=instance.exports;engine._start();engine.select_deck(1);engine.tick(0,0,0,0);
 const loadBakedArm=()=>fetch(new URL("./apollo-arm.bin?v=4",import.meta.url)).then(async r=>{
  if(!r.ok)throw Error("Apollo arm unavailable.");
  uploadArm(await r.arrayBuffer());
 }).catch(e=>console.warn(e.message));
 const installSuit=(body,isApollo=false)=>{
  apolloModelActive=isApollo;apolloBody=body;engine.select_arm(1);worldVersion++;hud();
 };
 const useDefaultSuit=()=>{
  try{installSuit(loadProceduralSuit(gl));}
  catch(e){console.warn("EVA equipment fallback: "+e.message);loadBakedArm();}
 };
 if(wantsApollo)loadApolloBody(gl,new URL("./apollo-body.glb?v=1",import.meta.url)).then(body=>installSuit(body,true)).catch(e=>{console.warn("Apollo body fallback: "+e.message);useDefaultSuit();});
 else useDefaultSuit();
 $("start").disabled=false;$("training").disabled=false;$("reentry").disabled=false;requestAnimationFrame(animate);
}catch(e){$("error").textContent=String(e.message);console.error(e);}
