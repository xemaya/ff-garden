import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {postalDialogue} from '../src/postal-dialogue.js';
import {createPostalMemorial,attachPostalMemorial,MEMORIAL_POSITION} from '../src/postal-memorial.js';
import {compileRoyalLayout} from '../src/royal-layout.js';
import {attachObservationSites,observationSites} from '../src/postal-observations.js';
import {canOccupy} from '../src/layout.js';

test('three residents react to every valid story phase with optional city-history echoes',()=>{
  const stages=[];for(let chapter=0;chapter<3;chapter++)for(const state of ['available','carrying','completed',...(chapter===1?['reply']:[])])stages.push({chapter,state,discoveries:[]});
  for(const species of ['moogle','mage','chocobo']){
    const lines=stages.map(snapshot=>{const before=JSON.stringify(snapshot),line=postalDialogue(species,snapshot);assert(line.greeting&&line.response);assert.equal(JSON.stringify(snapshot),before);return line.greeting;});assert.equal(new Set(lines).size,stages.length);
    const base={chapter:2,state:'completed',discoveries:[]},recorded={...base,discoveries:['royal-gate-message','royal-square-pause','royal-court-guest']};assert.ok(postalDialogue(species,recorded).response.length>postalDialogue(species,base).response.length);
  }
  assert.match(postalDialogue('chocobo',{chapter:1,state:'reply',discoveries:[]}).greeting,/两声短音/);
});
test('memorial remains bounded, switches visible keepsakes without rebuilding, and reuses merged materials',()=>{
  const memorial=createPostalMemorial({wood:new THREE.MeshStandardMaterial({color:0x9c7955})}),keepsake=memorial.root.children.find(o=>o.userData.dynamic),meshes=[];
  memorial.root.traverse(o=>{if(o.isMesh)meshes.push(o);});assert(memorial.snapshot().parts<=40);assert(memorial.snapshot().keepsakeBatches<=6);assert(!keepsake.visible);
  for(let i=0;i<20;i++)memorial.setCompleted(true);assert(keepsake.visible);assert(memorial.snapshot().completed);let after=0;memorial.root.traverse(o=>{if(o.isMesh)after++;});assert.equal(after,meshes.length);memorial.setCompleted(false);assert(!keepsake.visible);
  for(const mesh of meshes){const positions=mesh.geometry.attributes.position;for(const value of positions.array)assert(Number.isFinite(value));}
});
test('permanent support-table collision agrees with the physical scene and does not block any city route',()=>{
  const raw=JSON.parse(readFileSync(new URL('../public/data/royal-city.json',import.meta.url))),p=compileRoyalLayout(raw);attachObservationSites(p,observationSites(p,'royal'));attachPostalMemorial(p);
  assert(!canOccupy(p,MEMORIAL_POSITION.x,MEMORIAL_POSITION.z));for(const point of p.path)assert(canOccupy(p,point.x,point.z,.3));for(const site of observationSites(p,'royal'))assert(canOccupy(p,site.position.x,site.position.z+1.5));
});
