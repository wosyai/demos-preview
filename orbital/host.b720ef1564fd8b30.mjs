import {targetSurface,pickFragment,bindEquipment,equipmentPicker} from "./equipment-pick.56a3198358e42612.mjs";
import {hudText,flightStatusText,equipmentInstruction} from "./hud-text.8ad12705848e9c70.mjs";
import {reentryGlow} from "./reentry-glow.b934ac302e0ea400.mjs";
import {earthDetail} from "./earth-detail.ec4d1dc5aee98554.mjs";
import {exteriorSky} from "./exterior-sky.cdc104dc0f9accba.mjs";
import {loadApolloBody,loadProceduralSuit} from "./apollo-body.bc494923a39e77a4.mjs";
import {bindAvatarRig} from "./avatar-rig.4d669e79351b1361.mjs";
let avatarRig,rigRow;
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
// An infinite far plane preserves the physical station silhouette as it shrinks.
const stockStationDepth=[1,.02],bodyStationDepth=[1,2*.10/2.002];
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
uniform vec2 depthClip;
void main(){
 vec3 actual=assetPoint(pos);
 vec3 p=toEye(actual);
 gl_Position=vec4(p.x*optics.x,p.y*optics.y,-depthClip.x*p.z-depthClip.y,-p.z);
 surface=color.rgb;world=actual;material=armPose.w<0.?mat:vec2(.92,.181);
 fittedNormal=armPose.w<0.?(mat.x<0.?loadNormal(mat.x):vec3(0.)):mix(openNormal,closedNormal,armPose.w);
 uint uvHigh=uint(round(color.a*255.));
 armUV=armPose.w<0.?vec2(0.):(vec2(uvHigh%16u,uvHigh/16u)*256.+armUVLow)/4095.;
}`;
// Wosy's one Sun drives the station, fitted suit, depth pass and sky.
let orbitalSun, skyArt,materialArt;
const glslVec=v=>"vec3("+Array.from(v,x=>x.toFixed(7)).join(",")+")";
const sunShader = profile => `
const vec3 sunDir=${glslVec(profile.subarray(0,3))};
vec3 lightClip(vec3 p){
 vec3 q=p-${glslVec(profile.subarray(9,12))};
 return vec3(dot(q,${glslVec(profile.subarray(3,6))})/${profile[12].toFixed(7)},
             dot(q,${glslVec(profile.subarray(6,9))})/${profile[12].toFixed(7)},
            -dot(q,sunDir)/${profile[13].toFixed(7)});
}

`;
const depthVS=sun=>`#version 300 es
layout(location=0) in vec3 pos;
${sun}
${skinVertex}
void main(){gl_Position=vec4(lightClip(assetPoint(pos)),1.);}
`;
const depthFS=`#version 300 es
precision mediump float;
void main(){}
`;
const sunCompare=`float shadowAt(vec3 p,vec3 n,float direct){
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
`;
const earthLightingShader=profile=>{
 const n=i=>profile[i].toFixed(8);
 return `
uniform vec4 earthLighting;
float earthPhase(vec3 planet){
 // Hemisphere contribution follows illuminated fraction. Bound the
 // stylized Earth-shine floor to retain existing night navigation.
 return mix(${n(109)},1.,smoothstep(-1.,${n(110)},-dot(planet,sunDir)));
}
vec3 earthFill(vec3 n){
 vec3 planet=normalize(earthLighting.xyz);
 float r=earthLighting.w;
 float mu=dot(n,planet);
 float horizon=(1.-abs(mu));
 float spread=${n(111)}*r*horizon*horizon;
 float lighting=(max(0.,mu)+spread)*smoothstep(-r,r*.42,mu);
 return vec3(${n(103)},${n(104)},${n(105)})*earthPhase(planet)*lighting;
}
vec3 earthMetal(vec3 n,vec3 v,float metal){
 vec3 planet=normalize(earthLighting.xyz);
 float angular=dot(planet,reflect(-normalize(v),n));
 float outer=sqrt(max(0.,1.-earthLighting.w*earthLighting.w));
 float gain=smoothstep(outer-${n(112)},min(1.,outer+${n(112)}),angular);
 return vec3(${n(106)},${n(107)},${n(108)})*gain*earthPhase(planet)*metal;
}
`;
};
const exteriorMaterial=(sun,profile)=>{
const n=i=>profile[i].toFixed(8);
const v=i=>`vec3(${n(i)},${n(i+1)},${n(i+2)})`;
return `
uniform int eva;
uniform highp sampler2DShadow sunMap;
uniform int detailedShadow;
uniform int lightingUpgrade;
uniform bool practicalLighting;

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
${sunCompare}
${earthLightingShader(profile)}
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
  float spec=0.;
  if(receive>0.){
    float h=dot(N,normalize(L+V));
    // Below this lobe bound the summed lamp error is below one code value.
    if(h>.57)spec=receive*pow(h,mix(54.,12.,roughness));
  }
  return vec2(receive+.11,spec)*a;
}
vec2 servicePractical(vec3 p,vec3 n,vec3 viewDir,float roughness,out bool inPort) {
  inPort=false;
  vec3 r=p-${v(5)};
  if(abs(r.x)>${n(10)}||abs(r.y)>${n(11)}||r.z<${n(12)}||r.z>${n(13)})return vec2(0.);
  vec3 xAxis=vec3(${n(8)},0.,-${n(9)}),zAxis=vec3(${n(9)},0.,${n(8)});
  vec3 P=vec3(dot(r,xAxis),r.y,dot(r,zAxis));
  float radius2=dot(P.xy,P.xy);
  if(P.z<${n(14)}||P.z>${n(15)}||radius2>${n(16)})return vec2(0.);
  inPort=true;
  float mask=(1.-smoothstep(${n(17)},${n(18)},radius2))*smoothstep(${n(19)},${n(20)},P.z)*(1.-smoothstep(${n(21)},${n(15)},P.z));
  if(mask<=0.)return vec2(0.);
  vec3 N=vec3(dot(n,xAxis),n.y,dot(n,zAxis));
  vec3 V=normalize(vec3(dot(viewDir,xAxis),viewDir.y,dot(viewDir,zAxis)));
  vec2 C=practicalSource(P,N,V,${v(22)},${v(25)},${n(28)},roughness);
  C+=practicalSource(P,N,V,${v(29)},${v(32)},${n(35)},roughness);
  C+=practicalSource(P,N,V,${v(36)},${v(39)},${n(42)},roughness);
  C+=practicalSource(P,N,V,${v(43)},${v(46)},${n(49)},roughness);
  return min(vec2(.89,.48),C*mask);
}

vec3 wingRear(float weathering,vec2 footprint){
  const vec2 extent=vec2(${n(85)},${n(86)});
  float x0=world.x<(${n(80)}+${n(85)}+${n(81)})*.5?${n(80)}:
    world.x<(${n(81)}+${n(85)}+${n(82)})*.5?${n(81)}:${n(82)};
  float z0=world.z<(${n(83)}+${n(86)}+${n(84)})*.5?${n(83)}:${n(84)};
  vec2 uv=clamp((world.xz-vec2(x0,z0))/extent,0.,1.);
  vec2 width=max(footprint/extent,vec2(.0004));
  vec2 edge=min(uv,1.-uv);
  float hoop=max(1.-smoothstep(${n(87)},${n(87)}+width.x,edge.x),
                 1.-smoothstep(${n(87)},${n(87)}+width.y,edge.y));
  float carrier=1.-smoothstep(${n(88)},${n(88)}+width.x,abs(uv.x-.5));
  float cradle=1.-smoothstep(${n(91)},${n(91)}+width.y,min(abs(uv.y-${n(89)}),abs(uv.y-${n(90)})));
  float lead=(1.-smoothstep(${n(93)},${n(93)}+width.x,abs(uv.x-${n(92)})))*
    (1.-smoothstep(${n(93)}*.5,${n(93)}*2.,width.x));
  vec3 panel=mix(${v(94)},${v(97)},max(hoop,max(carrier,cradle)));
  return mix(panel,${v(100)},lead*.73)*(.85+.26*weathering);
}
vec3 sunColor(vec3 n,vec3 worldDx,vec3 worldDy){
 bool steel=material.y>.56 && material.y<.69;
 bool emitter=material.y>.8;
 bool upperBlanket=abs(material.y-${n(2)})<.0007;
 bool maskedPanel=abs(material.y-${n(1)})<.0007||upperBlanket;
 bool foil=maskedPanel || (material.y>.165 && material.y<.188 && surface.r>.52 && surface.b>surface.r*.78 && abs(n.x)>.86 && world.x<-1.3);
 bool suit=material.x>=0. && dot(fittedNormal,fittedNormal)>.25;
 bool armor=material.y>.705 && material.y<.735;
 bool solar=surface.b>2.*surface.r && material.y>.4 && material.y<.52;
 bool skin=suit&&armSurfaceReady;
 bool stamp=maskedPanel&&panelStampReady;
 bool pressure=pressureStampReady&&abs(material.y-${n(3)})<.0007;
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
   vec2 registered=vec2((world.z+${n(62)})/${n(63)},1.-(world.y+(upperBlanket?${n(64)}:${n(65)}))/${n(66)});
   if(upperBlanket)registered.x=1.-registered.x;
   thermalUV=clamp(registered,vec2(.002),vec2(.998));
  }
 }
 vec2 grain=skin?uv:fascia?clamp(vec2(world.x-${n(69)},1.-(world.y-${n(70)}+clamp((material.y-${n(4)})*${n(71)},0.,${n(72)}))/${n(73)}),.003,.997):pressure?clamp(vec2((world.z+${n(67)})/${n(63)},1.-(world.y+${n(65)})/${n(68)}),.002,.998):layer==1.?vec2(world.x*.87,(world.y*.78+world.z*.43)*1.42):
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
 float spec=0.;
 float directMetal=metal;
 if(shadow>0.){
   vec3 halfway=normalize(sunDir+normalize(eye-world));
   float lobe=max(dot(n,halfway),0.);
   if(abs(material.y-${n(0)})<.00013){
     // Turned rail shells have a narrow lobe across the brushed grain.
     lobe=min(1.,lobe*inversesqrt(max(.32,1.-.87*halfway.x*halfway.x)));
     polish=134.;
     directMetal=1.08;
     metal=1.08;
   }
   if(practicalLighting&&abs(material.y-${n(75)})<.00008){
     float bevel=1.-abs(n.x);
     polish=mix(${n(76)},${n(77)},bevel);
     directMetal=${n(78)};
   }
   spec=pow(lobe,polish);
 }
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
    if(practicalLighting&&n.y<-.45&&abs(material.y-${n(79)})<.00008)col=wingRear(sheet.r,abs(worldDx.xz)+abs(worldDy.xz));
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
   ambient=vec3(.055,.075,.115)+earthFill(n);
 }
 if(layer==1.&&lightingUpgrade!=1){
   float skyReflect=smoothstep(-.5,.6,n.y);
   ambient+=mix(vec3(.06,.125,.20),vec3(.026,.028,.022),skyReflect)*(.40+.60*sheet.b);
 }
 vec3 energy=col*(ambient+lamp*direct*shadow*1.44)+directMetal*spec*shadow*lamp;
 if(lightingUpgrade==1&&layer==1.)energy+=earthMetal(n,eye-world,min(metal,1.));
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
};
const fs = (sun,material)=>`#version 300 es
precision highp float;
in vec3 surface;
in vec3 world;
in vec2 material;
in vec3 fittedNormal;
in vec2 armUV;
out vec4 pix;
${view}
${exteriorMaterial(sun,material)}
${targetSurface}
vec3 equipmentLight(vec3 lit,vec3 n){
 if(!equipmentSurface())return lit;
 float rim=1.-abs(dot(n,normalize(eye-world)));
 return mix(lit,vec3(.17,.93,.86),.30+.60*rim*rim);
}
void main(){
 vec3 worldDx=dFdx(world),worldDy=dFdy(world);
 vec3 normal=normalize(cross(worldDx,worldDy));
 if(eva==1){
   if(material.y>=1.098){
     int address=int(round((material.y-1.10)*100.))+1;
     vec3 idle=vec3(.15,.23,.24);
     vec3 litLens=address<=2?vec3(1.,.57,.14):address==5?vec3(1.0,.63,.28):address==4?vec3(.40,.81,1.):vec3(.43,.89,.90);
     pix=vec4(address==routeLens?mix(litLens,vec3(.84,1.,.90),routeReach?.48:.0):idle,1.);return;
   }
   if(dot(fittedNormal,fittedNormal)>.2)normal=normalize(fittedNormal);
   if(dot(normal,eye-world)<0.)normal=-normal;
   pix=vec4(equipmentLight(sunColor(normal,worldDx,worldDy),normal),1.);return;
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
 pix=vec4(equipmentLight(pow(clamp(col,0.,1.),vec3(.79)),normal),1.);
}`;
const svs=`#version 300 es
out vec2 screen;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));screen=p*2.-1.;gl_Position=vec4(screen,.9999,1.);}
`;
const sfs=(sun,profile)=>`#version 300 es
precision highp float;
in vec2 screen;
out vec4 pix;
uniform int eva;
uniform int photo;
uniform sampler2D earthMap;
${view}
${sun}
${exteriorSky(profile)}
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
   vec3 stars=starReady==1?color*.81+orbitalStars(ray):color;
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
 return {p, equipmentId:gl.getUniformLocation(p,"equipmentId"), equipmentLow:gl.getUniformLocation(p,"equipmentLow"), equipmentHigh:gl.getUniformLocation(p,"equipmentHigh"), depthClip:gl.getUniformLocation(p,"depthClip"), eye:gl.getUniformLocation(p,"eye"), basis:gl.getUniformLocation(p,"basis"), optics:gl.getUniformLocation(p,"optics"), roll:gl.getUniformLocation(p,"roll"), eva:gl.getUniformLocation(p,"eva"), photo:gl.getUniformLocation(p,"photo"), earth:gl.getUniformLocation(p,"earthMap"),starMap:gl.getUniformLocation(p,"starMap"),starReady:gl.getUniformLocation(p,"starReady"),moonMap:gl.getUniformLocation(p,"moonMap"),moonReady:gl.getUniformLocation(p,"moonReady"),upgradedSky:gl.getUniformLocation(p,"upgradedSky"),orbitCenter:gl.getUniformLocation(p,"orbitCenter"),earthAngle:gl.getUniformLocation(p,"earthAngle"), backdrop:gl.getUniformLocation(p,"backdrop"), sunMap:gl.getUniformLocation(p,"sunMap"),armPose:gl.getUniformLocation(p,"armPose"),armSurfaceReady:gl.getUniformLocation(p,"armSurfaceReady"),panelStampReady:gl.getUniformLocation(p,"panelStampReady"),pressureStampReady:gl.getUniformLocation(p,"pressureStampReady"),fasciaStampReady:gl.getUniformLocation(p,"fasciaStampReady"), renderFraction:gl.getUniformLocation(p,"renderFraction"),surfaceTile:gl.getUniformLocation(p,"surfaceTile"), routeLens:gl.getUniformLocation(p,"routeLens"), routeReach:gl.getUniformLocation(p,"routeReach"), detailedShadow:gl.getUniformLocation(p,"detailedShadow"),lightingUpgrade:gl.getUniformLocation(p,"lightingUpgrade"),practicalLighting:gl.getUniformLocation(p,"practicalLighting"),earthLighting:gl.getUniformLocation(p,"earthLighting"),gripContact:gl.getUniformLocation(p,"gripContact"),gripRadius:gl.getUniformLocation(p,"gripRadius")};
}
const coarseShadow=matchMedia("(pointer:coarse)").matches;
const maxShadow=gl?gl.getParameter(gl.MAX_TEXTURE_SIZE):1024;
let shadowSize=0, detailed=false;
function configureShadow(){
 const profile=engine.quality_shadow(Number(nativeQuality),Number(detailHardware),Number(coarseShadow),maxShadow);
 const desired=profile>>>1,chooseDetail=Boolean(profile&1);
 if(shadowSize===desired&&detailed===chooseDetail)return;
 const oldTexture=shadowTexture, oldFbo=shadowFbo;
 [shadowTexture,shadowFbo]=shadowBuffer(desired);
 if(oldTexture)gl.deleteTexture(oldTexture);
 if(oldFbo)gl.deleteFramebuffer(oldFbo);
 shadowSize=desired;detailed=chooseDetail;shadowDirty=true;worldVersion++;
}
let shadowDirty=true;
let visual=null,tileRow=null,entryMesh=null,entrySample=null,renderPlan=null,hudRow=null;
let worldVersion=0;
let scene,space,skyCopy,depth,shadowFbo,shadowTexture,earthTexture,starTexture,moonTexture,surfaceTexture,earthReady=0,starReady=0,moonReady=0,engine,active=false, frame=null, grabbed=null, last=0;
let apolloBody=null,apolloModelActive=false;
// Wosy frame: [0..4] eye/aim, [5..7] velocity, [8..20] mission/contact;
// [21..22] body aim, [23..25] applied acceleration, [26] contact,
// [27] pre-grip speed², [28..32] altitude/entry/time/fuel/scenario,
// [33..36] translational and rotational controller commands, [37] simulated orbital seconds.
const sticks={move:{id:null,zone:0},look:{id:null,zone:1}};
let lastPickCamera=null,pickEquipment=null,pickFrame=null;
const equipmentRow=new Float32Array(15);
const browserKeys=new Map(["KeyA","ArrowLeft","KeyD","ArrowRight","KeyW","ArrowUp","KeyS","ArrowDown","Space","KeyC","ShiftLeft","ShiftRight"].map((code,slot)=>[code,slot]));
function batch() {
 const vao=gl.createVertexArray(), buffer=gl.createBuffer();
 gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(const [i,n,offset] of [[0,3,0],[1,3,12],[2,2,24]]) {gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,offset);}
 return {vao,buffer,num:0};
}
// The same committed indexed batch is read by the Sun shadow and color passes.
function uploadIndexed(p,n,e,ne,kind,base,start){
 if(n<0||n%8||ne<=0||ne%3||ne/3>=6680||kind<0||kind>6||base<0||start<0)
  throw Error("Invalid Wosy indexed mesh");
 const vertices=new Float32Array(engine.memory.buffer,p,n),elements=new Uint16Array(engine.memory.buffer,e,ne);
 const batch=kind===0?hull:room;
 gl.bindVertexArray(batch.vao);gl.bindBuffer(gl.ARRAY_BUFFER,batch.buffer);
 if(kind<2){
  if(base||start)throw Error("Invalid full indexed batch");
  gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
  batch.indices??=gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,batch.indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,elements,gl.STATIC_DRAW);
  batch.num=ne;batch.vertexCapacity=n/8;
 }else{
  const id=kind-2;
  if(!batch.indices||base!==engine.scenery_motion(11+id)||n/8>ne||base+n/8>batch.vertexCapacity||
    start*8!==engine.scenery_motion(2*id)||ne*8!==engine.scenery_motion(2*id+1)||start+ne>batch.num)
   throw Error("Unmatched Wosy actuator slice");
  gl.bufferSubData(gl.ARRAY_BUFFER,base*32,vertices);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,batch.indices);
  gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER,start*2,elements);
 }
 shadowDirty=true;worldVersion++;
}
function uploadHands(p,n){
 if(n<0||n%24||n/24>=6680)throw Error("Invalid fallback hand mesh");
 gl.bindVertexArray(hand.vao);gl.bindBuffer(gl.ARRAY_BUFFER,hand.buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(engine.memory.buffer,p,n),gl.DYNAMIC_DRAW);
 hand.num=n/8;worldVersion++;
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
 if(!onlyStatic)drawFallbackArm(program,eva,pose);
}
function drawFallbackArm(program,eva,pose){
 gl.vertexAttrib4f(3,0,0,0,1);
 if(eva&&importedArm){
   gl.uniform4f(program.armPose,pose[12],pose[13],pose[14],pose[8]);
   gl.bindVertexArray(importedArm.vao);gl.drawElements(gl.TRIANGLES,importedArm.elements,gl.UNSIGNED_SHORT,0);
 }else{
   gl.uniform4f(program.armPose,0,0,0,-1);
   gl.bindVertexArray(hand.vao);gl.drawArrays(gl.TRIANGLES,0,hand.num);
 }
}
let skyFbo,skyTexture,skyW=0,skyH=0,skyDetailEpoch=0;
let fineEarth;
function bindOrbit(frame){
 fineEarth.bind();
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,earthTexture);gl.uniform1i(space.earth,1);gl.uniform1i(space.photo,earthReady);
 gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,starTexture);gl.uniform1i(space.starMap,7);gl.uniform1i(space.starReady,starReady);
 gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,moonTexture);gl.uniform1i(space.moonMap,9);gl.uniform1i(space.moonReady,moonReady);
 gl.uniform1i(space.upgradedSky,Number(upgradedSky));gl.uniform1f(space.earthAngle,frame.spin);gl.uniform4fv(space.orbitCenter,frame.center);
}
function bakeBackdrop(bind,w,h,orbit){
 if(engine.sky_plan(w,h,Number(upgradedSky),earthReady,starReady,moonReady,skyDetailEpoch)===0)return;
 const wide=skyW!==w || skyH!==h;
 if(wide){skyW=w;skyH=h;}
 gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);
 if(wide)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 gl.bindFramebuffer(gl.FRAMEBUFFER,skyFbo);
 gl.disable(gl.DEPTH_TEST);bind(space);
 bindOrbit(orbit);
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);

}
const waypoint=$("waypoint"),waypointSymbol=["◇","▸","◂","▴","▾"];
let lastWaypoint=0,lastWaypointX=0,lastWaypointY=0,lastWaypointEdge=0;
function updateWaypoint(){
 const route=active&&engine.camera_mode(0)!==1?visual[60]:0;
 if(route!==lastWaypoint){waypoint.hidden=route===0;lastWaypoint=route;}
 if(!route)return;
 const x=visual[61],y=visual[62],edge=visual[63];
 if(x!==lastWaypointX||y!==lastWaypointY){
  waypoint.style.left=(50+50*x)+"%";waypoint.style.top=(50-50*y)+"%";
  lastWaypointX=x;lastWaypointY=y;
 }
 if(edge!==lastWaypointEdge){waypoint.textContent=waypointSymbol[edge];lastWaypointEdge=edge;}
}
const forwardMarker=$("reticle");
let lastMarkerX=0,lastMarkerY=0,lastMarkerOpacity=1;
function updateForwardMarker(){
 const x=engine.forward_marker(0), y=engine.forward_marker(1), opacity=engine.forward_marker(2);
 if(x!==lastMarkerX){forwardMarker.style.left=x===0?"":(50+50*x)+"%";lastMarkerX=x;}
 if(y!==lastMarkerY){forwardMarker.style.top=y===0?"":(50-50*y)+"%";lastMarkerY=y;}
 if(opacity!==lastMarkerOpacity){forwardMarker.style.opacity=opacity===1?"":opacity;lastMarkerOpacity=opacity;}
}
let glow=null;
function render(alpha) {
 if(!frame)return;
 engine.quality_plan(canvas.clientWidth,canvas.clientHeight,devicePixelRatio,Number(nativeQuality),Number(rasterSoftware));
 const [w,h,fraction]=renderPlan;
 if(w!==canvas.width || h!==canvas.height){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);
 // Synchronous Wosy presentation packet; GL consumes the borrowed row before its next write.
 engine.project_visual(alpha,w/h,apolloBody?.stockEyeSeat?2:Number(Boolean(apolloBody)));
 updateWaypoint();updateForwardMarker();
 const pose=visual.subarray(0,38),camera={eye:visual.subarray(38,41),yaw:visual[41],pitch:visual[42]};
 const [x,y,z]=camera.eye,{yaw:heading,pitch}=camera,drawBody=visual[43]===1;
 const optics=visual.subarray(44,46),roll=visual.subarray(46,48);
 const orbit={spin:visual[48],center:visual.subarray(49,53)};
 const eva=pose[15]===1,body=eva&&apolloBody,entry=pose[32]===1;
 // Share the exact depth mapping between the station and stock suit so that
 // the original visor/near shell occludes naturally from the registered eye.
 const stockDepth=apolloBody?.stockEyeSeat&&eva&&!entry&&!drawBody;
 const stationView=eva&&!entry;
 const depthClip=stationView?(stockDepth?stockStationDepth:bodyStationDepth):[1.002,.10];
 const heated=visual[58]>.01;
 const thirdPerson=engine.camera_mode(0)===1;
 if(eva&&upgradedSky&&earthReady&&active)fineEarth.update(h);
 const draw=engine.draw_plan(worldVersion,w,h,Number(Boolean(apolloBody)),Number(upgradedSky));
 if(draw===0)return;
 if(hudRow)equipmentRow.set(hudRow);
 const holdingAngle=draw===2;
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
  gl.uniform4f(o.basis,visual[54],visual[55],visual[56],visual[57]);
  gl.uniform2fv(o.optics,optics);
  gl.uniform1i(o.eva,Number(eva));gl.uniform1f(o.renderFraction,fraction);gl.uniform2fv(o.roll,roll);
 }
 if(holdingAngle)bakeBackdrop(bind,w,h,orbit);
 gl.clear(gl.DEPTH_BUFFER_BIT);
 gl.enable(gl.DEPTH_TEST);bind(scene);gl.uniform2fv(scene.depthClip,depthClip);
 bindEquipment(gl,scene,equipmentRow,active&&!thirdPerson);
 gl.uniform1i(scene.practicalLighting,Number(upgradedPractical));gl.uniform1i(scene.lightingUpgrade,Number(upgradedSky));gl.uniform4fv(scene.earthLighting,orbit.center);
 // Both suit solvers use this same Wosy-derived rail anchor; shade only in contact.
 const grip=body?avatarRig.stationGrip(pose):null;
 const contact=(!apolloModelActive||upgradedPractical)?grip:null;
 if(contact){gl.uniform4f(scene.gripContact,...contact.center,contact.progress);gl.uniform1f(scene.gripRadius,contact.radius);}
 else gl.uniform4f(scene.gripContact,0,0,0,0);
 gl.uniform1i(scene.routeLens,thirdPerson?0:pose[20]);gl.uniform1i(scene.routeReach,pose[10]);
 gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(scene.sunMap,2);gl.uniform1i(scene.detailedShadow,Number(detailed));
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D_ARRAY,surfaceTexture);gl.uniform1i(scene.surfaceTile,4);gl.uniform1i(scene.armSurfaceReady,Number(armSurfaceReady));gl.uniform1i(scene.panelStampReady,Number(panelStampReady));gl.uniform1i(scene.pressureStampReady,Number(pressureStampReady));gl.uniform1i(scene.fasciaStampReady,Number(fasciaStampReady));
 meshes(scene,eva,pose,Boolean(body));
 let suitPose=pose,suitOptions=null;
 if(body){
  // Keep meter-scale suit vertices precise millions of meters from Kestrel.
  const relative=entry?{...camera,eye:camera.eye.map((n,i)=>n-pose[i])}:camera;
  if(entry){suitPose=pose.slice();suitPose[0]=0;suitPose[1]=0;suitPose[2]=0;}
  suitOptions={camera:relative,optics,thirdPerson:drawBody,roll,sunDirection:orbitalSun,contact:grip,stationSun:apolloModelActive&&!entry,earthLighting:upgradedSky?orbit.center:null,shadowDetail:detailed,renderFraction:fraction,depthClip};
  body.draw(suitPose,suitOptions);
 }
 if(active&&equipmentRow[8]){
  const savedPose=pose.slice();
  const eye=new Float32Array(camera.eye),aim=new Float32Array(visual.subarray(54,58));
  const savedOptics=new Float32Array(optics),savedRoll=new Float32Array(roll);
  const savedOptions=body?{...suitOptions,camera:{...suitOptions.camera,eye:Array.from(suitOptions.camera.eye)},
    optics:savedOptics,roll:savedRoll,earthLighting:suitOptions.earthLighting?.slice()}:null;
  const savedSuitPose=entry?suitPose.slice():savedPose;
  lastPickCamera={w,h,eye,basis:aim,optics:savedOptics,roll:savedRoll,depthClip,pose:savedPose,
    drawOccluder:program=>body?body.draw(savedSuitPose,savedOptions):drawFallbackArm(program,eva,savedPose)};
  pickFrame=equipmentRow;
 }else{pickFrame=null;}
 // The background lies behind the mesh; early depth rejects the sky and globe
 // across the station rather than shading those pixels and drawing over them.
 gl.depthMask(false);
 if(holdingAngle){
   gl.useProgram(skyCopy.p);
   gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,skyTexture);gl.uniform1i(skyCopy.backdrop,3);
 }else{
   bind(space);bindOrbit(orbit);
 }
 if(stationView){gl.depthRange(1,1);gl.depthFunc(gl.LEQUAL);}
 gl.bindVertexArray(null);gl.drawArrays(gl.TRIANGLES,0,3);gl.depthMask(true);
 if(stationView){gl.depthRange(0,1);gl.depthFunc(gl.LESS);}
 if(body)apolloBody.drawInteriorVisor();
 if(heated){
  if(!glow){engine.reentry_shell();glow=reentryGlow(gl,entryMesh);}
  engine.reentry_visual();
  glow(entrySample,visual.subarray(54,58),optics,roll);
 }
}
let lastEquipmentId=0,lastHudActive=false,lastCanCoast=false;
function hud(){
 const eva=frame[15]===1;
 const hudCode=engine.hud_view();
 const [speed,driftAngle,showDrift,isEntry,lost,firstLookHint,copyIntent,flightStatus]=hudRow;
 const view=hudText(hudCode,frame[16],Boolean(firstLookHint),copyIntent);
 if(hudRow[8]!==lastEquipmentId||active!==lastHudActive){
  lastEquipmentId=hudRow[8];lastHudActive=active;worldVersion++;
 }
 lastCanCoast=view.coast;
 const thirdPerson=engine.camera_mode(0)===1;
 const coastButton=$("coast");
 $("push-off").hidden=!active||!view.canPush;
 coastButton.hidden=!active||!view.coast||thirdPerson;
 if(active&&!view.coast)engine.input_action(2);
 coastButton.setAttribute("aria-pressed",String(Boolean(engine.input_status()&2)));
 const cameraButton=$("camera");
 cameraButton.hidden=!apolloBody||!eva;
 cameraButton.disabled=!active||cameraButton.hidden;
 cameraButton.setAttribute("aria-label",thirdPerson?"Switch to first-person camera":"Switch to third-person camera");
 cameraButton.setAttribute("aria-pressed",String(thirdPerson));
 const instrument=$("flight-instrument");
 const visor=active&&!thirdPerson;
 $("visor-instructions").hidden=!visor;
 $("controls").hidden=!visor;
 $("reticle").hidden=!visor;
 instrument.hidden=!visor;
 instrument.classList.toggle("burn",view.burn);
 instrument.classList.toggle("contact",flightStatus===6);
 const clock=frame[30]>1?"×"+frame[30]+" · ":"";
 const entry=isEntry===1;
 $("flight-keys").hidden=entry;$("entry-keys").hidden=!entry;
 const signalLost=lost===1;
 text("systems",signalLost?"SIGNAL LOST":"SYSTEMS ONLINE");
 main.classList.toggle("signal-lost",signalLost);
 const readout=entry?clock+(frame[28]/1000).toFixed(1)+" km · "+(engine.entry_flow(5)/1000).toFixed(2)+" km/s":
   clock+flightStatusText(flightStatus)+" · "+speed.toFixed(1)+" m/s"+(eva?" · Δv "+frame[31].toFixed(1)+" / 20 m/s":"")+(view.far?" · "+(frame[28]/1000).toFixed(0)+" km":"");
 text("flight-speed",readout);
 const vector=$("drift-vector");
 vector.style.opacity=String(showDrift);
 vector.style.transform="rotate("+driftAngle+"rad)";
 main.classList.toggle("console-hud",view.console);
 const reticle=$("reticle");
 text("reticle",view.marker);
 reticle.classList.toggle("aim-cue",view.aim);
 reticle.classList.toggle("route-aim",view.route);
 text("objective",view.objective);
 text("help",view.tip);
 text("compact-help",view.short);
 $("compact-help").hidden=!view.short;
 const instruction=view.interact?equipmentInstruction(view.action,hudRow[8],coarseShadow):"";
 $("equipment-prompt").hidden=!instruction;
 text("equipment-prompt",instruction);
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
 const period=Math.max(0,t-last);
 if(t>last)last=t;
 engine.quality_adapt(period,Number(active),Number(nativeQuality),Number(rasterSoftware));
 const alpha=engine.input_advance(period,active?1:pauseDialog.open?2:0);
 if(engine.input_status()&8)hud();
 render(alpha);
 if(timing)timing(t);
}
const touchContacts=new Set();
function clearPointers(){touchContacts.clear();for(const stick of Object.values(sticks))stick.id=null;grabbed=null;pickFrame=null;}
function tryEquipment(clientX,clientY){
 if(!active||!lastPickCamera||!pickFrame?.[8]||!pickEquipment)return;
 const bounds=canvas.getBoundingClientRect();
 if(clientX<bounds.left||clientX>=bounds.right||clientY<bounds.top||clientY>=bounds.bottom)return;
 const x=2*(clientX-bounds.left)/bounds.width-1,y=1-2*(clientY-bounds.top)/bounds.height;
 const selected=pickEquipment(x,y,lastPickCamera,pickFrame);
 if(selected)engine.equipment_activate(selected);
}
function rejectMultiPointerTap(next){
 if(touchContacts.size>1)next.drag=true;
 for(const contact of [grabbed,sticks.move,sticks.look]){
  if(contact&&contact!==next&&contact.id!==null){contact.drag=true;next.drag=true;}
 }
}
main.addEventListener("pointerdown",e=>{
 if(!active||e.pointerType!=="touch"||(e.target!==canvas&&!e.target.closest(".thumb-zone")))return;
 touchContacts.add(e.pointerId);
 if(touchContacts.size>1){
  for(const contact of [grabbed,sticks.move,sticks.look])if(contact&&contact.id!==null)contact.drag=true;
 }
},true);
for(const event of ["pointerup","pointercancel"])
 window.addEventListener(event,e=>touchContacts.delete(e.pointerId),true);
function dragDistance(e,start){return Math.hypot(e.clientX-start.startX,e.clientY-start.startY);}
function clear(){engine?.input_clear();clearPointers();}
canvas.addEventListener("pointerdown",e=>{
 if(!active||e.button!==0||grabbed!==null)return;
 grabbed={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};
 rejectMultiPointerTap(grabbed);canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove",e=>{
 if(grabbed?.id!==e.pointerId)return;
 engine.input_pointer(e.clientX-grabbed.x,e.clientY-grabbed.y,Number(e.pointerType==="touch"));
 grabbed.drag||=dragDistance(e,grabbed)>7;
 grabbed.x=e.clientX;grabbed.y=e.clientY;
});
for(const event of ["pointerup","pointercancel","lostpointercapture"]){
 canvas.addEventListener(event,e=>{
  if(grabbed?.id!==e.pointerId)return;
  const contact=grabbed;grabbed=null;
  if(event==="pointerup"&&!contact.drag&&dragDistance(e,contact)<=7)tryEquipment(e.clientX,e.clientY);
 });
}
function releaseStick(stick){
 stick.id=null;engine.input_release(stick.zone);
}
for(const [name,stick] of Object.entries(sticks)){
 const node=stick.node=$(`${name}-stick`);
 const locate=e=>engine.input_stick(stick.zone,innerWidth,e.clientX-stick.startX,e.clientY-stick.startY);
 node.addEventListener("pointerdown",e=>{
  if(!active||stick.id!==null||e.pointerType!=="touch")return;
  stick.id=e.pointerId;stick.startX=e.clientX;stick.startY=e.clientY;
  stick.drag=false;rejectMultiPointerTap(stick);
  node.setPointerCapture(e.pointerId);
 });
 node.addEventListener("pointermove",e=>{if(stick.id===e.pointerId){stick.drag||=dragDistance(e,stick)>9;locate(e);}});
 for(const type of ["pointerup","pointercancel","lostpointercapture"])node.addEventListener(type,e=>{if(stick.id===e.pointerId){
  const select=type==="pointerup"&&!stick.drag&&dragDistance(e,stick)<=9;
  releaseStick(stick);if(select)tryEquipment(e.clientX,e.clientY);
 }});
}
window.addEventListener("blur",clear);
document.addEventListener("visibilitychange",()=>{if(document.hidden)clear();});
window.addEventListener("keydown",e=>{
 if(!active||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.target instanceof HTMLElement&&e.target.matches("select,input,textarea,[contenteditable]"))return;
 if(e.code==="KeyX"){
   if(!e.repeat&&lastCanCoast)engine.input_action(1);
   return;
 }
 if(e.code==="KeyE"){
   if(e.target instanceof HTMLElement&&e.target.closest("button,select,input,dialog,[contenteditable]"))return;
   e.preventDefault();
   if(!e.repeat){const r=canvas.getBoundingClientRect();tryEquipment(r.left+r.width/2,r.top+r.height/2);}
   return;
 }
 if(e.code==="Space"&&e.target===$("push-off"))return;
 const slot=browserKeys.get(e.code);if(slot!==undefined){e.preventDefault();engine.input_key(slot,1);}
});
window.addEventListener("keyup",e=>{const slot=browserKeys.get(e.code);if(slot!==undefined)engine?.input_key(slot,0);});
const pauseDialog=$("pause"),menuButton=$("menu");
const quality=$("render-quality"),qualityLabel=quality.parentElement;
quality.value=nativeQuality?"full":"auto";
quality.addEventListener("change",()=>{
 nativeQuality=quality.value==="full";
 const url=new URL(location.href);
 if(nativeQuality)url.searchParams.set("quality","full");else url.searchParams.delete("quality");
 history.replaceState(null,"",url);
 if(engine)configureShadow();
 worldVersion++;
});
function enter(which){
 clear();engine.input_advance(0,0);if(which===2)engine.select_reentry();else engine.select_deck(which);engine.tick(0,0,0,0);
 active=true;last=performance.now();$("intro").hidden=true;hud();
}
$("camera").onclick=()=>{if(active&&apolloBody&&frame[15]===1){engine.camera_mode(1);worldVersion++;hud();}};
$("push-off").onclick=()=>{if(active&&!$("push-off").hidden)engine.input_action(3);};
$("coast").onclick=()=>{if(active&&!$("coast").hidden)engine.input_action(1);};
$("reset").onclick=()=>{if(engine)enter(frame[32]===1?2:frame[15]);};
function restartExercise(){enter(frame[32]===1?2:frame[15]);}
function closePause(){
 pauseDialog.close();$("launch-settings").append(qualityLabel);
 active=true;last=performance.now();menuButton.focus();hud();
}
function pauseExercise(){
 if(!active)return;
 clearPointers();engine.input_advance(0,2);active=false;hud();
 $("pause-settings").append(qualityLabel);
 pauseDialog.showModal();$("resume").focus();
}
let escapeDown=false;
window.addEventListener("keyup",e=>{if(e.key==="Escape")escapeDown=false;});
window.addEventListener("blur",()=>{escapeDown=false;});
window.addEventListener("keydown",e=>{
 if(e.key!=="Escape"||e.altKey||e.ctrlKey||e.metaKey)return;
 if(active){
  e.preventDefault();
  if(!e.repeat&&!escapeDown){escapeDown=true;pauseExercise();}
 }else if(pauseDialog.open&&(e.repeat||escapeDown)){e.preventDefault();}
});
pauseDialog.addEventListener("cancel",e=>{
 e.preventDefault();
 if(!escapeDown){escapeDown=true;closePause();}
});
menuButton.onclick=pauseExercise;
$("resume").onclick=closePause;
$("pause-restart").onclick=()=>{closePause();restartExercise();};
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
 const response=await fetch(new URL("./orbital.d1e857c4d849aded.wasm",import.meta.url));
 if(!response.ok)throw Error("The station engine could not be downloaded.");
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),{
  orbital:{
   indexed:uploadIndexed,hands:uploadHands,
   avatar_rig(p,n){rigRow=new Float64Array(engine.memory.buffer,p,n);},
   material_art(p,n){if(n!==113)throw Error("Unexpected station material profile");materialArt=new Float64Array(engine.memory.buffer,p,n);},
   sky_art(p,n){if(n!==37)throw Error("Unexpected celestial profile");skyArt=new Float64Array(engine.memory.buffer,p,n);},
   hud_view(p,n){if(n!==15)throw Error("Unexpected HUD projection");hudRow=new Float64Array(engine.memory.buffer,p,n);},
   render_budget(p,n){if(n!==3)throw Error("Unexpected renderer plan");renderPlan=new Float64Array(engine.memory.buffer,p,n);},
   earth_tiles(p,n){if(n!==19)throw Error("Unexpected globe tile projection");tileRow=new Float64Array(engine.memory.buffer,p,n);},
   entry_shell(p,n){if(n!==6144)throw Error("Unexpected entry shell");entryMesh=new Float32Array(engine.memory.buffer,p,n);},
   entry_visual(p,n){if(n!==14)throw Error("Unexpected entry projection");entrySample=new Float64Array(engine.memory.buffer,p,n);},
   visual(p,n){if(n!==64)throw Error("Unexpected station projection");visual=new Float64Array(engine.memory.buffer,p,n);},
   frame(p,n){if(n!==38)throw Error("Unexpected station frame");frame=new Float32Array(engine.memory.buffer,p,n).slice();}
  },
  wasi_snapshot_preview1:{proc_exit(n){throw Error("Station exited: "+n);}}
 });
 engine=instance.exports;avatarRig=bindAvatarRig(engine,produce=>{rigRow=null;produce();return rigRow;});engine._start();engine.celestial_profile();engine.material_profile();
 orbitalSun=skyArt.subarray(0,3);
 const sun=sunShader(skyArt);
 scene=program(vs,fs(sun,materialArt));space=program(svs,sfs(sun,skyArt));skyCopy=program(svs,skyCopyFS);depth=program(depthVS(sun),depthFS);room=batch();hand=batch();hull=batch();
 pickEquipment=equipmentPicker(gl,program(vs,pickFragment),meshes);
 skyTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,skyTexture);
 for(const mode of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,mode,gl.LINEAR);
 for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,axis,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
 skyFbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,skyFbo);
 gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,skyTexture,0);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("Orbit backdrop buffer is unavailable.");
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
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
 panelStamp.src=new URL("./thermal-panel.jpg?v=2",import.meta.url).href;
 pressureStamp.src=new URL("./pressure-skin.jpg",import.meta.url).href;
 fasciaStamp.src=new URL("./cargo-fascia.jpg?v=1",import.meta.url).href;
 fineEarth=earthDetail(gl,space.p,()=>{worldVersion++;skyDetailEpoch++;},(now,height)=>{
  const scanned=engine.globe_tiles(now,height)===1;
  return {row:tileRow,scanned};
 },engine.globe_request,engine.globe_retry);
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
 moonTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,moonTexture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([150,128,128,255]));
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 if(upgradedSky){
  const stars=new Image();
  stars.onload=()=>{
   gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,starTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,stars);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
   starReady=1;worldVersion++;
  };
  stars.src=new URL("./starfield.jpg?v=2",import.meta.url).href;
  const moon=new Image();
  moon.onload=()=>{
   gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,moonTexture);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,moon);
   moonReady=1;worldVersion++;
  };
  moon.src=new URL("./moon-relief.webp?v=1",import.meta.url).href;
 }
 configureShadow();engine.select_deck(1);engine.tick(0,0,0,0);
 const loadBakedArm=()=>fetch(new URL("./apollo-arm.bin?v=4",import.meta.url)).then(async r=>{
  if(!r.ok)throw Error("Apollo arm unavailable.");
  uploadArm(await r.arrayBuffer());
 }).catch(e=>console.warn(e.message));
 const installSuit=(body,isApollo=false)=>{
  apolloModelActive=isApollo;apolloBody=body;engine.select_arm(1);worldVersion++;hud();
 };
 const useDefaultSuit=()=>{
  try{installSuit(loadProceduralSuit(gl,avatarRig));}
  catch(e){console.warn("EVA equipment fallback: "+e.message);loadBakedArm();}
 };
 if(wantsApollo)loadApolloBody(gl,new URL("./apollo-body.glb?v=1",import.meta.url),avatarRig,sun+sunCompare+earthLightingShader(materialArt)).then(body=>installSuit(body,true)).catch(e=>{console.warn("Apollo body fallback: "+e.message);useDefaultSuit();});
 else useDefaultSuit();
 $("start").disabled=false;$("training").disabled=false;$("reentry").disabled=false;requestAnimationFrame(animate);
}catch(e){$("error").textContent=String(e.message);console.error(e);}
