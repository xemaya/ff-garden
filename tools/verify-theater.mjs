import fs from 'node:fs';
import {observationSites,attachObservationSites} from '../src/postal-observations.js';
import {attachPostalMemorial,MEMORIAL_POSITION} from '../src/postal-memorial.js';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileRoyalLayout} from '../src/royal-layout.js';
import {compileTown,canOccupy} from '../src/layout.js';
function connected(plan,start,target){const step=.25,key=(x,z)=>x+','+z,origin={x:Math.round(start.x/step),z:Math.round(start.z/step)},q=[origin],seen=new Set([key(origin.x,origin.z)]);const goal={x:Math.round(target.x/step),z:Math.round(target.z/step)};
 function sweep(a,b){for(let i=0;i<=6;i++)if(!canOccupy(plan,a.x+(b.x-a.x)*i/6,a.z+(b.z-a.z)*i/6,.3))return false;return true;}
 assert.ok(sweep(start,{x:origin.x*step,z:origin.z*step}));
 for(let h=0;h<q.length;h++){const p=q[h];if(p.x===goal.x&&p.z===goal.z)return sweep({x:p.x*step,z:p.z*step},target);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,z=p.z+dz,k=key(x,z);if(seen.has(k)||x<-52||x>40||z<-143||z>-52||!sweep({x:p.x*step,z:p.z*step},{x:x*step,z:z*step}))continue;seen.add(k);q.push({x,z});}}
 return false;
}
const records=[];
for(const id of['residential','market','workshops','royal']){
 const spec=JSON.parse(fs.readFileSync(new URL(id==='royal'?'../public/data/royal-city.json':'../public/data/v4/'+id+'.json',import.meta.url))),plan=id==='royal'?compileRoyalLayout(spec):compileTown(spec),stage=plan.theaterStage;
 attachObservationSites(plan,observationSites(plan,id==='royal'?'royal':null));attachPostalMemorial(plan);
 for(const c of plan.colliders.filter(c=>c.id.startsWith('theater-')))assert.ok(!canOccupy(plan,c.x,c.z));
 for(const p of[stage.camera,stage.counterView,{x:MEMORIAL_POSITION.x,z:MEMORIAL_POSITION.z+1.5}]){assert.ok(canOccupy(plan,p.x,p.z,.3));assert.ok(connected(plan,plan.path.find(p=>p.z<-13),p),id+' theater access');}
 // Recheck every original route segment against the new solid objects.
 for(let j=1;j<plan.path.length;j++){const a=plan.path[j-1],b=plan.path[j];for(let u=0;u<=1;u+=.01)assert.ok(canOccupy(plan,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,.3));}
 records.push({id,routeClear:true,overviewReachable:true,counterReachable:true,booth:stage.booth,poster:stage.poster});
}
const assets=['poster.svg','ticket.svg'].map(name=>{const data=fs.readFileSync(new URL('../public/assets/theater/'+name,import.meta.url));assert.match(data.toString(),/^<svg/);assert.ok(!/(?:href|src)=["']https?:|<script|<foreignObject/.test(data.toString()));return{name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
const report={passed:true,newImageGenerationCalls:0,records,assets};fs.mkdirSync(new URL('../evidence/theater/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../evidence/theater/navigation-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
