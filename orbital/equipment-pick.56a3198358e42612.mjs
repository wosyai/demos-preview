// Bind pick and highlight to the same authored station surfaces; bounds and
// actionability are supplied by the current Wosy mission state.
export const targetSurface=`
uniform vec3 equipmentLow;
uniform vec3 equipmentHigh;
uniform int equipmentId;
bool equipmentSurface(){
 if(equipmentId==0 || any(lessThan(world,equipmentLow)) || any(greaterThan(world,equipmentHigh)))return false;
 float m=material.y;
 if(equipmentId==1)return abs(m)<.0002 || abs(m-.34)<.0002;
 if(equipmentId<=3)return abs(m-.6205)<.0002;
 if(equipmentId==4)return abs(m-.62)<.0002;
 if(equipmentId==5)return abs(m-.62)<.0002 || abs(m-.61)<.0002;
 return abs(m-.62)<.0002 || abs(m-.34)<.0002 || abs(m-.71)<.0002;
}`;
export const pickFragment=`#version 300 es
precision highp float;
in vec3 world;
in vec2 material;
out vec4 pix;
${targetSurface}
void main(){pix=vec4(equipmentSurface()?1.:0.,0.,0.,1.);}`;
export function bindEquipment(gl,locations,row,visible){
 const id=visible&&row?row[8]:0;
 gl.uniform1i(locations.equipmentId,id);
 if(id){
  gl.uniform3fv(locations.equipmentLow,row.subarray(9,12));
  gl.uniform3fv(locations.equipmentHigh,row.subarray(12,15));
 }
 return id;
}
export function equipmentPicker(gl,program,drawWorld){
 const fbo=gl.createFramebuffer(),color=gl.createRenderbuffer(),depth=gl.createRenderbuffer(),sample=new Uint8Array(4);
 gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
 gl.bindRenderbuffer(gl.RENDERBUFFER,color);
 gl.renderbufferStorage(gl.RENDERBUFFER,gl.RGBA8,1,1);
 gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.RENDERBUFFER,color);
 gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
 gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,1,1);
 gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error("Equipment selection buffer is unavailable");
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 return (x,y,camera,row)=>{
  const {w,h,eye,basis,optics,roll,depthClip,pose,drawOccluder}=camera;
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  try{
   const px=Math.min(w-1,Math.max(0,Math.floor((x+1)*w*.5)));
   const py=Math.min(h-1,Math.max(0,Math.floor((y+1)*h*.5)));
   gl.viewport(-px,-py,w,h);
   gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
   gl.clearBufferfv(gl.COLOR,0,[0,0,0,0]);gl.clearBufferfv(gl.DEPTH,0,[1]);
   gl.useProgram(program.p);
   gl.uniform3fv(program.eye,eye);gl.uniform4fv(program.basis,basis);
   gl.uniform2fv(program.optics,optics);gl.uniform2fv(program.roll,roll);gl.uniform2fv(program.depthClip,depthClip);
   gl.colorMask(false,false,false,false);
   bindEquipment(gl,program,row,false);drawOccluder(program);
   gl.colorMask(true,true,true,true);gl.useProgram(program.p);
   const id=bindEquipment(gl,program,row,true);
   drawWorld(program,pose[15]===1,pose,true);
   gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,sample);
   return sample[0]===255?id:0;
  }finally{
   gl.colorMask(true,true,true,true);
   gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
  }
 };
}
