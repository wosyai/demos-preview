%%start
f64 PI=3.141592653589793;
f64 TAU=6.283185307179586;
f64(f64,f64,f64) clamp=fn(x,lo,hi){if(x<lo){lo}else{if(x>hi){hi}else{x}}};
f64(f64) abs=fn(x){if(x<0.0){-x}else{x}};
f64(f64) wrap=fn(x){if(x>PI){x-TAU}else{if(x< -PI){x+TAU}else{x}}};
f64(f64) sin=fn(x){
    f64 u=wrap(x);
    f64 q=if(u>1.5707963267948966){PI-u}else{if(u< -1.5707963267948966){-PI-u}else{u}};
    f64 s=q*q;
    q*(1.0+s*(-0.16666666666666666+s*(0.008333333333333333+s*(-0.0001984126984126984+s*(0.0000027557319223985893+s*(-0.00000002505210838544172+s*(0.00000000016059043836821615-s*0.0000000000007647163731819816)))))))
};
f64(f64) cos=fn(x){sin(wrap(x)+1.5707963267948966)};
f64(f64,f64) root_scaled=fn(q,scale){if(q==0.0){0.0}else{if(q<0.25){root_scaled(q*4.0,scale*0.5)}else{if(q>4.0){root_scaled(q*0.25,scale*2.0)}else{
    f64 r=(q+1.0)*0.5;r=(r+q/r)*0.5;r=(r+q/r)*0.5;r=(r+q/r)*0.5;r=(r+q/r)*0.5;r=(r+q/r)*0.5;r*scale
}}}};
f64(f64,f64,f64) norm=fn(x,y,z){root_scaled(x*x+y*y+z*z,1.0)};
f64(f64) atan_small=fn(x){
    f64 t=x*x;
    f64 v=-0.043478260869565216;
    v=0.047619047619047616+t*v;v=-0.05263157894736842+t*v;v=0.058823529411764705+t*v;
    v=-0.06666666666666667+t*v;v=0.07692307692307692+t*v;v=-0.09090909090909091+t*v;
    v=0.11111111111111111+t*v;v=-0.14285714285714285+t*v;v=0.2+t*v;v=-0.3333333333333333+t*v;
    x*(1.0+t*v)
};
f64(f64) atan_positive=fn(t){if(t>2.414213562373095){1.5707963267948966-atan_small(1.0/t)}else{if(t>0.414213562373095){0.7853981633974483+atan_small((t-1.0)/(t+1.0))}else{atan_small(t)}}};
f64(f64,f64) atan2=fn(y,x){
    if(x==0.0){if(y==0.0){0.0}else{if(y<0.0){-1.5707963267948966}else{1.5707963267948966}}}
    else{
        f64 a=atan_positive(abs(y/x));
        f64 q=if(x<0.0){PI-a}else{a};
        if(y<0.0){-q}else{q}
    }
};
bool(f32) discrete_contact=fn(s){s==0.5||s==2.5||s==3.25||s==3.5||s==6.5};
%%end
