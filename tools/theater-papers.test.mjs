import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createTheaterPaperLoader} from '../src/theater-papers.js';
const fallback=()=>new THREE.Texture();
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('paper fallbacks exist before parallel downloads settle; successes retain material identity and cache',async()=>{
 const resolvers=[],calls=[];const loader=createTheaterPaperLoader({createFallback:fallback,loadTexture:path=>{calls.push(path);return new Promise(resolve=>resolvers.push(resolve));}});
 const material=loader.materials.poster,old=material.map;let disposed=false;old.addEventListener('dispose',()=>disposed=true);
 const first=loader.load();assert.equal(loader.load(),first);assert(material.map);await tick();assert.equal(calls.length,2);
 const maps=[new THREE.Texture(),new THREE.Texture()];resolvers.forEach((resolve,i)=>resolve(maps[i]));await first;
 assert.equal(loader.materials.poster,material);assert.equal(material.map,maps[0]);assert(disposed);assert.deepEqual(loader.failed(),[]);
 await loader.load();assert.equal(calls.length,2);
});
test('one failed paper preserves the street and retries only that paper',async()=>{
 const calls=[];let fail=true;const loader=createTheaterPaperLoader({createFallback:fallback,loadTexture:async path=>{calls.push(path);if(path.includes('poster')&&fail)throw Error('404');return new THREE.Texture();}});
 const old=loader.materials.poster.map;await loader.load();assert.deepEqual(loader.failed(),['poster']);assert.equal(loader.materials.poster.map,old);
 fail=false;await loader.load();assert.equal(calls.length,3);assert.notEqual(loader.materials.poster.map,old);assert.deepEqual(loader.failed(),[]);
});
test('network deadline preserves fallback and late images cannot replace it',async()=>{
 const timers=[],resolvers=[],signals=[];const loader=createTheaterPaperLoader({createFallback:fallback,setTimer:fn=>(timers.push(fn),fn),clearTimer(){},loadTexture:(path,context)=>{signals.push(context.signal);return new Promise(resolve=>resolvers.push(resolve));}});
 const old=loader.materials.poster.map,pending=loader.load();await tick();timers.forEach(fn=>fn());await pending;assert.equal(loader.failed().length,2);assert(signals.every(signal=>signal.aborted));
 let disposed=0;for(const resolve of resolvers){const map=new THREE.Texture();map.addEventListener('dispose',()=>disposed++);resolve(map);}await tick();assert.equal(disposed,2);assert.equal(loader.materials.poster.map,old);
});
test('decode timeout and retry share the active decoder instead of starting duplicates',async()=>{
 const timers=[],resolvers=[];let count=0;const loader=createTheaterPaperLoader({createFallback:fallback,setTimer:fn=>(timers.push(fn),fn),clearTimer(){},loadTexture:(path,context)=>{count++;context.downloaded();return new Promise(resolve=>resolvers.push(resolve));}});
 const first=loader.load();await tick();timers.slice(-2).forEach(fn=>fn());await first;const retry=loader.load();await tick();assert.equal(count,2);
 resolvers.forEach(resolve=>resolve(new THREE.Texture()));await retry;assert.deepEqual(loader.failed(),[]);
});
