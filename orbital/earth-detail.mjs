// Ground truth is the same VIIRS acquisition at two scales. Only the visible
// fine luminance pages live on the GPU; the base photograph owns global color.
export function earthDetail(gl,program,invalidate) {
 const NX=32,NY=16,S=1024,slots=9,unit=8;
 const [pagesLoc,mapLoc,pixelLoc]=['earthPages[0]','earthFine','earthTexelAngle'].map(k=>gl.getUniformLocation(program,k));
 const names=new Int32Array(slots).fill(-1), desired=new Int32Array(slots).fill(-1);
 const tally=new Float32Array(NX*NY), tasks=new Set(), retry=new Map();
 let gpu=gl.createTexture(),large=false,next=0,version=0,seen=-1,pixelAngle=1;
 const bind=()=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D_ARRAY,gpu);};
 const allocate=(w,d)=>{bind();gl.texStorage3D(gl.TEXTURE_2D_ARRAY,w===1?1:4,gl.R8,w,w,d);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,w===1?gl.LINEAR:gl.LINEAR_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAX_LEVEL,w===1?0:3);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   for(const dir of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,dir,gl.CLAMP_TO_EDGE);
 };
 allocate(1,1);
 const slot=id=>(id%NX)%3+3*(Math.floor(id/NX)%3);
 function load(id) {
   tasks.add(id);
   const image=new Image(),x=id%NX,y=Math.floor(id/NX),layer=slot(id);
   const failed=()=>{retry.set(id,performance.now()+60000);};
   image.onload=async()=>{
     let mips=[];
     try{
       if(desired[layer]!==id)return;
       // Resize away from the GL path; never rebuild the other eight layers' mips.
       for(let m=1;m<=3;m++){const w=S>>m;
         mips.push(await createImageBitmap(image,{resizeWidth:w,resizeHeight:w,resizeQuality:"medium"}));}
       if(desired[layer]!==id)return;
       if(!large){gl.deleteTexture(gpu);gpu=gl.createTexture();allocate(S,slots);large=true;}
       bind();gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,0,0,0,layer,S,S,1,gl.RED,gl.UNSIGNED_BYTE,image);
       for(let m=1;m<=3;m++){const w=S>>m;gl.texSubImage3D(gl.TEXTURE_2D_ARRAY,m,0,0,layer,w,w,1,gl.RED,gl.UNSIGNED_BYTE,mips[m-1]);}
       names[layer]=id;version++;invalidate();
     }catch{failed();}finally{for(const bmp of mips)bmp.close();tasks.delete(id);pump();}
   };
   image.onerror=()=>{tasks.delete(id);failed();pump();};
   image.src=new URL('./earth-detail/'+String(y).padStart(2,'0')+'-'+String(x).padStart(2,'0')+'.avif',import.meta.url).href;
 }
 function pump(){
   const now=performance.now();
   while(tasks.size<2){
     let pick=-1,w=0;
     for(let i=0;i<slots;i++){const id=desired[i];if(id<0||id===names[i]||tasks.has(id)||(retry.get(id)||0)>now)continue;
       if(tally[id]>w){pick=id;w=tally[id];}}
     if(pick<0)break;load(pick);
   }
 }
 function update(orbit,yaw,pitch,optics,roll,height){
   pixelAngle=10430/(height*optics[1]);
   const now=performance.now();if(now<next)return;next=now+180;
   tally.fill(0);
   const [cx,cy,cz,radius]=orbit.center,mag=Math.hypot(cx,cy,cz);
   const X=cx/mag,Y=cy/mag,Z=cz/mag,E=1-radius*radius;
   const a=Math.cos(yaw),b=Math.sin(yaw),c=Math.cos(pitch),s=Math.sin(pitch),
       rotC=Math.cos(orbit.spin),rotS=Math.sin(orbit.spin);
   // Project a small screen grid through the same optics as the globe shader.
   // Extra weight at center makes an off-center horizon yield to nearby ground.
   for(let j=0;j<7;j++)for(let i=0;i<9;i++){
     const sx=(i-4)*.245,sy=(j-3)*.325,px=sx/optics[0],py=sy/optics[1];
     const xx=roll[0]*px-roll[1]*py,yy=roll[1]*px+roll[0]*py,R=1/Math.hypot(px,py,1);
     const vx=(a*xx-b*(s*yy-c))*R,vy=(c*yy+s)*R,vz=(b*xx+a*(s*yy-c))*R;
     const arc=X*vx+Y*vy+Z*vz,d=arc*arc-E;
     if(arc<0||d<=0)continue;
     const t=arc-Math.sqrt(d),nx=(t*vx-X)/radius,ny=(t*vy-Y)/radius,nz=(t*vz-Z)/radius;
     const p=.56*nx-.8285*ny,h=.8285*nx+.56*ny;
     const lon=Math.atan2(rotC*p-rotS*nz,-(rotS*p+rotC*nz))/(2*Math.PI)+.46;
     const ix=Math.floor((lon-Math.floor(lon))*NX),iy=Math.min(NY-1,Math.floor(Math.acos(Math.min(1,Math.max(-1,h)))/Math.PI*NY));
     tally[iy*NX+ix]+=(1.5-.45*(sx*sx+sy*sy))*Math.min(1,Math.sqrt(d)*5);
   }
   desired.fill(-1);
   for(let id=0;id<tally.length;id++)if(tally[id]>0){const l=slot(id);if(desired[l]<0||tally[id]>tally[desired[l]])desired[l]=id;}
   pump();
 }
 return {update,bind(){bind();gl.uniform1i(mapLoc,unit);gl.uniform1f(pixelLoc,pixelAngle);if(seen!==version){gl.uniform1iv(pagesLoc,names);seen=version;}}};
}
