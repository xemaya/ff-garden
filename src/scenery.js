import * as THREE from 'three';
import {rng} from './layout.js';
let masonry,edge,roof,cityRoofs,bark,leafMaterial,windowMat,iron,gold;
const stats={revision:'branched-trees-royal-city-v3',trees:0,leaves:0,branches:0,arches:0,windows:0,newImageGenerationCalls:0};
export function sceneryMetrics(){return {...stats};}
export function initSceneryMaterials(hero){
 const muted=(source,color,strength,key)=>{const map=source.map.clone();map.repeat.set(.18,.18);map.needsUpdate=true;const m=new THREE.MeshStandardMaterial({color,map,roughness:.95});m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\ndiffuseColor.rgb=mix(diffuse,diffuseColor.rgb,${strength.toFixed(2)});`);};m.customProgramCacheKey=()=>key;return m;};
 masonry=muted(hero.plaster,0xbfc0b4,.25,'city-limestone-v3');edge=muted(hero.plaster,0xd1cfc1,.18,'city-trim-v3');roof=muted(hero['roof-teal'],0x526b70,.26,'city-slate-v3');
 const soften=masonry.onBeforeCompile;masonry.onBeforeCompile=shader=>{soften(shader);shader.vertexShader='varying vec3 vCityPosition; varying vec3 vCityNormal;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityPosition=(modelMatrix*vec4(transformed,1.0)).xyz; vCityNormal=mat3(modelMatrix)*normal;');shader.fragmentShader='varying vec3 vCityPosition; varying vec3 vCityNormal;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 cn=abs(normalize(vCityNormal));
vec2 stoneUV=vec2(cn.x>cn.z?vCityPosition.z:vCityPosition.x,vCityPosition.y);
float row=floor(stoneUV.y/.32);vec2 cell=vec2(stoneUV.x/.78+mod(row,2.0)*.5,stoneUV.y/.32);
vec2 f=fract(cell);float seam=(1.0-smoothstep(.009,.025,min(f.x,1.0-f.x)))*.11+(1.0-smoothstep(.015,.032,min(f.y,1.0-f.y)))*.11;
float tone=fract(sin(dot(floor(cell),vec2(12.9898,78.233)))*43758.5453);
diffuseColor.rgb*=1.0-seam+(tone-.5)*.075;`);};masonry.customProgramCacheKey=()=> 'city-limestone-courses-v3';
 cityRoofs=[roof,muted(hero['roof-clay'],0x806359,.25,'city-clay-v3'),muted(hero['roof-teal'],0x667570,.22,'city-weathered-v3')];
 bark=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1});leafMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});windowMat=new THREE.MeshStandardMaterial({color:0x435b61,roughness:.72});iron=new THREE.MeshStandardMaterial({color:0x58666a,roughness:.8});gold=new THREE.MeshStandardMaterial({color:0x998555,roughness:.8,metalness:.15});
 Object.assign(stats,{trees:0,leaves:0,branches:0,arches:0,windows:0});
}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,m,x=0,y=0,z=0){const geo=new THREE.BoxGeometry(w,h,d),uv=geo.attributes.uv;for(let f=0;f<6;f++){const a=f<2?d:w,b=f<4?h:d;for(let i=f*4;i<f*4+4;i++){uv.setXY(i,uv.getX(i)*a/2,uv.getY(i)*b/2);}}return mesh(g,geo,m,x,y,z);}
function cyl(g,rt,rb,h,m,x,y,z,n=24){return mesh(g,new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);}
function tube(g,pts,r,m,n=18){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,6,false),m);}
function arch(w,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h-w*.5);s.quadraticCurveTo(-w/2,h,0,h);s.quadraticCurveTo(w/2,h,w/2,h-w*.5);s.lineTo(w/2,0);s.closePath();return s;}
function opening(g,x,y,z,w,h){mesh(g,new THREE.ShapeGeometry(arch(w,h),20),windowMat,x,y,z);const outer=arch(w+.27,h+.18);outer.holes.push(new THREE.Path(arch(w,h).getPoints(20).reverse()));mesh(g,new THREE.ExtrudeGeometry(outer,{depth:.17,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1}),edge,x,y-.02,z+.03);box(g,.065,h-.15,.09,edge,x,y+h*.46,z+.21);box(g,w+.38,.16,.35,edge,x,y-.09,z+.04);stats.windows++;}
function branch(g,points,start,end,random){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),frames=path.computeFrenetFrames(18,false),pos=[],col=[],uv=[],c=new THREE.Color();
 const point=(i,j)=>{const u=i/18,a=j/10*Math.PI*2,r=THREE.MathUtils.lerp(start,end,u)*(1+.07*Math.sin(j*4+i*.5));const p=path.getPoint(u).addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);return p;};
 for(let i=0;i<18;i++)for(let j=0;j<10;j++)for(const [a,b]of[[i,j],[i+1,j],[i,j+1],[i,j+1],[i+1,j],[i+1,j+1]]){pos.push(...point(a,b).toArray());c.setHSL(.085,.18,.22+.065*Math.sin(b*2.8)+random()*.022).convertSRGBToLinear();col.push(...c.toArray());uv.push(b/10,a/18);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(pos.length),3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();mesh(g,geo,bark);stats.branches++;
}
export function buildGardenTree(t){const g=new THREE.Group(),random=rng(Math.round((t.x+30)*101)),clusters=[],pos=[],colors=[],uv=[],c=new THREE.Color();
 branch(g,[[0,0,0],[-.04,1.1,.03],[.10,2.3,0],[.02,3.3,-.12],[-.12,4.3,-.05]],.24,.065,random);
 for(let i=0;i<8;i++){const a=i*2.399,base=2.0+i*.22,len=1.0+random()*.65,x=Math.cos(a)*len,z=Math.sin(a)*len,y=3.35+(1.65-len)*1.1+(i%3)*.35+random()*.32;
 branch(g,[[.07,base,0],[x*.36,base+.40,z*.36],[x*.72,y-.25,z*.7],[x,y,z]],.08-i*.003,.017,random);
 for(let j=0;j<3;j++){const a2=a+(j-1)*.72,xx=x+Math.cos(a2)*(.45+random()*.20),zz=z+Math.sin(a2)*(.4+random()*.20),yy=y+.22+random()*.43;branch(g,[[x*.72,y-.25,z*.7],[x,y,z],[xx,yy,zz]],.024,.006,random);clusters.push([xx,yy,zz,.61+random()*.22,.52+random()*.28]);}
 }
 for(let i=0;i<4;i++){const a=i*2.4,x=Math.cos(a)*.55,z=Math.sin(a)*.5,y=4.65+random()*.60;branch(g,[[.02,3.35,-.12],[x*.50,4.1,z*.50],[x,y,z]],.05,.009,random);clusters.push([x,y+.10,z,.68,.70]);}
 clusters.push([-.1,4.6,0,.85,.80]);
 // Curved individual leaves form irregular sprays. No solid canopy primitives.
 for(const [cx,cy,cz,rx,ry]of clusters)for(let i=0;i<165;i++){
  const a=random()*Math.PI*2,v=random()*2-1,r=Math.pow(random(),.42),s=Math.sqrt(1-v*v),p=new THREE.Vector3(cx+Math.cos(a)*s*r*rx,cy+v*r*ry,cz+Math.sin(a)*s*r*rx);
  const length=.105+random()*.13,width=length*(.33+random()*.20),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(random()*2-.8,random()*Math.PI*2,random()*2-.9));
  const shape=[[-length*.55,0,0],[0,.026,-width],[length*.6,0,0],[0,.026,width],[0,.044,0]],tone=.32+random()*.10+(p.y-3.6)*.03;
  for(const ids of[[0,1,4],[1,2,4],[2,3,4],[3,0,4]])for(const id of ids){const vtx=new THREE.Vector3(...shape[id]).applyQuaternion(q).add(p);pos.push(...vtx.toArray());c.setHSL(.235+random()*.018,.29,tone+(id===4?.035:0)).convertSRGBToLinear();colors.push(...c.toArray());uv.push(id===2?1:0,id===3?1:0);}
  stats.leaves++;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();mesh(g,geo,leafMaterial);
 // Root flares stay inside the original trunk collider.
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;branch(g,[[0,.42,0],[Math.cos(a)*.13,.15,Math.sin(a)*.13],[Math.cos(a)*.25,.015,Math.sin(a)*.25]],.10,.016,random);}
 g.position.set(t.x,0,t.z);g.scale.setScalar(t.scale);stats.trees++;return g;
}
function hipRoof(g,w,d,h,x,y,z,m=roof){const p=[],uv=[],pts=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w*.24,h,0],[w*.24,h,0]];
 for(const ids of[[0,1,5],[0,5,4],[1,2,5],[2,3,4],[2,4,5],[3,0,4]])for(const id of ids){p.push(...pts[id]);uv.push((pts[id][0]+w/2)/2,(pts[id][2]+d/2+pts[id][1])/2);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const o=mesh(g,geo,m,x,y,z);o.material.side=THREE.DoubleSide;box(g,w*.50,.14,.16,iron,x,y+h,z);box(g,w+.12,.16,d+.12,edge,x,y-.08,z);
}
function turret(g,x,z,r,h){cyl(g,r,r*1.05,h,masonry,x,h/2,z);cyl(g,r+.20,r+.17,.35,edge,x,h-.2,z);cyl(g,r+.15,r+.15,.20,edge,x,h*.50,z);
 const points=[[r*1.20,0],[r*1.20,.13],[r,.38],[r*.78,1.2],[r*.46,2.6],[r*.19,4.2],[0,5.6]].map(([a,b])=>new THREE.Vector2(a,b));mesh(g,new THREE.LatheGeometry(points,28),roof,x,h,z);
 for(let i=1;i<=5;i++){const u=i/6,rr=r*1.08*Math.pow(1-u,1.12);const o=mesh(g,new THREE.TorusGeometry(rr,.035,4,28),iron,x,h+.15+u*4.5,z);o.rotation.x=Math.PI/2;}
 cyl(g,.035,.045,1.3,gold,x,h+6.12,z,6);
 for(let yy=5;yy<h-2;yy+=5)opening(g,x,yy,z+r+.015,.68,1.9);
 for(const a of[-.7,.7]){const rib=new THREE.Group();rib.position.set(x+Math.sin(a)*r*.95,0,z+Math.cos(a)*r*.95);rib.rotation.y=a;g.add(rib);box(rib,.20,h*.92,.35,edge,0,h*.46,.04);}
}
function gallery(g,x,z,n){const w=4.6,h=5.2,wall=new THREE.Shape();wall.moveTo(-w*n/2,0);wall.lineTo(w*n/2,0);wall.lineTo(w*n/2,6.1);wall.lineTo(-w*n/2,6.1);wall.closePath();
 for(let i=0;i<n;i++){const hole=arch(3.1,h).getPoints(24).reverse().map(p=>new THREE.Vector2(p.x-w*n/2+w*(i+.5),p.y));wall.holes.push(new THREE.Path(hole));stats.arches++;}
 mesh(g,new THREE.ExtrudeGeometry(wall,{depth:2.0,bevelEnabled:true,bevelSize:.06,bevelThickness:.04,bevelSegments:1}),masonry,x,3.0,z);
 box(g,w*n+.6,.36,2.7,edge,x,9.15,z+.9);for(let xx=-w*n/2;xx<=w*n/2;xx+=2.3){box(g,.18,1.02,.18,edge,x+xx,9.72,z+2.2);}box(g,w*n+.6,.18,.34,edge,x,10.22,z+2.2);
}
export function buildRoyalBackdrop(){const g=new THREE.Group();
 // The lower town is grounded on a terraced base, with recessed open galleries.
 box(g,86,2.8,32,masonry,0,1.28,-84);box(g,87,.30,33,edge,0,2.85,-84);
 gallery(g,-22,-67,7);gallery(g,22,-71,7);
 for(let i=0;i<14;i++){const x=-35+i*5.4,z=-80-(i%3)*5,h=5.8+(i*7%5),w=3.9+(i%3)*.24;const b=new THREE.Group();b.position.set(x,2.9,z);g.add(b);box(b,w,h,5.2,masonry,0,h/2,0);hipRoof(b,w+.65,5.9,2.0+(i%4)*.25,0,h,0,cityRoofs[i%3]);for(const xx of[-1,1])for(let yy=1.3;yy<h-1;yy+=2.5)opening(b,xx,yy,2.62,.63,1.5);box(b,.42,2,.50,edge,1.2,h+1,-1.5);for(const yy of[.2,h*.5])box(b,w+.08,.13,5.28,edge,0,yy,0);for(const xx of[-w/2+.11,w/2-.11])box(b,.19,h+.12,.23,edge,xx,h/2,2.62);}
 // An axial gateway connects the palace to the lower district.
 for(let i=0;i<7;i++)box(g,7+i*.42,.30,1.8,edge,-1,.15+i*.38,-60-i*1.55);
 const gate=new THREE.Group();gate.position.set(-1,3,-76);g.add(gate);gallery(gate,0,0,2);hipRoof(gate,10.3,3.6,2.5,0,10.5,1);for(const x of[-5.2,5.2])turret(gate,x,0,.85,12);
 const palace=new THREE.Group();palace.position.set(-1,7.0,-119);palace.rotation.y=-.10;g.add(palace);
 box(palace,37,3.8,25,masonry,0,1.9,0);box(palace,38,.45,26,edge,0,3.85,0);
 // Central nave, side aisles and stepped roof volumes read as built architecture.
 box(palace,15,22,22,masonry,0,15,-1);hipRoof(palace,16.5,24,5.4,0,26,-1);
 for(const side of[-1,1]){box(palace,7,13,20,masonry,side*11,10,-1);hipRoof(palace,8,22,3.8,side*11,16.5,-1);for(const zz of[7,1,-5]){box(palace,.70,14,1.15,edge,side*15,10,zz);tube(palace,[[side*15,16,zz],[side*11,20,zz],[side*8,22,zz]],.23,edge);}}
 for(const [x,z,r,h]of[[-16,7,1.8,21],[16,7,1.8,22],[-9,-7,1.75,30],[9,-7,1.75,32],[-4.5,-13,1.1,35],[4.5,-13,1.1,36]])turret(palace,x,z,r,h);
 opening(palace,0,4.1,10.02,3.6,7.1);for(const x of[-4.4,4.4]){opening(palace,x,6,10.04,1.5,5);opening(palace,x,15,10.04,1.2,5.3);box(palace,.60,23,1.25,edge,x+Math.sign(x)*1.1,15,10.1);}
 for(const yy of[4.3,12.2,23.7])box(palace,15.6,.25,22.5,edge,0,yy,-1);
 for(const side of[-1,1]){const banner=new THREE.Shape();banner.moveTo(-.5,0);banner.lineTo(.5,0);banner.lineTo(.5,-4.1);banner.lineTo(0,-3.75);banner.lineTo(-.5,-4.1);banner.closePath();mesh(palace,new THREE.ShapeGeometry(banner),new THREE.MeshStandardMaterial({color:side<0?0x703f4a:0x40566a,roughness:1,side:THREE.DoubleSide}),side*6.5,19.2,10.84);box(palace,1.4,.08,.12,gold,side*6.5,19.25,10.82);tube(palace,[[side*6.5,17.1,10.88],[side*6.5,18.2,10.88]],.025,gold,1);}
 const rose=mesh(palace,new THREE.CircleGeometry(2.15,48),windowMat,0,21,10.05);for(let i=0;i<12;i++){const a=i*Math.PI/6;tube(palace,[[0,21,10.1],[Math.cos(a)*2,21+Math.sin(a)*2,10.1]],.048,edge,1);}const rim=mesh(palace,new THREE.TorusGeometry(2.18,.15,6,48),edge,0,21,10.2);
 // Faceted sword tower: narrower taper, a dark socket, side ribs and ledges.
 box(palace,7.2,9,7.8,masonry,0,32,-5);hipRoof(palace,8.2,8.8,3.2,0,36.5,-5);
 const s=new THREE.Shape();s.moveTo(-1.95,35);s.lineTo(-1.7,49);s.lineTo(-.75,59);s.lineTo(0,65);s.lineTo(.75,59);s.lineTo(1.7,49);s.lineTo(1.95,35);s.closePath();mesh(palace,new THREE.ExtrudeGeometry(s,{depth:1.45,bevelEnabled:true,bevelSize:.09,bevelThickness:.07,bevelSegments:1}),edge,0,0,-4.7);
 tube(palace,[[0,36,-3.14],[0,63,-3.14]],.055,gold,1);for(const side of[-1,1])tube(palace,[[side*1.9,35,-3.1],[side*1.65,49,-3.1],[side*.74,59,-3.1],[0,65,-3.1]],.075,masonry);
 // A slender belfry gives the skyline an asymmetric lower note.
 const bell=new THREE.Group();bell.position.set(-29,3,-92);g.add(bell);box(bell,4.5,19,4.5,masonry,0,9.5,0);for(const y of[3.5,8,12.5])opening(bell,0,y,2.26,.70,2);opening(bell,0,16,2.27,2.3,2.4);hipRoof(bell,5.3,5.3,4,0,19.2,0);for(const yy of[2,10,15.5,19])box(bell,4.8,.20,4.8,edge,0,yy,0);
 return g;
}
