import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {loadSurfaceTexture,loadGltfAsset,disposeGltf,createCharacterAssetLoader} from '../src/asset-transport.js';
import {AssetLoadTimeoutError} from '../src/asset-loading.js';
import {clock,deferred,flush} from './asset-test-support.mjs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

function context(){const controller=new AbortController(),phases=[];return {controller,phases,value:{signal:controller.signal,downloaded:()=>phases.push('decode')}};}
function asset(name,clips=['Idle']){return {name,scene:new THREE.Group(),animations:clips.map(clip=>new THREE.AnimationClip(clip,1,[]))};}

test('surface transport is abortable, starts decode after the entire blob and always revokes its URL',async()=>{
 for(const fails of [false,true]){
  const state=context(),order=[],result=new THREE.Texture();let options;
  const promise=loadSurfaceTexture('wood',state.value,{
   fetcher:async(url,value)=>{assert.equal(url,'/assets/v3/wood.png');options=value;return {ok:true,blob:async()=>{order.push('blob');return 'bytes';}};},
   createUrl:blob=>{assert.equal(blob,'bytes');order.push('url');return 'blob:test';},
   decode:async url=>{assert.equal(url,'blob:test');assert.deepEqual(state.phases,['decode']);order.push('decode');if(fails)throw Error('decode failed');return result;},
   revokeUrl:url=>{assert.equal(url,'blob:test');order.push('revoke');}
  });
  if(fails)await assert.rejects(promise,/decode failed/);else assert.equal(await promise,result);
  assert.equal(options.signal,state.controller.signal);assert.equal(options.credentials,'same-origin');assert.deepEqual(order,['blob','url','decode','revoke']);
 }
});
test('late body completion after cancellation never starts image decoding or allocates an object URL',async()=>{
 const state=context(),body=deferred();let allocated=0;
 const promise=loadSurfaceTexture('wood',state.value,{fetcher:async()=>({ok:true,blob:()=>body.promise}),createUrl:()=>{allocated++;return 'blob:test';},decode:()=>{throw Error('must not decode');}});
 const failed=assert.rejects(promise,/cancelled/);await flush();state.controller.abort(Error('cancelled'));body.resolve('bytes');await failed;assert.equal(allocated,0);assert.deepEqual(state.phases,[]);
});
test('GLB HTTP failure and body errors stay retryable; complete buffers use parse with their asset base path',async()=>{
 const state=context();let parseCalls=0;
 await assert.rejects(loadGltfAsset('/assets/role/actor.glb',state.value,{fetcher:async()=>({ok:false,status:404}),parse:()=>{parseCalls++;}}),/404/);
 await assert.rejects(loadGltfAsset('/assets/role/actor.glb',state.value,{fetcher:async()=>({ok:true,arrayBuffer:async()=>{throw Error('body');}})}),/body/);
 const buffer=new ArrayBuffer(8),gltf=asset('valid');
 assert.equal(await loadGltfAsset('/assets/role/actor.glb',state.value,{fetcher:async()=>({ok:true,arrayBuffer:async()=>buffer}),parse:async(data,path)=>{parseCalls++;assert.equal(data,buffer);assert.equal(path,'/assets/role/');assert.deepEqual(state.phases,['decode']);return gltf;}}),gltf);
 assert.equal(parseCalls,1);
});
test('discarded GLB disposal visits shared resources once, including shared image bitmaps',()=>{
 const counts={geometry:0,material:0,texture:0,image:0,skeleton:0},image={close(){counts.image++;}},map=new THREE.Texture(image),normal=new THREE.Texture(image);
 const material=new THREE.MeshStandardMaterial({map,normalMap:normal}),geometry=new THREE.BoxGeometry(),scene=new THREE.Group(),skeleton={dispose(){counts.skeleton++;}};
 for(let i=0;i<2;i++){const mesh=new THREE.Mesh(geometry,material);mesh.skeleton=skeleton;scene.add(mesh);}
 geometry.addEventListener('dispose',()=>counts.geometry++);material.addEventListener('dispose',()=>counts.material++);for(const texture of [map,normal])texture.addEventListener('dispose',()=>counts.texture++);
 disposeGltf({scene,scenes:[scene,scene]});assert.deepEqual(counts,{geometry:1,material:1,texture:2,image:1,skeleton:1});
});
test('expired real character pipeline cannot assign a late template over its replacement',async()=>{
 const time=clock(),works=[],accepted=[],disposed=[];
 const loader=createCharacterAssetLoader('/actor.glb',['Idle'],'角色',gltf=>accepted.push(gltf.name),{timeoutMs:10,decodeTimeoutMs:20,...time,load:async()=>{const work=deferred();works.push(work);const gltf=await work.promise;gltf.scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));gltf.scene.children[0].geometry.addEventListener('dispose',()=>disposed.push(gltf.name));return gltf;}});
 const first=loader(),failed=assert.rejects(first,AssetLoadTimeoutError);await flush();time.advance(10);await failed;
 const second=loader();await flush();works[1].resolve(asset('new'));assert.equal((await second).name,'new');works[0].resolve(asset('old'));await flush();assert.deepEqual(accepted,['new']);assert.deepEqual(disposed,['old']);assert.equal(time.count(),0);
});
test('missing animation validation releases unaccepted geometry and never assigns its template',async()=>{
 const gltf=asset('invalid',[]),geometry=new THREE.BoxGeometry();let disposed=0,accepted=0;
 gltf.scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));geometry.addEventListener('dispose',()=>disposed++);
 const loader=createCharacterAssetLoader('/actor.glb',['Idle'],'角色',()=>accepted++,{load:async()=>gltf});
 await assert.rejects(loader(),/动作缺失/);assert.equal(disposed,1);assert.equal(accepted,0);
});
test('GLTF decode failure revokes owned blob URLs, including dependencies requested after rejection',async()=>{
 const originalParse=GLTFLoader.prototype.parseAsync,originalRevoke=URL.revokeObjectURL,revoked=[];let manager;
 GLTFLoader.prototype.parseAsync=async function(){manager=this.manager;manager.resolveURL('blob:owned');manager.resolveURL('blob:owned');throw Error('decode failure');};
 URL.revokeObjectURL=url=>revoked.push(url);
 try{
  const state=context();await assert.rejects(loadGltfAsset('/actor.glb',state.value,{fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})}),/decode failure/);
  assert.deepEqual(revoked,['blob:owned']);manager.resolveURL('blob:late');assert.deepEqual(revoked,['blob:owned','blob:late']);
 }finally{GLTFLoader.prototype.parseAsync=originalParse;URL.revokeObjectURL=originalRevoke;}
});
