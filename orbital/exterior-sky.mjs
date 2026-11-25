export const exteriorSky = `
uniform int starReady;
uniform sampler2D starMap;
uniform float earthAngle;
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

  // Closest approach gives tangent altitude even when no sphere hit.
  vec3 tangent=arc*ray-C;
  float altitude=max(0.,length(tangent)-radius);
  float daylight=smoothstep(-.19,.42,dot(tangent,S)/max(length(tangent),.000001));
  float halo=exp(-altitude*395.)*smoothstep(0.,edge,arc);
  vec3 air=mix(vec3(.018,.048,.128),vec3(.105,.395,.92),daylight);
  result+=air*halo*.59*(1.-occult);

  if(arc>=edge-aa){
    vec3 n=normalize((arc-sqrt(max(0.,arc*arc-edge*edge)))*ray-C);
    vec3 orb=vec3(.56*n.x-.8285*n.y,.8285*n.x+.56*n.y,n.z);
    float c=cos(earthAngle),s=sin(earthAngle);
    orb.xz=vec2(c*orb.x-s*orb.z,s*orb.x+c*orb.z);
    vec2 uv=vec2(atan(orb.x,-orb.z)*.159154943+.46,acos(clamp(orb.y,-1.,1.))*.318309886);
    // Explicit LOD avoids atan seam/derivative in this nonuniform silhouette branch.
    // Compare fixed level in portrait vs native; if sharp aliasing, use analytic
    // spherical derivatives or lift continuous derivative eval out of branch.
    vec3 albedo=photo==1?textureLod(earthMap,uv,0.).rgb:vec3(.055,.205,.37);
    float solar=dot(n,S);
    float day=smoothstep(-.065,.34,solar);
    vec3 surface=albedo*mix(vec3(.058,.082,.134),vec3(.93,.99,1.03),day);
    float horizon=max(0.,dot(n,-ray));
    float airInside=exp(-horizon*9.1)*.64;
    result=mix(result,mix(surface,air,airInside),occult);
  }
  return clamp(result,0.,1.);
}
`;
