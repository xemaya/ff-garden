import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createCharacterAssetLoader} from './asset-transport.js';

export const MAGE_URL='/assets/characters/mage/black-mage-v2.glb';
let template=null;
export const loadMageAsset=createCharacterAssetLoader(MAGE_URL,['Idle', 'Walk', 'Greet', 'Magic'],'魔导士',gltf=>{template=gltf;});
// Optional far-distance geometry: the same skin simplified to ~10% of the
// triangles (meshoptimizer). It reuses the full model's skeleton and materials;
// pages that never load it keep a single detail level.
export const MAGE_FAR_URL='/assets/characters/mage/black-mage-v2-far.glb';
let farTemplate=null;
export async function loadMageFarAsset(){const gltf=await new GLTFLoader().loadAsync(MAGE_FAR_URL);farTemplate=gltf.scene;return gltf;}
function attachFarDetail(model){
  if(!farTemplate)return null;const near=[],far=[],source=[];farTemplate.traverse(o=>{if(o.isSkinnedMesh)source.push(o);});model.traverse(o=>{if(o.isSkinnedMesh)near.push(o);});
  if(near.length!==source.length||near.some((m,i)=>m.name!==source[i].name))return null;
  near.forEach((m,i)=>{const s=new THREE.SkinnedMesh(source[i].geometry,m.material);s.name=m.name+' far';s.position.copy(m.position);s.quaternion.copy(m.quaternion);s.scale.copy(m.scale);s.castShadow=m.castShadow;s.receiveShadow=m.receiveShadow;s.visible=false;m.parent.add(s);s.bind(m.skeleton,m.bindMatrix);far.push(s);});
  let detailed=true;return value=>{if(value===detailed)return;detailed=value;for(const m of near)m.visible=value;for(const m of far)m.visible=!value;};
}
export function createMage(p={x:0,z:0},animated=null){
  if(!template)throw new Error('魔导士资产尚未加载');
  const root=new THREE.Group(),model=clone(template.scene);root.name='RefinedBlackMage';root.userData.dynamic=true;root.userData.refinedMage=true;root.add(model);const setDetail=attachFarDetail(model);root.position.set(p.x||0,animated?(p.z<-14?.04:.055):0,p.z||0);root.rotation.y=p.facing||0;
  const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(template.animations.map(c=>[c.name,mixer.clipAction(c)]));
  let current=null,finished=null,history=[],frozen=false;
  function play(name,fade=.14){
    if(!actions[name])throw new Error('Unknown Mage clip: '+name);
    if(current===name&&actions[name].isRunning())return;
    finished=null;frozen=false;const next=actions[name];next.paused=false;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);next.setLoop(['Greet','Magic'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);next.clampWhenFinished=['Greet','Magic'].includes(name);
    if(current&&fade>0)actions[current].fadeOut(fade);else if(current)actions[current].stop();next.fadeIn(fade).play();current=name;history.push(name);if(history.length>24)history.shift();
  }
  mixer.addEventListener('finished',e=>{finished=e.action.getClip().name;});
  play('Idle',0);
  const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;});
  root.userData.mage={root,personIndex:p.personIndex,model,mixer,actions,bones,play,setDetail,freeze(value){frozen=value;const action=actions[current];if(value){Object.values(actions).forEach(a=>{if(a!==action)a.stop();});action.stopFading().setEffectiveWeight(1);action.time=action.getClip().duration*.42;}action.paused=value;mixer.update(0);},seek(progress){const action=actions[current];Object.values(actions).forEach(a=>{if(a!==action)a.stop();});frozen=true;action.stopFading().setEffectiveWeight(1);action.time=action.getClip().duration*Math.max(0,Math.min(.9999,progress));action.paused=true;mixer.update(0);},update(dt){mixer.update(dt);},consumeFinished(){const value=finished;finished=null;return value;},snapshot(){const pose={};for(const name of['Head','HatTip','Hand_L','Hand_R','Coat_L','Coat_R','Foot_L','Foot_R']){const b=bones[name];if(b)pose[name]=b.quaternion.toArray().map(v=>+v.toFixed(5));}return{asset:MAGE_URL,clip:current,frozen,time:+(actions[current]?.time||0).toFixed(3),history:[...history],bones:pose,position:{x:root.position.x,z:root.position.z},height:1.55};}};
  if(animated){animated.people.push(root);if(!animated.mages)animated.mages=[];animated.mages.push(root.userData.mage);}return root;
}
