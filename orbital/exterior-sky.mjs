export const exteriorSky = `
uniform int starReady;
uniform sampler2D starMap;
uniform float earthAngle;
uniform highp sampler2DArray earthFine;
uniform int earthPages[9];
uniform float earthTexelAngle;
vec3 orbitalStars(vec3 ray) {
  vec2 uv=vec2(atan(ray.x,-ray.z)*.159154943+.5,acos(clamp(ray.y,-1.,1.))*.318309886);
  vec2 gx=dFdx(uv),gy=dFdy(uv);
  gx.x-=round(gx.x); gy.x-=round(gy.x);
  // Gentle floor for low-exposure backdrop; no frozen cloud or vignette.
  return textureGrad(starMap,uv,gx,gy).rgb*.79+vec3(.001,.0015,.002);
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
  float discRadius2=.00002165;
  float discAA=max(fwidth(s2),.000001);
  float disc=1.-smoothstep(discRadius2-discAA*.55,discRadius2+discAA*.55,s2);
  float glare=.11*exp(-s2*360.)+.19*exp(-s2*5900.);
  vec3 result=backdrop+vec3(1.,.86,.67)*(disc+glare);

  // Closest approach: the ground can eclipse low air while leaving
  // higher air illuminated. Keep the aerosol belt tighter than blue air.
  vec3 tangent=arc*ray-C;
  float tangentDist=max(length(tangent),.000001);
  float altitude=max(0.,tangentDist-radius);
  if(arc<=0.||(arc<edge-aa&&altitude>.021))return clamp(result,0.,1.);
  float tangentSun=dot(tangent,S)/tangentDist;
  float groundHorizon=-sqrt(max(0.,1.-radius*radius/(tangentDist*tangentDist)));
  float sunClear=tangentSun-groundHorizon;
  float daylight=smoothstep(-.06,.26,sunClear);
  float twilight=(1.-smoothstep(.015,.22,abs(sunClear-.025)))*smoothstep(-.085,.012,sunClear);
  float column=exp(-altitude*395.)*smoothstep(0.,edge,arc);
  float angle=dot(ray,S);
  float scatter=.72+.28*angle*angle;
  vec3 rayleigh=mix(vec3(.007,.019,.052),vec3(.048,.237,.72),daylight);
  vec3 lowerAir=mix(vec3(.007,.021,.058),vec3(.126,.36,.84),daylight)
      +vec3(.43,.13,.022)*twilight;
  result+=(rayleigh*.49+lowerAir*column*.39)*column*scatter*(1.-occult);

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
