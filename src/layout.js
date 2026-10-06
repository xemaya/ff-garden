import {compileStreet} from './kit.js';
export function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function center(z){return 1.8*Math.sin((28-z)/10)+.7*Math.sin((28-z)/19);}
export function derivative(z){return -.18*Math.cos((28-z)/10)-.7/19*Math.cos((28-z)/19);}
export function roadside(z,side,distance){const k=derivative(z),s=Math.sqrt(1+k*k);return{x:center(z)+side*distance/s,z:z-side*k*distance/s};}
export function onGround(x,z,r=.27){return(z>=-15&&z<=33&&Math.abs(x-center(z))<8.8-r)||Math.hypot(x+1,z+24)<12-r||Math.hypot(x+7.7,z-4)<4.8-r;}
export function canOccupy(plan,x,z,r=.27){
  if(!Number.isFinite(x)||!Number.isFinite(z)||!(plan.onGround||onGround)(x,z,r))return false;
  for(const c of plan.colliders){
    if(c.type==='circle'){if(Math.hypot(x-c.x,z-c.z)<c.r+r)return false;}
    else{const co=Math.cos(c.rotation||0),si=Math.sin(c.rotation||0),dx=x-c.x,dz=z-c.z,lx=dx*co-dz*si,lz=dx*si+dz*co;const ox=Math.max(0,Math.abs(lx)-c.w/2),oz=Math.max(0,Math.abs(lz)-c.d/2);if(Math.hypot(ox,oz)<r)return false;}
  }
  return true;
}
export function compileTown(raw){
  if(raw?.version===4)return compileStreet(raw,canOccupy);
  if(!raw||!Array.isArray(raw.buildings)||raw.buildings.length!==8)throw new Error('街区需要八栋店铺与住宅');
  const colliders=[];
  const buildings=raw.buildings.map(b=>{
    if(!['bakery','florist','inn','toys','cafe','books','home','apothecary'].includes(b.kind)||!['left','right'].includes(b.side))throw new Error('未知店铺类型');
    for(const key of['z','width','height','depth'])if(!Number.isFinite(b[key]))throw new Error('建筑尺寸无效');
    const side=b.side==='left'?-1:1,front=roadside(b.z,side,raw.provenance?.revision>=3&&['bakery','florist'].includes(b.kind)?3.95:4.75),k=derivative(b.z),rotation=Math.atan2(-side,side*k);
    const entry={...b,x:front.x,z:front.z,routeZ:b.z,rotation};
    colliders.push({id:b.id,type:'box',x:entry.x-Math.sin(rotation)*b.depth/2,z:entry.z-Math.cos(rotation)*b.depth/2,w:b.width,d:b.depth,rotation});
    return entry;
  });
  const props=[];
  for(const b of raw.buildings){const side=b.side==='left'?-1:1,z=b.z+b.width*.30,p=roadside(z,side,3.65);const kind=b.kind==='florist'?'flowerCart':b.kind==='bakery'?'breadCart':b.kind==='cafe'?'cafeTable':b.kind==='toys'?'toyDisplay':'flowerPot';props.push({id:'prop-'+b.id,kind,...p,side,seed:b.seed+10});colliders.push({id:'prop-'+b.id,type:'circle',...p,r:kind==='flowerPot'?.43:.65});}
  if(raw.provenance?.revision>=3){
    for(let i=props.length-1;i>=0;i--)if(['prop-bakery','prop-flowers'].includes(props[i].id))props.splice(i,1);
    for(let i=colliders.length-1;i>=0;i--)if(['prop-bakery','prop-flowers'].includes(colliders[i].id))colliders.splice(i,1);
    for(const b of buildings.filter(b=>['bakery','florist'].includes(b.kind))){
      const c=colliders.find(c=>c.id===b.id),si=Math.sin(b.rotation),co=Math.cos(b.rotation);c.x+=si*.15;c.z+=co*.15;c.d+=.30;c.w+=.12;
      const pots=b.kind==='florist'?Array.from({length:5},(_,i)=>({x:-b.width*.35+i*.54,z:.52})):Array.from({length:2},(_,i)=>({x:b.width*.36,z:.6+i*.42}));
      pots.forEach((p,i)=>colliders.push({id:'hero-pot-'+b.id+'-'+i,type:'circle',x:b.x+co*p.x+si*p.z,z:b.z-si*p.x+co*p.z,r:.26}));
    }
  }
  colliders.push({id:'fountain',type:'circle',x:-1,z:-24,r:2.2});
  const trees=[{x:-8.0,z:4.1,scale:1.3},{x:-9.8,z:1.2,scale:.85},{x:7.6,z:-23,scale:1.4},{x:-9.2,z:-29.6,scale:1.25},{x:5.8,z:28.7,scale:.8}];
  trees.forEach((t,i)=>colliders.push({id:'tree-'+i,type:'circle',x:t.x,z:t.z,r:.27*t.scale}));
  const benches=[{x:-7.0,z:5.5,rotation:Math.PI/2},{x:-7.8,z:-22,rotation:Math.PI/2},{x:7.2,z:-28,rotation:-Math.PI/2}];
  benches.forEach((b,i)=>colliders.push({id:'bench-'+i,type:'box',x:b.x,z:b.z,w:1.8,d:.62,rotation:b.rotation}));
  const people=[
    {x:1.9,z:23.2,species:'mage',facing:0,r:.38},
    {x:-1.0,z:24.4,species:'moogle',facing:.20,r:.36},
    {x:-2.65,z:5.2,species:'ratfolk',facing:.4,r:.28},
    {x:5.0,z:-20.4,species:'chocobo',facing:-.6,r:.65},
    {x:5.6,z:20.0,color:'coral',hat:true},
    {x:-5.0,z:-29.7,color:'sage'},
    {x:-5.4,z:-27.8,species:'moogle',facing:1.0,r:.36},
    {x:4.8,z:-29.4,species:'mage',facing:-.5,r:.38}
  ];
  people.forEach((p,i)=>colliders.push({id:'person-'+i,type:'circle',x:p.x,z:p.z,r:p.r||.23}));
  for(const x of[-5.35,5.35])colliders.push({id:'royal-gate-'+x,type:'box',x,z:-15.4,w:1.2,d:1.6});
  const path=[];for(let z=30;z>=-13;z-=.3)path.push({x:center(z),z});
  path.push({x:-1,z:-14},{x:1.5,z:-19},{x:2.8,z:-24},{x:3.2,z:-29},{x:2.2,z:-32.5});
  const spawn={x:center(30),z:30};
  const plan={...raw,buildings,props,trees,benches,people,colliders,path,spawn,destination:path.at(-1)};
  let length=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];length+=Math.hypot(a.x-b.x,a.z-b.z);for(let u=0;u<=1;u+=.05)if(!canOccupy(plan,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u))throw new Error('游览路径被 '+i+' 段遮挡');}
  plan.length=length;return plan;
}
export function nearestPathIndex(path,point){let index=0,best=Infinity;path.forEach((p,i)=>{const d=Math.hypot(p.x-point.x,p.z-point.z);if(d<best){best=d;index=i;}});return index;}
export function routeTo(plan,from,targetIndex){
  const start=nearestPathIndex(plan.path,from),forward=targetIndex>=start;
  const path=forward?plan.path.slice(start,targetIndex+1):plan.path.slice(targetIndex,start+1).reverse();
  // The displayed stops use the same authored clear route. When a manual pose
  // cannot reconnect, return null instead of moving through an obstacle.
  const first=path[0];if(!first)return null;
  const n=Math.max(1,Math.ceil(Math.hypot(first.x-from.x,first.z-from.z)/.1));for(let i=0;i<=n;i++){const u=i/n;if(!canOccupy(plan,from.x+(first.x-from.x)*u,from.z+(first.z-from.z)*u))return null;}
  return [{...from},...path];
}
