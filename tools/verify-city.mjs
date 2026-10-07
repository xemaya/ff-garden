import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compileCity,cityCanOccupy,footprint,boxesOverlap,cityHeight} from '../src/city-plan.js';
import {compileTown} from '../src/layout.js';

const raw=JSON.parse(fs.readFileSync(new URL('../public/data/v4/workshops.json',import.meta.url))),city=compileCity(raw),original=compileTown(raw);
assert.equal(city.buildings.length,49);assert.equal(city.metrics.heroBuildings,8);assert.equal(city.metrics.courtyards,2);
assert.deepEqual(city.buildings.filter(b=>b.detail==='hero').map(({district,detail,y,...b})=>b),original.buildings,'Approved street geometry must remain unchanged');
assert.deepEqual(compileCity(raw).buildings,city.buildings,'Seeded assembly must be deterministic');
assert.notDeepEqual(compileCity(raw,{seed:1908}).buildings,city.buildings,'A different seed must change legal library selections');
for(let i=0;i<city.buildings.length;i++)for(let j=i+1;j<city.buildings.length;j++)assert.ok(!boxesOverlap(footprint(city.buildings[i]),footprint(city.buildings[j]),.08),`Building overlap ${i}/${j}`);
const graph=Object.fromEntries(Object.keys(city.nodes).map(id=>[id,[]]));let samples=0;
function sweep(points,label){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.05));for(let j=0;j<=steps;j++){const u=j/steps,x=a.x+(b.x-a.x)*u,z=a.z+(b.z-a.z)*u;assert.ok(cityCanOccupy(city,x,z,.32),`${label} blocked at ${x},${z}`);if(j){const prevZ=a.z+(b.z-a.z)*(j-1)/steps;assert.ok(Math.abs(cityHeight(x,z)-cityHeight(x,prevZ))<=.19,'Walking stair riser too high');}samples++;}}}
for(const road of city.roads){assert.deepEqual(road.points[0],city.nodes[road.a]);assert.deepEqual(road.points.at(-1),city.nodes[road.b]);graph[road.a].push(road.b);graph[road.b].push(road.a);sweep(road.points,road.id);}
const seen=new Set(['entry']),queue=['entry'];while(queue.length){for(const id of graph[queue.shift()])if(!seen.has(id)){seen.add(id);queue.push(id);}}
assert.equal(seen.size,Object.keys(city.nodes).length,'Every district and courtyard must connect to the street graph');
assert.equal(new Set(city.roads.map(r=>[r.a,r.b].sort().join('/'))).size,city.roads.length,'No duplicate edges');
assert.ok(city.roads.length-Object.keys(city.nodes).length+1>=3,'City must have loops, not just branches');
assert.deepEqual(city.tour[0],city.tour.at(-1),'Tour must return to the entry');sweep(city.tour,'loop');
for(const [id,v]of Object.entries(city.views))if(id!=='aerial')assert.ok(cityCanOccupy(city,v.position[0],v.position[2]),'Viewpoint blocked: '+id);
for(const c of city.colliders)assert.ok(!cityCanOccupy(city,c.x,c.z),'Collider center should block: '+c.id);
assert.ok(!cityCanOccupy(city,-100,0));assert.ok(!cityCanOccupy(city,0,-100));
const manifest=JSON.parse(fs.readFileSync(new URL('../public/data/v4/manifest.json',import.meta.url))),textureHashes=Object.fromEntries(Object.keys(manifest.assets).map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL('../public/assets/v3/'+name,import.meta.url))).digest('hex')]));assert.deepEqual(textureHashes,manifest.assets);
const report={passed:true,revision:city.revision,metrics:city.metrics,walkSamples:samples,allRoadsConnected:true,graphLoops:city.roads.length-Object.keys(city.nodes).length+1,allRoadsAndLoopSwept:true,approvedStreetPreserved:true,textureHashes,textureHashesUnchanged:true,assembly:'authored neighborhood graph plus deterministic modular placement; no fresh model inference',visualAcceptance:'requires browser review and user acceptance'};
fs.mkdirSync(new URL('../evidence/city-v1/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../evidence/city-v1/verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
