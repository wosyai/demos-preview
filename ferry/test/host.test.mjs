import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import {axes,inputState,frameData,ENGINE_PATH,readRouteMap,boot} from "../host.mjs";

test("floating stick is radial and one thumb can steer and move simultaneously",()=>{
  assert.deepEqual(axes(3,2,40),[0,0]);
  const [x,y]=axes(30,-30,40);
  assert(x>0 && y>0);
  assert(Math.abs(x-y)<1e-10);
  assert(Math.abs(Math.hypot(x,y)-1)<1e-10);
  assert(axes(0,50,40)[1]<0);
});

test("pedals and one-shot action coexist with analog steering; keyboard axis precedence",()=>{
  const control=inputState();
  control.stick={id:1,axis:[.75,-.5]};
  control.buttons.set(2,"power");
  control.buttons.set(3,"brake");
  control.action=true;
  assert.deepEqual(control.sample(),[.75,1,3]);
  assert.deepEqual(control.sample(),[.75,1,1]);
  control.keys.set("KeyA","left");
  control.keys.set("KeyS","down");
  assert.deepEqual(control.sample(),[-1,-1,1]);
  control.clear();
  assert.deepEqual(control.sample(),[0,0,0]);
});

test("loader agrees with shell version, WebAssembly triangle shape, and 30-float engine frame",async()=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  const version=html.match(/host\.mjs\?v=([^"]+)/)?.[1];
  assert.equal(version,"ferry-guided-routes-v3-arcade-ui4");
  assert(html.includes('style.css?v=ferry-mobile-hud-v5-arcade-ui4"'));
  assert.equal(ENGINE_PATH,"./ferry.wasm?v=ferry-guided-routes-v3");
  assert.match(html,/<div id="play-hud" class="play-hud" hidden>[\s\S]*?<header[^>]*>[\s\S]*?id="camera-view"[\s\S]*?id="hint"[\s\S]*?<\/header>[\s\S]*?id="city-map"/);
  assert.match(html,/id="action-icon"[\s\S]*?<span id="action-caption">Interact<\/span>/);
  assert(html.includes('lang="en"')&&html.includes('id="roam"'));
  const memory=new WebAssembly.Memory({initial:1});
  assert.equal(frameData(memory,4,30,"frame").length,30);
  assert.equal(frameData(memory,4,18,"world").length,18);
  assert.throws(()=>frameData(memory,0,29,"frame"));
  assert.throws(()=>frameData(memory,1,30,"frame"));
  assert.throws(()=>frameData(memory,65532,18,"world"));
  assert.throws(()=>frameData(memory,0,17,"moving"));
});

function shell({defer=false,missing="",cue=1}={}) {
  class Target {
    handlers=new Map();
    captures=new Set();
    style={setProperty(){}};
    dataset={};
    parentElement={dataset:{}};
    width=0;
    height=0;
    clientWidth=960;
    clientHeight=480;
    disabled=true;
    textContent="";
    addEventListener(name,handler) { this.handlers.set(name,handler); }
    emit(name,props={}) { this.handlers.get(name)?.({button:0,preventDefault(){},...props}); }
    attributes=new Map();
    setAttribute(name,value) { this.attributes.set(name,value); }
    focus() {}
    setPointerCapture(id) { this.captures.add(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
  }
  const nodes=new Map();
  const get=(id)=>{
    if(!nodes.has(id))nodes.set(id,Object.assign(new Target(),{id}));
    return nodes.get(id);
  };
  const mapPaint=[];
  const chart=get("city-chart");
  chart.width=224; chart.height=152;
  chart.getContext=()=>({
    canvas:chart, clearRect(){mapPaint.push(["clear"]);},
    fillRect(...args){mapPaint.push(["road",...args]);},
    beginPath(){}, moveTo(...args){mapPaint.push(["route-start",...args]);},
    lineTo(...args){mapPaint.push(["route-leg",...args]);}, stroke(){mapPaint.push(["stroke",this.strokeStyle]);}, arc(...args){mapPaint.push(["dot",this.fillStyle,...args]);}, fill(){},
  });
  const window=new Target(), document=Object.assign(new Target(),{getElementById:get});
  window.screen={orientation:new Target()};
  const memory=new WebAssembly.Memory({initial:1});
  const frames=[],ticks=[],draws=[],uploads=[],resets=[];
  let finishFetch,cancellations=0,wasmStarts=0,time=0;
  let state=0,seconds=90,turn=0,selection=0,routeReads=0;
  const fetchGate=new Promise(resolve=>{finishFetch=resolve;});
  const env={
    window,document,devicePixelRatio:1,performance:{now:()=>time},
    requestAnimationFrame(fn){frames.push(fn);},
    async fetch() {
      if(defer) await fetchGate;
      return {ok:true,arrayBuffer:async()=>new ArrayBuffer(0)};
    },
    WebAssembly:{
      Memory:WebAssembly.Memory,
      async instantiate(_,imports){
        const bus=imports.ferry;
        const view=new Float32Array(memory.buffer,0,30);
        const publish=()=>{view[17]=state;view[18]=seconds;view[20]=cue;view[29]=turn;bus.frame(0,30);};
        const exports={
          memory,_start(){wasmStarts++;},
          reset(mode){resets.push(mode);bus.world(240,18);bus.moving(360,18);publish();},
          tick(...values){ticks.push(values);publish();},
          cancel_action(){cancellations++;},
          map_value(row,column){ return row===-1 ? 1 : [-1,2,3,4][column]; },
          route_selection(){ return selection; },
          route_value(key,row,column){ routeReads++; return row===-1 ? 3 : [[-1,2],[-1,4],[2,4]][row][column]; },
        };
        if(missing)delete exports[missing];
        return {instance:{exports}};
      },
    },
  };
  const started=boot(env,()=>({draw(...args){draws.push(args);},upload(...args){uploads.push(args);}}));
  return {
    get,window,document,ticks,draws,uploads,resets,started,finishFetch,mapPaint,
    advance(){ const frame=frames.shift(); assert(frame,"animation callback was scheduled");frame(time+=16); },
    mission(next){({state,seconds,turn,cue,selection}={state,seconds,turn,cue,selection,...next});},
    get routeReads(){return routeReads;},
    get wasmStarts(){return wasmStarts;},
    get cancellations(){return cancellations;},
  };
}

test("context loss during fetch does not enable menu or hide interruption until actual restore",async()=>{
  const app=shell({defer:true});
  const canvas=app.get("view"), start=app.get("start"), roam=app.get("roam");
  canvas.emit("webglcontextlost");
  app.finishFetch();
  await app.started;
  assert(start.disabled&&roam.disabled);
  assert.match(app.get("summary").textContent,/Graphics interrupted/);
  assert.deepEqual(app.ticks,[]);
  assert.deepEqual(app.uploads,[]);
  start.emit("click"); assert.deepEqual(app.resets,[0]);
  canvas.emit("webglcontextrestored");
  assert(!start.disabled&&!roam.disabled);
  assert.deepEqual(app.uploads.map(([name])=>name),["world","moving"]);
  assert.deepEqual(app.ticks,[[0,0,0,0,2]]);
});

test("restore before fetch completion also waits for a valid engine",async()=>{
  const app=shell({defer:true});
  app.get("view").emit("webglcontextlost");
  app.get("view").emit("webglcontextrestored");
  assert(app.get("start").disabled&&app.get("roam").disabled);
  app.finishFetch(); await app.started;
  assert(!app.get("start").disabled&&!app.get("roam").disabled);
  assert.deepEqual(app.ticks,[[0,0,0,0,2]]);
});

test("partial exports never start, enable, or fail while clearing the loading menu",async()=>{
  for(const missing of ["memory","_start","reset","tick","cancel_action"]) {
    const app=shell({missing}); await app.started;
    assert.equal(app.wasmStarts,0);
    assert(app.get("start").disabled&&app.get("roam").disabled);
    assert.match(app.get("summary").textContent,/could not be initialized/);
    app.get("view").emit("webglcontextrestored");
    assert(app.get("start").disabled);
  }
});

test("menu and paused resizing synchronize camera once per aspect without advancing gameplay",async()=>{
  const app=shell(); await app.started;
  assert.deepEqual(app.ticks,[[0,0,0,0,2]]);
  app.advance(); assert.equal(app.draws.length,1);
  const canvas=app.get("view");
  canvas.clientWidth=720; app.advance();
  assert.deepEqual(app.ticks.at(-1),[0,0,0,0,1.5]);
  app.get("start").emit("click"); app.advance(); app.advance();
  assert(app.ticks.at(-1)[0]>0);
  app.get("pause").emit("click"); canvas.clientWidth=480; app.advance(); app.advance();
  assert.deepEqual(app.ticks.at(-1),[0,0,0,0,1]);
  assert.equal(app.draws.length,5);
  const count=app.ticks.length;
  canvas.clientWidth=600; canvas.clientHeight=600; app.advance();
  assert.equal(app.draws.length,6);
  assert.equal(app.ticks.length,count);
});

test("cancelled touch does not clear keyboard interact; action only fires on release or accessibility click",async()=>{
  const app=shell(); await app.started;
  app.get("start").emit("click");
  const action=app.get("action");
  app.window.emit("keydown",{code:"KeyE"});
  action.emit("pointerdown",{pointerId:1});
  action.emit("pointercancel",{pointerId:1});
  app.advance(); assert.equal(app.ticks.at(-1)[3],2);
  action.emit("pointerdown",{pointerId:2});
  app.advance(); assert.equal(app.ticks.at(-1)[3],0);
  action.emit("pointerup",{pointerId:2});
  app.advance(); assert.equal(app.ticks.at(-1)[3],2);
  action.emit("click",{detail:0});
  app.advance(); assert.equal(app.ticks.at(-1)[3],2);
  const wheel=app.get("wheel"), power=app.get("power");
  wheel.emit("pointerdown",{pointerId:3,clientX:0,clientY:0});
  wheel.emit("pointermove",{pointerId:3,clientX:30,clientY:-20});
  power.emit("pointerdown",{pointerId:4});
  app.advance(); assert(app.ticks.at(-1)[1]>0&&app.ticks.at(-1)[2]===1);
  app.window.screen.orientation.emit("change");
  app.advance(); assert.deepEqual(app.ticks.at(-1).slice(1,4),[0,0,0]);
  assert(!wheel.hasPointerCapture(3)&&!power.hasPointerCapture(4));
  assert(app.cancellations>=2);
});


test("the clock follows tape pickup and a single contextual icon follows the engine",async()=>{
  const app=shell({cue:0});
  await app.started;
  app.get("start").emit("click");
  app.advance(); app.advance();
  assert.equal(app.get("departure").hidden,true);
  assert.equal(app.get("action").hidden,true);
  assert.equal(app.get("hint").hidden,true);
  app.mission({state:1,seconds:89,cue:8});
  app.advance();
  assert.equal(app.get("action").attributes.get("aria-label"),"Mark waterfront");
  assert.equal(app.get("action-icon").attributes.get("href"),"#icon-waterfront");
  assert.equal(app.get("departure").hidden,false);
  app.mission({state:1,seconds:89,cue:9});
  app.advance();
  assert.equal(app.get("action").attributes.get("aria-label"),"Mark avenue");
  assert.equal(app.get("action-icon").attributes.get("href"),"#icon-avenue");
  assert.equal(app.get("departure").hidden,false);
  app.mission({state:1,seconds:89,turn:.6,cue:4});
  app.advance();
  assert.equal(app.get("departure").hidden,false);
  assert.equal(app.get("objective").textContent,"Reach Pier 8");
  assert.equal(app.get("action").attributes.get("aria-label"),"Board ferry");
  assert.equal(app.get("action-icon").attributes.get("href"),"#icon-board");
  assert.equal(app.get("action").hidden,false);
  app.mission({state:1,cue:7});
  app.advance();
  assert.equal(app.get("action").attributes.get("aria-label"),"Park & walk");
  assert.equal(app.get("action-icon").attributes.get("href"),"#icon-exit");
  assert.equal(app.get("departure").hidden,false);
  app.mission({state:5,cue:0});
  app.advance();
  assert.equal(app.get("objective").textContent,"Crossing the canal");
  assert.equal(app.get("departure").hidden,true);
  assert.equal(app.get("touch").dataset.crossing,"true");
  assert.equal(app.get("action").hidden,true);
  app.mission({state:6,cue:5});
  app.advance();
  assert.equal(app.get("objective").textContent,"Leave the ferry");
  assert.equal(app.get("action").hidden,false);
  assert.equal(app.get("action").attributes.get("aria-label"),"Leave ferry");
  assert.equal(app.get("touch").dataset.crossing,"false");
  assert.equal(app.get("touch").dataset.docked,"true");
  app.mission({state:7,cue:0});
  app.advance();
  assert.equal(app.get("objective").textContent,"Walk ashore");
  assert.equal(app.get("touch").dataset.crossing,"true");
});


test("the phone prologue has one contextual action and no countdown",async()=>{
  const app=shell({cue:0});
  await app.started;
  app.get("start").emit("click");
  app.mission({state:8});
  app.advance(); app.advance();
  assert.equal(app.get("objective").textContent,"Answer the phone");
  assert.equal(app.get("departure").hidden,true);
  assert.equal(app.get("action").hidden,true);
  app.mission({cue:6});
  app.advance();
  assert.equal(app.get("action").attributes.get("aria-label"),"Answer phone");
  assert.equal(app.get("action-icon").attributes.get("href"),"#icon-phone");
  assert.equal(app.get("action").hidden,false);
});


test("camera is a one-shot command, works with interact, and cannot queue during pause",async()=>{
  const app=shell(); await app.started;
  const camera=app.get("camera-view");
  assert.equal(camera.disabled,true);
  app.get("start").emit("click");
  assert.equal(camera.disabled,false);
  camera.emit("click");
  app.window.emit("keydown",{code:"KeyE"});
  app.advance(); assert.equal(app.ticks.at(-1)[3],6);
  app.advance(); assert.equal(app.ticks.at(-1)[3],0);
  app.window.emit("keydown",{code:"KeyC",repeat:true});
  app.advance(); assert.equal(app.ticks.at(-1)[3],0);
  app.window.emit("keydown",{code:"KeyC"});
  app.advance(); assert.equal(app.ticks.at(-1)[3],4);
  app.get("pause").emit("click");
  assert.equal(camera.disabled,true);
  camera.emit("click");
  app.get("start").emit("click");
  app.advance(); assert.equal(app.ticks.at(-1)[3],0);
});


test("route map reads only the engine count and four components per road",()=>{
  const calls=[], data=[[-12,8,7,1],[5,-9,3,4]];
  const values=readRouteMap((r,c)=>{calls.push([r,c]); return r===-1 ? data.length : data[r][c];});
  assert.deepEqual(values,data);
  assert.deepEqual(calls,[[-1,0],[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3]]);
  assert.throws(()=>readRouteMap(()=>65),/unreadable/);
  assert.throws(()=>readRouteMap((row)=>row===-1 ? 1 : 0),/unreadable/);
});


test("map paints canonical roads and active markers only when expanded and playing",async()=>{
  const app=shell(); await app.started;
  const map=app.get("city-map");
  assert.equal(map.hidden,true);
  app.get("start").emit("click");
  assert.equal(map.hidden,false);
  app.advance(); assert.deepEqual(app.mapPaint,[]);
  map.open=true; map.emit("toggle");
  assert.deepEqual(app.mapPaint.map(entry=>entry.slice(0,entry[0]==="dot" ? 2 : 1)),
    [["clear"],["road"],["dot","#ffc276"],["dot","#fff5e1"]]);
  map.open=false; map.emit("toggle"); app.advance(); assert.equal(app.mapPaint.length,4);
  app.mission({state:4}); app.advance();
  map.open=true; map.emit("toggle");
  assert.deepEqual(app.mapPaint.slice(4).map(entry=>entry.slice(0,entry[0]==="dot" ? 2 : 1)),
    [["clear"],["road"],["dot","#fff5e1"]]);
  app.get("pause").emit("click");
  assert.equal(map.hidden,true);
  map.emit("toggle"); app.advance(); assert.equal(app.mapPaint.length,7);
});

test("touch action caption follows the same Wosy cue as its accessible name",async()=>{
  const app=shell({cue:6}); await app.started;
  const action=app.get("action"), caption=app.get("action-caption");
  const hud=app.get("play-hud");
  assert.equal(hud.hidden,true);
  app.get("start").emit("click"); app.advance();
  assert.equal(hud.hidden,false);
  assert.equal(caption.textContent,"Answer phone");
  assert.equal(action.attributes.get("aria-label"),caption.textContent);
  app.mission({cue:3}); app.advance();
  assert.equal(caption.textContent,"Collect tape");
  assert.equal(action.attributes.get("aria-label"),caption.textContent);
  app.mission({cue:0}); app.advance();
  assert.equal(action.hidden,true);
  app.get("pause").emit("click");
  assert.equal(hud.hidden,true);
});

test("the minimap paints Wosy turns and reads path points only on selection changes",async()=>{
  const app=shell(); await app.started;
  app.get("start").emit("click");
  app.mission({state:1,selection:64});
  app.advance();
  assert.equal(app.routeReads,0,"the closed map has no path work");
  const map=app.get("city-map");
  map.open=true; map.emit("toggle");
  assert.equal(app.routeReads,7);
  const start=app.mapPaint.find(row=>row[0]==="route-start");
  const legs=app.mapPaint.filter(row=>row[0]==="route-leg");
  assert.equal(legs.length,2);
  assert.equal(legs[0][1],start[1],"first segment shares the same map x");
  assert.equal(legs[1][2],legs[0][2],"second segment changes direction, not a diagonal to the goal");
  app.advance(); app.advance();
  assert.equal(app.routeReads,7,"unchanged legs render from cached points");
  app.mission({state:1,selection:65});
  app.advance();
  assert.equal(app.routeReads,14);
  app.mapPaint.length=0;
  app.mission({state:1,selection:0});
  app.advance();
  assert(!app.mapPaint.some(row=>row[0]==="route-start"),"when no route exists do not draw a shortcut");
});
