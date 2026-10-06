import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {royalArrival} from '../src/postal-content.js';
import {buildShopNameplate} from '../src/hero.js';

test('arrival describes the first task, saved continuation or completed visit without changing progress',()=>{
 for(const snapshot of [{chapter:0,state:'available',ending:false},{chapter:1,state:'carrying',ending:false},{chapter:2,state:'completed',ending:true}]){
  const before=JSON.stringify(snapshot),arrival=royalArrival(snapshot);assert.equal(JSON.stringify(snapshot),before);
  if(snapshot.ending){assert.match(arrival.subtitle,/已收工/);assert.doesNotMatch(arrival.text,/接第一封/);}
  else if(snapshot.chapter===0){assert.match(arrival.text,/喷泉/);assert.match(arrival.text,/手记/);}
  else{assert.match(arrival.text,/当前目标/);assert.doesNotMatch(arrival.text,/接第一封/);}
 }
});
test('royal shop nameplates use bounded local canvases and stay above walking height',()=>{
 const previous=globalThis.document,texts=[],canvases=[];
 globalThis.document={createElement(){const canvas={getContext(){return {fillRect(){},strokeRect(){},fillText(text){texts.push(text);}};}};canvases.push(canvas);return canvas;}};
 try{
  const raw=JSON.parse(readFileSync(new URL('../public/data/royal-city.json',import.meta.url))),wood=new THREE.MeshStandardMaterial();
  for(const building of raw.buildings){const sign=buildShopNameplate(building.name,wood),bounds=new THREE.Box3().setFromObject(sign);assert(bounds.min.y>3);assert.equal(sign.children.length,2);assert.equal(sign.children[0].material,wood);}
  assert.deepEqual(texts,raw.buildings.map(building=>building.name));assert.equal(canvases.length,6);for(const canvas of canvases){assert.equal(canvas.width,512);assert.equal(canvas.height,128);}
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
