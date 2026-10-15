import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileCity,cityCanOccupy,footprint,rectCorners} from '../src/city-plan.js';
import {BAKERY_ID,shopFrame,bakeryLayout,bakerLines} from '../src/city-shop.js';

const city=compileCity(JSON.parse(fs.readFileSync(new URL('../public/data/v4/workshops.json',import.meta.url))));
const bakery=city.buildings.find(b=>b.id===BAKERY_ID);

// Cells reachable on a 0.1 m grid from a start point, under a given occupancy test.
function flood(start,can,step=.1,limit=4e5){const key=(i,j)=>i+','+j,seen=new Set([key(Math.round(start.x/step),Math.round(start.z/step))]),queue=[[Math.round(start.x/step),Math.round(start.z/step)]];
  while(queue.length&&seen.size<limit){const[i,j]=queue.pop();for(const[di,dj]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=[i+di,j+dj],k=key(...n);if(seen.has(k)||!can(n[0]*step,n[1]*step))continue;seen.add(k);queue.push(n);}}
  return(x,z)=>seen.has(key(Math.round(x/step),Math.round(z/step)));}

test('the bakery is a market-lane shop and its door is on the street facade',()=>{
  assert.equal(bakery.kind,'bakery');assert.equal(bakery.district,'market');
  const f=shopFrame(bakery),corners=rectCorners(footprint(bakery));
  // The door point lies on the footprint's edge (within its .06 m margin).
  const d=Math.min(...[[0,1],[1,3],[3,2],[2,0]].map(([a,b])=>{const p=corners[a],q=corners[b],t=Math.max(0,Math.min(1,((f.door.x-p.x)*(q.x-p.x)+(f.door.z-p.z)*(q.z-p.z))/((q.x-p.x)**2+(q.z-p.z)**2)));return Math.hypot(f.door.x-(p.x+t*(q.x-p.x)),f.door.z-(p.z+t*(q.z-p.z)));}));
  assert.ok(d<.1,'door off the facade by '+d.toFixed(3));
});

test('the spot outside the bakery door is walkable from the city entrance',()=>{
  const f=shopFrame(bakery);assert.ok(cityCanOccupy(city,f.outside.x,f.outside.z),'outside spot blocked');
  const reach=flood(city.spawn,(x,z)=>cityCanOccupy(city,x,z),.25);assert.ok(reach(f.outside.x,f.outside.z),'outside spot not reachable');
});

test('inside, the visitor can reach the counter and the baker\'s stops, and walk back out',()=>{
  const layout=bakeryLayout(bakery),s=layout.spawn;assert.ok(layout.canOccupy(s.x,s.z),'spawn blocked');assert.ok(!layout.leaving(s.x,s.z),'spawn is already in the exit zone');
  const reach=flood(s,(x,z)=>layout.canOccupy(x,z));
  assert.ok(reach(s.x,-.3)&&layout.leaving(s.x,-.3),'cannot walk back out of the door');
  for(const x of[-1.6,-.7,.3])assert.ok(reach(x,-1.65),'cannot reach the front of the counter at x='+x);
  assert.ok(reach(-.7,-3.45),'cannot get behind the counter');
  for(const [x,z]of[[-.7,-3.45],[-1.4,-3.4],[.2,-3.5]])assert.ok(layout.canOccupy(x,z,.25),'baker stop blocked at '+x+','+z);
  // Walls hold: nothing outside the room is walkable except the doorway.
  for(const [x,z]of[[-3,-2],[3,-2],[0,-6],[-1,.3]])assert.ok(!layout.canOccupy(x,z),'walkable outside the room at '+x+','+z);
});

test('the baker has something to say by day and at dusk',()=>{for(const t of['day','dusk'])assert.ok(bakerLines(t).length>=3);assert.notDeepEqual(bakerLines('day'),bakerLines('dusk'));});
