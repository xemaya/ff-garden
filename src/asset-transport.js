import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAssetLoader,AssetLoadCancelledError,ASSET_NETWORK_TIMEOUT_MS,ASSET_DECODE_TIMEOUT_MS} from './asset-loading.js';

async function download(url,bodyType,context,fetcher){
  if(context.signal.aborted)throw context.signal.reason||new AssetLoadCancelledError();
  const response=await fetcher(url,{signal:context.signal,credentials:'same-origin'});
  if(!response.ok)throw new Error(`Asset request failed (${response.status})`);
  const data=await response[bodyType]();if(context.signal.aborted)throw context.signal.reason||new AssetLoadCancelledError();context.downloaded();return data;
}

// Retain TextureLoader's image orientation/color behavior. Only transport moves
// to fetch; the object URL survives until its uncancellable decoder settles.
export async function loadSurfaceTexture(name,context,{fetcher=fetch,decode=url=>new THREE.TextureLoader().loadAsync(url),createUrl=blob=>URL.createObjectURL(blob),revokeUrl=url=>URL.revokeObjectURL(url)}={}){
  const blob=await download(`/assets/v3/${name}.png`,'blob',context,fetcher),url=createUrl(blob);
  try{return await decode(url);}finally{revokeUrl(url);}
}
async function parseGltf(data,path){
  const urls=new Set();let finished=false;
  const manager=new THREE.LoadingManager().setURLModifier(url=>{
    if(url.startsWith('blob:')){if(finished)URL.revokeObjectURL(url);else urls.add(url);}return url;
  });
  try{return await new GLTFLoader(manager).parseAsync(data,path);}
  finally{finished=true;for(const url of urls)URL.revokeObjectURL(url);}
}
export async function loadGltfAsset(url,context,{fetcher=fetch,parse=parseGltf}={}){
  const data=await download(url,'arrayBuffer',context,fetcher);
  return parse(data,url.slice(0,url.lastIndexOf('/')+1));
}

export function disposeTexture(texture){texture.dispose();texture.image?.close?.();}
export function disposeGltf(gltf){
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set(),skeletons=new Set();
  for(const scene of gltf.scenes||[gltf.scene])scene?.traverse(object=>{
    if(object.geometry)geometries.add(object.geometry);if(object.skeleton)skeletons.add(object.skeleton);
    for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])materials.add(material);
  });
  for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  for(const geometry of geometries)geometry.dispose();for(const skeleton of skeletons)skeleton.dispose();
  for(const material of materials)material.dispose();for(const texture of textures){texture.dispose();if(texture.image)images.add(texture.image);}
  for(const image of images)image.close?.();
}

// Validation and template assignment must happen inside the current cohort's
// accept step, never inside an expired download/decode callback.
export function createCharacterAssetLoader(url,clips,label,onReady,{load=loadGltfAsset,...deadlines}={}){
  return createAssetLoader(context=>load(url,context),{
    timeoutMs:ASSET_NETWORK_TIMEOUT_MS,decodeTimeoutMs:ASSET_DECODE_TIMEOUT_MS,...deadlines,
    accept(gltf){
      const names=gltf.animations.map(clip=>clip.name);for(const name of clips)if(!names.includes(name))throw new Error(label+'动作缺失：'+name);
      gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(object=>{
        if(object.isMesh){object.castShadow=true;object.receiveShadow=true;if(object.material.map)object.material.map.anisotropy=8;}
        if(object.isSkinnedMesh)object.skeleton.update();
      });
      onReady(gltf);
    },dispose:disposeGltf
  });
}
