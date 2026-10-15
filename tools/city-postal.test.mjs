import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileCity,cityCanOccupy,CITY_POSTAL} from '../src/city-plan.js';
import {observationView} from '../src/postal-observations.js';
import {interactionRadius} from '../src/postal-world.js';
import {discoveries} from '../src/postal-content.js';

const raw=JSON.parse(fs.readFileSync(new URL('../public/data/v4/workshops.json',import.meta.url)));
const city=compileCity(raw);

// Walkable cells reachable from the entry on a 0.25 m grid.
function reachable(plan){const step=.25,key=(i,j)=>i+','+j,seen=new Set(),queue=[[Math.round(plan.spawn.x/step),Math.round(plan.spawn.z/step)]];seen.add(key(...queue[0]));
  while(queue.length){const[i,j]=queue.pop();for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=[i+di,j+dj],k=key(...n);if(seen.has(k))continue;const x=n[0]*step,z=n[1]*step;if(Math.abs(cityHeightStep(plan,x,z,i*step,j*step))>.19||!cityCanOccupy(plan,x,z,.3))continue;seen.add(k);queue.push(n);}}
  return(x,z)=>seen.has(key(Math.round(x/step),Math.round(z/step)));}
function cityHeightStep(plan,x,z,px,pz){return plan.height(x,z)-plan.height(px,pz);}
const canReach=reachable(city);
function standingSpots(x,z,maxDistance){const spots=[];for(let r=.8;r<=maxDistance;r+=.2)for(let a=0;a<24;a++){const px=x+Math.cos(a/24*Math.PI*2)*r,pz=z+Math.sin(a/24*Math.PI*2)*r;if(cityCanOccupy(city,px,pz,.3)&&canReach(px,pz))spots.push({x:px,z:pz});}return spots;}

test('the three story plaques stand in the city with a reachable, readable spot',()=>{
  const ids=discoveries.filter(d=>d.district==='royal').map(d=>d.id).sort();
  assert.deepEqual(city.postalSites.map(s=>s.id).sort(),ids);
  for(const site of city.postalSites){
    assert.deepEqual({x:site.position.x,z:site.position.z},{x:CITY_POSTAL.sites[site.id].x,z:CITY_POSTAL.sites[site.id].z});
    assert.ok(!cityCanOccupy(city,site.position.x,site.position.z),'plaque has a collider: '+site.id);
    const readable=standingSpots(site.position.x,site.position.z,2.8).filter(p=>{const yaw=Math.atan2(-(site.position.x-p.x),-(site.position.z-p.z));return observationView([site],{...p,yaw},'street',[])?.canObserve;});
    assert.ok(readable.length>0,'no reachable reading spot for '+site.id);
  }
});

test('courier, reading mage and chocobo can each be reached within their hand-over distance',()=>{
  const roles={0:'moogle',1:'chocobo',2:'mage'};
  for(const [index,species]of Object.entries(roles)){const person=city.people[index];assert.equal(person.species,species);
    assert.ok(standingSpots(person.x,person.z,interactionRadius[species]-.2).length>0,'cannot reach '+species);}
});

test('the memorial table has a collider and a reachable viewing spot',()=>{
  const m=CITY_POSTAL.memorial;assert.ok(city.colliders.some(c=>c.id==='postal-memorial'&&c.x===m.x&&c.z===m.z));
  assert.ok(!cityCanOccupy(city,m.x,m.z));assert.ok(standingSpots(m.x,m.z,2.2).length>0);
});
