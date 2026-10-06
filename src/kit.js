import {makeCastStage} from './cast-stage.js';
// One style kit shared by every generated street. No texture or mesh file generation.
export const KIT_VERSION='ff9-crafted-corner-v3';
export const MODULES=Object.freeze({wall:'weathered-plaster',frame:'hewn-timber',door:'arched-wood',window:'recessed-leaded',roofs:['clay','teal'],bays:['none','octagonal'],awnings:['none','striped'],balconies:['none','timber'],chimneys:['none','tall-stone']});
export const CASES=[
 {id:'residential',label:'住宅巷',seed:431,brief:'生成一条安静的 FF9 风格王城住宅巷，恰好 6 栋建筑，至少 3 栋 home 或 inn，至少 3 栋有 timber 阳台，striped 雨棚不超过 2 栋。留出宽松建筑间隔。街宽 5.2–5.8 米。'},
 {id:'market',label:'集市街',seed:617,brief:'生成一条热闹的 FF9 风格王城集市街，恰好 10 栋建筑，至少 7 栋为 bakery、florist、cafe、books、toys 或 apothecary，至少 7 栋有 striped 雨棚。两侧位置错开。街宽 6.6–7.2 米。'},
 {id:'workshops',label:'工坊街',seed:823,brief:'生成一条 FF9 风格的书匠、药草与木玩具工坊街，恰好 8 栋建筑，至少 5 栋为 books、apothecary 或 toys，至少 3 栋有 octagonal 凸窗，至少 3 栋有 tall-stone 烟囱。街宽 5.9–6.4 米。'}
];
export function styleFingerprint(b){const a=b.assembly;return[a.stories,a.roof,a.bay,a.awning,a.balcony,a.chimney].join('/');}
const kinds=['bakery','florist','inn','toys','cafe','books','home','apothecary'];
function check(ok,message){if(!ok)throw new Error(message);}
function between(n,a,b,label){check(Number.isFinite(n)&&n>=a&&n<=b,`${label} must be ${a}..${b}`);}
export function validateSpec(spec,caseId){
 check(spec?.version===4,'version must be 4');check(spec.kit===KIT_VERSION,'wrong style kit');
 between(spec.road?.width,5.2,7.2,'road.width');between(spec.road?.bend,-2.5,2.5,'road.bend');between(spec.road?.sway,-.8,.8,'road.sway');
 check(Array.isArray(spec.buildings)&&spec.buildings.length>=6&&spec.buildings.length<=10,'6..10 buildings required');
 for(const [i,b] of spec.buildings.entries()){
  check(kinds.includes(b.kind),'unknown kind at '+i);check(['left','right'].includes(b.side),'unknown side at '+i);
  between(b.z,-8.5,23.5,'building z');between(b.width,4.6,6.5,'width');between(b.depth,3.8,5.3,'depth');between(b.setback,0,1.15,'setback');
  const a=b.assembly;check(a&&[2,3].includes(a.stories),'2 or 3 stories required');
  check(MODULES.roofs.includes(a.roof)&&MODULES.bays.includes(a.bay)&&MODULES.awnings.includes(a.awning)&&MODULES.balconies.includes(a.balcony)&&MODULES.chimneys.includes(a.chimney),'unknown assembly module at '+i);
  between(a.roofRise,2.8,4.2,'roofRise');check(!(a.bay==='octagonal'&&a.balcony==='timber'),'bay and balcony occupy the same facade; choose only one at '+i);
 }
 if(caseId){const c=CASES.find(c=>c.id===caseId);check(c,'unknown case');const bs=spec.buildings;
  if(caseId==='residential'){check(bs.length===6,'residential requires exactly 6 buildings');check(bs.filter(b=>['home','inn'].includes(b.kind)).length>=3,'residential needs 3 homes/inns');check(bs.filter(b=>b.assembly.balcony==='timber').length>=3,'residential needs 3 balconies');check(bs.filter(b=>b.assembly.awning==='striped').length<=2,'residential permits at most 2 awnings');between(spec.road.width,5.2,5.8,'residential width');}
  if(caseId==='market'){check(bs.length===10,'market requires exactly 10 buildings');check(bs.filter(b=>['bakery','florist','cafe','books','toys','apothecary'].includes(b.kind)).length>=7,'market needs 7 shops');check(bs.filter(b=>b.assembly.awning==='striped').length>=7,'market needs 7 awnings');between(spec.road.width,6.6,7.2,'market width');}
  if(caseId==='workshops'){check(bs.length===8,'workshops requires exactly 8 buildings');check(bs.filter(b=>['books','apothecary','toys'].includes(b.kind)).length>=5,'workshops needs 5 workshops');check(bs.filter(b=>b.assembly.bay==='octagonal').length>=3,'workshops needs 3 bays');check(bs.filter(b=>b.assembly.chimney==='tall-stone').length>=3,'workshops needs 3 chimneys');between(spec.road.width,5.9,6.4,'workshops width');}
 }
 const sides=['left','right'].map(s=>spec.buildings.filter(b=>b.side===s));check(sides.every(a=>a.length>=2),'both sides need buildings');
 check(new Set(spec.buildings.map(styleFingerprint)).size>=3,'need at least 3 distinct module combinations');return spec;
}
function corners(c){const co=Math.cos(c.rotation),si=Math.sin(c.rotation);return[-1,1].flatMap(x=>[-1,1].map(z=>({x:c.x+co*x*c.w/2+si*z*c.d/2,z:c.z-si*x*c.w/2+co*z*c.d/2})));}
function overlap(a,b){const aa=corners(a),bb=corners(b);for(const r of[a.rotation,b.rotation])for(const axis of[{x:Math.cos(r),z:-Math.sin(r)},{x:Math.sin(r),z:Math.cos(r)}]){const pa=aa.map(p=>p.x*axis.x+p.z*axis.z),pb=bb.map(p=>p.x*axis.x+p.z*axis.z);if(Math.max(...pa)+.08<Math.min(...pb)||Math.max(...pb)+.08<Math.min(...pa))return false;}return true;}
// Least-squares isotonic projection packs each roadside while preserving model
// order and minimizing displacement from its requested z positions.
export function packBuildings(spec){
 const result=spec.buildings.map(b=>({...b,requestedZ:b.z}));
 for(const side of['left','right']){
  const items=result.filter(b=>b.side===side).sort((a,b)=>b.z-a.z),offset=[0];
  for(let i=1;i<items.length;i++)offset.push(offset.at(-1)+(items[i-1].width+items[i].width)/2+1.0+Math.max(items[i-1].depth,items[i].depth)*.04*Math.abs(spec.road.bend));
  check(offset.at(-1)<=32,'street has insufficient length for chosen widths; use smaller widths');
  const blocks=[];items.forEach((b,i)=>{blocks.push({start:i,end:i,sum:b.z+offset[i],weight:1});while(blocks.length>1&&blocks.at(-2).sum/blocks.at(-2).weight<blocks.at(-1).sum/blocks.at(-1).weight){const last=blocks.pop(),prev=blocks.pop();blocks.push({start:prev.start,end:last.end,sum:prev.sum+last.sum,weight:prev.weight+last.weight});}});
  for(const block of blocks){const mean=Math.max(-8.5+offset.at(-1),Math.min(23.5,block.sum/block.weight));for(let i=block.start;i<=block.end;i++)items[i].z=mean-offset[i];}
 }
 return result;
}
export function compileStreet(spec,canOccupy){
 validateSpec(spec,spec.provenance?.caseId);
 const width=spec.road.width,curve=z=>spec.road.bend*Math.sin((30-z)/15)+spec.road.sway*Math.sin((30-z)/27),derivative=z=>-spec.road.bend/15*Math.cos((30-z)/15)-spec.road.sway/27*Math.cos((30-z)/27);
 const roadside=(z,side,d)=>{const k=derivative(z),s=Math.sqrt(1+k*k);return{x:curve(z)+side*d/s,z:z-side*k*d/s};};
 const colliders=[],buildings=packBuildings(spec).map((b,i)=>{
  const side=b.side==='left'?-1:1,front=roadside(b.z,side,width/2+.44+b.setback),rotation=Math.atan2(-side,side*derivative(b.z));
  const h=b.assembly.stories===3?8.45:6.05+(i%3)*.28;
  const v={...b,id:'building-'+i,x:front.x,z:front.z,routeZ:b.z,rotation,height:h,roof:b.assembly.roof==='clay'?'coral':'sage',wall:'cream',seed:(spec.provenance?.seed||17)+i*31};
  colliders.push({id:v.id,type:'box',x:v.x-Math.sin(rotation)*(v.depth/2-.15),z:v.z-Math.cos(rotation)*(v.depth/2-.15),w:v.width+.12,d:v.depth+.30,rotation});return v;
 });
 for(let i=0;i<colliders.length;i++)for(let j=i+1;j<colliders.length;j++)check(!overlap(colliders[i],colliders[j]),`buildings ${i} and ${j} overlap: keep same-side z separation greater than half their widths plus 1 meter, and account for street bend`);
 for(const b of buildings){const si=Math.sin(b.rotation),co=Math.cos(b.rotation),pots=b.kind==='florist'?Array.from({length:5},(_,i)=>({x:-b.width*.35+i*.54,z:.52})):b.kind==='bakery'?Array.from({length:2},(_,i)=>({x:b.width*.36,z:.6+i*.42})):[];pots.forEach((p,i)=>colliders.push({id:'hero-pot-'+b.id+'-'+i,type:'circle',x:b.x+co*p.x+si*p.z,z:b.z-si*p.x+co*p.z,r:.26}));}
 colliders.push({id:'fountain',type:'circle',x:-1,z:-24,r:2.2});
 const castStage=makeCastStage(),props=castStage.props,trees=[{x:7.6,z:-23,scale:1.4},{x:-9.2,z:-29.6,scale:1.25}],benches=castStage.benches;
 trees.forEach((p,i)=>colliders.push({id:'tree-'+i,type:'circle',x:p.x,z:p.z,r:.27*p.scale}));benches.forEach((p,i)=>colliders.push({id:'bench-'+i,type:'box',...p,x:p.x-.05*Math.sin(p.rotation),z:p.z-.05*Math.cos(p.rotation),w:1.8,d:.62}));
 for(const p of props)colliders.push(p.w?{id:p.id,type:'box',x:p.x,z:p.z,w:p.w,d:p.d,rotation:p.rotation}:{id:p.id,type:'circle',x:p.x,z:p.z,r:p.r});
 const people=castStage.people;people.forEach((p,i)=>colliders.push({id:'person-'+i,type:'circle',x:p.x,z:p.z,r:p.r}));
 for(const x of[-5.35,5.35])colliders.push({id:'royal-gate-'+x,type:'box',x,z:-15.4,w:1.2,d:1.6});
 const path=[];for(let z=30;z>=-13;z-=.3)path.push({x:curve(z),z});path.push({x:-1,z:-14},{x:1.5,z:-19},{x:2.8,z:-24},{x:3.2,z:-29},{x:2.2,z:-32.5});
 const stops=[{id:'entry',title:'街道入口',z:28},{id:'garden',title:'街道中段',z:5},{id:'square',title:'喷泉广场',z:-21},{id:'castle',title:'王城观景',z:-32}],ground=(x,z,r=.27)=>(z>=-15&&z<=33&&Math.abs(x-curve(z))<width/2+1.8-r)||Math.hypot(x+1,z+24)<12-r;
 const plan={...spec,buildings,colliders,trees,benches,people,path,stops,props,spawn:{x:curve(30),z:30},destination:path.at(-1),center:curve,roadside,roadWidth:width,onGround:ground,castStage};
 let length=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];length+=Math.hypot(a.x-b.x,a.z-b.z);for(let u=0;u<=1;u+=.02)check(canOccupy(plan,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,.30),`walking route blocked in segment ${i}; move buildings or attachments away from center`);}plan.length=length;return plan;
}
export function streetMetrics(spec,plan){return{buildings:spec.buildings.length,roadWidth:spec.road.width,roadBend:spec.road.bend,roadSway:spec.road.sway,pathLength:plan.length,combinations:new Set(spec.buildings.map(styleFingerprint)).size,bays:spec.buildings.filter(b=>b.assembly.bay==='octagonal').length,balconies:spec.buildings.filter(b=>b.assembly.balcony==='timber').length,awnings:spec.buildings.filter(b=>b.assembly.awning==='striped').length,chimneys:spec.buildings.filter(b=>b.assembly.chimney==='tall-stone').length,stories3:spec.buildings.filter(b=>b.assembly.stories===3).length,packedPlacements:plan.buildings.filter(b=>Math.abs(b.requestedZ-b.routeZ)>.01).length,maxPlacementShift:Math.max(...plan.buildings.map(b=>Math.abs(b.requestedZ-b.routeZ)))};}
