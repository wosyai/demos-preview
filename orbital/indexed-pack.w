%%start
bridge = extern wasm "orbital" {
    unsafe unit(*?u8,i32,*?u8,i32,i32,i32,i32) indexed;
};
f32[8] zero_vertex=[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
f32[8][16] vrow=[zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex,zero_vertex];
f32[8][16][16] vblock=[vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow,vrow];
f32[8][16][16][16] vpage=[vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock,vblock];
f32[8][16][16][16][5] positions=[vpage,vpage,vpage,vpage,vpage];
u16[16] irow=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
u16[16][16] iblock=[irow,irow,irow,irow,irow,irow,irow,irow,irow,irow,irow,irow,irow,irow,irow,irow];
u16[16][16][16] ipage=[iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock,iblock];
u16[16][16][16][5] indices=[ipage,ipage,ipage,ipage,ipage];
i32[16] hrow=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
i32[16][16] hblock=[hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow,hrow];
i32[16][16][16] hpage=[hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock,hblock];
i32[16][16][16][8] marks=[hpage,hpage,hpage,hpage,hpage,hpage,hpage,hpage];
i32[16][16][16][8] occupants=[hpage,hpage,hpage,hpage,hpage,hpage,hpage,hpage];
i32 generation=0;
i32 next_vertex=0;
i32 ceiling=0;
bool failed=false;
unit() start=fn{failed=false;};
bool() ok=fn{!failed};
unit() reject=fn{failed=true;};
i32() end=fn{next_vertex};
unit(i32,i32) partition=fn(base,limit){
    if(base<0||limit<base||limit>20480||generation>=2147483646){failed=true;}
    else{generation=generation+1;next_vertex=base;ceiling=limit;};
};
bool(f32) valid=fn(v){v>= -100000.0&&v<=100000.0};
i64(f32,i64) mix=fn(x,h){
    i32 q=core.float_to_sint_trunc<i32>(core.float_extend<f64>(x)*4096.0);
    ((h^(core.int_extend<i64>(q)&4294967295))*16777619)&4294967295
};
i32(f32,f32,f32,f32,f32,f32,f32,f32) bin=fn(x,y,z,r,g,b,s,l){
    i64 h=mix(l,mix(s,mix(b,mix(g,mix(r,mix(z,mix(y,mix(x,2166136261))))))));
    core.int_trunc<i32>(h&32767)
};
bool(i32,f32,f32,f32,f32,f32,f32,f32,f32) equal_vertex=fn(i,x,y,z,r,g,b,s,l){
    u64 p=core.int_extend<u64>(i/4096);u64 m=core.int_extend<u64>((i/256)%16);u64 n=core.int_extend<u64>((i/16)%16);u64 k=core.int_extend<u64>(i%16);
    positions[p][m][n][k][0]==x&&positions[p][m][n][k][1]==y&&positions[p][m][n][k][2]==z&&positions[p][m][n][k][3]==r&&
    positions[p][m][n][k][4]==g&&positions[p][m][n][k][5]==b&&positions[p][m][n][k][6]==s&&positions[p][m][n][k][7]==l
};
unit(i32,f32,f32,f32,f32,f32,f32,f32,f32) write_vertex=fn(i,x,y,z,r,g,b,s,l){
    u64 p=core.int_extend<u64>(i/4096);u64 m=core.int_extend<u64>((i/256)%16);u64 n=core.int_extend<u64>((i/16)%16);u64 k=core.int_extend<u64>(i%16);
    positions[p][m][n][k][0]=x;positions[p][m][n][k][1]=y;positions[p][m][n][k][2]=z;positions[p][m][n][k][3]=r;
    positions[p][m][n][k][4]=g;positions[p][m][n][k][5]=b;positions[p][m][n][k][6]=s;positions[p][m][n][k][7]=l;
};
i32(i32,i32,f32,f32,f32,f32,f32,f32,f32,f32) find=fn(at,remaining,x,y,z,r,g,b,s,l){
    if(remaining==0){-1}else{
        u64 p=core.int_extend<u64>(at/4096);u64 m=core.int_extend<u64>((at/256)%16);u64 n=core.int_extend<u64>((at/16)%16);u64 k=core.int_extend<u64>(at%16);
        if(marks[p][m][n][k]!=generation){
            if(next_vertex==ceiling){-1}else{
                i32 chosen=next_vertex;
                next_vertex=next_vertex+1;write_vertex(chosen,x,y,z,r,g,b,s,l);
                marks[p][m][n][k]=generation;occupants[p][m][n][k]=chosen;
                chosen
            }
        }else{
            i32 existing=occupants[p][m][n][k];
            if(equal_vertex(existing,x,y,z,r,g,b,s,l)){existing}
            else{find((at+1)&32767,remaining-1,x,y,z,r,g,b,s,l)}
        }
    }
};
unit(i32,f32,f32,f32,f32,f32,f32,f32,f32) put=fn(i,x,y,z,r,g,b,s,l){
    if(!failed){
        if(i<0||i>=20480||generation==0||!valid(x)||!valid(y)||!valid(z)||!valid(r)||!valid(g)||!valid(b)||!valid(s)||!valid(l)){
            failed=true;
        }else{
            i32 chosen=find(bin(x,y,z,r,g,b,s,l),32768,x,y,z,r,g,b,s,l);
            if(chosen<0){failed=true;}else{
                u64 p=core.int_extend<u64>(i/4096);u64 m=core.int_extend<u64>((i/256)%16);u64 n=core.int_extend<u64>((i/16)%16);u64 k=core.int_extend<u64>(i%16);
                indices[p][m][n][k]=core.int_trunc<u16>(chosen);
            };
        };
    };
};
unit(i32,i32) pad=fn(lo,hi){
    if(lo<0||hi>20480||lo>hi){failed=true;}else{if(lo<hi){
        write_vertex(lo,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0);
        pad(lo+1,hi);
    };};
};
unit(i32,i32,i32,i32,i32) transmit=fn(kind,first_vert,n_vert,first_element,n_element){
    if(!failed&&first_vert>=0&&first_vert<20480&&n_vert>=0&&first_vert+n_vert<=20480&&
        first_element>=0&&first_element<20480&&n_element>=0&&first_element+n_element<=20480){
        u64 v0=core.int_extend<u64>(first_vert/4096);u64 v1=core.int_extend<u64>((first_vert/256)%16);
        u64 v2=core.int_extend<u64>((first_vert/16)%16);u64 v3=core.int_extend<u64>(first_vert%16);
        u64 i0=core.int_extend<u64>(first_element/4096);u64 i1=core.int_extend<u64>((first_element/256)%16);
        u64 i2=core.int_extend<u64>((first_element/16)%16);u64 i3=core.int_extend<u64>(first_element%16);
        unsafe {bridge.indexed(core.pointer_cast<*?u8>(&?positions[v0][v1][v2][v3][0]),n_vert*8,
            core.pointer_cast<*?u8>(&?indices[i0][i1][i2][i3]),n_element,kind,first_vert,first_element);};
    }else{
        unsafe {bridge.indexed(core.pointer_cast<*?u8>(&?positions[0][0][0][0][0]),-1,
            core.pointer_cast<*?u8>(&?indices[0][0][0][0]),-1,kind,0,0);};
    };
};
%%end
