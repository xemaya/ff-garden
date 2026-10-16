import * as THREE from 'three';
import {rng} from './layout.js';
import {plain,mat} from './materials.js';
import {batchStatic} from './batch.js';

// Countryside around the walled city: terrain with a carved river valley,
// Textured field ground, instanced wheat and leaf sprays, and windmills that reuse
// the approved city plaster/wood/roof assets. No new external assets or generation.
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
  const detail=mat('grass').map;
  m.onBeforeCompile=s=>{s.uniforms.landDetail={value:detail};s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLand;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLand=(modelMatrix*vec4(transformed,1.)).xyz;');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vLand;
uniform sampler2D landDetail;
float ln(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),fract(sin(dot(i+vec2(1,0),vec2(127.1,311.7)))*43758.5453),f.x),mix(fract(sin(dot(i+vec2(0,1),vec2(127.1,311.7)))*43758.5453),fract(sin(dot(i+vec2(1,1),vec2(127.1,311.7)))*43758.5453),f.x),f.y);}
float lh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float riverX(float z){return 58.+9.*sin(z*.035+1.)+4.*sin(z*.011);}
float sstep(float a,float b,float x){return smoothstep(a,b,x);}`).replace('#include <map_fragment>',`#include <map_fragment>
{vec2 w=vLand.xz;float c=cos(${FIELD_ANGLE.toFixed(2)}),s=sin(${FIELD_ANGLE.toFixed(2)});vec2 f=vec2((w.x*c-w.y*s)/${CELL[0]}.,(w.x*s+w.y*c)/${CELL[1]}.);
 f+=vec2(ln(w*.025),ln(w*.025+31.))*.11;vec2 id=floor(f),uv=fract(f);float k=lh(id);
 vec3 crop=k<.22?vec3(.47,.55,.30):k<.40?vec3(.36,.47,.26):k<.56?vec3(.83,.63,.28):k<.68?vec3(.72,.51,.24):k<.80?vec3(.52,.40,.29):vec3(.56,.63,.36);
 float phase=(k<.5?w.x:w.y)*2.4;float rows=(.5+.5*sin(phase))/(1.+fwidth(phase)*3.);crop*=.86+.10*rows+.13*ln(w*.23);
 float grassDetail=dot(texture2D(landDetail,w*.22).rgb,vec3(.3333));crop*=.72+grassDetail*.7;
 float hedge=1.-sstep(.012,.035,min(min(uv.x,1.-uv.x)*${CELL[0]}.,min(uv.y,1.-uv.y)*${CELL[1]}.)/${CELL[1]}.);
 crop=mix(crop,vec3(.27,.36,.21),hedge*.20);
 float city=max(abs(w.x-.5)-41.,max(w.y-55.,-72.-w.y)),castle=max(abs(w.x+1.)-62.,max(w.y+64.,-178.-w.y));
 float open=sstep(0.,14.,city)*sstep(0.,10.,castle);
 float rd=abs(w.x-riverX(w.y));open*=sstep(7.,13.,rd);
 diffuseColor.rgb=mix(diffuseColor.rgb,crop,open*.9);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.50,.38),(1.-sstep(4.,7.5,rd))*.7);}`);};
  m.customProgramCacheKey=()=>'city-textured-fields-v2';return m;}

function river(){const pos=[],idx=[];let i=0;for(let z=-235;z<=140;z+=3,i++){const x=riverX(z),w=5.4+1.2*Math.sin(z*.05);pos.push(x-w,-.78,z,x+w,-.78,z);if(i)idx.push((i-1)*2,i*2,(i-1)*2+1,(i-1)*2+1,i*2,i*2+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  const water=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x4f7f93,roughness:.12,metalness:.05,envMapIntensity:1.6}));water.receiveShadow=true;return water;}

function trees(seed){const random=rng(seed),spots=[];
  const ok=(x,z)=>Math.abs(x)<210&&z>-195&&z<135&&countryside(x,z)>.6&&Math.abs(x-riverX(z))>9;
  for(let g=0;g<26;g++){const cx=(random()-.5)*400,cz=-190+random()*320;if(!ok(cx,cz))continue;const n=6+Math.floor(random()*12);for(let i=0;i<n;i++){const a=random()*6.28,r=Math.sqrt(random())*11,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(ok(x,z))spots.push([x,z,.8+random()*.6]);}}
  // Hedgerow trees sit on the field borders used by the shader.
  const c=Math.cos(FIELD_ANGLE),s=Math.sin(FIELD_ANGLE);
  for(let i=0;i<520&&spots.length<430;i++){const[fx,fz]=fieldLocal((random()-.5)*400,-190+random()*320),edgeX=random()<.5;const u=edgeX?Math.round(fx):fx,v=edgeX?fz:Math.round(fz);const lx=u*CELL[0],lz=v*CELL[1],x=lx*c+lz*s,z=-lx*s+lz*c;if(ok(x,z))spots.push([x,z,.6+random()*.5]);}
  const trunkGeo=new THREE.CylinderGeometry(.14,.26,3.5,7);trunkGeo.translate(0,1.75,0);const crownGeo=leafSprays();
  const trunk=new THREE.InstancedMesh(trunkGeo,mat('wood',0x756348),spots.length),crowns=[0x58703f,0x4d6638,0x667c45].map(c=>new THREE.InstancedMesh(crownGeo,new THREE.MeshStandardMaterial({color:c,vertexColors:true,side:THREE.DoubleSide,roughness:1}),spots.length));
  const counts=[0,0,0],m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
  spots.forEach(([x,z,sc],i)=>{e.set(0,random()*6.28,0);q.setFromEuler(e);m.compose(new THREE.Vector3(x,cityTerrainHeight(x,z)-.1,z),q,new THREE.Vector3(sc,sc*(.9+random()*.3),sc));trunk.setMatrixAt(i,m);const k=i%3;crowns[k].setMatrixAt(counts[k]++,m);});
  crowns.forEach((c,k)=>{c.count=counts[k];c.castShadow=true;c.receiveShadow=true;});trunk.castShadow=true;
  const g=new THREE.Group();g.add(trunk,...crowns);g.userData.dynamic=true;g.userData.trees=spots.length;return g;}

// A shared, open silhouette of leaf sprays instead of a solid icosahedron crown.
function leafSprays(){
  const random=rng(214),p=[],colors=[],uv=[];
  for(let branch=0;branch<10;branch++){
    const angle=branch*2.399,reach=.65+random()*.8,cx=Math.cos(angle)*reach,cz=Math.sin(angle)*reach,cy=2.6+random()*1.9;
    for(let j=0;j<20;j++){
      const a=random()*Math.PI*2,r=Math.sqrt(random())*.8,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r,y=cy+(random()-.5)*.8,w=.29+random()*.28,l=w*1.6;
      const dx=Math.cos(a)*w,dz=Math.sin(a)*w,ex=-Math.sin(a)*l,ez=Math.cos(a)*l;
      const points=[[x-dx,y,z-dz],[x+ex,y+.08,z+ez],[x,y+.12,z],[x+dx,y,z+dz],[x-ex,y-.05,z-ez]];
      for(const k of[0,1,2,1,3,2,3,4,2,4,0,2]){p.push(...points[k]);uv.push(k%2,k>2?1:0);const tint=.78+random()*.30+(y-3)*.10;colors.push(tint,tint,tint*.88);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}

export const WINDMILLS=[{x:84,z:-14,yaw:Math.atan2(-84,-10)},{x:-79,z:12,yaw:Math.atan2(60.15,-76.62)}];
function textured(source,color,rx,ry){const m=source.clone();m.color.setHex(color);m.map=source.map.clone();m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;m.map.repeat.set(rx,ry);m.map.needsUpdate=true;m.roughness=.95;return m;}
function windmill(site,hero,seed){
  const {x,z,yaw}=site,g=new THREE.Group();g.name='textured-windmill';g.position.set(x,cityTerrainHeight(x,z)-.2,z);g.rotation.y=yaw;
  const plaster=textured(hero.plaster,0xe4d5b8,2.6,2),wood=textured(hero.wood,0xa18868,1,2),clay=textured(hero['roof-clay'],0xab7c62,3,1.8),stone=mat('stone',0xb3ad93,2,1),cloth=textured(hero.plaster,0xe9ddbb,1,2);
  cloth.side=THREE.DoubleSide;const iron=plain(0x4a4b43,.8,.15),dark=plain(0x263a3c);
  function add(geo,m,x=0,y=0,z=0,parent=g){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  function box(w,h,d,m,x,y,z,parent=g){return add(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);}
  add(new THREE.CylinderGeometry(2,2.9,10,24),plaster,0,5,0);
  add(new THREE.CylinderGeometry(2.88,3.14,1.05,24),stone,0,.35,0);
  for(const yy of[4.7,9.8])add(new THREE.CylinderGeometry(2.97-yy*.09,2.97-yy*.09,.13,24),wood,0,yy,0);
  // Bell-shaped tiled cap and a deep eave, sharing the street's roof palette.
  const roofProfile=[[0,3.1],[.35,2.7],[1.1,1.55],[2.05,.45],[2.65,.08],[2.8,0]].map(([r,y])=>new THREE.Vector2(r,y));
  add(new THREE.LatheGeometry(roofProfile.reverse(),32),clay,0,10,0);
  add(new THREE.CylinderGeometry(2.83,2.83,.18,32),wood,0,10,0);
  box(1.3,2.2,.14,wood,0,1.1,2.79);for(const xx of[-.78,.78])box(.18,2.45,.3,stone,xx,1.17,2.82);box(1.8,.2,.34,stone,0,2.42,2.82);
  for(const angle of[0,Math.PI/2,Math.PI,-Math.PI/2])for(const yy of[3.45,7.35]){
    const frame=new THREE.Group();frame.rotation.y=angle;g.add(frame);const radius=2.9-.09*yy;
    box(.70,1.05,.12,dark,0,yy,radius+.03,frame);for(const xx of[-.43,.43])box(.12,1.24,.21,wood,xx,yy,radius+.07,frame);
    for(const y2 of[-.60,.60])box(.96,.12,.22,wood,0,yy+y2,radius+.07,frame);box(.07,1.08,.16,wood,0,yy,radius+.15,frame);
    box(1.12,.14,.45,stone,0,yy-.72,radius+.12,frame);
  }
  // Braced gallery gives the tower an inhabited, built silhouette.
  const deck=add(new THREE.CylinderGeometry(3.2,3.2,.18,24),wood,0,4.7,0);
  for(let i=0;i<16;i++){const a=i*Math.PI/8,xx=Math.sin(a)*3.05,zz=Math.cos(a)*3.05;box(.10,.85,.10,wood,xx,5.17,zz);const brace=box(.12,1.25,.12,wood,xx*.88,4.1,zz*.88);brace.rotation.set(Math.cos(a)*.4,0,-Math.sin(a)*.4);}
  add(new THREE.TorusGeometry(3.05,.065,5,32).rotateX(Math.PI/2),wood,0,5.6,0);
  const hub=new THREE.Group();hub.position.set(0,9.8,3.48);g.add(hub);add(new THREE.CylinderGeometry(.36,.36,.85,12).rotateX(Math.PI/2),iron,0,0,0,hub);
  for(let i=0;i<4;i++){
    const arm=new THREE.Group();arm.rotation.z=i*Math.PI/2+seed;hub.add(arm);
    box(.17,7.1,.16,wood,0,3.55,0,arm);box(.10,4.8,.10,wood,1.2,4.8,0,arm);
    const geo=new THREE.PlaneGeometry(1.13,4.8,4,12),pos=geo.attributes.position;
    for(let k=0;k<pos.count;k++){const xx=pos.getX(k),yy=pos.getY(k);pos.setZ(k,.12*Math.sin((xx/.565+1)*Math.PI/2)*Math.cos(yy*.6));}
    geo.computeVertexNormals();add(geo,cloth,.62,4.8,.03,arm);
    for(let k=0;k<8;k++)box(1.30,.055,.10,wood,.60,2.4+k*.68,.09,arm);
  }
  batchStatic(hub);hub.userData.dynamic=true;batchStatic(g);
  g.userData.dynamic=true;g.userData.textured=true;return{root:g,hub};
}

function wheat(seed){
  const random=rng(seed),positions=[],uvs=[];
  function quad(points){for(const k of[0,1,2,0,2,3]){positions.push(...points[k]);uvs.push(k===1||k===2?1:0,k>=2?1:0);}}
  for(let i=0;i<4;i++){
    const x=(random()-.5)*1.25,z=(random()-.5)*1.25,h=.65+random()*.35,a=random()*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);
    quad([[x-dx*.02,0,z-dz*.02],[x+dx*.02,0,z+dz*.02],[x+dx*.08,h,z+dz*.08],[x+dx*.04,h,z+dz*.04]]);
    quad([[x-dx*.10,h,z-dz*.10],[x,h-.06,z],[x+dx*.10,h+.12,z+dz*.10],[x+dx*.03,h+.32,z+dz*.03]]);
    quad([[x,h*.45,z],[x+dx*.33,h*.62,z+dz*.33],[x+dx*.12,h*.57,z+dz*.12],[x-.02,h*.47,z-.02]]);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.computeVertexNormals();
  const spots=[];
  for(let i=0;i<95000&&spots.length<16000;i++){
    const x=-150+random()*300,z=-100+random()*230;
    if(countryside(x,z)<.85||Math.abs(x-riverX(z))<13||WINDMILLS.some(m=>Math.hypot(x-m.x,z-m.z)<5))continue;
    const f=fieldLocal(x,z),v=Math.sin(Math.floor(f[0])*127.1+Math.floor(f[1])*311.7)*43758.5453,k=v-Math.floor(v);
    if(k<.4||k>.68)continue;spots.push([x,z]);
  }
  const material=new THREE.MeshStandardMaterial({color:0xc9ad63,side:THREE.DoubleSide,roughness:1});const time={value:0};
  material.onBeforeCompile=s=>{s.uniforms.cropTime=time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nuniform float cropTime;').replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x+=sin(cropTime*1.6+instanceMatrix[3].x*.32+instanceMatrix[3].z*.21)*.08*position.y*position.y;\n#endif');};
  material.customProgramCacheKey=()=>'city-wheat-sway-v1';
  const mesh=new THREE.InstancedMesh(geo,material,spots.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color();
  spots.forEach(([x,z],i)=>{const sc=.8+random()*.7;q.setFromAxisAngle(new THREE.Vector3(0,1,0),random()*6.28);m.compose(new THREE.Vector3(x,cityTerrainHeight(x,z),z),q,new THREE.Vector3(sc,sc,sc));mesh.setMatrixAt(i,m);c.setHSL(.11+random()*.025,.30+random()*.15,.47+random()*.13);mesh.setColorAt(i,c);});
  mesh.name='wheat-clumps';mesh.receiveShadow=true;mesh.userData.dynamic=true;return{mesh,time};
}

export function buildCityOutskirts(seed=1907,hero){const g=new THREE.Group();g.add(river());const grove=trees(seed*3+5);g.add(grove);
  const mills=WINDMILLS.map((site,i)=>windmill(site,hero,.3+i*.8));mills.forEach(m=>g.add(m.root));const crops=wheat(seed+31);g.add(crops.mesh);
  return{group:g,trees:grove.userData.trees,wheat:crops.mesh.count,update(t){mills.forEach((m,i)=>m.hub.rotation.z=t*(.22+i*.035));crops.time.value=t;}};}
