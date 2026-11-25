// A local shock sheath and trailing hot flow, not a full-screen tint.
// Wosy owns the airflow vector, heating threshold and mission outcome.
const vs=`#version 300 es
layout(location=0) in vec4 ring;
uniform vec3 origin, axis, crossX, crossY;
uniform vec4 basis;
uniform vec2 optics,roll;
out vec3 flowUV;
void main(){
 float angle=ring.y*6.2831853;
 vec3 p=origin+axis*ring.x+ring.z*(crossX*cos(angle)+crossY*sin(angle));
 vec3 q=vec3(basis.x*p.x+basis.y*p.z,p.y,-basis.y*p.x+basis.x*p.z);
 vec3 a=vec3(q.x,basis.z*q.y+basis.w*q.z,-basis.w*q.y+basis.z*q.z);
 gl_Position=vec4((roll.x*a.x+roll.y*a.y)*optics.x,(-roll.y*a.x+roll.x*a.y)*optics.y,-1.002*a.z-.1,-a.z);
 flowUV=vec3(ring.x,ring.y,ring.w);
}`;
const fs=`#version 300 es
precision highp float;
in vec3 flowUV;
uniform float heat,clock;
out vec4 pix;
void main(){
 float along=flowUV.x,angle=flowUV.y*6.2831853;
 float shard=sin(angle*9.+sin(angle*3.+along*1.8)*1.4+along*2.1-clock*5.);
 float band=pow(.5+.5*shard,6.)*.75;
 float filament=sin(angle*19.+along*7.5-clock*13.+sin(angle*6.+clock)*.9)*.5+.5;
 float pulse=.75+.25*sin(along*15.+clock*9.+angle*3.);
 float nose=smoothstep(-.41,1.39,along);
 vec3 light=mix(vec3(.94,.15,.025),vec3(1.,.70,.24),(band*.70+.23)*nose);
 light=mix(light,vec3(1.,.91,.56),pow(filament,8.)*nose*heat*.52);
 float alpha=heat*flowUV.z*(.23+band+.34*pow(filament,4.))*pulse;
 pix=vec4(light,alpha);
}`;
export function reentryGlow(gl){
 const program=gl.createProgram();
 for(const [kind,source] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){
  const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
  gl.attachShader(program,s);gl.deleteShader(s);
 }
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
 const u=Object.fromEntries(['origin','axis','crossX','crossY','basis','optics','roll','heat','clock'].map(key=>[key,gl.getUniformLocation(program,key)]));
 const vao=gl.createVertexArray(),buffer=gl.createBuffer();
 const rings=[[1.68,.04,0],[1.46,.36,.20],[1.12,.61,.49],[.58,.85,.50],[0,1.02,.46],[-.68,1.17,.35],[-1.53,1.4,.28],[-2.86,1.60,.18],[-4.90,1.22,0]];
 const data=[];
 function point(row,j){const [x,r,a]=rings[row];data.push(x,j/32,r,a);}
 for(let i=1;i<rings.length;i++)for(let j=0;j<32;j++){
  point(i-1,j);point(i-1,j+1);point(i,j+1);
  point(i-1,j);point(i,j+1);point(i,j);
 }
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);
 gl.bindVertexArray(null);
 return (orbiter,camera,optics,roll,axis,heat,clock)=>{
  const [x,y,z]=axis,span=Math.hypot(x,z);
  const ux=span>.05?-z/span:1,uz=span>.05?x/span:0;
  gl.useProgram(program);
  gl.uniform3f(u.origin,orbiter[0]-camera.eye[0],orbiter[1]-camera.eye[1]-.58,orbiter[2]-camera.eye[2]);
  gl.uniform3f(u.axis,x,y,z);gl.uniform3f(u.crossX,ux,0,uz);
  gl.uniform3f(u.crossY,y*uz,z*ux-x*uz,-y*ux);
  gl.uniform4f(u.basis,Math.cos(camera.yaw),Math.sin(camera.yaw),Math.cos(camera.pitch),Math.sin(camera.pitch));
  gl.uniform2fv(u.optics,optics);gl.uniform2fv(u.roll,roll);
  gl.uniform1f(u.heat,heat);gl.uniform1f(u.clock,clock);
  gl.bindVertexArray(vao);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.drawArrays(gl.TRIANGLES,0,data.length/4);
  gl.disable(gl.BLEND);gl.depthMask(true);
 };
}
