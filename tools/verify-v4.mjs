import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {compileTown,canOccupy,routeTo,nearestPathIndex} from '../src/layout.js';import {CASES,validateSpec,streetMetrics,styleFingerprint,packBuildings,KIT_VERSION} from '../src/kit.js';
const summary=JSON.parse(fs.readFileSync(new URL('../evidence/v4/generation-summary.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync(new URL('../public/data/v4/manifest.json',import.meta.url)));
assert.ok(summary.passed&&summary.assetsUnchanged);assert.equal(summary.newImageGenerationCalls,0);assert.equal(manifest.streets.length,3);assert.equal(manifest.kit,KIT_VERSION);
assert.equal(summary.resource.stopped.ownedProcessRemaining,null);assert.deepEqual(summary.resource.missingSharedPids,[]);
const actualAssets=Object.fromEntries(Object.keys(manifest.assets).map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL('../public/assets/v3/'+name,import.meta.url))).digest('hex')]));assert.deepEqual(actualAssets,manifest.assets);assert.deepEqual(actualAssets,summary.assetsBefore);
const records=[],signatures=[],combos=new Set();
for(const c of CASES){const spec=JSON.parse(fs.readFileSync(new URL('../public/data/v4/'+c.id+'.json',import.meta.url)));validateSpec(spec,c.id);const plan=compileTown(spec);
 assert.equal(spec.provenance.source,'qwen3-4b-instruct-2507-q4_k_m');assert.equal(spec.provenance.training,'none');assert.equal(spec.provenance.newImageGenerationCalls,0);
 // Independent swept navigation check at a finer step than compile-time validation.
 for(let i=1;i<plan.path.length;i++){const a=plan.path[i-1],b=plan.path[i];for(let u=0;u<=1;u+=.01)assert.ok(canOccupy(plan,a.x+(b.x-a.x)*u,a.z+(b.z-a.z)*u,.30),c.id+' route collision');}
 for(const collider of plan.colliders)assert.ok(!canOccupy(plan,collider.x,collider.z),c.id+' collider center must block');
 for(const stop of plan.stops)assert.ok(routeTo(plan,plan.spawn,nearestPathIndex(plan.path,{x:plan.center(stop.z),z:stop.z})));
 assert.ok(!canOccupy(plan,100,0));assert.ok(!canOccupy(plan,0,-100));
 assert.deepEqual(packBuildings(spec),packBuildings(spec),'deterministic packing');
 const again=compileTown(spec);assert.deepEqual(plan.buildings,again.buildings,'stable realization');
 assert.deepEqual(spec.realization.positions,plan.buildings.map(b=>({id:b.id,side:b.side,requestedZ:b.requestedZ,realizedZ:b.routeZ,x:b.x,z:b.z})));
 const metrics=streetMetrics(spec,plan);for(const b of spec.buildings)combos.add(styleFingerprint(b));
 signatures.push(JSON.stringify(plan.buildings.map(b=>[b.kind,b.side,b.routeZ,b.width,b.depth,b.setback,styleFingerprint(b)])));
 const attempts=JSON.parse(fs.readFileSync(new URL('../evidence/v4/'+c.id+'-attempts.json',import.meta.url)));assert.deepEqual(JSON.parse(attempts.attempts.at(-1).content).buildings,spec.buildings,'no manual replacement of model recipes/positions');
 records.push({id:c.id,...metrics,sweptRoute:true,allStopsReachable:true,modelOutputPreserved:true});
}
assert.equal(new Set(signatures).size,3);assert.deepEqual(records.map(r=>r.buildings),[6,10,8]);assert.equal(new Set(records.map(r=>r.roadWidth)).size,3);assert.ok(combos.size>=5);
const report={passed:true,kit:KIT_VERSION,newImageGenerationCalls:0,textureHashesUnchanged:true,distinctStreets:3,distinctAssemblyCombinations:combos.size,records,resourceStopped:true,sharedProcessesPreserved:true,placement:'model requests plus deterministic constraint packing',humanStyleAcceptance:'pending comparison'};
fs.writeFileSync(new URL('../evidence/v4/verification.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
