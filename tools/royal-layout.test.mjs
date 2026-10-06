import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileRoyalLayout,mapProjection,royalLocation,royalScenerySpec} from '../src/royal-layout.js';
import {canOccupy,routeTo,nearestPathIndex} from '../src/layout.js';
import {createPostalWorld} from '../src/postal-world.js';
const raw=JSON.parse(readFileSync(new URL('../public/data/royal-city.json',import.meta.url)));
const plan=()=>compileRoyalLayout(raw);
function clearSegment(p,a,b){const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.08);for(let i=0;i<=n;i++){const u=n?i/n:0;if(!canOccupy(p,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,.3))return false;}return true;}

test('actual royal route passes through gate, street, plaza and courtyard without collision',()=>{
  const p=plan();assert.ok(p.length>100&&p.length<120);assert.deepEqual(p.spawn,{x:0,z:48});assert.equal(p.destination.z,-55);
  for(let i=1;i<p.path.length;i++)assert.ok(clearSegment(p,p.path[i-1],p.path[i]),'route segment '+i);
  for(const stop of p.stops){const i=nearestPathIndex(p.path,{x:stop.x??p.center(stop.z),z:stop.z});const route=routeTo(p,p.spawn,i);assert.ok(route?.length>1);assert.ok(Math.abs(route.at(-1).z-stop.z)<.4);}
  assert.deepEqual([48,8,-24,-55].map(royalLocation),['听风城门','青瓦主街','风铃喷泉广场','王宫外庭']);
});
test('every ground architecture solid blocks the player while both real gateways remain open',()=>{
  const p=plan();assert.equal(p.structures.length,27);
  for(const s of p.structures){assert.ok(p.colliders.includes(s));assert.equal(canOccupy(p,s.x,s.z),false,s.id);}
  assert.ok(clearSegment(p,{x:0,z:48},{x:0,z:34}));assert.ok(clearSegment(p,{x:0,z:-34},{x:0,z:-55}));
  for(const point of[{x:23,z:0},{x:0,z:-60},{x:0,z:51},{x:6,z:48}])assert.equal(canOccupy(p,point.x,point.z),false);
  assert.ok(canOccupy(p,0,-58.5,.3),'courtyard reaches visible palace door');
});
test('all postal role approaches remain reachable from the royal entrance',()=>{
  const p=plan(),step=.5,key=(x,z)=>x+','+z,queue=[{x:0,z:96}],seen=new Set(['0,96']);
  for(let h=0;h<queue.length;h++)for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){const a=queue[h],b={x:a.x+dx,z:a.z+dz},k=key(b.x,b.z);if(seen.has(k)||!clearSegment(p,{x:a.x*step,z:a.z*step},{x:b.x*step,z:b.z*step}))continue;seen.add(k);queue.push(b);}
  for(const person of p.people){const view=person.view||{x:person.x+.68,z:person.z+(person.species==='moogle'?1.5:2.9)};assert.ok(canOccupy(p,view.x,view.z));const rounded={x:Math.round(view.x/step),z:Math.round(view.z/step)};assert.ok(seen.has(key(rounded.x,rounded.z)),person.species+' reachable');assert.ok(clearSegment(p,{x:rounded.x*step,z:rounded.z*step},view));}
  const world=createPostalWorld({plan:p,getActors:()=>({}),getCouriers:()=>[],getView:()=>({player:p.spawn,mode:'street'}),getFailed:()=>new Set()});
  for(const snapshot of[{chapter:0,state:'available'},{chapter:0,state:'carrying'},{chapter:1,state:'carrying'},{chapter:2,state:'carrying'}])assert.ok(world.currentTarget(snapshot).exists);
});
test('map fits actual walls, route, palace and all role targets within its padding',()=>{
  const p=plan(),m=mapProjection(p.bounds);assert.equal(m.xScale,m.zScale);
  for(const point of[...p.path,...p.people,...p.structures,...p.landmarks]){const x=m.ox+point.x*m.xScale,y=m.oy+point.z*m.zScale;assert.ok(x>=22&&x<=218);assert.ok(y>=22&&y<=298);}
  assert.equal(p.portal.href,'/?street=residential');assert.ok(canOccupy(p,p.portal.x,p.portal.z));
});

test('complete hill footprints stay outside royal bounds with space between scenery and playable ground',()=>{
 const p=plan();for(const h of royalScenerySpec(p.bounds)){const minX=h.x-h.r*h.sx,maxX=h.x+h.r*h.sx,minZ=h.z-h.r*h.sz,maxZ=h.z+h.r*h.sz;assert.ok(maxX<p.bounds.minX-8||minX>p.bounds.maxX+8||maxZ<p.bounds.minZ-8||minZ>p.bounds.maxZ+8,'hill must be fully outside city, not just its center');}
});

test('shop frontages, optional plaques and the keepsake table can reconnect to the entrance with final props present',async()=>{
 const {observationSites,attachObservationSites}=await import('../src/postal-observations.js'),{attachPostalMemorial,MEMORIAL_POSITION}=await import('../src/postal-memorial.js');
 const p=plan(),sites=observationSites(p,'royal');attachObservationSites(p,sites);attachPostalMemorial(p);
 const step=.5,key=(x,z)=>x+','+z,queue=[{x:0,z:96}],seen=new Set(['0,96']);
 for(let h=0;h<queue.length;h++)for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=queue[h],b={x:a.x+dx,z:a.z+dz},k=key(b.x,b.z);if(seen.has(k)||!clearSegment(p,{x:a.x*step,z:a.z*step},{x:b.x*step,z:b.z*step}))continue;seen.add(k);queue.push(b);}
 const points=[...p.buildings.map(b=>({label:b.name,x:b.x+Math.sin(b.rotation)*2,z:b.z+Math.cos(b.rotation)*2})),...sites.map(s=>({label:s.id,x:s.position.x,z:s.position.z+1.5})),{label:'keepsake table',x:MEMORIAL_POSITION.x,z:MEMORIAL_POSITION.z+1.5},...[-1,1].flatMap(side=>[{label:'wall edge '+side,x:side*20,z:-32},{label:'courtyard side '+side,x:side*6,z:-54}])];
 for(const point of points){assert(canOccupy(p,point.x,point.z,.3),point.label+' clear');const rounded={x:Math.round(point.x/step),z:Math.round(point.z/step)};assert(seen.has(key(rounded.x,rounded.z)),point.label+' connected');assert(clearSegment(p,{x:rounded.x*step,z:rounded.z*step},point),point.label+' fine approach');}
});
