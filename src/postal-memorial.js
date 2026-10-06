import * as THREE from 'three';
import {plain,mat} from './materials.js';
import {batchStatic} from './batch.js';

export const MEMORIAL_POSITION=Object.freeze({x:-6.7,z:-18.5});
export function attachPostalMemorial(plan){
  plan.colliders.push({id:'postal-memorial',type:'circle',...MEMORIAL_POSITION,r:.58});
}
export function createPostalMemorial(materials={}){
  const root=new THREE.Group(),keepsake=new THREE.Group(),wood=materials.wood||mat('wood',0x9c7955),gold=plain(0xb89855,.5,.3),paper=plain(0xf0e0b7),green=plain(0x6b8157),petal=plain(0xc5a2b5);let parts=0;
  root.position.set(MEMORIAL_POSITION.x,0,MEMORIAL_POSITION.z);root.add(keepsake);keepsake.userData.dynamic=true;keepsake.visible=false;
  function mesh(group,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);parts++;return m;}
  const box=(group,w,h,d,material,x,y,z)=>mesh(group,new THREE.BoxGeometry(w,h,d),material,x,y,z);
  // The support table is always present, so its collider is never invisible.
  box(root,.95,.11,.72,wood,0,.78,0);
  for(const x of[-.33,.33])for(const z of[-.24,.24])box(root,.09,.74,.09,wood,x,.37,z);
  box(keepsake,.4,.025,.27,paper,-.16,.85,.08);box(keepsake,.34,.012,.018,gold,-.16,.87,.1);
  for(const side of[-1,1])box(keepsake,.045,.89,.045,gold,side*.35,1.28,-.19);
  box(keepsake,.78,.045,.045,gold,0,1.74,-.19);
  for(const [i,length] of [.20,.20,.40].entries()){
    const x=-.23+i*.23;box(keepsake,.018,.12,.018,green,x,1.66,-.19);
    mesh(keepsake,new THREE.CylinderGeometry(.038,.045,length,10),gold,x,1.59-length/2,-.19);
  }
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;const m=mesh(keepsake,new THREE.SphereGeometry(.052,8,5),petal,-.16+Math.cos(angle)*.055,.90,.06+Math.sin(angle)*.055);m.scale.y=.35;}
  mesh(keepsake,new THREE.SphereGeometry(.033,8,5),gold,-.16,.91,.06);
  const shape=new THREE.Shape();shape.moveTo(0,-.17);shape.quadraticCurveTo(-.11,-.02,0,.18);shape.quadraticCurveTo(.1,.05,0,-.17);const feather=mesh(keepsake,new THREE.ShapeGeometry(shape,12),paper,.18,.875,.09);feather.rotation.x=-Math.PI/2;feather.rotation.z=.45;box(keepsake,.012,.018,.3,gold,.18,.883,.09);
  const batches=batchStatic(keepsake);let completed=false;
  return {root,setCompleted(value){if(completed===value)return;completed=value;keepsake.visible=value;},snapshot(){return {completed,position:{...MEMORIAL_POSITION},parts,keepsakeBatches:batches.batches};}};
}
