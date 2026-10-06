import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeroMaterialLoader,HERO_TEXTURE_NAMES} from '../src/hero-textures.js';
import {initPlazaMaterials} from '../src/plaza.js';
import {initSceneryMaterials} from '../src/scenery.js';

const texture=name=>new THREE.Texture({name,width:16,height:16});
test('all five requests start before any settles and concurrent callers share the batch',async()=>{
  const starts=[],resolve=new Map(),loader=createHeroMaterialLoader({loadTexture:name=>{starts.push(name);return new Promise(done=>resolve.set(name,done));},createFallback:texture});
  const first=loader.load();assert.equal(first,loader.load());await Promise.resolve();
  assert.deepEqual(starts,HERO_TEXTURE_NAMES);
  for(const name of HERO_TEXTURE_NAMES)resolve.get(name)(texture(name));
  const materials=await first;assert.equal(Object.keys(materials).length,5);assert.deepEqual(loader.failed(),[]);
  assert.equal(materials.pavers.bumpMap,null);assert.equal(materials.wood.bumpMap,materials.wood.map);
  assert.deepEqual(materials.wood.map.repeat.toArray(),[.24,1.6]);assert.equal(materials.plaster.map.colorSpace,THREE.SRGBColorSpace);
  assert.equal(await loader.load(),materials);assert.equal(starts.length,5);
});
test('one rejected texture keeps successful assets and retry restores existing clones without rebuilding',async()=>{
  const calls=new Map(),loader=createHeroMaterialLoader({loadTexture:name=>{const count=(calls.get(name)||0)+1;calls.set(name,count);if(name==='plaster'&&count===1)throw Error('404');return texture(name);},createFallback:name=>texture('fallback-'+name)});
  const materials=await loader.load(),wood=materials.wood.map,plaster=materials.plaster,source=plaster.map.source;
  assert.deepEqual(loader.failed(),['plaster']);assert.equal(plaster.map.image.name,'fallback-plaster');
  const clone=plaster.map.clone();clone.repeat.set(.15,.15);const clonedMaterial=new THREE.MeshStandardMaterial({map:clone});
  const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(),clonedMaterial));const version=clone.version;
  await loader.load();loader.refreshClones(root);
  assert.deepEqual(loader.failed(),[]);assert.equal(materials.plaster,plaster);assert.equal(plaster.map.source,source);
  assert.equal(clone.image.name,'plaster');assert(clone.version>version);assert.deepEqual(clone.repeat.toArray(),[.15,.15]);
  assert.equal(materials.wood.map,wood);assert.equal(calls.get('plaster'),2);for(const name of HERO_TEXTURE_NAMES.filter(name=>name!=='plaster'))assert.equal(calls.get(name),1);
});
test('complete failure remains usable and repeated failed retries retain the same fallback material',async()=>{
  let calls=0,fallbacks=0;
  const loader=createHeroMaterialLoader({loadTexture:()=>{calls++;return Promise.reject(Error('offline'));},createFallback:name=>{fallbacks++;return texture(name);}});
  const materials=await loader.load(),originals=Object.values(materials);assert.equal(originals.length,5);assert.deepEqual(loader.failed(),HERO_TEXTURE_NAMES);
  await loader.load();assert.deepEqual(Object.values(materials),originals);assert.equal(calls,10);assert.equal(fallbacks,5);
});
test('real tiny canvas fallbacks remain compatible with plaza and scenery material cloning',async()=>{
  const previous=globalThis.document,canvases=[];
  globalThis.document={createElement(type){assert.equal(type,'canvas');const canvas={getContext(){return {fillStyle:'',fillRect(){}};}};canvases.push(canvas);return canvas;}};
  try{
    const loader=createHeroMaterialLoader({loadTexture:()=>Promise.reject(Error('offline'))}),materials=await loader.load();
    assert.equal(canvases.length,5);for(const material of Object.values(materials)){assert(material.map.isCanvasTexture);assert.equal(material.map.image.width,16);assert.equal(material.map.image.height,16);}
    assert.doesNotThrow(()=>initPlazaMaterials(materials));assert.doesNotThrow(()=>initSceneryMaterials(materials));
  }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
