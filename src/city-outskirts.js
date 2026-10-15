import * as THREE from 'three';
import {rng} from './layout.js';
import {plain} from './materials.js';

// Countryside around the walled city: terrain with a carved river valley,
// patchwork fields (shader only), groves and hedgerow trees (instanced), and two
// windmills. Procedural; no new downloads.
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const riverX=z=>58+9*Math.sin(z*.035+1)+4*Math.sin(z*.011);
export function cityTerrainHeight(x,z){
  const fade=smooth(39,86,Math.abs(x));let h=-.6+fade*(3.0+2.3*Math.sin(x*.04+z*.027)+1.0*Math.cos(z*.04));
  // The river carves a valley; banks blend back into the hills.
  return THREE.MathUtils.lerp(-1.35,h,smooth(4,15,Math.abs(x-riverX(z))));
}
// Field grid: rotated cells; shared by the shader and the hedgerow tree placement.
const FIELD_ANGLE=.33,CELL=[27,19];
function fieldLocal(x,z){const c=Math.cos(FIELD_ANGLE),s=Math.sin(FIELD_ANGLE);return[(x*c-z*s)/CELL[0],(x*s+z*c)/CELL[1]];}
// 0 inside the city and castle grounds, 1 in open countryside.
function countryside(x,z){const city=Math.max(Math.abs(x-.5)-41,Math.max(z-55,-72-z)),castle=Math.max(Math.abs(x+1)-62,Math.max(z+64,-178-z));return smooth(0,14,city)*smooth(0,10,castle);}

export function terrainMaterial(){const m=new THREE.MeshStandardMaterial({color:0x84906d,roughness:1});
  m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLand;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLand=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vLand;
float lh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float riverX(float z){return 58.+9.*sin(z*.035+1.)+4.*sin(z*.011);}
float sstep(float a,float b,float x){return smoothstep(a,b,x);}`).replace('#include <map_fragment>',`#include <map_fragment>
{vec2 w=vLand.xz;float c=cos(${FIELD_ANGLE.toFixed(2)}),s=sin(${FIELD_ANGLE.toFixed(2)});vec2 f=vec2((w.x*c-w.y*s)/${CELL[0]}.,(w.x*s+w.y*c)/${CELL[1]}.);
 vec2 id=floor(f),uv=fract(f);float k=lh(id);
 vec3 crop=k<.22?vec3(.47,.55,.30):k<.40?vec3(.36,.47,.26):k<.56?vec3(.78,.70,.42):k<.68?vec3(.66,.55,.34):k<.80?vec3(.52,.40,.29):vec3(.56,.63,.36);
 float rows=.5+.5*sin((k<.5?uv.x:uv.y)*${(CELL[0]*1.6).toFixed(1)});crop*=.93+.07*rows;
 float hedge=1.-sstep(.012,.035,min(min(uv.x,1.-uv.x)*${CELL[0]}.,min(uv.y,1.-uv.y)*${CELL[1]}.)/${CELL[1]}.);
 crop=mix(crop,vec3(.27,.36,.21),hedge*.85);
 float city=max(abs(w.x-.5)-41.,max(w.y-55.,-72.-w.y)),castle=max(abs(w.x+1.)-62.,max(w.y+64.,-178.-w.y));
 float open=sstep(0.,14.,city)*sstep(0.,10.,castle);
 float rd=abs(w.x-riverX(w.y));open*=sstep(7.,13.,rd);
 diffuseColor.rgb=mix(diffuseColor.rgb,crop,open*.9);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.50,.38),(1.-sstep(4.,7.5,rd))*.7);}`);};
  m.customProgramCacheKey=()=>'city-patchwork-v1';return m;}

function river(){const pos=[],idx=[];let i=0;for(let z=-235;z<=140;z+=3,i++){const x=riverX(z),w=5.4+1.2*Math.sin(z*.05);pos.push(x-w,-.78,z,x+w,-.78,z);if(i)idx.push((i-1)*2,i*2,(i-1)*2+1,(i-1)*2+1,i*2,i*2+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  const water=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x4f7f93,roughness:.12,metalness:.05,envMapIntensity:1.6}));water.receiveShadow=true;return water;}

function trees(seed){const random=rng(seed),spots=[];
  const ok=(x,z)=>Math.abs(x)<210&&z>-195&&z<135&&countryside(x,z)>.6&&Math.abs(x-riverX(z))>9;
  for(let g=0;g<26;g++){const cx=(random()-.5)*400,cz=-190+random()*320;if(!ok(cx,cz))continue;const n=6+Math.floor(random()*12);for(let i=0;i<n;i++){const a=random()*6.28,r=Math.sqrt(random())*11,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(ok(x,z))spots.push([x,z,.8+random()*.6]);}}
  // Hedgerow trees sit on the field borders used by the shader.
  const c=Math.cos(FIELD_ANGLE),s=Math.sin(FIELD_ANGLE);
  for(let i=0;i<520&&spots.length<430;i++){const[fx,fz]=fieldLocal((random()-.5)*400,-190+random()*320),edgeX=random()<.5;const u=edgeX?Math.round(fx):fx,v=edgeX?fz:Math.round(fz);const lx=u*CELL[0],lz=v*CELL[1],x=lx*c+lz*s,z=-lx*s+lz*c;if(ok(x,z))spots.push([x,z,.6+random()*.5]);}
  const trunkGeo=new THREE.CylinderGeometry(.18,.26,2.2,5);trunkGeo.translate(0,1.1,0);const crownGeo=new THREE.IcosahedronGeometry(1.9,0);crownGeo.scale(1,1.15,1);crownGeo.translate(0,3.4,0);
  const trunk=new THREE.InstancedMesh(trunkGeo,plain(0x5b4a3a),spots.length),crowns=[0x58703f,0x4d6638,0x667c45].map(c=>new THREE.InstancedMesh(crownGeo,plain(c,.95),spots.length));
  const counts=[0,0,0],m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
  spots.forEach(([x,z,sc],i)=>{e.set(0,random()*6.28,0);q.setFromEuler(e);m.compose(new THREE.Vector3(x,cityTerrainHeight(x,z)-.1,z),q,new THREE.Vector3(sc,sc*(.9+random()*.3),sc));trunk.setMatrixAt(i,m);const k=i%3;crowns[k].setMatrixAt(counts[k]++,m);});
  crowns.forEach((c,k)=>{c.count=counts[k];c.castShadow=true;c.receiveShadow=true;});trunk.castShadow=true;
  const g=new THREE.Group();g.add(trunk,...crowns);g.userData.dynamic=true;g.userData.trees=spots.length;return g;}

function windmill(x,z,yaw,seed){const g=new THREE.Group(),y=cityTerrainHeight(x,z)-.2;g.position.set(x,y,z);g.rotation.y=yaw;
  const plaster=plain(0xe6dcc6,.95),wood=plain(0x6d5440,.9),clay=plain(0xa9624a,.9);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(2.0,2.9,10,10),plaster);body.position.y=5;body.castShadow=body.receiveShadow=true;g.add(body);
  for(const yy of[.3,5,9.8]){const band=new THREE.Mesh(new THREE.CylinderGeometry(2.95-yy*.09,2.95-yy*.09,.25,10),wood);band.position.y=yy;g.add(band);}
  const cap=new THREE.Mesh(new THREE.ConeGeometry(2.6,3.4,10),clay);cap.position.y=11.7;cap.castShadow=true;g.add(cap);
  const door=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.9,.1),wood);door.position.set(0,.95,2.75);door.rotation.x=-.08;g.add(door);
  const hub=new THREE.Group();hub.position.set(0,10.6,2.3);g.add(hub);hub.add(new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.7,8).rotateX(Math.PI/2),wood));
  for(let i=0;i<4;i++){const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2+seed;hub.add(arm);const spar=new THREE.Mesh(new THREE.BoxGeometry(.16,8.4,.12),wood);spar.position.y=4.2;arm.add(spar);
    const sail=new THREE.Mesh(new THREE.PlaneGeometry(1.5,6.4),new THREE.MeshStandardMaterial({color:0xefe6d2,roughness:1,side:THREE.DoubleSide}));sail.position.set(.85,5,.05);sail.castShadow=true;arm.add(sail);
    for(let k=0;k<6;k++){const rung=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,.05),wood);rung.position.set(.85,2.1+k*1.15,.08);arm.add(rung);}}
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});g.userData.dynamic=true;return{root:g,hub};}

export function buildCityOutskirts(seed=1907){const g=new THREE.Group();g.add(river());const grove=trees(seed*3+5);g.add(grove);
  const mills=[windmill(84,-14,-1.25,.3),windmill(-79,12,1.2,1.1)];mills.forEach(m=>g.add(m.root));
  return{group:g,trees:grove.userData.trees,update(t){mills.forEach((m,i)=>m.hub.rotation.z=t*(.42+i*.07));}};}
