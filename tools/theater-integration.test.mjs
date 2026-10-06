import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileTown,canOccupy} from '../src/layout.js';
import {compileRoyalLayout} from '../src/royal-layout.js';
import {selectStreet} from '../src/street-selection.js';
import {theaterPanelVisible} from '../src/theater-plan.js';
import {observationSites,attachObservationSites} from '../src/postal-observations.js';
import {attachPostalMemorial,MEMORIAL_POSITION} from '../src/postal-memorial.js';
import {createPostalJourney} from '../src/postal-journey.js';
const read=path=>JSON.parse(fs.readFileSync(new URL('../public/'+path,import.meta.url)));
const manifest=read('data/v4/manifest.json');

test('default royal and legacy theater links retain both scenes and do not alter saved progress',()=>{
 const map=new Map(),storage={getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};
 const journey=createPostalJourney(storage);const context={actorReady:true,near:true,streetMode:true,busy:false,species:'moogle'};assert(journey.accept(context));assert.equal(journey.snapshot().state,'carrying');
 // Compile/navigation is independent from all persistent state.
 const before=JSON.stringify([...map]);
 for(const search of['','theater=1','district=royal&theater=1','street=residential&theater=1','street=market&theater=1','street=workshops&theater=1']){
  const selection=selectStreet(new URLSearchParams(search),manifest),raw=read(selection.street.path),plan=selection.royal?compileRoyalLayout(raw):compileTown(raw);
  attachObservationSites(plan,observationSites(plan,selection.royal?'royal':null));attachPostalMemorial(plan);
  assert(plan.theaterStage);assert.equal(plan.people.filter(person=>person.species).length,3);
  for(const p of [plan.theaterStage.camera,plan.theaterStage.counterView,{x:MEMORIAL_POSITION.x,z:MEMORIAL_POSITION.z+1.5},...plan.path])assert(canOccupy(plan,p.x,p.z,.3),search+' blocked after postal props');
  assert.equal(JSON.stringify([...map]),before);assert.equal(createPostalJourney(storage).snapshot().state,'carrying');
 }
 const sample=selectStreet(new URLSearchParams('sample=1'),manifest);assert(sample.sample);assert(!compileTown(read('data/town.json')).theaterStage);
});
test('theater panel yields to notebook, NPC, map and study; leaves focus when player walks away',()=>{
 const stage={booth:{x:-6,z:-18}},near={x:-5,z:-17},far={x:0,z:48};
 assert(theaterPanelVisible({stage,player:near}));assert(theaterPanelVisible({stage,player:far,focused:true}));
 for(const state of[{notebookOpen:true},{npcVisible:true},{mode:'map'},{mode:'study'},{mode:'transition'}])assert(!theaterPanelVisible({stage,player:near,focused:true,...state}));
 assert(!theaterPanelVisible({stage,player:far}));assert(!theaterPanelVisible({stage:null,player:near}));
});
