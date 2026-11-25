const add=(a,b)=>a.map((x,i)=>x+b[i]), sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(v,k)=>v.map(x=>x*k), dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=v=>Math.hypot(...v);
const unit=v=>mul(v,1/(length(v)||1));
const mix=(a,b,k)=>add(a,mul(sub(b,a),k));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const origin=m=>m.slice(12,15);
const transform=(m,[x,y,z])=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
const product=(a,b)=>Array.from({length:16},(_,i)=>{const r=i%4,c=i-r;return a[r]*b[c]+a[r+4]*b[c+1]+a[r+8]*b[c+2]+a[r+12]*b[c+3];});
const matrix=(t=[0,0,0],[x,y,z,w]=[0,0,0,1],[a,b,c]=[1,1,1])=>[
 a*(1-2*(y*y+z*z)),a*2*(x*y+z*w),a*2*(x*z-y*w),0,
 b*2*(x*y-z*w),b*(1-2*(x*x+z*z)),b*2*(y*z+x*w),0,
 c*2*(x*z+y*w),c*2*(y*z-x*w),c*(1-2*(x*x+y*y)),0,...t,1
];
const orbitRotation=(axis,r)=>[...mul(unit(axis),Math.sin(r/2)),Math.cos(r/2)];
function facing(yaw,pitch){
 const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
 return {forward:[sy*cp,sp,-cy*cp],right:[cy,0,sy],up:[-sy*sp,cp,cy*sp]};
}
function transformBasis(forward,up,right,p=[0,0,0]){
 return [...forward,0,...up,0,...right,0,...p,1];
}
function align(m,from,to){
 const a=unit(from),b=unit(to),d=clamp(dot(a,b),-1,1);
 if(d>1-1e-7)return m;
 let axis=cross(a,b);
 if(length(axis)<1e-7)axis=cross(a,Math.abs(a[1])>.85?[1,0,0]:[0,1,0]);
 const p=origin(m);
 const dst=product(matrix(p,orbitRotation(axis,Math.acos(d))),[...m.slice(0,12),0,0,0,1]);
 return dst;
}

// Project a requested wrist onto the anatomical reach annulus, then solve the
// two rigid bone lengths in the plane defined by the side-specific elbow pole.
export function elbowIK(shoulder,wrist,upper,fore,pole){
 const delta=sub(wrist,shoulder), dir=length(delta)>.00001?unit(delta):[0,0,-1];
 const d=clamp(length(delta),Math.abs(upper-fore)+.0005,upper+fore-.0005);
 let normal=sub(pole,mul(dir,dot(pole,dir)));
 if(length(normal)<.00001){const safe=Math.abs(dir[1])<.9?[0,-1,0]:[1,0,0];normal=sub(safe,mul(dir,dot(safe,dir)));}
 const run=(upper*upper-fore*fore+d*d)/(2*d);
 return {elbow:add(shoulder,add(mul(dir,run),mul(unit(normal),Math.sqrt(Math.max(upper*upper-run*run,0))))),
         wrist:add(shoulder,mul(dir,d)), wristError:Math.abs(length(delta)-d)};
}

export function chaseView(frame,{blend=1, clip}={}){
 const eye=Array.from(frame.slice(0,3)), yaw=frame[3],pitch=frame[4];
 const {forward,right,up}=facing(yaw,pitch);
 const aim=add(eye,mul(up,-.23));
 const goal=add(aim,add(mul(forward,-2.85),add(mul(up,.75),mul(right,.39))));
 const safe=clip?mix(aim,goal,clamp(clip(aim,goal),0,1)):goal;
 const f=unit(add(mul(forward,5.3),sub(aim,safe)));
 return {
   eye:mix(eye,safe,clamp(blend,0,1)),
   yaw:yaw+Math.atan2(Math.sin(Math.atan2(f[0],-f[2])-yaw),Math.cos(Math.atan2(f[0],-f[2])-yaw))*blend,
   pitch:pitch+(Math.asin(f[1])-pitch)*blend,
 };
}

export class ApolloPose {
 constructor(asset){
  this.asset=asset;
  this.nodes=asset.json.nodes;
  this.local=this.nodes.map(n=>n.matrix||matrix(n.translation,n.rotation,n.scale));
  this.names=new Map(this.nodes.map((n,i)=>[n.name,i]));
  this.globals=this.nodes.map(()=>null);
  this.joints=asset.json.skins[0].joints;
  this.palette=new Float32Array(89*16);
  this.knuckles=Object.fromEntries(['Left','Right'].map(side=>[side,this.joints.flatMap((i,ib)=>{
   const name=this.nodes[i].name;
   if(!name.startsWith(side+'Hand'))return [];
   const thumb=name.includes('Thumb');
   const r=thumb?(name.endsWith('Proximal')?-.18:name.endsWith('Distal')?-.20:0):
      name.endsWith('Proximal')?-.12:name.endsWith('Intermediate')?-.43:name.endsWith('Distal')?-.38:0;
   const inv=asset.bind[ib];
   return r?[[i,r*(side==='Left'?1:-1),unit([inv[0],inv[1],inv[2]])]]:[];
  })]));
 }
 solve(frame,options={}){
  const joints=this.globals, index=name=>this.names.get(name);
  const eye=Array.from(frame.slice(0,3));
  const body=facing(frame[21]??frame[3],frame[22]??frame[4]);
  const head=facing(frame[3],frame[4]);
  const grip=clamp(frame[8],0,1);
  // Apollo faces +X, +Y is up and right is +Z in the exported GLB.
  const base=transformBasis(body.forward,body.up,body.right,
      sub(eye,add(mul(body.up,1.623),mul(body.forward,-.095))));
  const locals=this.local,nodes=this.nodes;
  function walk(i,parent){
   const m=product(parent,locals[i]);joints[i]=m;
   for(const child of nodes[i].children??[])walk(child,m);
  }
  function install(i,m){
   joints[i]=m;
   for(const child of nodes[i].children??[])walk(child,m);
  }
  for(const i of this.asset.json.scenes[this.asset.json.scene||0].nodes)walk(i,base);
  const neck=index('Neck'), neckPoint=origin(joints[neck]);
  // World-space head delta leaves the body and arms in the slower Wosy frame.
  let look=align(joints[neck],body.forward,head.forward);
  install(neck,[...look.slice(0,12),...neckPoint,1]);
  const debug={};
  const gear=transformBasis(body.right,body.up,mul(body.forward,-1),eye);
  const {amount,controls}=equipmentPose(this.palette,frame,body,gear);
  for(const [side,s] of [['Left',-1],['Right',1]]){
   const upper=index(side+'ArmUpper'),lower=index(side+'ArmLower'), wrist=index(side+'HandWrist');
   let a=origin(joints[upper]),b=origin(joints[lower]),c=origin(joints[wrist]);
   const control=controls[side==='Left'?0:1];
   const hand=transform(gear,control.handle);
   const controllerForward=unit(sub(hand,transform(gear,control.stem)));
   const rest=sub(hand,mul(controllerForward,.061));
   const reach=side==='Left'?grip:0;
   const authoredWrist=Array.from(frame.slice(12,15));
   const published=options.wrist??add(authoredWrist,[.068,.154,.077]);
   const target=reach?mix(rest,published,reach):rest;
   const pole=add(mul(body.right,s*.51),mul(body.up,-1));
   if(reach){
    const collar=index('LeftShoulder'), anchor=origin(joints[collar]);
    const boneLength=length(sub(b,a))+length(sub(c,b));
    const deficit=Math.max(0,length(sub(target,a))-boneLength+.010);
    if(deficit){
     // Protract the clavicle towards the rail, rather than stretching the hand.
     const push=mul(unit(sub(target,a)),Math.min(deficit*1.48,.18));
     const vector=sub(a,anchor);
     const offset=mix(vector,sub(add(a,push),anchor),Math.min(1,reach*2.1));
     install(collar,align(joints[collar],vector,offset));
     a=origin(joints[upper]);b=origin(joints[lower]);c=origin(joints[wrist]);
    }
   }
   const M=elbowIK(a,target,length(sub(b,a)),length(sub(c,b)),pole);
   install(upper,align(joints[upper],sub(b,a),sub(M.elbow,a)));
   const afterLower=origin(joints[lower]), afterWrist=origin(joints[wrist]);
   install(lower,align(joints[lower],sub(afterWrist,afterLower),sub(M.wrist,M.elbow)));
   const palm=index(side+'HandPalm');
   const forward=reach?unit(mix(controllerForward,options.gripForward??head.forward,reach)):controllerForward;
   const m=align(joints[wrist],sub(origin(joints[palm]),origin(joints[wrist])),forward);
   install(wrist,m);
   const curl=.72+.28*reach;
   // Mirror the approved closed bake's per-knuckle curls.
   for(const [i,r,axis] of this.knuckles[side])
    install(i,product(joints[i],matrix(undefined,orbitRotation(axis,r*curl))));
   debug[side]={shoulder:a, elbow:origin(joints[lower]), wrist:origin(joints[wrist]), requested:target, error:M.wristError};
  }
  for(let j=0;j<this.joints.length;j++)this.palette.set(product(joints[this.joints[j]],this.asset.bind[j]),j*16);
  return {palette:this.palette, joints:debug, plume:Math.min(.66,Math.sqrt(amount)*.46)};
 }
}

const components={5121:Uint8Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const arity={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
export function openApolloGLB(bytes){
 const header=new DataView(bytes);
 const jsonBytes=header.getUint32(12,true);
 if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2||header.getUint32(8,true)!==bytes.byteLength
    ||header.getUint32(16,true)!==0x4e4f534a||header.getUint32(24+jsonBytes,true)!==0x004e4942)throw Error('Invalid Apollo GLB');
 const json=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonBytes)));
 const base=28+jsonBytes;
 function accessor(i){
  const a=json.accessors[i],v=json.bufferViews[a.bufferView],C=components[a.componentType],size=arity[a.type];
  if(v.byteStride&&v.byteStride!==size*C.BYTES_PER_ELEMENT)throw Error('Expected packed Apollo GLB');
  return new C(bytes,base+(v.byteOffset??0)+(a.byteOffset??0),a.count*size);
 }
 const ibm=accessor(json.skins[0].inverseBindMatrices);
 const bind=Array.from({length:ibm.length/16},(_,i)=>ibm.subarray(i*16,i*16+16));
 function image(i){const a=json.images[i],v=json.bufferViews[a.bufferView];return new Blob([new Uint8Array(bytes,base+(v.byteOffset??0),v.byteLength)],{type:a.mimeType});}
 if(bind.length!==84)throw Error('Unexpected Apollo skeleton');
 return {json,bind,image,accessor};
}

const vertex=`#version 300 es
layout(location=0) in vec3 pos;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=3) in uvec4 joints;
layout(location=4) in vec4 weights;
layout(location=5) in vec4 bakedColor;
uniform bool baked;
uniform vec4 baseColor;
flat out vec4 surfaceColor;
layout(std140) uniform ApolloJoints { mat4 bones[89]; };
uniform vec3 eye;
uniform vec4 basis;
uniform vec2 optics;
uniform vec2 roll;
out vec2 tex;
out vec3 n;
out vec3 world;
out vec3 surfacePoint;
void main(){
 mat4 skin=baked?bones[joints.x]:(weights.x*bones[joints.x]+weights.y*bones[joints.y]+weights.z*bones[joints.z]+weights.w*bones[joints.w]);
 world=(skin*vec4(pos,1.)).xyz;
 vec3 p=world-eye;
 vec3 q=vec3(basis.x*p.x+basis.y*p.z,p.y,-basis.y*p.x+basis.x*p.z);
 vec3 a=vec3(q.x,basis.z*q.y+basis.w*q.z,-basis.w*q.y+basis.z*q.z);
 gl_Position=vec4((roll.x*a.x+roll.y*a.y)*optics.x,(-roll.y*a.x+roll.x*a.y)*optics.y,-1.002*a.z-.1,-a.z);
 tex=uv;n=mat3(skin)*normal;surfacePoint=pos;surfaceColor=baked?bakedColor:baseColor;
}`;
const fragment=`#version 300 es
precision highp float;
uniform vec3 sunDirection;
uniform vec3 eye;
uniform bool firstPerson;
uniform float plume;
flat in vec4 surfaceColor;
uniform bool mapped;
uniform sampler2D albedo;
in vec2 tex;
in vec3 n;
in vec3 world;
in vec3 surfacePoint;
out vec4 pix;
void main(){
 if(plume>0.){
    float a=pow(max(1.-tex.x,0.),2.2)*plume;
    pix=vec4(mix(vec3(.85,.96,1.),vec3(.19,.57,.88),tex.x),a);
    return;
 }
 if(firstPerson && distance(world,eye)<.20)discard;
 vec3 color=surfaceColor.rgb;
 if(mapped)color*=texture(albedo,tex).rgb;
 vec3 N=normalize(n);
 float direct=max(dot(N,sunDirection),0.);
 vec3 lit=color*(vec3(.15,.18,.23)+vec3(.035,.079,.118)*max(0.,dot(N,vec3(.46,-.80,-.35)))+direct*vec3(1.08,1.04,.94));
 if(!mapped&&surfaceColor.a<.99){
   vec3 V=normalize(eye-world);
   if(surfaceColor.a<.3){
     // Faint weave locked to the stitched piece, not to the world or screen.
     vec3 u=surfacePoint*760.;
     vec3 a=abs(N);
     float pattern=sin(u.y)*sin(mix(u.z,u.x,step(.52,a.z)));
     float coverage=1.-smoothstep(.8,3.4,length(fwidth(u)));
     lit*=1.+.055*pattern*coverage;
   }
   float metal=smoothstep(.50,.93,surfaceColor.a);
   float facing=max(dot(V,N),0.);
   float h=max(dot(N,normalize(sunDirection+V)),0.);
   float h2=h*h,h4=h2*h2,h8=h4*h4,h16=h8*h8,h32=h16*h16;
   float spec=mix(h8*h4*h,h32*h16*h4*h,metal);
   lit+=mix(vec3(.66,.74,.82),mix(vec3(.60,.71,.78),color,.46),metal)*(max(.0,1.-facing)*.035+spec*mix(.10,.48,metal)*sqrt(direct));
 }
 pix=vec4(pow(max(lit,0.),vec3(.45455)),1.);
}`;
function program(gl){
 const p=gl.createProgram();
 for(const [kind,src] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
  const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));
  gl.attachShader(p,s);gl.deleteShader(s);
 }
 gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
 return p;
}
const sleeveParts=new Set(['forearm_gauge_body','forearm_gauge_face','forearm_gauge_glass','forearm_gauge_ticks','glove_fingertips','gloves','wrist_rings','wristwatch','wristwatch_glass','suit_torso_arms']);
function firstPersonSleeve(asset,part,indices){
 const j=asset.accessor(part.attributes.JOINTS_0),w=asset.accessor(part.attributes.WEIGHTS_0);
 const arm=asset.json.skins[0].joints.map(i=>/^(Left|Right)(ArmLower|ArmUpper|Hand)/.test(asset.json.nodes[i].name));
 const weights=new Float32Array(j.length/4);
 for(let i=0;i<weights.length;i++)for(let k=0;k<4;k++)if(arm[j[i*4+k]])weights[i]+=w[i*4+k];
 const keep=[];
 for(let i=0;i<indices.length;i+=3){
  if(weights[indices[i]]>.6&&weights[indices[i+1]]>.6&&weights[indices[i+2]]>.6)keep.push(indices[i],indices[i+1],indices[i+2]);
 }
 return new indices.constructor(keep);
}
export async function loadApolloBody(gl,url=new URL('./apollo-body.glb',import.meta.url)){
 const response=await fetch(url);
 if(!response.ok)throw Error('Apollo mesh: '+response.status);
 const asset=openApolloGLB(await response.arrayBuffer()), pose=new ApolloPose(asset);
 const textures=[];
 const TEX=8;
 for(let i=0;i<asset.json.images.length;i++){
  const pixels=await createImageBitmap(asset.image(i),{colorSpaceConversion:'none'});
  const tex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0+TEX);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.SRGB8_ALPHA8,gl.RGBA,gl.UNSIGNED_BYTE,pixels);pixels.close();
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);
  textures.push(tex);
 }
 const meshes=[];
 for(const node of asset.json.nodes){
  if(node.mesh===undefined||node.skin!==0)continue;
  for(const part of asset.json.meshes[node.mesh].primitives){
   const vao=gl.createVertexArray();gl.bindVertexArray(vao);
   for(const [i,key,dim] of [[0,'POSITION',3],[1,'NORMAL',3],[2,'TEXCOORD_0',2],[3,'JOINTS_0',4],[4,'WEIGHTS_0',4]]){
    const data=asset.accessor(part.attributes[key]);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(i);
    if(i===3)gl.vertexAttribIPointer(i,dim,data instanceof Uint8Array?gl.UNSIGNED_BYTE:gl.UNSIGNED_SHORT,0,0);
    else gl.vertexAttribPointer(i,dim,gl.FLOAT,false,0,0);
   }
   const indices=asset.accessor(part.indices);
   const elements=gl.createBuffer();
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
   let nearElements=null,nearCount=0;
   if(node.name==='suit_torso_arms'){
    const sleeve=firstPersonSleeve(asset,part,indices);
    nearElements=gl.createBuffer();nearCount=sleeve.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,nearElements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,sleeve,gl.STATIC_DRAW);
   }
   const mat=asset.json.materials[part.material].pbrMetallicRoughness;
   const tex=mat.baseColorTexture?textures[asset.json.textures[mat.baseColorTexture.index].source]:null;
   meshes.push({name:node.name,vao,first:sleeveParts.has(node.name),elements,nearElements,nearCount,len:indices.length,kind:indices instanceof Uint16Array?gl.UNSIGNED_SHORT:gl.UNSIGNED_INT,tex,color:mat.baseColorFactor??[1,1,1,1]});
  }
 }
 return renderAvatar(gl,pose,meshes);
}

function renderAvatar(gl,pose,meshes,hasEquipment=false){
 const p=program(gl);
 const U=Object.fromEntries(['eye','basis','optics','roll','sunDirection','firstPerson','plume','baseColor','baked','mapped','albedo'].map(n=>[n,gl.getUniformLocation(p,n)]));
 const UBO=3, TEX=8, palette=gl.createBuffer();
 gl.uniformBlockBinding(p,gl.getUniformBlockIndex(p,'ApolloJoints'),UBO);
 gl.bindBuffer(gl.UNIFORM_BUFFER,palette);gl.bufferData(gl.UNIFORM_BUFFER,89*64,gl.DYNAMIC_DRAW);
 if(!hasEquipment)meshes.push(...rigidMesh(gl,createEquipment()));
 const plumes=[createPlume(gl,87),createPlume(gl,88)];
 gl.bindVertexArray(null);
 let last=null;
 return {
  draw(frame,{camera, optics, thirdPerson=false, sunDirection=[.5674,.611,.5521], roll=[1,0],...opts}){
   last=pose.solve(frame,opts);
   gl.useProgram(p);gl.uniform3fv(U.eye,camera.eye);
   gl.uniform4f(U.basis,Math.cos(camera.yaw),Math.sin(camera.yaw),Math.cos(camera.pitch),Math.sin(camera.pitch));
   gl.uniform2fv(U.optics,optics);gl.uniform2fv(U.roll,roll);gl.uniform3fv(U.sunDirection,sunDirection);
   gl.uniform1i(U.albedo,TEX);gl.uniform1f(U.plume,0);gl.uniform1i(U.firstPerson,!thirdPerson);
   gl.bindBuffer(gl.UNIFORM_BUFFER,palette);gl.bufferSubData(gl.UNIFORM_BUFFER,0,last.palette);
   gl.bindBufferBase(gl.UNIFORM_BUFFER,UBO,palette);gl.activeTexture(gl.TEXTURE0+TEX);
   for(const m of meshes){
    if(!thirdPerson&&!m.first)continue;
    gl.bindVertexArray(m.vao);
    if(m.tex)gl.bindTexture(gl.TEXTURE_2D,m.tex);
    gl.uniform1i(U.mapped,Boolean(m.tex));gl.uniform1i(U.baked,Boolean(m.baked));
    if(m.baked){
     gl.vertexAttrib4f(4,1,0,0,0);
     const skip=thirdPerson?m.closeCount:0;
     const cull=thirdPerson&&!gl.isEnabled(gl.CULL_FACE);
     if(cull)gl.enable(gl.CULL_FACE);
     gl.drawElements(gl.TRIANGLES,thirdPerson?m.len-skip:m.nearCount,gl.UNSIGNED_SHORT,skip*2);
     if(cull)gl.disable(gl.CULL_FACE);
    }else{
     gl.uniform4fv(U.baseColor,m.color);
     const near=!thirdPerson&&m.nearElements;
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,near?m.nearElements:m.elements);
     gl.drawElements(gl.TRIANGLES,near?m.nearCount:m.len,m.kind,0);
    }
   }
   if(last.plume>.03){
    gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    gl.uniform1f(U.plume,last.plume);gl.uniform1i(U.baked,0);gl.vertexAttrib4f(4,1,0,0,0);
    for(const m of plumes){
     gl.bindVertexArray(m.vao);gl.vertexAttribI4ui(3,m.joint,0,0,0);
     gl.drawArrays(gl.TRIANGLES,0,m.len);
    }
    gl.disable(gl.BLEND);gl.depthMask(true);
   }
   gl.bindVertexArray(null);gl.vertexAttrib4f(3,0,0,0,1);
  },
  diagnostics:()=>last?.joints,
 };
}

function equipmentPose(palette,frame,body,gear){
  palette.set(gear,84*16);
  const acceleration=Array.from(frame.slice(23,26));
  const amount=length(acceleration);
  if(amount>.004){
   const ex=mul(acceleration,-1/amount);
   const guide=Math.abs(ex[1])>.94?body.forward:body.up;
   const side=unit(cross(ex,guide)), up=cross(side,ex);
   const scale=Math.min(1,Math.sqrt(amount));
   for(const [i,x] of [-.382,.382].entries()){
    const nozzle=transform(gear,[x,-.585,.300]);
    palette.set(transformBasis(side,up,mul(ex,.19+.27*scale),nozzle),(87+i)*16);
   }
  }
  const controls=mmuControls(frame);
  for(const [i,control] of controls.entries())palette.set(product(gear,control.pivot), (85+i)*16);
  return {amount,controls};
}

// In eye-relative body space (+X right, +Y up, +Z behind). A geared
// hinge at each arm tip is the one shared transform for hardware and fingers.
const controllerPoint=([x,y,z])=>[x*.90,y+.040,z-.095];
export function mmuControls(frame){
 return [-1,1].map((s,i)=>{
  const x=clamp(frame[33+i*2]||0,-1,1), y=clamp(frame[34+i*2]||0,-1,1);
  const stem=controllerPoint([s*.285,-.255,-.425]);
  const handle=controllerPoint([s*.285,-.307,-.50]);
  const r=matrix(stem,orbitRotation([y,-x,0],Math.min(1,Math.hypot(x,y))*.34));
  const pivot=product(r,matrix(mul(stem,-1)));
  return {stem,handle:transform(pivot,handle),pivot};
 });
}

// Round the load-bearing silhouette; seams and fasteners are physical geometry.
function rigidMesh(gl,groups){
 // Draw the near prefix or the full rigid suit as one indexed batch. The
 // original bone palette supplies transforms without CPU vertex uploads.
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const vertices=[],indices=[],joints=[];
 let nearCount=0,closeCount=0;
 for(const {joint,color,buf,first} of [...groups.filter(g=>g.first==='close'),...groups.filter(g=>g.first===true),...groups.filter(g=>!g.first)]){
  const seen=new Map();
  for(let i=0;i<buf.length;i+=6){
   const v=buf.slice(i,i+6).map(x=>Math.round(x*100000)/100000), key=v.join(',');
   let n=seen.get(key);
   if(n===undefined){
    n=joints.length;
    if(n>65535)throw Error("Suit mesh index budget exceeded");
    seen.set(key,n);vertices.push(...v,...color);joints.push(joint);
   }
   indices.push(n);
  }
  if(first)nearCount=indices.length;
  if(first==='close')closeCount=indices.length;
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
 for(const [i,n,offset] of [[0,3,0],[1,3,12],[5,4,24]]){
  gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,40,offset);
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Uint8Array(joints),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(3);gl.vertexAttribIPointer(3,1,gl.UNSIGNED_BYTE,1,0);
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 return [{vao,len:indices.length,nearCount,closeCount,first:true,baked:true}];
}
function metalShop(){
 const groups=[];
 const get=(joint,color,first)=>{let g=groups.find(g=>g.joint===joint&&g.color===color&&g.first===first);
  if(!g){g={joint,color,first,buf:[]};groups.push(g);}return g.buf;};
 const flat=(buf,...pts)=>{const n=unit(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])));for(let i=1;i<pts.length-1;i++)buf.push(...pts[0],...n,...pts[i],...n,...pts[i+1],...n);};
 const box=(j,c,h,k,first=true,r=.007)=>{
  // Eight-point chamfer cut in each corner of a beveled perimeter.
  const b=Math.min(r,...h.map(t=>t*.8)),buf=get(j,k,first),[w,t,d]=h;
  const ring=(v,u,z)=>[[-v+b,-u], [v-b,-u],[v,-u+b],[v,u-b],[v-b,u],[-v+b,u],[-v,u-b],[-v,-u+b]].map(([x,y])=>add(c,[x,y,z]));
  const layers=[ring(w-b*.65,t-b*.65,-d),ring(w,t,-d+b),ring(w,t,d-b),ring(w-b*.65,t-b*.65,d)];
  flat(buf,...layers[0].slice().reverse());flat(buf,...layers[3]);
  for(let z=0;z<3;z++)for(let i=0;i<8;i++){const k1=(i+1)%8;flat(buf,layers[z][i],layers[z][k1],layers[z+1][k1],layers[z+1][i]);}
 };
 const tube=(j,pts,rad,mat,first=true,sides=12,caps=false)=>{
  const buf=get(j,mat,first),rings=pts.map((p,i)=>{
   const axis=unit(sub(pts[Math.min(pts.length-1,i+1)],pts[Math.max(0,i-1)])), guide=Math.abs(axis[1])>.92?[1,0,0]:[0,1,0];
   const u=unit(cross(guide,axis)),v=cross(axis,u);
   return Array.from({length:sides},(_,k)=>{const a=k*Math.PI*2/sides,n=add(mul(u,Math.cos(a)),mul(v,Math.sin(a)));return [...add(p,mul(n,Array.isArray(rad)?rad[i]:rad)),...n];});
  });
  for(let i=1;i<rings.length;i++)for(let k=0;k<sides;k++){
   const l=(k+1)%sides;buf.push(...rings[i-1][k],...rings[i-1][l],...rings[i][k],...rings[i][k],...rings[i-1][l],...rings[i][l]);
  }
  if(caps)for(const end of [0,rings.length-1])if((Array.isArray(rad)?rad[end]:rad)>0){
   const r=rings[end].map(x=>x.slice(0,3));flat(buf,...(end===0?r.reverse():r));
  }
 };
 return {groups,get,box,tube};
}
function createEquipment(){
 const {groups,box,tube}=metalShop();
 const titanium=[.39,.44,.46,.77],plate=[.73,.75,.70,.65],dark=[.026,.044,.050,.40],rubber=[.028,.040,.046,.36];
 const teal=[.06,.37,.44,.68],gold=[.79,.36,.08,.72],bright=[.73,.74,.66,.80],ceramic=[.23,.27,.26,.46],warning=[.34,.13,.06,.48];
 const back=(c,h,m,r)=>box(84,c,h,m,false,r);
 // Split main pack, rear pressure canisters and removable louver panel.
 back([0,-.49,.24],[.278,.205,.094],dark,.032);
 back([0,-.485,.325],[.258,.190,.057],plate,.033);
 back([0,-.433,.386],[.228,.104,.019],titanium,.018);
 back([0,-.432,.408],[.158,.069,.012],dark,.014);
 back([0,-.625,.375],[.185,.036,.022],ceramic,.012);
 for(let n=0;n<6;n++)back([0,-.480+n*.020,.422],[.140,.004,.006],titanium,.003);
 for(const x of [-.195,.195]){
  tube(84,[[x,-.646,.405],[x,-.617,.431],[x,-.342,.431],[x,-.317,.407]],[.047,.067,.067,.043],ceramic,false,16,true);
  for(const y of [-.591,-.390])tube(84,[[x,y-.011,.431],[x,y+.011,.431]],[.071,.071],titanium,false,14);
  for(const y of [-.579,-.286])tube(84,[[x,y,.381],[x,y,.412]],[.012,.009],bright,false,8);
 }
 for(const [i,sign] of [-1,1].entries()){
  const x=t=>sign*t,j=85+i,accent=i?teal:gold;
  back([x(.302),-.480,.268],[.055,.145,.082],plate,.019);
  back([x(.328),-.617,.308],[.054,.038,.053],titanium,.012);
  const hose=[[x(.259),-.312,.368],[x(.327),-.296,.326],[x(.370),-.321,.232],[x(.372),-.391,.151],[x(.339),-.421,.095]];
  tube(84,hose,.020,rubber,false,12);
  tube(84,hose.map(p=>add(p,[0,-.039,.015])),.012,warning,false,10);
  for(const y of [-.585,-.450]){
   tube(84,[[x(.374),y,.287],[x(.396),y,.287],[x(.415),y,.287],[x(.422),y,.287]],[.037,.044,.039,.029],titanium,false,14);
   tube(84,[[x(.421),y,.287],[x(.429),y,.287]],[.024,.020],dark,false,14,true);
  }
  // Parallel support channel, outer hinge, captive bolts and a controller bellows.
  box(84,[x(.309),-.345,-.083],[.033,.029,.372],titanium,true,.014);
  box(84,[x(.311),-.319,-.142],[.024,.011,.298],plate,true,.008);
  box(84,[x(.287),-.290,-.451],[.043,.045,.071],dark,true,.015);
  box(84,[x(.285),-.243,-.446],[.025,.008,.046],accent,true,.005);
  for(const z of [-.436,-.400])tube(84,[[x(.310),-.245,z],[x(.310),-.236,z]],[.009,.008],bright,true,8);
  const stem=controllerPoint([x(.285),-.255,-.425]);
  const anchor=controllerPoint([x(.285),-.307,-.50]);
  tube(84,[add(stem,[0,-.036,.009]),stem],[.044,.032],titanium,true,16);
  tube(j,[stem,add(stem,[0,-.014,-.012]),add(stem,[0,-.016,-.023]),add(stem,[0,-.031,-.039]),anchor],[.023,.027,.021,.023,.018],rubber,true,14);
  tube(j,[add(anchor,[0,-.017,.005]),anchor,add(anchor,[0,.044,-.028])],[.026,.029,.022],dark,true,16);
  const cap=add(anchor,[0,.048,-.028]);
  tube(j,[add(cap,[0,-.011,0]),cap,add(cap,[0,.008,-.005])],[.023,.025,.020],accent,true,14,true);
 }
 return groups;
}
function createPlume(gl,joint){
 const source=[];
 // Short translucent gas mesh; no sprite, particles, textures or depth pass.
 const bands=[[0,.026],[.26,.043],[.70,.034],[1,.003]];
 const vertex=([z,r],i)=>{const angle=i*Math.PI/4;return [Math.cos(angle)*r,Math.sin(angle)*r,z,z,0];};
 for(let i=0;i<8;i++)for(let band=0;band<bands.length-1;band++){
  const a=vertex(bands[band],i),b=vertex(bands[band],i+1);
  const c=vertex(bands[band+1],i),d=vertex(bands[band+1],i+1);
  source.push(...a,...b,...c,...b,...d,...c);
 }
 const vao=gl.createVertexArray(),buffer=gl.createBuffer();
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(source),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,20,0);
 gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,2,gl.FLOAT,false,20,12);
 return {vao,joint,len:source.length/5};
}

// Original low-poly EVA suit. No download, imported topology, texture, or bone store.
export function loadProceduralSuit(gl){
 const navy=[.035,.067,.085,.48], rubber=[.039,.048,.052,.32], white=[.75,.74,.66,.18], panel=[.24,.30,.32,.50], gold=[.42,.25,.09,.92], pale=[.83,.86,.83,.64], red=[.64,.18,.055,.54];
 const {groups,get,box,tube}=metalShop();
 const shell=(joint,center,rx,ry,rz,color)=>{
  const buf=get(joint,color,joint>=4);
  const L=joint===1?24:joint===0?14:rx>=.070?20:12,S=joint===1?12:joint===0?7:rx>=.070?9:6;
  const p=(i,j)=>{
   const theta=j*2*Math.PI/L, phi=(i/S-.5)*Math.PI, c=Math.cos(phi);
   const [x,y,z]=[c*Math.cos(theta),c*Math.sin(theta),Math.sin(phi)];
   return [...add(center,[x*rx,y*ry,z*rz]),...unit([x/rx,y/ry,z/rz])];
  };
  for(let i=0;i<S;i++)for(let j=0;j<L;j++){
   const a=p(i,j),b=p(i,j+1),c=p(i+1,j),d=p(i+1,j+1);
   if(i)buf.push(...a,...b,...c);
   if(i!==S-1)buf.push(...b,...d,...c);
  }
 };
 shell(0,[0,-.38,0],.26,.325,.16,white);
 shell(0,[0,-.39,.102],.205,.21,.126,panel);
 const seam=[.59,.59,.53,.22],trim=[.098,.138,.144,.49];
 tube(0,[[0,-.169,.013],[0,-.143,.013],[0,-.126,.013]],[.112,.118,.106],trim,false,24);
 tube(0,[[0,-.141,.013],[0,-.132,.013]],[.119,.116],pale,false,20);
 for(const side of [-1,1]){
  tube(0,[[side*.157,-.186,.044],[side*.173,-.223,.120],[side*.165,-.295,.190],[side*.144,-.368,.199]],.013,trim,false,10);
  box(0,[side*.166,-.250,.150],[.027,.019,.024],panel,false,.006);
 }
 shell(0,[0,-.37,-.14],.135,.104,.066,navy);
 shell(0,[0,-.37,-.196],.092,.042,.015,panel);
 for(const s of [-1,1]){
  shell(0,[s*.16,-.66,0],.112,.102,.125,rubber);
  shell(0,[s*.155,-.86,.007],.10,.234,.111,white);
  shell(0,[s*.166,-1.102,.013],.094,.087,.101,navy);
  shell(0,[s*.171,-1.237,.014],.083,.184,.089,white);
  shell(0,[s*.173,-1.409,-.044],.100,.103,.158,navy);
  shell(0,[s*.173,-1.417,-.093],.089,.065,.148,panel);
  for(const y of [-.995,-1.020,-1.040])tube(0,[[s*.163,y-.006,.012],[s*.164,y+.006,.012]],[.091,.092],seam,false,16);
  box(0,[s*.165,-1.091,.103],[.065,.047,.020],navy,false,.015);
  box(0,[s*.173,-1.393,.091],[.078,.027,.021],trim,false,.009);
  box(0,[s*.173,-1.449,-.057],[.095,.015,.142],rubber,false,.014);
  for(let n=0;n<4;n++)box(0,[s*.173,-1.461,-.128+n*.055],[.077,.007,.014],navy,false,.004);
 }
 shell(1,[0,.009,.01],.148,.166,.155,pale);
 shell(1,[0,-.019,-.099],.125,.092,.079,navy);
 shell(1,[0,-.020,-.129],.106,.069,.056,gold);
 box(1,[0,-.016,.148],[.033,.020,.015],navy,false,.006);
 box(1,[0,-.015,.164],[.013,.006,.004],red,false,.003);
 for(let i=0;i<2;i++){
  const j=4+3*i;
  shell(j,[0,0, .11],.098,.098,.171,white);
  shell(j,[0,0,.225],.082,.081,.069,panel);
  shell(j+1,[0,0,.018],.072,.074,.062,seam);
  tube(j+1,[[0,0,.014],[0,0,.046],[0,0,.103],[0,0,.156],[0,0,.176]],[.077,.080,.077,.067,.060],white,true,26);
  for(const z of [.045,.062,.081,.101,.121,.141])tube(j+1,[[0,0,z-.004],[0,0,z],[0,0,z+.004]],[.077-(z-.045)*.09,.081-(z-.045)*.10,.077-(z-.045)*.09],white,'close',22);
  tube(j+1,[[0,0,.158],[0,0,.180],[0,0,.212],[0,0,.227]],[.063,.073,.065,.051],navy,true,28);
  tube(j+1,[[0,0,.176],[0,0,.183],[0,0,.189]],[.073,.074,.071],gold,true,26);
  tube(j+1,[[0,0,.193],[0,0,.197]],[.072,.071],red,true,24);
  box(j+1,[0,.068,.116],[.034,.012,.041],panel,'close',.009);
  box(j+1,[0,.081,.116],[.023,.002,.024],navy,'close',.005);
  box(j+1,[.007,.084,.124],[.011,.001,.004],gold,'close',.002);
  shell(j+2,[0,0,.040],.047,.039,.058,panel);
  shell(j+2,[(i?1:-1)*.037,-.012,.044],.021,.026,.042,rubber);
  for(let f=0;f<4;f++)shell(j+2,[(f-1.5)*.021,.001,.079],.013,.020,.037,rubber);
 }
 return renderAvatar(gl,new ProceduralPose(),rigidMesh(gl,[...groups,...createEquipment()]),true);
}

class ProceduralPose{
 constructor(){this.palette=new Float32Array(89*16);}
 solve(frame,options={}){
  const eye=Array.from(frame.slice(0,3));
  const body=facing(frame[21]??frame[3],frame[22]??frame[4]), head=facing(frame[3],frame[4]);
  const gear=transformBasis(body.right,body.up,mul(body.forward,-1),eye);
  const helmet=transformBasis(head.right,head.up,mul(head.forward,-1),eye);
  this.palette.set(gear,0);this.palette.set(helmet,16);
  const {amount,controls}=equipmentPose(this.palette,frame,body,gear);
  const grip=clamp(frame[8],0,1), debug={};
  const wristFrame=options.wrist??add(Array.from(frame.slice(12,15)),[.068,.154,.077]);
  const aim=(a,b)=>{
   const z=unit(sub(b,a));
   const guide=Math.abs(dot(body.up,z))>.92?body.right:body.up;
   const x=unit(cross(guide,z));return transformBasis(x,cross(z,x),z,a);
  };
  for(const [i,s] of [-1,1].entries()){
   let a=transform(gear,[s*.228,-.177,-.076]);
   const control=controls[i], handle=transform(gear,control.handle), controlAxis=unit(sub(handle,transform(gear,control.stem)));
   const rest=sub(handle,mul(controlAxis,.064));
   const reach=i===0?grip:0, target=mix(rest,wristFrame,reach);
   const deficit=Math.max(0,length(sub(target,a))-.496);
   if(reach&&deficit)a=add(a,mul(unit(sub(target,a)),Math.min(.17,deficit)*Math.min(1,reach*2.1)));
   const M=elbowIK(a,target,.276,.232,add(mul(body.right,s*.46),mul(body.up,-1)));
   const hand=unit(mix(controlAxis,options.gripForward??head.forward,reach));
   const j=(4+3*i)*16;
   this.palette.set(aim(a,M.elbow),j);
   this.palette.set(aim(M.elbow,M.wrist),j+16);
   this.palette.set(aim(M.wrist,add(M.wrist,hand)),j+32);
   debug[i?'Right':'Left']={shoulder:a,elbow:M.elbow,wrist:M.wrist,requested:target,error:M.wristError};
  }
  return {palette:this.palette,joints:debug,plume:Math.min(.66,Math.sqrt(amount)*.46)};
 }
}
