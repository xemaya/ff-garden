import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLamplighterState,LAMPLIGHTER_KEY,STEPS,LINES,LETTER,objective} from '../src/lamplighter-story.js';
import {compileCity,cityCanOccupy} from '../src/city-plan.js';

const memory=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),raw:m};};
const city=compileCity(JSON.parse(fs.readFileSync(new URL('../public/data/v4/workshops.json',import.meta.url))));

test('the letter is carried step by step, and steps cannot be skipped',()=>{
  const s=createLamplighterState(memory());
  assert.equal(s.snapshot().step,'invite');
  assert.equal(s.read(),false,'cannot read before taking the letter');
  assert.equal(s.lit(),false);assert.equal(s.hang(),false);
  assert.ok(s.accept());assert.equal(s.snapshot().step,'read');
  assert.equal(s.clue('mage'),false,'no clues before reading');
  assert.ok(s.read());assert.equal(s.snapshot().step,'ask');
  assert.ok(s.clue('patrol'));assert.equal(s.clue('patrol'),false,'a clue counts once');assert.equal(s.snapshot().step,'ask');
  assert.equal(s.clue('baker'),false,'unknown clue');
  assert.ok(s.clue('mage'));assert.equal(s.snapshot().step,'wait');
  assert.ok(s.lit());assert.ok(s.give());assert.ok(s.hang());
  assert.equal(s.snapshot().step,'done');assert.ok(s.reached('carry'));
});

test('progress survives a reload, and a broken save starts over',()=>{
  const store=memory(),a=createLamplighterState(store);a.accept();a.read();a.clue('mage');
  const b=createLamplighterState(store);assert.deepEqual(b.snapshot(),{step:'ask',clues:['mage'],index:2});
  store.setItem(LAMPLIGHTER_KEY,'{"v":1,"step":"flying","clues":[]}');assert.equal(createLamplighterState(store).snapshot().step,'invite');
  store.setItem(LAMPLIGHTER_KEY,'not json');assert.equal(createLamplighterState(store).snapshot().step,'invite');
  store.setItem(LAMPLIGHTER_KEY,'{"v":1,"step":"ask","clues":["mage","ghost"]}');assert.deepEqual(createLamplighterState(store).snapshot().clues,['mage']);
  const broken={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};const c=createLamplighterState(broken);assert.ok(c.accept(),'works without storage');
});

test('every step has an objective, and the story text is complete',()=>{
  for(const step of STEPS)assert.ok(objective({step,clues:[]}).text.length>4,step);
  assert.equal(objective({step:'ask',clues:['mage']}).items.filter(i=>i.done).length,1);
  assert.notEqual(objective({step:'wait',clues:[]},{dusk:true}).text,objective({step:'wait',clues:[]}).text);
  for(const [k,v]of Object.entries(LINES))for(const line of v.flat())assert.ok(line.text?.length>3,k);
  assert.ok(LETTER.body.join('').includes('八盏'),'the letter counts the eight lamps');
});

test('the gate bench seat, Vivi\'s spot and the wind post approach are on walkable ground',async()=>{
  // Importing the episode pulls in three.js scene code; read the sites from the source instead.
  const src=fs.readFileSync(new URL('../src/episode-lamplighter.js',import.meta.url),'utf8');
  const sites=Function('return '+src.match(/LAMPLIGHTER_SITES=(\{[\s\S]*?\n\});/)[1])();
  for(const k of['seat','vivi'])assert.ok(cityCanOccupy(city,sites[k].x,sites[k].z),k+' blocked');
  const p=sites.post,around=[[1.2,0],[1.2,1.2],[0,1.2],[1.6,.6]].some(([dx,dz])=>cityCanOccupy(city,p.x+dx,p.z+dz));assert.ok(around,'nowhere to stand by the wind post');
  assert.ok(Math.hypot(sites.seat.x-sites.bench.x,sites.seat.z-sites.bench.z)<1,'seat is next to the bench');
});
