import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildRoyalShopDisplay} from '../src/royal-shop-displays.js';import {createPostalMemorial} from '../src/postal-memorial.js';

test('royal clock and tea replacements fit existing elevated window shelves with at most forty static parts',()=>{
 const wood=new THREE.MeshStandardMaterial(),groups=[buildRoyalShopDisplay('toys',2.08,wood),buildRoyalShopDisplay('cafe',2.08,wood)];let parts=0;
 for(const g of groups){const bounds=new THREE.Box3().setFromObject(g,true);assert(bounds.min.y>1.2);assert(bounds.max.y<2);assert(bounds.min.x>-1.04&&bounds.max.x<1.04);assert(bounds.max.z<.2);assert.equal(g.children.length,g.userData.storyDisplay.parts);parts+=g.children.length;g.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.count<500);assert(!o.material.map);}});}
 assert.equal(parts,40);assert.equal(groups[0].userData.storyDisplay.clocks,3);assert.equal(groups[1].userData.storyDisplay.cups,4);
 for(const kind of['home','inn','books','bakery','florist'])assert.equal(buildRoyalShopDisplay(kind,2.08,wood),null);
});
test('royal table marker is bounded and always visible while keepsakes still follow completion without rebuilding',()=>{
 const previous=globalThis.document,canvases=[],texts=[];globalThis.document={createElement(){const canvas={getContext(){return {fillRect(){},fillText(t){texts.push(t);}};}};canvases.push(canvas);return canvas;}};
 try{
  const wood=new THREE.MeshStandardMaterial(),plain=createPostalMemorial({wood}),marked=createPostalMemorial({wood},{marker:true});
  assert.equal(marked.snapshot().parts-plain.snapshot().parts,4);assert.equal(marked.snapshot().keepsakeBatches,plain.snapshot().keepsakeBatches);assert.deepEqual(texts,['回信小铃桌']);assert.equal(canvases[0].width,256);assert.equal(canvases[0].height,64);
  const label=marked.root.children.find(o=>o.material?.map);assert(label);const before=marked.root.children.length;for(const ending of[true,true,false,true,false]){marked.setCompleted(ending);assert(label.visible);assert.equal(marked.snapshot().completed,ending);assert.equal(marked.root.children.length,before);}
  assert(!plain.snapshot().marker);assert(marked.snapshot().marker);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
