import * as THREE from 'three';
import {mat,plain} from './materials.js';

// Three modest physical plaques, using local canvas text and shared stone/metal.
export function buildObservationMarkers(sites){
  const group=new THREE.Group(),stone=mat('stone',0xd8c7a5),metal=plain(0x777354,.7,.25);
  function box(w,h,d,material,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  for(const entry of sites){
    const {x,z}=entry.position;box(.72,.15,.55,stone,x,.075,z);box(.14,.82,.14,metal,x,.5,z);box(1.4,.87,.16,stone,x,1.1,z+.08);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=288;const c=canvas.getContext('2d');c.fillStyle='#efe2c0';c.fillRect(0,0,512,288);c.strokeStyle='#b49b65';c.lineWidth=5;c.strokeRect(15,15,482,258);c.fillStyle='#485e52';c.textAlign='center';c.font="52px 'Songti SC',serif";c.fillText(entry.label,256,126);c.font="26px 'Songti SC',serif";c.fillStyle='#79866c';c.fillText('✧  留给旅人的话  ✧',256,196);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:texture,roughness:.93});material.userData.shared=true;
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(1.27,.74),material);plaque.position.set(x,1.1,z+.165);group.add(plaque);
  }
  return group;
}
