// The order is Orbital's hud_code message contract. This module only renders English copy.
const matchSpeed="Tap thrust opposite your drift. Releasing thrust does not stop you.";
const holding="Holding station.";
const rails=["Airlock rail","Scaffold rail","Cargo brace"];
const initial="Use gentle forward thrust toward the lit rail. Counterthrust to slow.";
const approach=rail=>"Approach the "+rail.toLowerCase();
const findHatch=side=>["Return to the airlock",`Look ${side} to find the round hatch. Slow down before gripping.`,`Look ${side}`,`Look ${side} to find hatch`];
const messages=[
 (rail,showTouch)=>[approach(rail),initial,"Too far",showTouch?"Left half: thrust · Right half: look":"Drift to lit rail"],
 ["Pushing off","Push away from the rail, then pass underneath it.","Pushing off"],
 rail=>[rail+" secured","Open your hand to push away from the rail.","Release & push"],
 ["Gripping the rail","Your drift is arrested.","Grip rail"],
 rail=>[rail+" in reach","Grip to stop drifting.","Grip rail"],
 rail=>[approach(rail),"Look toward the lit rail.","Face rail","Look toward rail"],
 rail=>[approach(rail),"Tap thrust opposite your drift to slow down.","Slow down",null],
 ["Cargo lock in reach","Seat the pin. The amber indicator turns green.","Seat cargo lock"],
 ["Seating cargo pin","Holding the pin until it seats.","Seating pin"],
 ["Cargo lock secured","Pin seated. Release toward the blue alignment console.","Drift to align"],
 ["Clearing the lock","Drift right to the blue alignment console.","Clearing lock","Drift right"],
 ["Approach the alignment console","Move right toward the blue light, then counterthrust.","Out of reach","Drift right toward blue"],
 ["Taking the alignment handle",holding,"Gripping handle"],
 ["Alignment handle in reach","Slow enough to grip the blue handle.","Grip handle"],
 ["Match speed at the console",matchSpeed,"Counterthrust",null],
 ["Face the alignment console","Look toward its blue light to line up.","Aim at light","Look toward blue"],
 ["Alignment handle secured","Set the handle to lower the load into its shoes.","Set alignment"],
 ["Lowering cargo","The robot is guiding the load into the cradle.","Lowering cargo"],
 ["Cargo seated","Close the cradle keepers and release the robot grip.","Transfer cargo","Close keepers"],
 ["Closing cradle keepers","The cradle is securing the seated load.","Closing keepers","Closing keepers"],
 ["Opening robot grip","The cradle is locked. The robot can release the load.","Opening grip","Opening grip"],
 ["Cargo transfer complete","Release the console and return to the round airlock hatch.","Release & return"],
 ["Return to the airlock","Thrust toward the round hatch, then counterthrust to slow.","Out of reach","Drift to round hatch"],
 findHatch("right"),findHatch("left"),
 ["Taking the airlock handle",holding,"Gripping handle"],
 ["Airlock handle in reach","Grip the amber locking bar.","Grip hatch"],
 ["Match speed at the hatch",matchSpeed,"Counterthrust",null],
 ["Face the hatch handle","Look toward the amber handle.","Aim at handle","Look toward handle"],
 ["Airlock handle secured","Lift the locking bar into its upper detent.","Lock airlock"],
 ["Moving hatch bar","Holding the bar until it seats.","Locking hatch"],
 ["EVA complete","Outer hatch locked. Cargo is secured and the station has your confirmation.","Hatch locked"],
 ["Approach the amber rail","Tap forward thrust. Tap opposite thrust to slow down.","Grip rail"],
 ["Handrail in reach","Grip to stop drifting.","Grip rail"],
 ["Gripping the handrail","Your drift is arrested.","Grip rail"],
 ["Rail secured","Release the rail to push off.","Release & push"],
 ["Exercise complete","You pushed off. Reset to practice again.","Grip rail"],
 ["Low-perigee orbit","Reentry scenario. This orbit descends into the upper atmosphere. Use Coast ×120 to approach the interface.","Station not in this exercise","Observe the orbit with Coast ×120"],
 ["Separated from station","Velocity persists. Aim back toward the station and counterthrust, or coast at 120×.","Station out of reach","Counterthrust to return"],
 ["Separated from station","Coasting at 120×. Thrust resumes normal time.","Station out of reach","Thrust returns to 1×"],
 ["Atmosphere reached","120 km interface crossed. Watch the descent at ×24. Thrusters cannot arrest this entry.","Coasting through entry","120 km interface · ×24"],
 ["Robot arm clearing","The cradle is carrying the load. Wait for the robot arm to clear.","Arm clearing","Arm clearing"],
 ["Entry heating","Hot gas is forming along the flight path. Switch camera to see the wake.","Entry in progress","Plasma heating · ×24"],
 ["Suit lost","The unshielded suit exceeded its heating limit in this exercise. Reset to replay.","Reset to replay","Heating limit exceeded"],
 ["Ease toward the hatch","Use a short thrust pulse to close the last gap, then match speed.","Out of reach","Pulse toward the hatch"],
 ["Ease toward the console","Use a short thrust pulse to close the last gap, then match speed.","Out of reach","Pulse toward the console"],
 ["Descend below the rail","Thrust down to clear the rail before moving toward the next one.","Rail ahead","Thrust down"],
 ["Pass beneath the rail","Thrust forward beneath the rail, then rise toward the next one.","Rail ahead","Thrust forward"],
 ["Clear the end of the scaffold","Move away from the station to clear the end of the rail.","Scaffold ahead","Move outboard"],
 ["Pass the end of the scaffold","Move along the station past the end of the rail, then head for the hatch.","Scaffold ahead","Pass the rail end"],
 ["Level out to grip","Keep the handle in view while bringing your look closer to level. Let the suit settle.","Level out","Bring your look level"],
 ["Square up to the hatch","Keep facing the handle until the suit lines up with it.","Line up","Face the handle"]
];
const sections=["TRAINING 01 / HANDRAIL","EVA / 1 OF 3","EVA / 2 OF 3","EVA / 3 OF 3","EVA / CARGO ALIGNMENT","EVA / AIRLOCK RETURN","ORBIT / REENTRY"];
const arrow=["+","+","+","+","→","←","↑","↓"];
function counter(face){
 if(face&1)return "Aim below drift";
 if(face&2)return "Aim above drift";
 const along=face&4?"back":face&8?"forward":"",side=face&16?"left":face&32?"right":"";
 return "Thrust "+[along,side].filter(Boolean).join(" + ");
}
export function hudText(code,leg,showFirstLookHint,copyIntent){
 const entry=messages[code&63], aim=(code>>>6)&7, route=Boolean(code&512);
 let [objective,tip,action,short=""]=typeof entry==="function"?entry(rails[leg],showFirstLookHint):entry;
 if((code&63)===15&&aim>=4){
  action=["Look right","Look left","Look up","Look down"][aim-4];
 }
 if(copyIntent===1){
  const direction=code>>>19;
  short=counter(direction);
  if(direction&63){
   tip=(direction&3?short+", then thrust.":short+" to slow down.")+" Releasing thrust does not stop you.";
  }
 }
 if(copyIntent===2){
  const local=code>>>19;
  if(local&1)short="Aim down, then pulse";
  else if(local&2)short="Aim up, then pulse";
  else if(local&60)short=counter(local).replace("Thrust ","Pulse ");
  tip=short+". Use a short pulse, then match speed.";
 }
 if(copyIntent===3){tip="Propellant depleted. Existing drift continues.";short="Propellant depleted";}
 return {objective,tip,action,short,section:sections[(code>>>16)&7],
   aim:Boolean(aim),route,marker:route?(aim===4?"❯":"❮"):arrow[aim],
   interact:Boolean(code&1024),console:Boolean(code&2048),coast:Boolean(code&4096),far:Boolean(code&8192),burn:Boolean(code&32768)};
}

const flightStatuses=["FREE FLOAT","DRIFT","ANCHORED","TAKING HOLD","PUSHING OFF","THRUST","HULL CONTACT"];
export function flightStatusText(status){return flightStatuses[status];}

const equipmentNames=["","rail","rail","rail","cargo pin","console handle","hatch handle"];
const equipmentActions={
 "Grip rail":"grip it","Grip handle":"grip it","Grip hatch":"grip it",
 "Release & push":"release and push off","Seat cargo lock":"seat it",
 "Drift to align":"release and drift to the console","Set alignment":"lower the cargo",
 "Transfer cargo":"transfer the load","Release & return":"release and return to the hatch",
 "Lock airlock":"lock the hatch"
};
export function equipmentInstruction(action,id,touch){
 const name=equipmentNames[id],verb=equipmentActions[action];
 return name&&verb?(touch?"Tap":"Click")+" the highlighted "+name+" to "+verb+".":"";
}
