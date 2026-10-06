import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Merge opaque static module parts by material. Keep sprites, lights, transparent
// curtains and the reflector independent. This makes asset reuse cheap to render.
export function batchStatic(group){
  group.updateMatrixWorld(true);
  const inverse=group.matrixWorld.clone().invert(),buckets=new Map(),meshes=[];
  group.traverse(o=>{
    let ancestor=o,dynamic=false;while(ancestor&&ancestor!==group){if(ancestor.userData.dynamic){dynamic=true;break;}ancestor=ancestor.parent;}
    if(!o.isMesh||dynamic||o.userData.reflector||Array.isArray(o.material)||o.material.transparent)return;
    const key=`${o.material.uuid}-${o.castShadow}-${o.receiveShadow}`;
    if(!buckets.has(key))buckets.set(key,{material:o.material,cast:o.castShadow,receive:o.receiveShadow,geometries:[]});
    const transform=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld);
    let geometry=o.geometry.clone().applyMatrix4(transform);if(geometry.index){const unindexed=geometry.toNonIndexed();geometry.dispose();geometry=unindexed;}buckets.get(key).geometries.push(geometry);meshes.push(o);
  });
  for(const o of meshes){o.removeFromParent();o.geometry.dispose();}
  for(const {material,cast,receive,geometries}of buckets.values()){
    const merged=mergeGeometries(geometries,false);
    if(!merged)throw new Error('模块几何合并失败');
    const m=new THREE.Mesh(merged,material);m.castShadow=cast;m.receiveShadow=receive;group.add(m);geometries.forEach(g=>g.dispose());
  }
  return {parts:meshes.length,batches:buckets.size};
}
