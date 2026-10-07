import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compileCity} from '../src/city-plan.js';
import {addRoyalColliders} from '../src/royal-plan.js';
import {makeCityLifeSpecs,createCityLife} from '../src/city-life.js';
import {canOccupy} from '../src/layout.js';
const raw=JSON.parse(fs.readFileSync(new URL('../public/data/v4/workshops.json',import.meta.url))),plan=addRoyalColliders(compileCity(raw)),recipe=makeCityLifeSpecs(plan);
assert.equal(recipe.specs.filter(s=>s.role==='patrol').length,10);assert.equal(recipe.specs.filter(s=>s.kind==='npc').length,18);assert.equal(recipe.specs.length,33);
function actors(){return new Map(recipe.specs.map(s=>[s.id,{root:{position:{x:0,y:0,z:0},rotation:{y:0},scale:{y:1}},play(name){this.clip=name;},update(){}}]));}
const life=createCityLife(plan,actors()),visitor={x:0,z:30};let minimum=Infinity,maxHop=0;const checkpoints=[];
for(let frame=0;frame<10800;frame++){
 life.update(1/30,visitor);const snap=life.snapshot();
 for(const a of life.agents){const p=a.actor.root.position;assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(canOccupy(recipe.environment,p.x,p.z,a.r),a.id+' entered static obstacle');const c=life.plan.colliders.find(c=>c.id===a.id);assert.ok(Math.abs(c.x-p.x)<1e-8&&Math.abs(c.z-p.z)<1e-8,'Moving collider stale');maxHop=Math.max(maxHop,a.hop);}
 if(frame%6===0)for(let i=0;i<life.agents.length;i++)for(let j=i+1;j<life.agents.length;j++){const a=life.agents[i],b=life.agents[j],pa=a.actor.root.position,pb=b.actor.root.position,d=Math.hypot(pa.x-pb.x,pa.z-pb.z)-a.r-b.r;minimum=Math.min(minimum,d);assert.ok(d>=.06,'Resident overlap: '+a.id+'/'+b.id);}
 if(frame%1800===1799)checkpoints.push({seconds:(frame+1)/30,patrolProgress:snap.agents[0].routeProgress});
}
const result=life.snapshot(),troop=result.agents.filter(a=>a.role==='patrol');assert.ok(troop.every(a=>Math.abs(a.routeProgress-troop[0].routeProgress)<.01),'Squad separated');assert.ok(troop[0].routeProgress>recipe.patrol.length*1.8,'Patrol must repeatedly traverse the loop, not freeze at its join');assert.ok(maxHop>.15);assert.ok(result.agents.filter(a=>a.kind==='npc').every(a=>a.routeProgress>30),'Pedestrians must make sustained progress');assert.ok(result.agents.find(a=>a.kind==='chocobo').routeProgress>80);
const before=life.snapshot();life.setActive(false);for(let i=0;i<30;i++)life.update(.03,visitor);assert.deepEqual(life.snapshot().agents,before.agents,'Pause must freeze all residents');life.setActive(true);life.update(.05,visitor);assert.ok(life.snapshot().time>before.time);
const reduced=createCityLife(plan,actors(),{reduced:true}),still=reduced.snapshot();reduced.update(1,visitor);assert.deepEqual(reduced.snapshot(),still,'Reduced motion default must remain still');reduced.setActive(true);reduced.update(.05,visitor);assert.ok(reduced.snapshot().time>0);
const report={passed:true,simulatedSeconds:360,people:33,additionalRoyalCharacters:3,counts:recipe.counts,minimumCircleClearance:minimum,maximumHop:maxHop,patrolLoop:recipe.patrol.length,patrolCheckpoints:checkpoints,pauseAndReducedMotionPassed:true,final:result,scope:'authored routes, local avoidance and reserved patrol corridor; horizontal circle proxies and prescribed ground heights, not physical cloth, foot IK or arbitrary-crowd proof'};
fs.writeFileSync(new URL('../evidence/city-life/verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(new URL('../evidence/city-life/recipe.json',import.meta.url),JSON.stringify({counts:recipe.counts,specs:recipe.specs},null,2)+'\n');console.log({passed:true,minimumClearance:minimum,hop:maxHop,checkpoints});
