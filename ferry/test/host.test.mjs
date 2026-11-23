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
  assert.deepEqual(control.sample(),[.75,1,3,0,0]);
  assert.deepEqual(control.sample(),[.75,1,1,0,0]);
  control.keys.set("KeyA","left");
  control.keys.set("KeyS","down");
  assert.deepEqual(control.sample(),[-1,-1,1,0,0]);
  control.clear();
  assert.deepEqual(control.sample(),[0,0,0,0,0]);
});

test("loader agrees with shell version, WebAssembly triangle shape, and 30-float engine frame",async()=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  const version=html.match(/host\.mjs\?v=([^"]+)/)?.[1];
  assert.equal(version,"ferry-street-orbit-v1-navigation-v2");
  assert(html.includes('style.css?v=ferry-free-orbit-v1"'));
  assert.equal(ENGINE_PATH,"./ferry.wasm?v=ferry-street-orbit-v1");
  assert.doesNotMatch(html,/id="camera-view"/);
  assert.match(html,/<div id="play-hud" class="play-hud" hidden>[\s\S]*?<header[^>]*>[\s\S]*?id="objective"[\s\S]*?id="status"[\s\S]*?id="city-map"[\s\S]*?id="hint"[\s\S]*?<\/header>/);
  assert.match(html,/id="action-icon"[\s\S]*?<span id="action-caption">Interact<\/span>/);
  assert.match(html,/<button id="reverse"[^>]*>[\s\S]*?Reverse<\/button>/);
  assert(html.includes('lang="en"')&&html.includes('id="roam"'));
  const memory=new WebAssembly.Memory({initial:1});
  assert.equal(frameData(memory,4,30,"frame").length,30);
  assert.equal(frameData(memory,4,18,"world").length,18);
  assert.throws(()=>frameData(memory,0,29,"frame"));
  assert.throws(()=>frameData(memory,1,30,"frame"));
  assert.throws(()=>frameData(memory,65532,18,"world"));
  assert.throws(()=>frameData(memory,0,17,"moving"));
  const larger=new WebAssembly.Memory({initial:16});
  assert.equal(frameData(larger,0,9*4096*6,"world").length,9*4096*6);
  assert.throws(()=>frameData(larger,0,9*4096*6+18,"world"));
  assert.equal(frameData(larger,0,24*256*6,"moving").length,24*256*6);
  assert.throws(()=>frameData(larger,0,24*256*6+18,"moving"));
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
  const mapPaint=[], roadPaint=[];
  const chart=get("city-chart");
  chart.width=280; chart.height=182;
  chart.getContext=()=>({
    canvas:chart, clearRect(){mapPaint.push(["clear"]);},
    drawImage(){mapPaint.push(["roads-layer"]);},
    beginPath(){}, moveTo(...args){mapPaint.push(["route-start",...args]);},
    lineTo(...args){mapPaint.push(["route-leg",...args]);},
    setLineDash(pattern){this.dash=pattern;},
    closePath(){mapPaint.push(["close-shape"]);},
    stroke(){mapPaint.push(["stroke",this.strokeStyle,this.dash]);},
    arc(...args){mapPaint.push(["dot",...args]);}, fill(){mapPaint.push(["fill",this.fillStyle]);},
  });
  const window=new Target(), document=Object.assign(new Target(),{getElementById:get});
  window.screen={orientation:new Target()};
  document.createElement=()=>{
    const canvas={width:0,height:0};
    return {getContext:()=>({canvas,clearRect(){},fillRect(...args){roadPaint.push(args);}})};
  };
  const memory=new WebAssembly.Memory({initial:1});
  const frames=[],ticks=[],draws=[],uploads=[],resets=[];
  let finishFetch,cancellations=0,wasmStarts=0,time=0;
  let state=0,seconds=90,turn=0,selection=0,routeReads=0, player=[0,0],target=[0,0],heading=0,driving=false, routeSelections=0, pathUpdates=0, path=[], exitOnAction=false, hit=0, hitSequence=0;
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
        const publish=()=>{view[16]=+driving;view[17]=state;view[18]=seconds;view[20]=cue;view[21]=hit;view[22]=hitSequence;view.set([...target,...player,heading,turn],24);bus.frame(0,30);};
        const exports={
          memory,_start(){wasmStarts++;},
          reset(mode){resets.push(mode);bus.world(240,18);bus.moving(360,18);publish();},
          tick(...values){ticks.push(values);if(exitOnAction&&(values[3]&2)){driving=false;cue=0;exitOnAction=false;}publish();},
          cancel_action(){cancellations++;},
          map_value(row,column){ return row===-1 ? 1 : [-1,2,3,4][column]; },
          route_selection(){ routeSelections++; return selection; },
          navigation_update(){pathUpdates++;return path.length;},
          navigation_point(row,column){routeReads++;return path[row][column];},
        };
        if(missing)delete exports[missing];
        return {instance:{exports}};
      },
    },
  };
  const started=boot(env,()=>({draw(...args){draws.push(args);},upload(...args){uploads.push(args);}}));
  return {
    get,window,document,ticks,draws,uploads,resets,started,finishFetch,mapPaint,roadPaint,
    advance(delta=16){ const frame=frames.shift(); assert(frame,"animation callback was scheduled");frame(time+=delta); },
    mission(next){({state,seconds,turn,cue,selection,player,target,heading,driving,exitOnAction,hit,hitSequence,path}={state,seconds,turn,cue,selection,player,target,heading,driving,exitOnAction,hit,hitSequence,path,...next});},
    get routeSelections(){return routeSelections;},
    get pathUpdates(){return pathUpdates;},
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
  assert.deepEqual(app.ticks,[[0,0,0,0,2,0,0]]);
});

test("restore before fetch completion also waits for a valid engine",async()=>{
  const app=shell({defer:true});
  app.get("view").emit("webglcontextlost");
  app.get("view").emit("webglcontextrestored");
  assert(app.get("start").disabled&&app.get("roam").disabled);
  app.finishFetch(); await app.started;
  assert(!app.get("start").disabled&&!app.get("roam").disabled);
  assert.deepEqual(app.ticks,[[0,0,0,0,2,0,0]]);
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
  assert.deepEqual(app.ticks,[[0,0,0,0,2,0,0]]);
  app.advance(); assert.equal(app.draws.length,1);
  const canvas=app.get("view");
  canvas.clientWidth=720; app.advance();
  assert.deepEqual(app.ticks.at(-1),[0,0,0,0,1.5,0,0]);
  app.get("start").emit("click"); app.advance(); app.advance();
  assert(app.ticks.at(-1)[0]>0);
  app.get("pause").emit("click"); canvas.clientWidth=480; app.advance(); app.advance();
  assert.deepEqual(app.ticks.at(-1),[0,0,0,0,1,0,0]);
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
  app.mission({driving:true}); app.advance();
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


test("scene orbit is independent of movement, supports keyboard, and discards cancelled or paused drag",async()=>{
  const app=shell(); await app.started;
  const view=app.get("view"), wheel=app.get("wheel"), gas=app.get("power");
  app.get("start").emit("click");
  app.mission({driving:true});
  app.advance();
  wheel.emit("pointerdown",{pointerId:1,clientX:0,clientY:0});
  wheel.emit("pointermove",{pointerId:1,clientX:30,clientY:0});
  gas.emit("pointerdown",{pointerId:2});
  view.emit("pointerdown",{button:0,pointerId:3,clientX:100,clientY:100});
  view.emit("pointermove",{pointerId:3,clientX:140,clientY:120});
  view.emit("pointermove",{pointerId:2,clientX:280,clientY:320});
  app.window.emit("keydown",{code:"KeyE"});
  app.advance();
  const sample=app.ticks.at(-1);
  assert(sample[1]>.25 && sample[2]===1 && sample[3]===2);
  assert(Math.abs(sample[5]-.36)<.0001 && Math.abs(sample[6]-.14)<.0001);
  view.emit("pointermove",{pointerId:3,clientX:165,clientY:145});
  view.emit("pointercancel",{pointerId:3});
  app.advance(); assert.deepEqual(app.ticks.at(-1).slice(5),[0,0]);
  app.window.emit("keydown",{code:"KeyJ"});
  app.advance(); assert(app.ticks.at(-1)[5]<0);
  app.window.emit("keyup",{code:"KeyJ"});
  app.window.emit("keydown",{code:"KeyC"});
  app.advance(); assert.equal(app.ticks.at(-1)[3],4);
  app.advance(); assert.equal(app.ticks.at(-1)[3],0);
  const tap=(id,time)=>{
    view.emit("pointerdown",{button:0,pointerId:id,clientX:60,clientY:70,timeStamp:time});
    view.emit("pointerup",{pointerId:id,pointerType:"touch",timeStamp:time+40});
  };
  tap(7,200);
  app.advance(); assert.equal(app.ticks.at(-1)[3],0);
  tap(8,350);
  app.advance(); assert.equal(app.ticks.at(-1)[3],4);
  app.get("pause").emit("click");
  view.emit("pointerdown",{button:0,pointerId:4,clientX:0,clientY:0});
  view.emit("pointermove",{pointerId:4,clientX:40,clientY:20});
  app.get("start").emit("click");
  app.advance(); assert.deepEqual(app.ticks.at(-1).slice(5),[0,0]);
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
  assert.deepEqual(app.mapPaint.filter(entry=>entry[0]==="fill"),[["fill","#ffcd87"],["fill","#fff5e1"]]);
  assert.equal(app.roadPaint.length,1);
  const initial=app.mapPaint.length;
  map.open=false; map.emit("toggle"); app.advance(); assert.equal(app.mapPaint.length,initial);
  app.mission({state:4}); app.advance();
  map.open=true; map.emit("toggle");
  assert.deepEqual(app.mapPaint.slice(initial).filter(entry=>entry[0]==="fill"),[["fill","#fff5e1"]]);
  const beforePause=app.mapPaint.length;
  app.get("pause").emit("click");
  assert.equal(map.hidden,true);
  map.emit("toggle"); app.advance(); assert.equal(app.mapPaint.length,beforePause);
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

test("minimap paints exactly Wosy's connected route and never invents a shortcut",async()=>{
  const app=shell(); await app.started;
  app.get("start").emit("click");
  const path=[[0,3],[0,4],[2,4]];
  app.mission({state:1,selection:65,player:path[0],target:[-1,4],path});
  app.advance();
  assert.equal(app.pathUpdates,0,"closed map performs no routing");
  const map=app.get("city-map");
  map.open=true; map.emit("toggle");
  assert.equal(app.pathUpdates,1);
  assert.equal(app.routeReads,6);
  const [start]=app.mapPaint.filter(row=>row[0]==="route-start");
  const legs=app.mapPaint.filter(row=>row[0]==="route-leg");
  assert.equal(legs.length,2);
  assert.equal(legs[0][1],start[1],"start spans the first canonical street");
  assert.equal(legs[1][2],legs[0][2],"the corner stays intact");
  assert.deepEqual(app.mapPaint.find(row=>row[0]==="dot").slice(1,3),legs.at(-1).slice(1),"next stop is the path end supplied by Wosy");
  const firstPaint=app.mapPaint.length, firstSelection=app.routeSelections;
  app.advance(); app.advance();
  assert.equal(app.routeSelections,firstSelection,"no key polling at RAF rate");
  app.advance(72);
  assert.equal(app.mapPaint.length,firstPaint,"unchanged map is not repainted");
  assert.equal(app.pathUpdates,1,"unchanged route avoids an engine graph query");
  assert.equal(app.roadPaint.length,1);
  app.mission({selection:66,driving:true,heading:Math.PI/2});
  app.mapPaint.length=0;
  app.advance(72);
  assert.equal(app.pathUpdates,2,"same-phase route key changes are detected");
  assert.equal(app.roadPaint.length,1,"pose/heading changes reuse the road projection");
  assert.equal(app.mapPaint.filter(row=>row[0]==="close-shape").length,1,"car gets a heading glyph");
  const direction=app.mapPaint.filter(row=>row[0]==="route-start").at(-1);
  const sides=app.mapPaint.filter(row=>row[0]==="route-leg").slice(-3);
  assert(sides.every(([,x])=>direction[1]>x),"eastbound heading points right");
  app.mission({player:[.15,3]});
  app.advance(72);
  assert.equal(app.pathUpdates,2,"small motion does not trigger graph work");
  app.mapPaint.length=0;
  app.mission({player:[.9,3],path:[]});
  app.advance(72);
  assert.equal(app.pathUpdates,3,"movement re-anchors path to the car");
  assert(!app.mapPaint.some(([kind,color])=>kind==="stroke"&&color==="#ffcd87"),"no legitimate path means no invented shortcut");
  app.mission({heading:Math.PI-.02});
  app.advance();
  assert.equal(app.pathUpdates,3,"heading observes the same bounded cadence as movement");
  app.advance(72);
  assert.equal(app.pathUpdates,4,"turning in place can require a different approach");
  app.mission({heading:-Math.PI+.02});
  app.advance(72);
  assert.equal(app.pathUpdates,4,"crossing the angle wrap only counts the actual small turn");
  app.mission({heading:-Math.PI+.27});
  app.advance(72);
  assert.equal(app.pathUpdates,5,"small changes accumulate against the last planned heading");
  app.mapPaint.length=0;
  app.mission({state:5,driving:false});
  app.advance();
  assert.deepEqual(app.mapPaint.filter(row=>row[0]==="fill"),[["fill","#fff5e1"]],"crossing removes guidance immediately");
});


test("mobile reverse steers independently, can brake, and clears on cancellation",async()=>{
  const app=shell(); await app.started;
  app.get("start").emit("click");
  app.mission({driving:true});
  app.advance();
  const reverse=app.get("reverse"), power=app.get("power"), brake=app.get("brake"), wheel=app.get("wheel");
  wheel.emit("pointerdown",{pointerId:1,clientX:0,clientY:0});
  wheel.emit("pointermove",{pointerId:1,clientX:30,clientY:0});
  power.emit("pointerdown",{pointerId:2});
  reverse.emit("pointerdown",{pointerId:3});
  brake.emit("pointerdown",{pointerId:4});
  app.advance();
  assert(app.ticks.at(-1)[1]>0);
  assert.deepEqual(app.ticks.at(-1).slice(2,4),[-1,1]);
  assert.equal(app.get("brake-caption").textContent,"Brake");
  reverse.emit("pointercancel",{pointerId:3});
  app.advance();
  assert.deepEqual(app.ticks.at(-1).slice(2,4),[1,1]);
  app.window.screen.orientation.emit("change");
  app.advance();
  assert.deepEqual(app.ticks.at(-1).slice(1,4),[0,0,0]);
  assert.equal(reverse.dataset.held,"false");
});


test("leaving a car clears all pedals before the exit tick without losing stick or action",async()=>{
  const app=shell({cue:2}); await app.started;
  app.get("start").emit("click");
  app.mission({driving:true,exitOnAction:true});
  app.advance();
  const reverse=app.get("reverse"), power=app.get("power"), brake=app.get("brake"), wheel=app.get("wheel"), action=app.get("action");
  reverse.emit("pointerdown",{pointerId:1});
  power.emit("pointerdown",{pointerId:2});
  wheel.emit("pointerdown",{pointerId:3,clientX:0,clientY:0});
  wheel.emit("pointermove",{pointerId:3,clientX:30,clientY:0});
  action.emit("pointerdown",{pointerId:4});
  brake.emit("pointerdown",{pointerId:5});
  app.window.emit("keydown",{code:"Space"});
  app.advance();
  assert.deepEqual(app.ticks.at(-1).slice(2,4),[-1,1],"all pedals are initially active");
  action.emit("pointerup",{pointerId:4});
  app.advance();
  assert(app.ticks.at(-1)[1]>0,"exit preserves intentional steering on the same tick");
  assert(app.ticks.at(-1)[2]===0,"exit tick has no drive from pedals");
  assert.equal(app.ticks.at(-1)[3],2,"exit tick passes action without Brake");
  assert(!power.hasPointerCapture(2)&&!reverse.hasPointerCapture(1)&&!brake.hasPointerCapture(5));
  assert.equal(reverse.dataset.held,"false");
  assert.equal(power.dataset.held,"false");
  assert.equal(brake.dataset.held,"false");
  assert.equal(app.get("brake-caption").textContent,"Sprint");
  assert(wheel.hasPointerCapture(3));
  app.advance();
  assert(app.ticks.at(-1)[1]>0);
  assert(app.ticks.at(-1)[2]===0,"walking does not inherit either pedal");
  assert.equal(app.ticks.at(-1)[3],0,"walking does not inherit Brake or repeat exit");
  reverse.emit("pointerdown",{pointerId:6});
  assert(!reverse.hasPointerCapture(6),"a stale event cannot start a vehicle hold on foot");
});


test("repeated contacts are silent and Pier 8 boarding cues remain actionable",async()=>{
  const app=shell({cue:0}); await app.started;
  app.get("start").emit("click");
  app.mission({state:1,hit:5,hitSequence:1});
  app.advance();
  assert.equal(app.get("hint").hidden,true);
  assert.equal(app.get("hint").textContent,"");
  assert.equal(app.get("announce").textContent,"Reach Pier 8");
  app.mission({hit:5,hitSequence:2,cue:4});
  app.advance();
  assert.equal(app.get("hint").hidden,false);
  assert.equal(app.get("hint").textContent,"E · Board ferry");
  assert.equal(app.get("announce").textContent,"Board ferry");
  assert.equal(app.get("action").attributes.get("aria-label"),"Board ferry");
  app.mission({hit:4,hitSequence:3});
  app.advance();
  assert.equal(app.get("hint").textContent,"E · Board ferry");
  assert.equal(app.get("announce").textContent,"Board ferry");
  app.mission({state:2,cue:0});
  app.advance();
  assert.equal(app.get("announce").textContent,"Tape delivered");
  assert.equal(app.get("summary").textContent,"Tape delivered. You made it ashore.");
});
