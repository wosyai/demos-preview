export const exteriorSky = profile => `
uniform int starReady;
uniform sampler2D starMap;
uniform float earthAngle;
uniform sampler2D moonMap;
uniform int moonReady;
uniform highp sampler2DArray earthFine;
uniform int earthPages[9];
uniform float earthTexelAngle;
vec3 orbitalStars(vec3 ray) {
  // Fixed world-to-atlas orientation. A turn away from the Sun uncovers
  // the atlas's dense dust lane; it is never centered on the camera.
  const mat3 galaxy=mat3(${Array.from(profile.subarray(20,29),v=>v.toFixed(7)).join(",")});
  vec3 q=galaxy*ray;
  vec2 uv=vec2(atan(q.x,-q.z)*.159154943+.5,acos(clamp(q.y,-1.,1.))*.318309886);
  vec2 gx=dFdx(uv),gy=dFdy(uv);
  gx.x-=round(gx.x); gy.x-=round(gy.x);
  vec3 plate=textureGrad(starMap,uv,gx,gy).rgb;
  float density=dot(plate,vec3(.2126,.7152,.0722));
  float dust=smoothstep(.013,.115,density);
  float exposure=mix(.70,1.38,dust)*(1.-.28*smoothstep(.32,.77,density));
  return plate*exposure+vec3(.001,.0013,.0018);
}
vec3 orbitalMoon(vec3 backdrop,vec3 ray,vec3 sun) {
  // Showcase angular size, independent of the orbital dynamics.
  vec3 M=normalize(vec3(${Array.from(profile.subarray(14,17),v=>v.toFixed(2)).join(",")}));
  vec3 d=ray-M;
  float chord2=dot(d,d);
  const float r2=${profile[17].toFixed(8)};
  float edgeAA=max(fwidth(chord2),.000001);
  if(chord2>=r2+edgeAA*.65)return backdrop;
  float cover=1.-smoothstep(r2-edgeAA*.65,r2+edgeAA*.65,chord2);
  vec3 right=normalize(cross(M,vec3(0.,1.,0.)));
  vec3 up=cross(right,M);
  vec2 disk=vec2(dot(ray,right),dot(ray,up))/${profile[18].toFixed(8)};
  float face=sqrt(max(0.,1.-dot(disk,disk)));
  vec3 normal=normalize(right*disk.x+up*disk.y-M*face);
  vec3 rock=moonReady==1?textureLod(moonMap,vec2(.5)+vec2(disk.x,-disk.y)*.495,0.).rgb:vec3(.59,128./255.,128./255.);
  vec2 bump=(rock.gb-128./255.)*1.12;
  vec3 stoneNormal=normalize(normal+right*bump.x+up*bump.y);
  float incision=dot(stoneNormal,sun);
  float reliefLight=sqrt(max(0.,incision))*smoothstep(-.10,.04,dot(normal,sun));
  vec3 lunar=rock.r*(vec3(.100,.113,.133)*(.7+.3*face)+vec3(1.19,1.12,1.00)*reliefLight);
  return mix(backdrop,lunar,cover);
}
vec3 orbitalExterior(vec3 ray, vec3 backdrop, vec3 centerDir, float earthSinRadius) {
  vec3 S=normalize(sunDir);
  vec3 C=normalize(centerDir);
  float radius=clamp(earthSinRadius,.0001,.999999);
  float arc=dot(C,ray), edge=sqrt(max(0.,1.-radius*radius));
  float aa=max(fwidth(arc),.00006);
  float occult=smoothstep(edge-aa*.65,edge+aa*.65,arc);

  // Angle from Sun expressed as half-chord; stable at dot ≈ 1.
  vec3 toSun=ray-S;
  float s2=dot(toSun,toSun);
  float discRadius2=${profile[19].toFixed(7)};
  float discAA=max(fwidth(s2),.000001);
  float disc=1.-smoothstep(discRadius2-discAA*.55,discRadius2+discAA*.55,s2);
  float beyond=max(0.,s2-discRadius2);
  // Two analytic scales from one reciprocal: broad warm corona, bright inner glare.
  float glareWing=max(0.,1.-s2*.32/.049)/(1.+beyond*410.);
  float glareCut=1.-smoothstep(.016,.049,s2);
  vec3 glare=(vec3(.40,.24,.13)*glareWing+vec3(1.02,.75,.47)*glareWing*glareWing*glareWing)*glareCut;
  float limbDark=.88+.12*sqrt(max(0.,1.-s2/discRadius2));
  vec3 result=orbitalMoon(backdrop,ray,S)+vec3(1.,.94,.81)*disc*limbDark+glare;

  // Closest approach: the ground can eclipse low air while leaving
  // higher air illuminated. Keep the aerosol belt tighter than blue air.
  vec3 tangent=arc*ray-C;
  float tangentDist=max(length(tangent),.000001);
  float altitude=max(0.,tangentDist-radius);
  if(arc<=0.||(arc<edge-aa&&altitude>.043))return clamp(result,0.,1.);
  float tangentSun=dot(tangent,S)/tangentDist;
  float groundHorizon=-sqrt(max(0.,1.-radius*radius/(tangentDist*tangentDist)));
  float sunClear=tangentSun-groundHorizon;
  float daylight=smoothstep(-.06,.26,sunClear);
  float twilight=(1.-smoothstep(.015,.22,abs(sunClear-.025)))*smoothstep(-.085,.012,sunClear);
  float column=exp(-altitude*305.)*smoothstep(0.,edge,arc);
  float angle=dot(ray,S);
  float scatter=.72+.28*angle*angle;
  vec3 rayleigh=mix(vec3(.007,.019,.052),vec3(.087,.330,.89),daylight);
  vec3 lowerAir=mix(vec3(.007,.021,.058),vec3(.178,.46,.96),daylight)
      +vec3(.43,.13,.022)*twilight;
  result+=(rayleigh*.61+lowerAir*column*.53)*column*scatter*(1.-occult);
  // Projected sunlight-scatter halo outside the silhouette only. Reuse
  // ground eclipse: no glow on the night side, no veil over the clouds.
  float spread=sqrt(column)*(1.-smoothstep(.017,.037,altitude));
  result+=vec3(.080,.235,.54)*spread*daylight*daylight*scatter*(1.-occult);

  if(arc>=edge-aa){
    float projected=sqrt(max(0.,arc*arc-edge*edge)),distanceToSurface=arc-projected;
    vec3 n=normalize(distanceToSurface*ray-C);
    vec3 orb=vec3(.56*n.x-.8285*n.y,.8285*n.x+.56*n.y,n.z);
    float c=cos(earthAngle),s=sin(earthAngle);
    orb.xz=vec2(c*orb.x-s*orb.z,s*orb.x+c*orb.z);
    vec2 uv=vec2(atan(orb.x,-orb.z)*.159154943+.46,acos(clamp(orb.y,-1.,1.))*.318309886);
    // Explicit LOD avoids atan seam/derivative in this nonuniform silhouette branch.
    // Compare fixed level in portrait vs native; if sharp aliasing, use analytic
    // spherical derivatives or lift continuous derivative eval out of branch.
    vec3 albedo=photo==1?textureLod(earthMap,uv,0.).rgb:vec3(.055,.205,.37);
    vec2 tile=vec2(fract(uv.x)*32.,clamp(uv.y,0.,.999999)*16.);
    ivec2 page=ivec2(tile);int layer=page.x%3+3*(page.y%3);
    if(earthPages[layer]==page.y*32+page.x){
      vec2 st=fract(tile),m=min(st,1.-st)*1024.;
      float feather=min(1.,.125*min(m.x,m.y));
      // Fade frequencies above the screen's Nyquist limit toward the limb.
      // Derivative magnitude from the ray/sphere intersection, not wrapped UV.
      float footprint=earthTexelAngle*distanceToSurface/max(.02,projected);
      float gain=feather*(1.-smoothstep(5.,10.,footprint));
      if(gain>0.){
        float fine=(textureLod(earthFine,vec3(st,float(layer)),clamp(log2(max(1.,footprint)),0.,3.)).r-128./255.)*.5;
        albedo=clamp(albedo+gain*fine,0.,1.);
      }
    }
    float solar=dot(n,S);
    float day=smoothstep(-.065,.34,solar);
    // The existing satellite composite supplies the weather, not a fake
    // noise cloud layer. A conservative spectral test selects blue water.
    float density=dot(albedo,vec3(.2126,.7152,.0722));
    float water=smoothstep(.023,.145,albedo.b-albedo.r)*(1.-smoothstep(.37,.64,density));
    vec3 reflectance=mix(albedo,albedo*vec3(.68,.89,1.19),water);
    // Square/sqrt is the inexpensive ~2 gamma approximation: treat light
    // and optical-column transmission as energy, not display RGB.
    vec3 incidence=mix(vec3(.0035,.0065,.0178),vec3(.865,.980,1.06),day);
    vec3 surface=reflectance*reflectance*incidence;
    float horizon=projected/radius;
    if(water>.08&&solar>0.){
      float spec=max(0.,dot(reflect(-S,n),-ray));
      float s4=spec*spec;s4*=s4;
      float s16=s4*s4;s16*=s16;
      float s64=s16*s16;s64*=s64;
      surface+=vec3(.33,.41,.50)*(s64*s16)*water*day;
    }
    float forwardScatter=exp(-horizon*9.1)*.64;
    vec3 air=mix(rayleigh,lowerAir,.64)*scatter;
    result=mix(result,sqrt(max(vec3(0.),mix(surface,air*air,forwardScatter))),occult);
  }
  return clamp(result,0.,1.);
}
`;
