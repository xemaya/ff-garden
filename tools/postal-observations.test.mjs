import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileRoyalLayout} from '../src/royal-layout.js';
import {observationSites,attachObservationSites,observationView,observationSummary} from '../src/postal-observations.js';
import {canOccupy} from '../src/layout.js';
import {createPostalJourney} from '../src/postal-journey.js';
const raw=JSON.parse(readFileSync(new URL('../public/data/royal-city.json',import.meta.url)));

test('three physical royal plaques leave the authored route and their viewing points open',()=>{
  const p=compileRoyalLayout(raw),sites=observationSites(p,'royal');assert.equal(sites.length,3);attachObservationSites(p,sites);
  for(const point of p.path)assert.ok(canOccupy(p,point.x,point.z,.3));
  for(const site of sites){assert(!canOccupy(p,site.position.x,site.position.z));assert.ok(canOccupy(p,site.position.x,site.position.z+1.5));}
  assert.deepEqual(observationSites(p,'residential'),[]);
});
test('observation requires proximity, a street view and looking toward the physical plaque',()=>{
  const p=compileRoyalLayout(raw),sites=observationSites(p,'royal'),site=sites[0],player={x:site.position.x,z:site.position.z+2,yaw:0};
  assert(observationView(sites,player,'street',[]).canObserve);assert(!observationView(sites,{...player,yaw:Math.PI},'street',[]).canObserve);
  for(const mode of ['map','study','transition'])assert.equal(observationView(sites,player,mode,[]),null);
  assert.equal(observationView(sites,{...player,z:player.z+4},'street',[]),null);
  assert(observationView(sites,player,'street',[site.id]).recorded);
});
test('observed stories persist once, leave commissions untouched, and remain optional at ending',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},j=createPostalJourney(storage),sites=observationSites(compileRoyalLayout(raw),'royal');
  for(const site of sites){assert(j.discover({id:site.id,near:true,streetMode:true}));assert(!j.discover({id:site.id,near:true,streetMode:true}));}
  assert.equal(j.snapshot().state,'available');const reload=createPostalJourney(storage),summary=observationSummary(reload.snapshot());assert.equal(summary.entries.length,3);assert(summary.entries.every(e=>e.text&&e.keepsake));assert.match(summary.text,/3处/);
  assert.match(observationSummary({discoveries:[]}).text,/邮路已经完整/);
  assert.equal(observationSummary({discoveries:['residential-window']}).entries[0].title,'窗台上的问候','older defined observations remain readable');
});
