import * as THREE from 'three';
import {createAssetLoader,ASSET_NETWORK_TIMEOUT_MS,ASSET_DECODE_TIMEOUT_MS} from './asset-loading.js';
import {loadTextureUrl,disposeTexture} from './asset-transport.js';

const names=['poster','ticket'];
function fallback(name){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=name==='poster'?720:230;
 const context=canvas.getContext('2d');context.fillStyle='#e3d2ad';context.fillRect(0,0,canvas.width,canvas.height);
 context.fillStyle='#713e45';context.textAlign='center';context.textBaseline='middle';context.font='36px serif';
 context.fillText(name==='poster'?'空中剧场 · 今夜开演':'TANTALUS · 入场券',256,canvas.height/2);
 return new THREE.CanvasTexture(canvas);
}
// Optional printed artwork loads beside the scene. Stable material objects keep
// already-built/batched geometry valid when a late image or retry succeeds.
export function createTheaterPaperLoader({loadTexture=loadTextureUrl,createFallback=fallback,timeoutMs=ASSET_NETWORK_TIMEOUT_MS,decodeTimeoutMs=ASSET_DECODE_TIMEOUT_MS,...timers}={}){
 const materials={},failed=new Set(),ready=new Set();let pending=null;
 for(const name of names){const map=createFallback(name);map.colorSpace=THREE.SRGBColorSpace;materials[name]=new THREE.MeshStandardMaterial({map,roughness:1,side:THREE.DoubleSide});}
 const loaders=Object.fromEntries(names.map(name=>[name,createAssetLoader(context=>loadTexture(`/assets/theater/${name}.svg`,context),{timeoutMs,decodeTimeoutMs,...timers,dispose:disposeTexture})]));
 return {materials,failed:()=>names.filter(name=>failed.has(name)),
  load(){if(!pending)pending=Promise.all(names.filter(name=>!ready.has(name)).map(async name=>{
   try{const map=await loaders[name]();map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;const previous=materials[name].map;materials[name].map=map;materials[name].needsUpdate=true;disposeTexture(previous);ready.add(name);failed.delete(name);}
   catch{failed.add(name);}
  })).finally(()=>{pending=null;});return pending;},
  cancel(){for(const load of Object.values(loaders))load.cancel();}
 };
}
