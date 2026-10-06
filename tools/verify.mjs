import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileTown,canOccupy,center,routeTo} from '../src/layout.js';
const raw=JSON.parse(fs.readFileSync(new URL('../public/data/town.json',import.meta.url),'utf8')),plan=compileTown(raw);
assert.equal(plan.buildings.length,8);assert.equal(new Set(plan.buildings.map(b=>b.kind)).size,8);assert.ok(plan.length>60&&plan.length<70);
assert.ok(Math.max(...plan.path.map(p=>p.x))-Math.min(...plan.path.map(p=>p.x))>3,'road must visibly bend');
for(let i=1;i<plan.path.length;i++){const a=plan.path[i-1],b=plan.path[i];for(let u=0;u<=1;u+=.02)assert.ok(canOccupy(plan,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,.28));}
assert.equal(new Set(plan.people.filter(p=>p.species).map(p=>p.species)).size,4);
for(const p of plan.people)assert.ok(!canOccupy(plan,p.x,p.z));
assert.ok(!canOccupy(plan,-1,-24),'fountain must block the player');
for(const b of plan.buildings)assert.ok(!canOccupy(plan,b.x-Math.sin(b.rotation)*b.depth/2,b.z-Math.cos(b.rotation)*b.depth/2));
for(const p of plan.props)assert.ok(!canOccupy(plan,p.x,p.z));
assert.ok(!canOccupy(plan,100,0));assert.ok(!canOccupy(plan,0,-100));
for(const stop of raw.stops){const i=plan.path.reduce((best,p,i)=>Math.abs(p.z-stop.z)<Math.abs(plan.path[best].z-stop.z)?i:best,0);assert.ok(routeTo(plan,plan.spawn,i));}
const assetReport=[];
for(const name of ['plaster','wood','pavers','roof-clay','roof-teal']){
 const data=fs.readFileSync(new URL('../public/assets/v3/'+name+'.png',import.meta.url));
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const width=data.readUInt32BE(16),height=data.readUInt32BE(20);assert.ok(width>=1024&&height>=1024);
 assetReport.push({name,width,height,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
for(const c of plan.colliders.filter(c=>c.id.startsWith('hero-pot-')))assert.ok(!canOccupy(plan,c.x,c.z),'hero planting must have real collision');
fs.writeFileSync(new URL('../evidence/hero-asset-verification.json',import.meta.url),JSON.stringify({passed:true,assets:assetReport,heroPotCollision:true,authoredLayout:true},null,2));
const report={passed:true,theme:'ff9-alexandria-crafted-corner',revision:3,authoredLayout:true,buildings:8,uniqueShopKinds:8,pathLength:plan.length,curvedRoute:true,sweptNavigation:true,buildingAndPropCollision:true,fountainCollision:true,boundaryProtection:true,allStopsReachable:true};
fs.writeFileSync(new URL('../evidence/navigation-verification.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
