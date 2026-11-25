// Ground truth is the same VIIRS acquisition at two scales. Only the visible
// fine luminance pages live on the GPU; the base photograph owns global color.
export function earthDetail(gl,program,invalidate,query,request,backoff) {
 const NX=32,S=1024,slots=9,unit=8;
 const [pagesLoc,mapLoc,pixelLoc]=['earthPages[0]','earthFine','earthTexelAngle'].map(k=>gl.getUniformLocation(program,k));
 const names=new Int32Array(slots).fill(-1), desired=new Int32Array(slots).fill(-1);
 const tasks=new Set(),retry=new Map();
 let gpu=gl.createTexture(),large=false,version=0,seen=-1,pixelAngle=1;
 const bind=()=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D_ARRAY,gpu);};
 const allocate=(w,d)=>{bind();gl.texStorage3D(gl.TEXTURE_2D_ARRAY,w===1?1:4,gl.R8,w,w,d);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,w===1?gl.LINEAR:gl.LINEAR_MIPMAP_LINEAR);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAX_LEVEL,w===1?0:3);
   gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   for(const dir of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D_ARRAY,dir,gl.CLAMP_TO_EDGE);
 };
 allocate(1,1);
 function load(id,layer) {
   tasks.add(id);
   const image=new Image(),x=id%NX,y=Math.floor(id/NX);
   const failed=()=>{retry.set(id,backoff(performance.now()));};
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
   for(;;){
     let available=0;
     for(let i=0;i<slots;i++){
       const id=desired[i];
       if(id>=0&&id!==names[i]&&!tasks.has(id)&&(retry.get(id)||0)<=now)available|=1<<i;
     }
     const layer=request(available,tasks.size);
     if(layer<0)break;
     load(desired[layer],layer);
   }
 }
 function update(height){
   const {row,scanned}=query(performance.now(),height);
   pixelAngle=row[0];
   if(!scanned)return;
   desired.set(row.subarray(1,10));
   pump();
 }
 return {update,bind(){bind();gl.uniform1i(mapLoc,unit);gl.uniform1f(pixelLoc,pixelAngle);if(seen!==version){gl.uniform1iv(pagesLoc,names);seen=version;}}};
}
