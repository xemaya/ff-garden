import {compileTown,canOccupy} from './layout.js';

export const CITY_REVISION='royal-neighborhoods-v1';
const point=(x,z)=>({x,z});
export function cityHeight(x,z){
  if(z>=-38)return 0;
  if(z>-40)return Math.floor((-38-z)/.25)*.18125;
  if(z>=-51)return 1.45;
  if(z>-53)return 1.45+Math.floor((-51-z)/.25)*.18125;
  return 2.9;
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-u*dx,p.z-a.z-u*dz);}
export function footprint(b){const r=b.rotation||0;return{id:b.id,type:'box',x:b.x-Math.sin(r)*b.depth/2,z:b.z-Math.cos(r)*b.depth/2,w:b.width+.12,d:b.depth+.12,rotation:r};}
export function rectCorners(c){const co=Math.cos(c.rotation||0),si=Math.sin(c.rotation||0);return[-1,1].flatMap(x=>[-1,1].map(z=>point(c.x+co*x*c.w/2+si*z*c.d/2,c.z-si*x*c.w/2+co*z*c.d/2)));}
export function boxesOverlap(a,b,gap=0){const aa=rectCorners(a),bb=rectCorners(b);for(const r of[a.rotation||0,b.rotation||0])for(const axis of[point(Math.cos(r),-Math.sin(r)),point(Math.sin(r),Math.cos(r))]){const pa=aa.map(p=>p.x*axis.x+p.z*axis.z),pb=bb.map(p=>p.x*axis.x+p.z*axis.z);if(Math.max(...pa)+gap<Math.min(...pb)||Math.max(...pb)+gap<Math.min(...pa))return false;}return true;}

export function compileCity(raw,{seed=1907}={}){
  const street=compileTown(raw),nodes={},roads=[],buildings=street.buildings.map(b=>({...b,district:'workshops',detail:'hero',y:0}));
  function node(id,x,z){nodes[id]=point(x,z);}
  node('arrival',0,46);node('entry',street.center(31),31);node('west-entry',-19,31);node('east-entry',20,31);
  node('workshops-north',street.center(23),23);node('workshops-mid',street.center(4),4);node('market-mid',-19,4);node('market-court',-19,.2);node('herb-door',-12.8,4);node('herb-court',-12.8,.2);node('weavers-entry',10.4,31);node('weavers-court',10.4,23);node('main-cross',street.center(-12),-12);node('west-cross',-19,-12);node('east-cross',20,-12);
  node('west-square',-19,-29);node('east-square',20,-29);node('square-west',-8,-32);node('square-east',7.5,-32);node('square',2.2,-32.5);
  node('upper-west',-17,-49);node('upper-east',17,-49);node('upper-center',0,-49);
  node('royal-west',-17,-62);node('royal-east',17,-62);node('royal-center',-1,-62);node('royal-gate',-1,-65);
  function road(id,a,b,width,via=[]){roads.push({id,a,b,width,points:[nodes[a],...via.map(p=>point(...p)),nodes[b]]});}
  road('arrival','arrival','entry',6.2);road('entry-west','entry','west-entry',5.2);road('entry-weavers','entry','weavers-entry',5.2);road('entry-east','weavers-entry','east-entry',5.2);
  for(const [a,b]of[['entry','workshops-north'],['workshops-north','workshops-mid'],['workshops-mid','main-cross']]){const points=[];for(let z=nodes[a].z-1;z>nodes[b].z;z-=1)points.push([street.center(z),z]);road('workshops-'+a,a,b,street.roadWidth,points);}
  road('market-north','west-entry','market-mid',4.8);road('market-court','market-mid','market-court',4.8);road('market-south','market-court','west-cross',4.8);road('residential','east-entry','east-cross',4.6);
  road('cross-west','main-cross','west-cross',4.1);road('cross-east','main-cross','east-cross',4.1);
  road('market-square','west-cross','west-square',4.8);road('homes-square','east-cross','east-square',4.6);
  road('square-west','west-square','square-west',4.0,[[-14,-32]]);road('square-east','east-square','square-east',4.0,[[14,-32]]);
  road('plaza-west','square-west','square',3.4);road('plaza-east','square-east','square',3.4);
  // Preserve the approved clear path through the fountain staging.
  road('plaza-main','main-cross','square',4.0,[[street.center(-13),-13],[-1,-14],[1.5,-19],[2.8,-24],[3.2,-29]]);
  road('royal-ascent','square','upper-center',5.0,[[0,-35]]);road('royal-axis','upper-center','royal-center',5.0);road('royal-gate','royal-center','royal-gate',5.0);
  road('west-ascent','west-square','upper-west',4.2,[[-17,-35]]);road('east-ascent','east-square','upper-east',4.2,[[17,-35]]);
  road('upper-cross-west','upper-west','upper-center',4.0);road('upper-cross-east','upper-center','upper-east',4.0);
  road('upper-west','upper-west','royal-west',4.2);road('upper-east','upper-east','royal-east',4.2);
  road('royal-cross-west','royal-west','royal-center',4.0);road('royal-cross-east','royal-center','royal-east',4.0);
  const courtyards=[{id:'herb-court',x:-12.8,z:.2,w:8.0,d:6.1,y:0},{id:'weavers-court',x:10.4,z:22,w:3.5,d:8.2,y:0}];
  road('herb-entry','workshops-mid','herb-door',1.6);road('herb-passage','herb-door','market-mid',1.6);road('herb-court','herb-door','herb-court',2.0);road('herb-market','herb-court','market-court',2.0);
  road('weavers-door','workshops-north','weavers-court',2.7);road('weavers-passage','weavers-court','weavers-entry',2.7);
  function add(district,x,z,rotation,index,kind){const n=buildings.length,styles=['clay','teal','clay','clay','teal'];const stories=(index+seed)%5===0?3:2,width=5.6+(index%3)*.35,depth=Math.abs(x)>20||district==='arrival'?7.0+(index%2)*.4:(district==='market'&&x===-16&&[2,3].includes(index)?4.4:5.6+(index%2)*.2);
    buildings.push({id:'city-'+n,district,detail:'urban',x,z,y:cityHeight(x,z),rotation,width,depth,height:stories===3?8.1:6.0+(index%3)*.27,kind:kind||(['home','inn','home','cafe'][index%4]),seed:seed+n*37,assembly:{stories,roof:styles[(index+seed)%5],roofRise:2.8+(index%4)*.28,bay:index%5===1&&!(district==='residential'&&index%3===0)?'octagonal':'none',awning:district==='market'&&index%3!==1?'striped':'none',balcony:district==='residential'&&index%3===0?'timber':'none',chimney:index%3===1?'tall-stone':'none'}});
  }
  for(const [district,x,rotation] of[['market',-16, -Math.PI/2],['market',-22.5,Math.PI/2],['residential',17,Math.PI/2],['residential',23.3,-Math.PI/2]])for(let i=0;i<5;i++){if(x===-16&&i===3)continue;add(district,x,23-i*7.6,rotation,i,district==='market'?['bakery','florist','cafe','books','apothecary'][i]:'home');}
  for(const side of[-1,1])for(let i=0;i<2;i++)add(side<0?'market':'residential',side<0?-22.5:23.3,-20-i*7.7,side<0?Math.PI/2:-Math.PI/2,i+5);
  for(const x of[-24,-16,-8,8,16,24])add('arrival',x,36,Math.PI,Math.abs(x)/8,'inn');
  for(const z of[-43.9,-56.9])for(const side of[-1,1])for(const outer of[false,true])add('upper',side*(outer?20.3:13.6),z,side*(outer?-1:1)*Math.PI/2,Math.round(Math.abs(z))+Number(outer),outer?'home':'inn');
  for(const z of[-46.6,-59.8])for(const side of[-1,1]){add('upper',side*5.15,z,Math.PI,3,'home');const b=buildings.at(-1);Object.assign(b,{width:4.7,depth:5.7,height:8.1});Object.assign(b.assembly,{stories:3,roofRise:3.2,bay:'none',balcony:'none'});}
  const trees=[...street.trees,{x:-10.15,z:2.1,scale:.38},{x:10.4,z:19.6,scale:.64},{x:-29,z:22,scale:.8},{x:29.8,z:-18,scale:.82}];
  const props=[...street.props,{id:'market-bread',kind:'breadCart',x:-21.15,z:22,r:.65,seed:761,rotation:0},{id:'market-flowers',kind:'flowerCart',x:-21.10,z:14,r:.68,seed:763,rotation:.2},{id:'court-herbs',kind:'flowerPot',x:-10.65,z:2.65,r:.26,seed:769,rotation:0},{id:'court-post',kind:'postBox',x:-9.3,z:2.5,r:.40,seed:767,rotation:0}];
  const people=[...street.people,{x:-17.6,z:20,species:'moogle',facing:-.7,r:.36,role:'market-postal'},{x:21.4,z:9.2,species:'mage',facing:1.1,r:.38,role:'neighbor'}];
  const courtyardPlanters=[];for(const c of courtyards)if(c.id==='herb-court'){for(const side of[-1,1])for(const end of[-1,1])courtyardPlanters.push({x:c.x+side*c.w*.32,z:c.z+end*c.d*.42,w:2.1,d:.4});}else for(const side of[-1,1])for(const z of[20,25.3])courtyardPlanters.push({x:c.x+side*c.w*.44,z,w:.35,d:1.5});
  const benches=[...street.benches,{x:-12.5,z:-1.65,rotation:.12}];
  const colliders=[...street.colliders,...buildings.filter(b=>b.detail!=='hero').map(footprint)];
  for(const p of props.slice(street.props.length))colliders.push({id:p.id,type:'circle',x:p.x,z:p.z,r:p.r});
  for(const [i,t]of trees.slice(street.trees.length).entries())colliders.push({id:'city-tree-'+i,type:'circle',x:t.x,z:t.z,r:.27*t.scale});
  for(const [i,p]of people.slice(street.people.length).entries())colliders.push({id:'city-neighbor-'+i,type:'circle',x:p.x,z:p.z,r:p.r});
  for(const [x,z,w]of[[-19,27.5,4.6],[20,27.5,4.5],[0,46.8,6.5]])for(const side of[-1,1])colliders.push({id:`arch-${x}-${side}`,type:'box',x:x+side*(w/2+.35),z,w:.70,d:.85,rotation:0});
  courtyardPlanters.forEach((c,i)=>colliders.push({id:'court-planter-'+i,type:'box',...c,rotation:0}));
  colliders.push({id:'court-bench',type:'box',x:-12.5,z:-1.65,w:1.8,d:.62,rotation:.12});
  for(const [x,z,w,d]of[[-31.2,11,1,24],[32,10,1,26]])colliders.push({id:`garden-${x}`,type:'box',x,z,w,d,rotation:0});
  for(const start of[-38,-51])for(const [x,w]of[[-26,13],[-8.3,9.3],[8.3,9.3],[26,13]])colliders.push({id:`terrace-${start}-${x}`,type:'box',x,z:start-.06,w,d:.4,rotation:0});
  for(const start of[-38,-51])for(const x of[-20,-14,-3.4,3.4,14,20])colliders.push({id:`stair-rail-${start}-${x}`,type:'box',x,z:start-1,w:.34,d:2.3,rotation:0});
  const onGround=(x,z,r=.3)=>{
    if(x<-31+r||x>32-r||z<-66+r||z>48-r)return false;
    if(street.onGround(x,z,r))return true;
    if(courtyards.some(c=>Math.abs(x-c.x)<c.w/2-r&&Math.abs(z-c.z)<c.d/2-r))return true;
    return roads.some(road=>road.points.slice(1).some((b,i)=>segmentDistance(point(x,z),road.points[i],b)<road.width/2+1.1-r));
  };
  const plan={revision:CITY_REVISION,seed,street,nodes,roads,buildings,courtyards,courtyardPlanters,benches,trees,props,people,colliders,onGround,height:cityHeight};
  const tourNodes=['entry','workshops-north','workshops-mid','main-cross','west-cross','market-court','market-mid','west-entry','entry','weavers-entry','east-entry','east-cross','east-square','square-east','square','upper-center','royal-center','royal-west','upper-west','west-square','square-west','square','main-cross','workshops-mid','workshops-north','entry'];
  const tour=[];
  for(let i=1;i<tourNodes.length;i++){const a=tourNodes[i-1],b=tourNodes[i],road=roads.find(r=>(r.a===a&&r.b===b)||(r.a===b&&r.b===a));if(!road)throw new Error('Missing city route '+a+'→'+b);const points=road.a===a?road.points:[...road.points].reverse();if(!tour.length)tour.push(points[0]);tour.push(...points.slice(1));}
  plan.tour=tour;plan.spawn={...nodes.entry};plan.views={
    aerial:{position:[43,46,69],target:[0,11,-33],label:'王城全景'},
    street:{position:[street.center(30),1.7,30],target:[street.center(16),2.3,16],label:'工坊主街'},
    market:{position:[-19,1.7,29],target:[-19,2.1,13],label:'集市巷'},
    residential:{position:[20,1.7,26],target:[20,2.3,12],label:'住宅巷'},
    courtyard:{position:[-15.3,1.7,1.3],target:[-10.6,1.1,-.4],label:'药草小院'},
    square:{position:[1.5,1.7,-16.5],target:[-1,3.2,-29],label:'喷泉广场'},
    upper:{position:[0,cityHeight(0,-44)+1.7,-44],target:[-1,10,-67],label:'上城台阶'},
    castle:{position:[-1,cityHeight(-1,-59)+1.7,-59],target:[-1,29,-119],label:'王城观景'}
  };
  plan.metrics={buildings:buildings.length,heroBuildings:street.buildings.length,urbanBuildings:buildings.length-street.buildings.length,roads:roads.length,courtyards:courtyards.length,districts:new Set(buildings.map(b=>b.district)).size,tourLength:tour.slice(1).reduce((n,b,i)=>n+Math.hypot(b.x-tour[i].x,b.z-tour[i].z),0),newImageCalls:0,newModelCalls:0};
  return plan;
}
export function cityCanOccupy(plan,x,z,r=.3){return canOccupy(plan,x,z,r);}
