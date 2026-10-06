import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createAssetLoader} from './asset-loading.js';

export const CHOCOBO_URL='/assets/characters/chocobo/chocobo-v1.glb';
let template=null;
export const loadChocoboAsset=createAssetLoader(()=>new GLTFLoader().loadAsync(CHOCOBO_URL).then(gltf=>{
    const names=gltf.animations.map(c=>c.name);for(const name of['Idle','Walk','Chirp','Flap'])if(!names.includes(name))throw new Error('陆行鸟动作缺失：'+name);
    gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.map)o.material.map.anisotropy=8;}if(o.isSkinnedMesh)o.skeleton.update();});
    template=gltf;return gltf;
  }));
export function createChocobo(p={x:0,z:0},animated=null){
  if(!template)throw new Error('陆行鸟资产尚未加载');
  const root=new THREE.Group(),model=clone(template.scene);root.name='RefinedChocobo';root.userData.dynamic=true;root.userData.refinedChocobo=true;root.add(model);root.position.set(p.x||0,animated?(p.z<-14?.04:.055):0,p.z||0);root.rotation.y=p.facing||0;
  const mixer=new THREE.AnimationMixer(model),actions=Object.fromEntries(template.animations.map(c=>[c.name,mixer.clipAction(c)]));
  let current=null,finished=null,history=[],frozen=false;
  function play(name,fade=.14){
    if(!actions[name])throw new Error('Unknown Chocobo clip: '+name);
    if(current===name&&actions[name].isRunning())return;
    finished=null;frozen=false;const next=actions[name];next.paused=false;next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);next.setLoop(['Chirp','Flap'].includes(name)?THREE.LoopOnce:THREE.LoopRepeat,Infinity);next.clampWhenFinished=['Chirp','Flap'].includes(name);
    if(current&&fade>0)actions[current].fadeOut(fade);else if(current)actions[current].stop();next.fadeIn(fade).play();current=name;history.push(name);if(history.length>24)history.shift();
  }
  mixer.addEventListener('finished',e=>{finished=e.action.getClip().name;});
  play('Idle',0);
  const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;});
  root.userData.chocobo={root,personIndex:p.personIndex,model,mixer,actions,bones,play,freeze(value){frozen=value;const action=actions[current];if(value){Object.values(actions).forEach(a=>{if(a!==action)a.stop();});action.stopFading().setEffectiveWeight(1);action.time=action.getClip().duration*.42;}action.paused=value;mixer.update(0);},seek(progress){const action=actions[current];Object.values(actions).forEach(a=>{if(a!==action)a.stop();});frozen=true;action.stopFading().setEffectiveWeight(1);action.time=action.getClip().duration*Math.max(0,Math.min(.9999,progress));action.paused=true;mixer.update(0);},update(dt){mixer.update(dt);},consumeFinished(){const value=finished;finished=null;return value;},snapshot(){const pose={};for(const name of['Head','Neck','Crest','Wing_L','Wing_R','Tail','Foot_L','Foot_R']){const b=bones[name];if(b)pose[name]=b.quaternion.toArray().map(v=>+v.toFixed(5));}return{asset:CHOCOBO_URL,clip:current,frozen,time:+(actions[current]?.time||0).toFixed(3),history:[...history],bones:pose,position:{x:root.position.x,z:root.position.z},height:2.22};}};
  if(animated){animated.people.push(root);if(!animated.chocobos)animated.chocobos=[];animated.chocobos.push(root.userData.chocobo);}return root;
}
