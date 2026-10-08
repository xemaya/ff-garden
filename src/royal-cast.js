import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createAssetLoader} from './asset-loading.js';
import {ROYAL_CAST} from './royal-plan.js';
export {ROYAL_CAST};
const templates=new Map();
export const loadSteinerV4=createAssetLoader(async()=>{const gltf=await new GLTFLoader().loadAsync('/assets/characters/royal-cast/steiner-v4.glb');for(const clip of['Idle','Walk','Greet','Signature'])if(!gltf.animations.some(a=>a.name===clip))throw new Error('Steiner v4 缺少动作 '+clip);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});gltf.scene.userData.height=2.08;templates.set('steiner',gltf);return gltf;});
export const royalLoaders=Object.fromEntries(Object.keys(ROYAL_CAST).map(id=>[id,createAssetLoader(async()=>{const gltf=await new GLTFLoader().loadAsync('/assets/characters/royal-cast/'+id+'-v1.glb');for(const clip of['Idle','Walk','Greet','Signature'])if(!gltf.animations.some(a=>a.name===clip))throw new Error(id+' 缺少动作 '+clip);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.map)o.material.map.anisotropy=8;}});templates.set(id,gltf);return gltf;})]));
export function createRoyal(id){const template=templates.get(id);if(!template)throw new Error('角色还未加载：'+id);const root=new THREE.Group(),model=clone(template.scene);root.name='Royal-'+id;root.userData.dynamic=true;root.add(model);const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(template.animations.map(c=>[c.name,mixer.clipAction(c)]));let current=null,frozen=false;
 function play(name,fade=.16){if(!actions[name])throw new Error('Unknown royal clip '+name);if(current===name&&actions[name].isRunning())return;const next=actions[name];next.paused=false;next.reset().setEffectiveWeight(1);next.setLoop(['Greet','Signature'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);next.clampWhenFinished=['Greet','Signature'].includes(name);if(current)fade?actions[current].fadeOut(fade):actions[current].stop();next.fadeIn(fade).play();current=name;frozen=false;}
 function seek(u){const a=actions[current];Object.values(actions).forEach(b=>{if(b!==a)b.stop();});a.stopFading().setEffectiveWeight(1);a.time=a.getClip().duration*Math.max(0,Math.min(.9999,u));a.paused=true;frozen=true;mixer.update(0);}
 play('Idle',0);return{root,model,play,seek,update(dt){if(!frozen)mixer.update(dt);},freeze(value){if(value)seek(.42);else{frozen=false;actions[current].paused=false;}},snapshot(){return{id,clip:current,time:actions[current].time,frozen,height:template.scene.userData.height||ROYAL_CAST[id].height};}};
}
