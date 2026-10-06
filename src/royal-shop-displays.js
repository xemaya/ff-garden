import * as THREE from 'three';
import {plain} from './materials.js';

// Royal-only shelf replacements, using the existing facade space and palette.
export function buildRoyalShopDisplay(kind,width,wood){
 if(!['toys','cafe'].includes(kind))return null;
 const group=new THREE.Group(),cream=plain(0xe3d0ab),dark=plain(0x544532),green=plain(0x667555);let parts=0;
 function mesh(geometry,material,x,y,z){const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;group.add(object);parts++;return object;}
 const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
 if(kind==='toys'){
  for(let i=0;i<3;i++){
   const x=(i-1)*width*.25,y=1.45;
   box(.33,.43,.18,wood,x,y,.02);
   const roof=mesh(new THREE.ConeGeometry(.17,.17,4),wood,x,y+.29,.02);roof.rotation.y=Math.PI/4;
   mesh(new THREE.CircleGeometry(.125,16),cream,x,y+.035,.116);
   box(.014,.075,.008,dark,x,y+.065,.122);const hand=box(.075,.012,.008,dark,x+.026,y+.015,.125);hand.rotation.z=-.25;
   mesh(new THREE.CircleGeometry(.035,10),cream,x,y-.145,.116);
  }
  group.userData.storyDisplay={kind:'wood-clocks',clocks:3,cups:0,parts};
 }else{
  for(let row=0;row<2;row++)for(const x of[-width*.25,width*.08]){
   const y=1.255+row*.53;
   mesh(new THREE.CylinderGeometry(.12,.12,.018,12),cream,x,y,.06);
   mesh(new THREE.CylinderGeometry(.082,.06,.13,12,1,true),green,x,y+.075,.06);
   const tea=mesh(new THREE.CircleGeometry(.075,12),dark,x,y+.139,.06);tea.rotation.x=-Math.PI/2;
   mesh(new THREE.TorusGeometry(.044,.013,5,10),green,x+.092,y+.077,.06);
  }
  const x=width*.32,y=1.37;
  const pot=mesh(new THREE.SphereGeometry(.14,12,8),green,x,y,.02);pot.scale.y=.85;
  mesh(new THREE.CylinderGeometry(.068,.075,.07,12),green,x,y+.1,.02);
  mesh(new THREE.CylinderGeometry(.085,.085,.018,12),cream,x,y+.142,.02);
  mesh(new THREE.SphereGeometry(.022,8,5),green,x,y+.169,.02);
  const spout=mesh(new THREE.CylinderGeometry(.027,.055,.16,10),green,x-.15,y+.03,.02);spout.rotation.z=.85;
  mesh(new THREE.TorusGeometry(.08,.018,5,12),green,x+.145,y,.02);
  group.userData.storyDisplay={kind:'tea-service',clocks:0,cups:4,parts};
 }
 return group;
}
