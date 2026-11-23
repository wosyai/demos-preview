export const ENGINE_PATH = "./ferry.wasm?v=ferry-pier-signal-v1";
const INPUTS = new Map([
  ["KeyA","left"],["ArrowLeft","left"],["KeyD","right"],["ArrowRight","right"],
  ["KeyW","up"],["ArrowUp","up"],["KeyS","down"],["ArrowDown","down"],["Space","brake"],
]);
const ACTIONS = ["","Enter car","Exit car","Collect tape","Board ferry","Leave ferry","Answer phone","Park & walk","Mark waterfront","Mark avenue"];
const ACTION_ICONS = ["","enter","exit","tape","board","exit","phone","exit","waterfront","avenue"];
const HIT = ["","Mailbox hit","Tree hit","Pedestrian hit","Vehicle hit","Wall hit"];
const OBJECTIVES = ["Collect the tape","Reach Pier 8","Tape delivered","Missed the ferry","Free roam","Crossing the canal","Leave the ferry","Walk ashore","Answer the phone"];

export function axes(x,y,radius) {
  const length = Math.hypot(x,y);
  const level = Math.min(length/radius,1);
  if (level <= .13) return [0,0];
  const scale = (level-.13)/(.87*length);
  return [x*scale,-y*scale];
}

export function inputState() {
  const keys = new Map(), buttons = new Map();
  return {
    keys, buttons, stick: null, action: false, camera: false,
    clear() { keys.clear(); buttons.clear(); this.stick=null; this.action=false; this.camera=false; },
    sample() {
      const keyboard=Array.from(keys.values());
      const held=(key)=>keyboard.includes(key);
      const horizontal=held("left")||held("right");
      const vertical=held("up")||held("down");
      const pedal=Array.from(buttons.values());
      const steer=horizontal ? Number(held("right"))-Number(held("left")) : (this.stick?.axis[0]??0);
      const drive=vertical ? Number(held("up"))-Number(held("down")) : pedal.includes("power") ? 1 : (this.stick?.axis[1]??0);
      const flags=Number(held("brake")||pedal.includes("brake")) | (this.action ? 2 : 0) | (this.camera ? 4 : 0);
      this.action=false;
      this.camera=false;
      return [steer,drive,flags];
    },
  };
}

export function readRouteMap(value) {
  const count=value(-1,0);
  if(!Number.isInteger(count)||count<0||count>64) throw Error("The route map is unreadable.");
  return Array.from({length:count},(_,row)=>{
    const road=Array.from({length:4},(_,column)=>value(row,column));
    if(!road.every(Number.isFinite)||road[2]<=0||road[3]<=0) throw Error("The route map is unreadable.");
    return road;
  });
}

function routeMapBounds(roads) {
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const [x,z,w,d] of roads) {
    minX=Math.min(minX,x); maxX=Math.max(maxX,x+w);
    minZ=Math.min(minZ,z); maxZ=Math.max(maxZ,z+d);
  }
  return [minX,maxX,minZ,maxZ];
}
function drawRouteMap(ctx,roads,bounds,frame,route) {
  if(!bounds||!roads.length) return;
  const {width,height}=ctx.canvas, active=[0,1,8].includes(frame[17]);
  let minX=Math.min(bounds[0],frame[26]),maxX=Math.max(bounds[1],frame[26]);
  let minZ=Math.min(bounds[2],frame[27]),maxZ=Math.max(bounds[3],frame[27]);
  if(active) {
    minX=Math.min(minX,frame[24]); maxX=Math.max(maxX,frame[24]);
    minZ=Math.min(minZ,frame[25]); maxZ=Math.max(maxZ,frame[25]);
  }
  const scale=Math.min((width-16)/(maxX-minX),(height-16)/(maxZ-minZ));
  const x=(v)=>(width-(maxX-minX)*scale)/2+(v-minX)*scale;
  const z=(v)=>(height-(maxZ-minZ)*scale)/2+(maxZ-v)*scale;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle="#49716d";
  for(const [rx,rz,w,d] of roads) ctx.fillRect(x(rx),z(rz+d),w*scale,d*scale);
  if(route.length>1) {
    ctx.beginPath();
    ctx.moveTo(x(route[0][0]),z(route[0][1]));
    for(let i=1;i<route.length;i++) ctx.lineTo(x(route[i][0]),z(route[i][1]));
    ctx.lineJoin="round";
    ctx.lineCap="round";
    ctx.strokeStyle="#101924";
    ctx.lineWidth=4.5;
    ctx.stroke();
    ctx.strokeStyle="#ffc276";
    ctx.lineWidth=2.25;
    ctx.stroke();
  }
  const dot=(px,pz,r,color)=>{
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x(px),z(pz),r,0,Math.PI*2); ctx.fill();
  };
  if(active) dot(frame[24],frame[25],4,"#ffc276");
  dot(frame[26],frame[27],3,"#fff5e1");
}

const meshLimits = {world:9*4096*6,moving:24*256*6};

export function frameData(memory,pointer,length,kind) {
  if (!Number.isSafeInteger(pointer)||pointer<0||pointer%4||!Number.isSafeInteger(length)||length<=0||
      (kind==="frame" ? length!==30 : length%18!==0||length>(meshLimits[kind]??0))||pointer+length*4>memory.buffer.byteLength) {
    throw Error("The game engine returned unreadable data.");
  }
  return new Float32Array(memory.buffer,pointer,length);
}

function programFor(gl) {
  const shader=(kind,source)=>{
    const id=gl.createShader(kind);
    gl.shaderSource(id,source);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id,gl.COMPILE_STATUS)) throw Error("The scene shader could not start.");
    return id;
  };
  const vertex=shader(gl.VERTEX_SHADER,`#version 300 es
  layout(location=0) in vec3 position;
  layout(location=1) in vec3 color;
  uniform mat4 camera;
  uniform bool sky;
  out vec3 tint;
  flat out highp int surface;
  out vec3 skyRay;
  out vec3 local;
  out float depth;
  void main(){
    if(sky){
      vec2 ndc=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);
      vec3 right=vec3(camera[0][0],camera[1][0],camera[2][0]);
      vec3 up=vec3(camera[0][1],camera[1][1],camera[2][1]);
      vec3 forward=vec3(camera[0][3],camera[1][3],camera[2][3]);
      skyRay=forward+ndc.x*right/dot(right,right)+ndc.y*up/dot(up,up);
      gl_Position=vec4(ndc,0.,1.);
      tint=vec3(0.); surface=0; local=vec3(0.); depth=0.;
    }else{
      gl_Position=camera*vec4(position,1.);
      surface=int(floor(color.r*.5));
      tint=vec3(color.r-2.*float(surface),color.gb); local=position; depth=gl_Position.w; skyRay=vec3(0.,0.,1.);
    }
  }`);
  const fragment=shader(gl.FRAGMENT_SHADER,`#version 300 es
  precision highp float;
  uniform bool sky;
  uniform float waterPhase;
  in vec3 tint;
  flat in highp int surface;
  in vec3 skyRay;
  in vec3 local;
  in float depth;
  out vec4 pixel;
  void main(){
    if(sky){
      vec3 d=normalize(skyRay);
      vec3 sun=normalize(vec3(-0.39,.14,.91));
      float elevation=max(0.,d.y);
      float facing=max(0.,dot(d,sun));
      vec3 horizon=mix(vec3(.49,.34,.51),vec3(.94,.54,.43),pow(facing,4.));
      vec3 zenith=vec3(.083,.105,.24);
      vec3 air=mix(horizon,zenith,smoothstep(.005,.61,elevation));
      float glow=pow(facing,28.)*.27+pow(facing,280.)*.34;
      air+=vec3(1.,.51,.25)*glow;
      float disk=smoothstep(.99941,.99962,facing);
      air=mix(air,vec3(1.,.77,.52),disk);
      vec2 p=d.xz/(.135+elevation);
      float wisps=sin(p.x*9.8+p.y*3.7)+.43*sin(p.x*16.6-p.y*5.)+.36*sin(p.x*4.1+p.y*2.2);
      float clouds=smoothstep(.47,1.22,wisps)*smoothstep(.08,.25,elevation)*(1.-smoothstep(.31,.63,elevation));
      air=mix(air,vec3(.65,.43,.56)+vec3(.20,.085,.026)*pow(facing,4.),clouds*.26);
      pixel=vec4(air,1.);
    }else if(tint.z<0.){
      pixel=vec4(.028,.015,.061,-tint.z);
    }else if(surface==4){
      if(tint.g<.002) discard;
      pixel=vec4(1.,.65,.29,tint.g*(1.-smoothstep(25.,92.,depth)));
    }else if(surface==6){
      if(tint.g<.003) discard;
      pixel=vec4(.65,.86,.92,tint.g*(1.-smoothstep(24.,108.,depth)));
    }else if(surface==5){
      pixel=vec4(mix(vec3(1.,.83,.54),vec3(.65,.39,.47),smoothstep(20.,170.,depth)*.45),1.);
    }else if(surface==7){
      pixel=vec4(mix(tint,vec3(.65,.39,.47),smoothstep(20.,170.,depth)*.45),1.);
    }else{
      float haze=smoothstep(19.,185.,depth);
      vec3 normal=cross(dFdy(local),dFdx(local));
      normal*=inversesqrt(max(dot(normal,normal),1e-8));
      float key=max(0.,dot(normal,vec3(-.60,.57,.56)));
      float bounce=max(0.,dot(normal,vec3(.57,.37,-.66)));
      vec3 light=vec3(.76,.75,.92)+vec3(.27,.16,.09)*key+vec3(.05,.09,.16)*bounce;
      vec3 paint=tint;
      vec3 reflected=vec3(0.);
      if(surface==1){
        vec2 grit=local.xz*7.;
        float footprint=max(length(dFdx(grit)),length(dFdy(grit)));
        float gritFade=1.-smoothstep(.32,1.,footprint);
        vec2 cell=floor(grit);
        float speck=fract(dot(fract(cell*vec2(.1031,.1137)),vec2(7.13,13.9)));
        float wear=.5+.5*sin(local.x*.67+local.z*.46)*sin(local.z*.91);
        paint*=.92+.13*wear+(.24*(speck-.5))*gritFade;
      }else if(surface==2&&abs(normal.y)<.42){
        float across=abs(normal.x)>.5?local.z:local.x;
        vec2 brick=vec2(across*1.55,local.y*3.25);
        float footprint=max(length(dFdx(brick)),length(dFdy(brick)));
        float detail=1.-smoothstep(.2,.78,footprint);
        brick.x+=.5*mod(floor(brick.y),2.);
        vec2 f=fract(brick);
        float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
        float mortar=(1.-smoothstep(.035,.105,edge))*detail;
        paint=mix(paint*(.88+.18*fract(dot(floor(brick),vec2(.77,.41)))*detail),
                  paint*.64+vec3(.09,.075,.07),mortar);
      }else if(surface==3){
        vec2 q=local.xz;
        float a=dot(q,vec2(.11,2.8))+waterPhase;
        float b=dot(q,vec2(-.33,4.7))-2.*waterPhase;
        float detail=1.-smoothstep(.4,2.45,max(fwidth(a),fwidth(b)));
        float wave=(sin(a)*.63+sin(b)*.37)*detail;
        float gleam=max(0.,wave);
        gleam*=gleam; gleam*=gleam;
        float sunTrail=exp(-abs(q.x+18.-.19*(q.y-75.))*.105);
        paint*=1.06+.22*wave;
        reflected=vec3(.095,.12,.16)*(.25+.75*gleam)+vec3(.34,.17,.074)*sunTrail*gleam;
      }
      vec3 dusk=paint*light+vec3(.036,.018,.045)+reflected;
      pixel=vec4(mix(dusk,vec3(.51,.34,.44),haze*.69),1.);
    }
  }`);
  const program=gl.createProgram();
  gl.attachShader(program,vertex);
  gl.attachShader(program,fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error("The scene could not start.");
  return program;
}

function graphics(canvas) {
  const gl=canvas.getContext("webgl2",{alpha:true,antialias:true});
  if (!gl) throw Error("Last Ferry needs WebGL 2. Try a browser with graphics acceleration enabled.");
  const program=programFor(gl), camera=gl.getUniformLocation(program,"camera"), sky=gl.getUniformLocation(program,"sky");
  const waterPhase=gl.getUniformLocation(program,"waterPhase");
  const skyVao=gl.createVertexArray();
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const layers=["world","moving"].map(()=>{
    const vao=gl.createVertexArray(), buffer=gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for (let i=0;i<2;i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i,3,gl.FLOAT,false,24,i*12);
    }
    return {vao,buffer,count:0};
  });
  return {
    upload(name,data) {
      const layer=layers[name==="world"?0:1];
      gl.bindBuffer(gl.ARRAY_BUFFER,layer.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,data,name==="world"?gl.STATIC_DRAW:gl.DYNAMIC_DRAW);
      layer.count=data.length/6;
    },
    draw(frame) {
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(camera,false,frame.subarray(0,16));
      gl.uniform1f(waterPhase,(performance.now()%20000)*Math.PI/10000);
      gl.disable(gl.DEPTH_TEST);
      gl.uniform1i(sky,1);
      gl.bindVertexArray(skyVao);
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.enable(gl.DEPTH_TEST);
      gl.uniform1i(sky,0);
      for (const layer of layers) {
        gl.bindVertexArray(layer.vao);
        gl.drawArrays(gl.TRIANGLES,0,layer.count);
      }
    },
  };
}

function countdown(value) {
  if (!Number.isFinite(value)) return "--:--";
  const left=Math.max(0,Math.ceil(value));
  return `${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;
}
function label(node,text) { if(node.textContent!==text) node.textContent=text; }
function fit(canvas,pixelRatio) {
  const ratio=Math.min(pixelRatio||1,1.8);
  const width=Math.max(1,Math.round(canvas.clientWidth*ratio));
  const height=Math.max(1,Math.round(canvas.clientHeight*ratio));
  if(canvas.width!==width) canvas.width=width;
  if(canvas.height!==height) canvas.height=height;
  return width/height;
}

export async function boot(env=globalThis,createGraphics=graphics) {
  const {document,window,WebAssembly,performance}=env;
  const get=(id)=>document.getElementById(id);
  const canvas=get("view"), wheel=get("wheel"), thumb=get("thumb"), pause=get("pause"), cameraView=get("camera-view");
  const panel=get("panel"), start=get("start"), roam=get("roam"), power=get("power"), brake=get("brake"), action=get("action");
  const objective=get("objective"), stats=get("status"), clock=get("clock"), hint=get("hint"), summary=get("summary"), announce=get("announce");
  const actionCaption=get("action-caption"), playHud=get("play-hud");
  const touch=get("touch"), trip=get("trip"), departure=get("departure"), brakeIcon=get("brake-icon"), actionIcon=get("action-icon");
  const input=inputState(), meshes=new Map();
  const map=get("city-map"), chart=get("city-chart").getContext?.("2d");
  let roads=[], roadBounds, routeKey=-1, route=[];
  let engine, renderer, frame, aspect=0, menuText="Loading the waterfront…", failed=false, noticeUntil=0, notice="", last=0, playing=false, lost=false, ready=false, paused=false, mode=0, event=0, previousCue=-1, previousState=-1;
  const heldButtons=[power,brake,action];
  const renderThumb=(x,y)=>{
    thumb.style.setProperty("--x",`${x}px`);
    thumb.style.setProperty("--y",`${y}px`);
  };
  function clear() {
    if (input.stick && wheel.hasPointerCapture(input.stick.id)) wheel.releasePointerCapture(input.stick.id);
    for(const [id,name] of input.buttons) {
      const node=get(name);
      if(node.hasPointerCapture(id)) node.releasePointerCapture(id);
    }
    input.clear();
    renderThumb(0,0);
    for(const node of heldButtons) node.dataset.held="false";
    if(ready) engine.cancel_action();
  }
  function overlay(message,cta) {
    playing=false;
    clear();
    menuText=message; label(start,cta);
    panel.hidden=false;
    get("touch").hidden=true;
    hint.hidden=true;
    pause.disabled=true;
    updateAvailability();
    if(ready&&!lost) start.focus({preventScroll:true});
  }
  const missionText="Answer the marked phone. Pick up the tape at Sunset Video, then reach Pier 8 within 90 seconds.";
  function updateAvailability() {
    const available=ready&&!lost;
    start.disabled=!available; roam.disabled=!available;
    pause.disabled=!available||!playing;
    cameraView.disabled=pause.disabled;
    playHud.hidden=pause.disabled;
    map.hidden=pause.disabled||!chart;
    label(summary,lost&&!failed ? "Graphics interrupted. Waiting for the browser to restore the scene." : menuText);
  }
  function paintMap() {
    if(!chart||!frame||!map.open||map.hidden) return;
    const selected=engine.route_selection();
    if(selected!==routeKey) {
      const next=[];
      if(selected!==0) {
        const length=engine.route_value(selected,-1,0);
        if(!Number.isInteger(length)||length<2||length>16) throw Error("The guide route is unreadable.");
        for(let i=0;i<length;i++) {
          const x=engine.route_value(selected,i,0),z=engine.route_value(selected,i,1);
          if(!Number.isFinite(x)||!Number.isFinite(z)) throw Error("The guide route is unreadable.");
          next.push([x,z]);
        }
      }
      route=next; routeKey=selected;
    }
    drawRouteMap(chart,roads,roadBounds,frame,route);
  }
  map.addEventListener("toggle",()=>{ if(ready) paintMap(); });
  function syncAspect(next) {
    aspect=next;
    engine.tick(0,0,0,0,aspect);
    show();
  }
  function show() {
    if(!frame || !renderer) return;
    renderer.draw(frame);
    paintMap();
    const foot=frame[16]===0,state=frame[17],cue=frame[20],hit=frame[21],target=state===0||state===1||state===8;
    label(objective,OBJECTIVES[state]||"Find the ferry");
    label(stats,target ? `${Math.round(frame[23])} m` : "");
    trip.dataset.route=String(target);
    trip.style.setProperty("--bearing",`${frame[29]}rad`);
    departure.hidden=state!==1;
    if(state===1) label(clock,countdown(frame[18]));
    touch.dataset.crossing=String(state===5||state===7);
    touch.dataset.docked=String(state===6);
    brake.parentElement.dataset.foot=String(foot);
    if(previousState!==state||previousCue!==cue) {
      action.hidden=!ACTIONS[cue];
      action.setAttribute("aria-label",ACTIONS[cue]||"Interact");
      label(actionCaption,ACTIONS[cue]||"Interact");
      if(ACTION_ICONS[cue]) actionIcon.setAttribute("href",`#icon-${ACTION_ICONS[cue]}`);
    }
    const brakeMode=foot?"Sprint":"Brake";
    if(brake.dataset.mode!==brakeMode) {
      brake.dataset.mode=brakeMode;
      brake.setAttribute("aria-label",brakeMode);
      brakeIcon.setAttribute("href",foot?"#icon-sprint":"#icon-brake");
    }
    if(frame[22]!==event) {
      notice=HIT[hit]||""; noticeUntil=performance.now()+1800;
    }
    const message=performance.now()<noticeUntil ? notice : "";
    label(hint,message|| (ACTIONS[cue] ? `E · ${ACTIONS[cue]}` : ""));
    hint.dataset.notice=String(Boolean(message));
    hint.hidden=!playing||!hint.textContent;
    if(frame[22]!==event) {
      event=frame[22]; if(HIT[hit]) label(announce,HIT[hit]);
    } else if(previousState!==state||previousCue!==cue) {
      label(announce,ACTIONS[cue]||OBJECTIVES[state]||"");
    }
    previousCue=cue; previousState=state;
    if(playing && (state===2||state===3)) overlay(state===2?"Tape delivered. You made it ashore.":"The ferry left without the tape. Try a quicker route.","Play again");
  }
  function engage(nextMode) {
    if(!ready||lost) return;
    try {
      clear();
      if(!paused||nextMode!==mode) {
        event=0; previousCue=-1; previousState=-1; noticeUntil=0;
        mode=nextMode; engine.reset(mode); aspect=0;
      }
      paused=false; playing=true; last=0;
      panel.hidden=true; panel.dataset.intro="false"; get("touch").hidden=false; updateAvailability();
      pause.focus({preventScroll:true});
    } catch(error) { fail(error); }
  }
  function suspend() {
    if(!playing) return;
    paused=true;
    try { overlay("Take a breather. The ferry clock is paused.","Resume game"); }
    catch(error) { fail(error); }
  }
  start.addEventListener("click",()=>engage(paused ? mode : 0));
  roam.addEventListener("click",()=>{ if(ready&&!lost) { paused=false;engage(1); } });
  pause.addEventListener("click",suspend);
  cameraView.addEventListener("click",()=>{ if(playing) input.camera=true; });
  function updateStick(event) {
    const held=input.stick;
    const x=event.clientX-held.x,y=event.clientY-held.y;
    held.axis=axes(x,y,held.radius);
    const factor=Math.min(1,held.radius/(Math.hypot(x,y)||1));
    renderThumb(x*factor,y*factor);
  }
  wheel.addEventListener("pointerdown",(e)=>{
    if(!playing||input.stick||e.button!==0) return;
    e.preventDefault(); wheel.setPointerCapture(e.pointerId);
    input.stick={id:e.pointerId,x:e.clientX,y:e.clientY,radius:Math.min(48,wheel.clientWidth*.34),axis:[0,0]};
  });
  wheel.addEventListener("pointermove",(e)=>{ if(input.stick?.id===e.pointerId) updateStick(e); });
  for(const name of ["pointerup","pointercancel","lostpointercapture"]) wheel.addEventListener(name,(e)=>{
    if(input.stick?.id!==e.pointerId) return;
    input.stick=null; renderThumb(0,0);
  });
  for(const node of heldButtons) {
    node.addEventListener("pointerdown",(e)=>{
      if(!playing||e.button!==0||(node===action&&!ACTIONS[frame?.[20]])) return;
      e.preventDefault(); node.setPointerCapture(e.pointerId);
      input.buttons.set(e.pointerId,node.id);
      node.dataset.held="true";

    });
    for(const name of ["pointerup","pointercancel","lostpointercapture"]) node.addEventListener(name,(e)=>{
      if(input.buttons.get(e.pointerId)!==node.id) return;
      input.buttons.delete(e.pointerId);
      if(!Array.from(input.buttons.values()).includes(node.id)) node.dataset.held="false";
      if(name==="pointerup"&&playing&&node===action&&ACTIONS[frame?.[20]]) input.action=true;
    });
  }
  action.addEventListener("click",(e)=>{ if(playing&&e.detail===0&&ACTIONS[frame?.[20]]) input.action=true; });
  window.addEventListener("keydown",(e)=>{
    if(e.code==="Escape"&&!e.repeat) {
      if(playing) suspend();
      else if(paused) engage(mode);
      return;
    }
    if(!playing||e.ctrlKey||e.metaKey||e.altKey) return;
    if(e.code==="Space"&&/^(BUTTON|A)$/.test(e.target?.tagName)&&e.target!==pause) return;
    if(e.code!=="KeyE"&&e.code!=="KeyC"&&!INPUTS.has(e.code)) return;
    e.preventDefault();
    if(e.repeat) return;
    if(e.code==="KeyE") input.action=true;
    else if(e.code==="KeyC") input.camera=true;
    else input.keys.set(e.code,INPUTS.get(e.code));
  });
  window.addEventListener("keyup",(e)=>input.keys.delete(e.code));
  window.addEventListener("blur",suspend);
  window.addEventListener("orientationchange",clear);
  window.screen?.orientation?.addEventListener("change",clear);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)suspend();});
  canvas.addEventListener("webglcontextlost",(e)=>{
    e.preventDefault(); lost=true; renderer=null;
    suspend(); updateAvailability();
  });
  canvas.addEventListener("webglcontextrestored",()=>{
    if(failed) return;
    try {
      renderer=createGraphics(canvas);
      if(ready) for(const [name,range] of meshes)renderer.upload(name,frameData(engine.memory,...range,name));
      lost=false;
      if(ready) syncAspect(fit(canvas,env.devicePixelRatio));
      updateAvailability();
    } catch(error) { fail(error); }
  });
  function fail(error) {
    ready=false; failed=true;
    overlay(error?.message||"Last Ferry could not load.","Unavailable");
  }
  function receive(name,pointer,length) {
    const data=frameData(engine.memory,pointer,length,name);
    const other=meshes.get(name==="world"?"moving":"world");
    if (other && pointer+length*4>other[0] && other[0]+other[1]*4>pointer) {
      throw Error("The game engine returned overlapping geometry.");
    }
    meshes.set(name,[pointer,length]);
    renderer?.upload(name,data);
  }
  try {
    renderer=createGraphics(canvas);
    const response=await env.fetch(ENGINE_PATH);
    if(!response.ok) throw Error("The game could not be downloaded. Reload the page to try again.");
    const module=await WebAssembly.instantiate(await response.arrayBuffer(),{
      ferry:{
        world:(ptr,len)=>receive("world",ptr,len),
        moving:(ptr,len)=>receive("moving",ptr,len),
        frame:(ptr,len)=>{ frame=frameData(engine.memory,ptr,len,"frame").slice(); },
      },
      wasi_snapshot_preview1:{proc_exit(code){throw Error(`The game stopped (${code}).`);}},
    });
    if(failed) return;
    const exports=module.instance.exports;
    if(!(exports.memory instanceof WebAssembly.Memory) ||
      !["_start","reset","tick","cancel_action","map_value","route_selection","route_value"].every((name)=>typeof exports[name]==="function")) {
      throw Error("The game engine could not be initialized.");
    }
    engine=exports;
    engine._start();
    engine.reset(0);
    roads=readRouteMap(engine.map_value);
    roadBounds=routeMapBounds(roads);
    if(!lost) syncAspect(fit(canvas,env.devicePixelRatio));
    ready=true;
    menuText=missionText; label(start,"Start mission");
    updateAvailability();
    function loop(now) {
      if(!ready) return;
      if(!lost) {
        try {
          const width=canvas.width,height=canvas.height;
          const next=fit(canvas,env.devicePixelRatio);
          if(playing) {
            aspect=next;
            engine.tick(last ? Math.min((now-last)/1000,.05) : 0,...input.sample(),aspect);
            last=now;
            show();
          } else if(next!==aspect) {
            syncAspect(next);
          } else if(canvas.width!==width||canvas.height!==height) {
            show();
          }
        } catch(error) { fail(error); }
      }
      if(ready) env.requestAnimationFrame(loop);
    }
    env.requestAnimationFrame(loop);
  } catch(error) { fail(error); }
}

if (typeof document!=="undefined") void boot();
