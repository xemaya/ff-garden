import * as THREE from 'three';
import {createAssetLoader} from './asset-loading.js';

export const HERO_TEXTURE_NAMES=['plaster','wood','pavers','roof-clay','roof-teal'];
const fallbackColors={plaster:'#c7bca7',wood:'#8d7257',pavers:'#b3aa95','roof-clay':'#a77360','roof-teal':'#638181'};
function fallbackTexture(name){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=16;
  const context=canvas.getContext('2d');context.fillStyle=fallbackColors[name];context.fillRect(0,0,16,16);
  return new THREE.CanvasTexture(canvas);
}
function configure(map,name){
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=8;
  if(name==='plaster')map.repeat.set(.24,.24);
  if(name==='wood')map.repeat.set(.24,1.6);
}

// Every request starts together. Successful textures are cached, failures alone
// remain retryable, and fallback materials stay usable by all scene builders.
export function createHeroMaterialLoader({loadTexture=name=>new THREE.TextureLoader().loadAsync(`/assets/v3/${name}.png`),createFallback=fallbackTexture}={}){
  const materials={},failed=new Set(),loaders=Object.fromEntries(HERO_TEXTURE_NAMES.map(name=>[name,createAssetLoader(()=>loadTexture(name))]));
  let pending=null;
  async function loadBatch(){
    const names=HERO_TEXTURE_NAMES.filter(name=>!materials[name]||failed.has(name));
    await Promise.all(names.map(async name=>{
      let map;
      try{map=await loaders[name]();failed.delete(name);}catch{failed.add(name);if(materials[name])return;map=createFallback(name);}
      if(materials[name]){
        // Texture.clone shares Source. Preserve it so plaza/scenery clones also
        // see the recovered image; their upload flags are refreshed separately.
        const existing=materials[name].map;existing.source.data=map.image;existing.needsUpdate=true;map.dispose();
      }else{
        configure(map,name);
        const material=new THREE.MeshStandardMaterial({map,bumpMap:name==='pavers'?null:map,bumpScale:name==='wood'?.032:name==='plaster'?.018:.021,roughness:.95});
        material.userData.shared=true;materials[name]=material;
      }
    }));
    return materials;
  }
  return {
    load(){if(!pending)pending=loadBatch().finally(()=>{pending=null;});return pending;},
    failed:()=>HERO_TEXTURE_NAMES.filter(name=>failed.has(name)),
    refreshClones(root){
      const sources=new Set(Object.values(materials).map(material=>material.map.source));
      root.traverse(object=>{for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[]){
        for(const map of [material.map,material.bumpMap])if(map&&sources.has(map.source))map.needsUpdate=true;
      }});
    }
  };
}
