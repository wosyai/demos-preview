import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// Run-length encoded controls from a real Paris delivery; no recorded simulation state.
const controls = [
    [20,56],[8323264,1],[8323136,4],[8192064,1],[7995456,1],[7798848,1],[7536704,1],[7340096,1],[7077952,1],
    [6881344,1],[6619200,1],[6357056,1],[6094912,1],[5832768,1],[5570624,1],[5308480,1],[5046336,1],[4784192,1],
    [4522048,1],[4259904,1],[3997760,1],[3801152,1],[3539008,1],[3276864,1],[3080256,1],[2818112,1],[2621504,1],
    [2424896,1],[2228288,1],[2031680,1],[1835072,1],[1638464,1],[1441856,1],[1310784,1],[1114176,1],[983104,1],
    [852032,1],[720960,1],[589888,1],[458816,1],[393280,1],[262208,1],[196672,1],[131136,1],[65600,1],
    [64,1],[16711744,1],[16646208,1],[16580672,1],[16515136,2],[16449600,2],[16384064,2],[16252992,1],[16187456,1],
    [16121920,1],[16056384,1],[15990848,1],[15859776,2],[14221376,1],[14155840,1],[14090304,1],[14024768,2],[13959232,3],
    [13893696,9],[13959232,4],[14024768,2],[14090304,3],[14155840,2],[14221376,3],[14286912,1],[14286944,1],[14352480,3],
    [14418016,3],[14483552,2],[14549088,2],[14614624,3],[14680160,2],[14745696,2],[14811232,2],[14876768,2],[14942304,1],
    [15007840,2],[15073376,3],[15138912,3],[15204448,5],[15269984,8],[15204448,8],[15138912,5],[15073376,5],[15007840,5],
    [14942304,14],[15007840,5],[15073376,4],[32,68],[128,1],[0,1],[128,1],[20,56],[8323136,42],
    [8192064,1],[7864384,1],[7536704,1],[7209024,1],[6815808,1],[6488128,1],[6160448,1],[5832768,1],[5505088,1],
    [5177408,1],[4849728,1],[4587584,1],[4259904,1],[3997760,1],[3670080,1],[3407936,1],[3145792,1],[2883648,1],
    [2621504,1],[2359360,1],[2162752,1],[1900608,1],[1704000,1],[1507392,1],[1310784,1],[1114176,1],[983104,1],
    [786496,1],[655424,1],[524352,1],[393280,1],[262208,1],[196672,1],[65600,1],[64,1],[16711744,1],
    [16580672,1],[16515136,2],[16449600,1],[16384064,1],[16318528,2],[16252992,2],[16187456,3],[16121920,9],[16187456,4],
    [16252992,4],[16318528,5],[16384064,7],[16449600,57],[16482112,4],[16547648,5],[16613184,3],[16678720,2],[16744256,2],
    [32576,2],[98112,2],[163648,1],[229184,2],[294720,2],[360256,1],[425792,2],[491328,1],[556864,2],
    [622400,1],[687936,2],[753472,1],[819008,2],[884544,2],[950080,2],[1015616,3],[1079360,1],[1076544,1],
    [1073728,1],[1071168,1],[1068608,1],[1131584,1],[1129280,1],[1126976,1],[1124928,1],[1122880,1],[1121088,1],
    [1119552,1],[1052480,1],[1051456,1],[1050176,1],[1049152,1],[1048384,1],[1047616,1],[981568,1],[981056,1],
    [915008,1],[914496,1],[848704,2],[783168,2],[717632,1],[652096,1],[652352,1],[587072,1],[521792,1],
    [522048,1],[456768,1],[457024,1],[391744,2],[392000,1],[326464,1],[326720,2],[261184,2],[261440,3],
    [195904,11],[130368,46],[130112,27],[129856,18],[129600,12],[129344,9],[129088,7],[128832,5],[128576,4],
    [128832,2],[129088,2],[129344,9],[129088,4],[128832,3],[128576,6],[194112,1],[194368,6],[194112,2],
    [193856,1],[193344,1],[192832,1],[192064,1],[14461280,1],[14395744,1],[14396000,1],[14396512,1],[14397280,1],
    [14398048,1],[14399072,1],[14400096,1],[14401120,1],[14467680,1],[14468960,1],[14535776,1],[14602592,1],[14669152,1],
    [14735968,1],[14802528,1],[14869344,1],[14935904,1],[15002208,1],[15068768,1],[15200608,1],[15266912,1],[15333216,1],
    [15465056,1],[15531104,1],[15597152,1],[15663200,1],[15728992,1],[15794784,1],[15860576,1],[15926368,1],[15992160,1],
    [16057696,1],[16123488,1],[16189280,1],[16254816,1],[16320608,1],[16386144,1],[16451680,1],[16517472,2],[16583008,1],
    [16648800,2],[16714336,2],[16714080,1],[2400,1],[2144,1],[67680,4],[132960,2],[133216,4],[198752,3],
    [199008,3],[199264,4],[199392,1],
];
const module = new WebAssembly.Module(readFileSync(process.argv[2] ?? new URL("../flight.wasm", import.meta.url)));
const dt=1/30;
let engine, frame, geometry;
engine = new WebAssembly.Instance(module,{
    wasi_snapshot_preview1:{proc_exit(code){assert.fail("Wosy trap "+code);}},
    flight:{world(){},record(){},aircraft(_,length){ geometry=length; },frame(pointer,length) {
        frame=new Float32Array(engine.memory.buffer,pointer,length).slice();
    }}
}).exports;
engine._start();
function eye(f) {
    const rows=[[f[0],f[4],f[8],-f[12]],[f[1],f[5],f[9],-f[13]],[f[3],f[7],f[11],-f[15]]];
    return [0,1,2].map(i=>rows.reduce((sum,r)=>sum+r[i]*r[3]/r.slice(0,3).reduce((length,c)=>length+c*c,0),0));
}
const magnitude=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
for(const aspect of [.45,16/9]) {
    const tick=(input, duration=dt)=>engine.tick(duration,input,aspect);
    engine.select_view(0); engine.reset(1); tick(0,0);
    let j=0;
    for(const [cmd,count] of controls)for(let n=0;n<count;n++,j++) {
        if(j===803){engine.select_view(1);tick(0,0);}
        tick(cmd,j===310?0:dt);
        if(j===310)engine.cancel_drop();
    }
    assert.equal(j,882);
    assert.equal(frame[36],2,"the live Paris mail camera is visible before impact");
    let parcelFrames=0;
    for(let i=0;i<120&&frame[22]===0;i++) {
        const old=frame.slice();
        tick(24);
        if(old[36]===2) parcelFrames++;
        if(frame[22]===0) continue;
        assert(parcelFrames>30);
        assert.equal(old[36],2,"the preceding published frame follows the parcel");
        assert.equal(frame[22],4,"real diving flight hits Paris terrain outside the strip");
        assert.equal(frame[36],1,"the crash supersedes the parcel, not vice versa");
        const jump=magnitude(eye(old),eye(frame));
        assert(jump<.001,"first wreck frame preserves the published parcel eye; jump was "+jump+" m");
        assert.deepEqual(frame.slice(0,16),old.slice(0,16),"orientation and projection are unchanged at handoff");
        const first=frame.slice(0,16), firstGeometry=geometry;
        tick(0,0);
        assert.deepEqual(frame.slice(0,16),first,"zero-duration render cannot consume the handoff");
        assert.equal(geometry,firstGeometry,"the first intact airframe persists on a zero-duration render");
        let travelled=0,previous=eye(frame);
        for(let k=0;k<13;k++) {
            tick(0);
            const next=eye(frame);
            const step=magnitude(next,previous);
            assert(step<10,"camera eases rather than snapping to wreck: "+step+" m");
            travelled+=step;
            previous=next;
        }
        assert(travelled>25,"the camera reaches the moving wreck instead of remaining at the parcel");
    }
    assert.equal(frame[22],4);
    for(let i=0;i<340&&frame[36]!==0;i++)tick(0);
    assert.equal(frame[36],0,"the result becomes retryable after the wreck settles");
    engine.reset(1); tick(0,0);
    assert.equal(frame[22],0);
    assert.equal(frame[36],0,"retry cannot reuse the old parcel camera");
}
console.log("Flying Low: desktop and portrait preserve the live parcel camera through a real interrupted crash.");
