import * as THREE from 'three';
import {mat,plain} from './materials.js';
import {buildPlazaPaving,buildPlazaTurf} from './plaza.js';

// A bounded outdoor district; static meshes are merged by the existing batcher.
export function buildRoyalDistrict(plan){
  const city=new THREE.Group(),stone=mat('stone',0xd9c7a4),light=mat('stone',0xf0dfbb),roof=mat('roof',0x497c80),gold=plain(0xb89855,.5,.3),dark=plain(0x314b58),hedge=plain(0x647c50);
  let parts=0;
  function mesh(geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;city.add(m);parts++;return m;}
  const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  function plane(w,d,m,x,z,y=.035){const p=mesh(new THREE.PlaneGeometry(w,d),m,x,y,z);p.rotation.x=-Math.PI/2;p.castShadow=false;return p;}
  function arch(w,h,depth,m,x,y,z){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h-w/2);shape.absarc(0,h-w/2,w/2,0,Math.PI,false);shape.closePath();return mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10}),m,x,y,z);}
  function gateArch(w,spring,rise,thickness,depth,z){const shape=new THREE.Shape();shape.moveTo(-w/2,spring);shape.lineTo(-w/2,spring+rise+thickness);shape.lineTo(w/2,spring+rise+thickness);shape.lineTo(w/2,spring);shape.quadraticCurveTo(0,spring+rise*2,-w/2,spring);shape.closePath();return mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:20}),light,0,0,z-depth/2);}
  function gable(w,d,rise,x,y,z){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,rise);shape.lineTo(w/2,0);shape.closePath();return mesh(new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false}),roof,x,y,z-d/2);}
  function sign(text,x,y,z){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const c=canvas.getContext('2d');c.fillStyle='#f1dfb5';c.fillRect(0,0,768,160);c.strokeStyle='#ae9057';c.lineWidth=8;c.strokeRect(8,8,752,144);c.fillStyle='#42594f';c.font="54px 'Songti SC',serif";c.textAlign='center';c.textBaseline='middle';c.fillText(text,384,80);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:texture,roughness:.85});material.userData.shared=true;mesh(new THREE.BoxGeometry(5.2,1.08,.12),material,x,y,z);}
  // Flat navigation and visibly flat pavement agree; beds and architecture define the edges.
  plane(48,110,mat('grass',0xaebc88,48,110),0,-4,-.015);
  plane(10,64,mat('pavers',0xe2d3b2,10,64),0,17);
  plane(10,10,mat('pavers',0xe2d3b2,10,10),0,-38);
  plane(32,21,mat('pavers',0xe9dcbc,32,21),0,-47.5);
  city.add(buildPlazaPaving(),buildPlazaTurf());
  for(const side of[-1,1]){
    plane(2,66,mat('pavers',0xcabd99,2,66),side*19,-3);
    for(const z of[31,13,-5,-33,-52]){
      box(.13,3.7,.13,gold,side*4.6,1.9,z);
      mesh(new THREE.SphereGeometry(.24,10,6),plain(0xf1dfb3),side*4.6,3.83,z);
      mesh(new THREE.ConeGeometry(.36,.3,8),roof,side*4.6,4.14,z);
    }
  }
  for(const s of plan.structures){
    if(s.kind==='tower'){
      mesh(new THREE.CylinderGeometry(s.r*.98,s.r,s.h,16),stone,s.x,s.h/2,s.z);
      mesh(new THREE.CylinderGeometry(s.r*1.15,s.r*1.15,.5,16),light,s.x,s.h-.7,s.z);
      mesh(new THREE.ConeGeometry(s.r*1.32,s.r*2,16),roof,s.x,s.h+s.r*.94,s.z);
      mesh(new THREE.SphereGeometry(.19,8,6),gold,s.x,s.h+s.r*1.94,s.z);
      for(const y of[4.8,s.h*.62])arch(.85,1.85,.03,dark,s.x,y,s.z+s.r+.035);
    }else{
      box(s.w,s.h,s.d,s.kind==='garden'?stone:s.kind==='palace'?light:stone,s.x,s.h/2,s.z);
      if(s.kind==='garden'){box(s.w-.25,.6,s.d-.25,hedge,s.x,.7,s.z);continue;}
      box(s.w+.18,.25,s.d+.16,light,s.x,s.h-.15,s.z);
      if(s.kind==='wall'){
        const long=s.d>s.w,n=Math.ceil((long?s.d:s.w)/2.3);
        for(let i=0;i<n;i++)box(long?s.w+.1:1,.6,long?1:s.d+.1,light,s.x+(long?0:(i+.5)*s.w/n-s.w/2),s.h+.25,s.z+(long?(i+.5)*s.d/n-s.d/2:0));
      }else{
        const front=s.z+s.d/2+.025;
        gable(s.w+1,s.d+1,s.id==='palace-hall'?4.5:3,s.x,s.h,s.z);
        for(let x=s.x-s.w/2+1.5;x<s.x+s.w/2;x+=3)for(const y of[3.4,7]){arch(1.1,2.45,.08,dark,x,y,front);box(1.35,.15,.2,gold,x,y,front+.04);}
        for(const x of[s.x-s.w/2+.4,s.x+s.w/2-.4])box(.48,s.h,.42,stone,x,s.h/2,front);
      }
    }
  }
  // Overhead members never create a ground-level invisible barrier.
  gateArch(10,5.8,3.4,1,1.7,42);box(11,.38,2,roof,0,10.35,42);
  sign('听 风 王 城',0,9.55,42.93);
  gateArch(10.4,4.4,2,.5,1.3,-37);sign('风铃外庭',0,6.93,-36.25);
  arch(3.7,6.2,.14,plain(0x5c4d3c),0,.1,-58.84);
  box(4.3,.35,.45,stone,0,6.35,-58.75);sign('听风议事厅',0,9.2,-58.83);
  mesh(new THREE.CircleGeometry(1.4,32),plain(0xf1dfb5),0,13,-58.85);
  mesh(new THREE.TorusGeometry(1.45,.09,6,32),gold,0,13,-58.78);
  box(.08,1.03,.06,dark,0,13.45,-58.69);const hand=box(.8,.08,.06,dark,.35,13.1,-58.69);hand.rotation.z=.35;
  for(const side of[-1,1]){box(.055,4,.055,gold,side*8,18,-65);box(1.4,1.05,.045,roof,side*8+.65,19,-65);}
  // Map and diagnostic metadata describe the real playable geometry.
  city.userData.royalMetrics={name:plan.royal.name,staticParts:parts,groundSolids:plan.structures.length,zones:4,interiors:false};
  return city;
}
