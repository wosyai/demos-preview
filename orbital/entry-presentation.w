%%start
bridge = extern wasm "orbital" {
    unsafe unit(*?u8,i32) entry_shell;
    unsafe unit(*?u8,i32) entry_visual;
};
math = namespace orbital "presentation.w";
f32[3][9] sections=[
    [1.68,0.04,0.0],[1.46,0.36,0.20],[1.12,0.61,0.49],
    [0.58,0.85,0.50],[0.0,1.02,0.46],[-0.68,1.17,0.35],
    [-1.53,1.40,0.28],[-2.86,1.60,0.18],[-4.90,1.22,0.0]
];
f32[4] zero=[0.0,0.0,0.0,0.0];
f32[4][6] cell=[zero,zero,zero,zero,zero,zero];
f32[4][6][32] band=[cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,
    cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell,cell];
f32[4][6][32][8] shell=[band,band,band,band,band,band,band,band];
bool authored=false;
unit(u64,u64,u64,u64,i32) point=fn(r,col,i,row,j){
    shell[r][col][i][0]=sections[row][0];
    shell[r][col][i][1]=core.sint_to_float<f32>(j)*0.03125;
    shell[r][col][i][2]=sections[row][1];
    shell[r][col][i][3]=sections[row][2];
};
unit(u64,i32) make=fn(r,col){
    if(r<8){
        u64 c=core.int_extend<u64>(col);
        point(r,c,0,r,col);point(r,c,1,r,col+1);point(r,c,2,r+1,col+1);
        point(r,c,3,r,col);point(r,c,4,r+1,col+1);point(r,c,5,r+1,col);
        if(col==31){make(r+1,0);}else{make(r,col+1);};
    };
};
unit() geometry=fn{
    if(!authored){make(0,0);authored=true;};
    unsafe {bridge.entry_shell(core.pointer_cast<*?u8>(&?shell[0][0][0][0]),6144);};
};
f64[14] sample=[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
unit(f64,f64,f64,f64,f64,f64,f64,f64) frame=fn(ox,oy,oz,x,y,z,heat,clock){
    f64 span=math.norm(x,0.0,z);
    f64 ux=if(span>0.05){-z/span}else{1.0};
    f64 uz=if(span>0.05){x/span}else{0.0};
    sample[0]=ox; sample[1]=oy-0.58; sample[2]=oz;
    sample[3]=x; sample[4]=y; sample[5]=z;
    sample[6]=ux; sample[7]=0.0; sample[8]=uz;
    sample[9]=y*uz; sample[10]=z*ux-x*uz; sample[11]=-y*ux;
    sample[12]=heat; sample[13]=clock;
    unsafe {bridge.entry_visual(core.pointer_cast<*?u8>(&?sample[0]),14);};
};
%%end
