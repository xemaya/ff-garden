import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CitySSAOPass} from '../src/city-ssao.js';
import {cityCameraHeight,followCameraHeight} from '../src/city-camera-height.js';
import {cityHeight} from '../src/city-plan.js';
import {WINDMILLS} from '../src/city-outskirts.js';

test('halo quads do not enter the normal/depth pass; render visibility is restored',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),pass=new CitySSAOPass(scene,camera,32,32);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,opacity:.8,depthWrite:false}));
  const hidden=new THREE.Sprite();hidden.visible=false;
  const wall=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());scene.add(halo,hidden,wall);
  pass.overrideVisibility();assert.equal(halo.visible,false);assert.equal(wall.visible,true);
  pass.restoreVisibility();assert.equal(halo.visible,true);assert.equal(hidden.visible,false);
  pass.dispose();
});
test('each stair flight has a continuous camera support with flat joins',()=>{
  for(const start of[-38,-51]){
    const base=start===-38?0:1.45;
    assert.equal(cityCameraHeight(0,start),base);assert.equal(cityCameraHeight(0,start-2),base+1.45);
    let maxAcceleration=0,lastV=0;
    for(let i=0;i<=180;i++){
      const z=start+2-i/30*2,dt=1/30;
      const v=(cityCameraHeight(0,z-2*dt)-cityCameraHeight(0,z))/dt;
      if(i)maxAcceleration=Math.max(maxAcceleration,Math.abs(v-lastV)/dt);lastV=v;
      assert.ok(Math.abs(cityCameraHeight(0,z)-cityHeight(0,z))<.33,'eye remains close to the visible tread support');
    }
    assert.ok(maxAcceleration<10,'no per-tread velocity spikes');
    assert.ok(Math.abs(cityCameraHeight(0,start-.00001)-base)<1e-8);
  }
});
test('camera damping is stable across frame rates',()=>{
  const run=fps=>{let y=0;for(let i=0;i<fps;i++)y=followCameraHeight(y,2.9,1/fps);return y;};
  assert.ok(Math.abs(run(30)-run(144))<1e-12);
});
test('the final windmill sails face the actual final-shot observation point',()=>{
  const mill=WINDMILLS[1],dx=-18.85-mill.x,dz=-64.62-mill.z,len=Math.hypot(dx,dz);
  assert.ok((Math.sin(mill.yaw)*dx+Math.cos(mill.yaw)*dz)/len>.99,'blades must not appear edge-on');
});
