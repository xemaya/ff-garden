import * as THREE from 'three';
import {plain,mat} from './materials.js';
import {rng} from './layout.js';
let stone=[],trim,metal,wood,stats={};
export function initPlazaMaterials(hero){
 stone=[0xb7b5a8,0xbdbbac,0xcac6b7,0xaead9f,0xb9b8ab].map(color=>{const map=hero.plaster.map.clone();map.repeat.set(.15,.15);map.needsUpdate=true;const m=new THREE.MeshStandardMaterial({color,map,roughness:.97});m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(diffuse, diffuseColor.rgb, 0.42);');};m.customProgramCacheKey=()=> 'plaza-stone-soft-map-v2';return m;});
 trim=plain(0x798177,.9);metal=plain(0x7f8063,.62,.35);const map=hero.wood.map.clone();map.repeat.set(.2,1.4);map.needsUpdate=true;wood=new THREE.MeshStandardMaterial({color:0xb8a07b,map,roughness:.91});stats={revision:'royal-plaza-v2',pavers:0,curbStones:0,grassBlades:0,flowers:0,fountainCoping:0,newImageGenerationCalls:0};
}
export function plazaMetrics(){return{...stats};}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,m,x,y,z){return mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function lathe(g,profile,m){return mesh(g,new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),64),m);}
function tube(g,pts,r,m,n=24){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,7,false),m);}
function wedge(r0,r1,a0,a1,height,bevel=.007){const s=new THREE.Shape(),steps=3;s.moveTo(r0*Math.cos(a0),r0*Math.sin(a0));for(let i=0;i<=steps;i++){const a=a0+(a1-a0)*i/steps;s.lineTo(r1*Math.cos(a),r1*Math.sin(a));}for(let i=steps;i>=0;i--){const a=a0+(a1-a0)*i/steps;s.lineTo(r0*Math.cos(a),r0*Math.sin(a));}s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1});geo.rotateX(-Math.PI/2);return geo;}
function ring(g,inner,outer,m,y){const o=mesh(g,new THREE.RingGeometry(inner,outer,128),m,0,y,0);o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
export function buildPlazaPaving(){const g=new THREE.Group(),random=rng(183);g.position.set(-1,0,-24);
 const mortar=mesh(g,new THREE.CircleGeometry(12,128),plain(0x9d9f8d),0,.018,0);mortar.rotation.x=-Math.PI/2;mortar.castShadow=false;
 // Narrow stone joints and staggered radial bonds make the fountain a centre.
 for(let row=0;row<18;row++){const r0=2.20+row*.544,r1=Math.min(12,r0+.544),mid=(r0+r1)/2,n=Math.round(Math.PI*2*mid/.72),offset=(row%2)*Math.PI/n;
  for(let i=0;i<n;i++){const a=i*Math.PI*2/n+offset,da=Math.PI*2/n,gap=.013/mid;const m=stone[Math.floor(random()*stone.length)];mesh(g,wedge(r0+.013,r1-.013,a+gap,a+da-gap,.019,.007),m,0,.013+random()*.002,0);stats.pavers++;}}
 for(let i=0;i<112;i++){const a=i*Math.PI*2/112;mesh(g,wedge(11.98,12.20,a+.001,a+Math.PI*2/112-.001,.06,.012),stone[i%stone.length],0,.005,0);stats.curbStones++;}
 ring(g,2.23,2.34,trim,.043);ring(g,3.04,3.16,trim,.043);ring(g,10.88,10.97,trim,.043);
 return g;
}
function grassGeometry(){const positions=[],colors=[],random=rng(291),base=new THREE.Color(),tip=new THREE.Color(0xa2af80),palette=[0x6f886b,0x819a77,0x8ea17c,0x788e6b];
 function blade(x,y,z,h,w,angle){const dx=Math.cos(angle)*w,dz=Math.sin(angle)*w,bend=.025;positions.push(x-dx,y,z-dz,x+dx,y,z+dz,x+bend,y+h,z+.02);base.setHex(palette[Math.floor(random()*palette.length)]);colors.push(...base.toArray(),...base.toArray(),...tip.toArray());stats.grassBlades++;}
 // Tufts soften the outer pavement edge and the back lawn, not the walking line.
 for(let i=0;i<2500;i++){const a=random()*Math.PI*2,r=12.22+random()*1.75,x=-1+Math.cos(a)*r,z=-24+Math.sin(a)*r;if(z>-14.4&&Math.abs(x)<5.5)continue;for(let j=0;j<3;j++)blade(x+(random()-.5)*.08,-.018,z+(random()-.5)*.08,.08+random()*.15,.009+random()*.01,random()*Math.PI);}
 for(const [x0,z0] of[[7.6,-23],[-9.2,-29.6]])for(let i=0;i<180;i++){const a=random()*Math.PI*2,r=.35+random()*.58;blade(x0+Math.cos(a)*r,.043,z0+Math.sin(a)*r,.07+random()*.11,.011,random()*Math.PI);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();return geo;
}
export function buildPlazaTurf(){const g=new THREE.Group(),random=rng(313);const blades=mesh(g,grassGeometry(),new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));blades.castShadow=false;
 // Small meadow flowers in the outer turf avoid a flat solid-green backdrop.
 for(let i=0;i<180;i++){const a=random()*Math.PI*2,r=12.5+random()*1.3,x=-1+Math.cos(a)*r,z=-24+Math.sin(a)*r;if(z>-14&&Math.abs(x)<6)continue;const y=.09+random()*.14;const stem=mesh(g,new THREE.CylinderGeometry(.005,.006,y,4),plain(0x697c58),x,y/2-.025,z);stem.castShadow=false;const bloom=mesh(g,new THREE.SphereGeometry(.027,5,3),plain([0xdccda1,0xc0b0c7,0xe2ddd0][i%3]),x,y-.025,z);bloom.scale.y=.4;bloom.castShadow=false;stats.flowers++;}
 return g;
}
function lawnMaterial(w,h){const map=mat('grass',0xffffff,w,h).map.clone();map.needsUpdate=true;const m=new THREE.MeshStandardMaterial({map,vertexColors:true,roughness:1});m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb = mix(diffuse, diffuseColor.rgb, 0.20);');};m.customProgramCacheKey=()=> 'plaza-grass-fine-map-v2';return m;}
export function buildPlazaLawn(plan){const geo=new THREE.PlaneGeometry(75,115,110,170);geo.rotateX(-Math.PI/2);geo.translate(0,0,-12);const pos=geo.attributes.position,col=[],c=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),rad=Math.hypot(x+1,z+24),road=Math.abs(x-(plan.center?plan.center(z):0));let y=-.025;if(rad>12.3&&!(z>-15&&road<(plan.roadWidth||7)/2+1.2))y+=Math.min(.13,(rad-12.3)*.018)*(1+.5*Math.sin(x*.41)*Math.cos(z*.33));pos.setY(i,y);const shade=.46+.018*Math.sin(x*.62+z*.21)+.020*Math.sin(z*.43-x*.3);c.setHSL(.235+.009*Math.sin(x*.3),.25,shade).convertSRGBToLinear();col.push(...c.toArray());}
 geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.computeVertexNormals();const g=new THREE.Group(),o=mesh(g,geo,lawnMaterial(75,115));o.castShadow=false;return g;
}
export function buildRoyalFountain(animated){const g=new THREE.Group();g.position.set(-1,0,-24);
 lathe(g,[[0,.025],[1.92,.025],[2.10,.075],[2.14,.13],[2.12,.22],[2.03,.27],[2.01,.50],[2.09,.54],[2.10,.60],[1.78,.60],[1.72,.48],[1.70,.25],[0,.25]],stone[1]);
 for(let i=0;i<40;i++){const a=i*Math.PI*2/40;mesh(g,wedge(1.76,2.14,a+.004,a+Math.PI*2/40-.004,.085,.014),stone[i%5],0,.59,0);stats.fountainCoping++;}
 // Actual panel seams, recessed band and small leaf medallions on the stonework.
 ring(g,1.93,2.005,trim,.27);
 for(let i=0;i<12;i++){const a=i*Math.PI*2/12,r=2.02;const panel=new THREE.Group();panel.position.set(Math.cos(a)*r,.405,Math.sin(a)*r);panel.rotation.y=Math.PI/2-a;g.add(panel);const leaf=new THREE.Shape();leaf.moveTo(0,-.085);leaf.quadraticCurveTo(-.065,-.01,0,.09);leaf.quadraticCurveTo(.065,-.01,0,-.085);mesh(panel,new THREE.ExtrudeGeometry(leaf,{depth:.012,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:1}),stone[3]);}
 const waterMat=new THREE.MeshPhysicalMaterial({color:0x78afa7,transparent:true,opacity:.83,roughness:.16,metalness:.05,envMapIntensity:.65,depthWrite:false});const water=mesh(g,new THREE.CircleGeometry(1.76,96),waterMat,0,.527,0);water.rotation.x=-Math.PI/2;water.castShadow=false;water.userData.dynamic=true;animated.water=water;
 lathe(g,[[.43,.29],[.49,.36],[.44,.49],[.32,.57],[.27,.73],[.23,1.12],[.29,1.32],[.41,1.39],[.44,1.43]],stone[2]);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(g,[[Math.cos(a)*.29,.65,Math.sin(a)*.29],[Math.cos(a)*.255,1.0,Math.sin(a)*.255],[Math.cos(a)*.30,1.30,Math.sin(a)*.30]],.026,stone[0],12);}
 lathe(g,[[.11,1.40],[.62,1.43],[.76,1.54],[.77,1.63],[.72,1.68],[.66,1.62],[.55,1.53],[.11,1.51]],stone[2]);
 mesh(g,new THREE.CylinderGeometry(.075,.14,.24,16),metal,0,1.76,0);const crystal=mesh(g,new THREE.OctahedronGeometry(.29),new THREE.MeshPhysicalMaterial({color:0x8ec4c8,roughness:.12,metalness:.08,transparent:true,opacity:.86,emissive:0x407f87,emissiveIntensity:.16}),0,2.14,0);crystal.scale.y=1.6;crystal.userData.dynamic=true;crystal.userData.baseY=2.14;animated.crystal=crystal;
 for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a),z=Math.sin(a);tube(g,[[x*.10,1.69,z*.10],[x*.32,2.03,z*.32],[x*.19,2.35,z*.19],[0,2.62,0]],.018,metal,18);}
 const jetmat=new THREE.MeshPhysicalMaterial({color:0xc0e8e0,transparent:true,opacity:.42,roughness:.16,depthWrite:false});
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a),z=Math.sin(a),jet=mesh(g,new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(x*.64,1.59,z*.64),new THREE.Vector3(x*1.0,1.99,z*1.0),new THREE.Vector3(x*1.48,.54,z*1.48)),26,.012,5,false),jetmat);jet.castShadow=false;}
 const particles=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(128*3),3)),new THREE.PointsMaterial({color:0xd4efea,size:.025,transparent:true,opacity:.52,depthWrite:false}));particles.userData.dynamic=true;g.add(particles);animated.drops=particles;animated.royalPlaza=true;animated.plazaRipples=[];
 for(let i=0;i<3;i++){const r=mesh(g,new THREE.TorusGeometry(.70+i*.32,.004,4,72),new THREE.MeshBasicMaterial({color:0xb4d3c8,transparent:true,opacity:.18,depthWrite:false}),0,.532,0);r.rotation.x=-Math.PI/2;r.castShadow=false;r.userData.dynamic=true;r.userData.phase=i/3;animated.plazaRipples.push(r);}
 return g;
}
export function animateRoyalFountain(animated,time){const a=animated.drops.geometry.attributes.position;for(let i=0;i<a.count;i++){const u=(time*.48+i*.017)%1,theta=Math.floor(i%8)*Math.PI/4+Math.sin(i*2.3)*.023,r=.64+u*.84;a.setXYZ(i,Math.cos(theta)*r,1.59+Math.sin(u*Math.PI)*.21-u*1.05,Math.sin(theta)*r);}a.needsUpdate=true;for(const r of animated.plazaRipples){const u=(time*.16+r.userData.phase)%1;r.scale.setScalar(.85+u*.30);r.material.opacity=.16*(1-u);}}
export function buildGardenBench(b){const g=new THREE.Group(),iron=plain(0x5c695f,.7,.28);for(let j=0;j<4;j++){const geo=new THREE.BoxGeometry(1.78,.058,.12,8,1,1),p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+.012*Math.cos(p.getX(i)*1.3));geo.computeVertexNormals();mesh(g,geo,wood,0,.475,-.185+j*.125);}
 for(let j=0;j<3;j++){const geo=new THREE.BoxGeometry(1.76,.115,.05,8,1,1),p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.025*Math.cos(p.getX(i)*1.4));geo.computeVertexNormals();mesh(g,geo,wood,0,.77+j*.145,-.265-j*.012);}
 for(const x of[-.73,.73]){tube(g,[[x,.02,.21],[x,.22,.10],[x,.46,.02],[x,.48,-.15],[x,.02,-.26]],.025,iron,16);tube(g,[[x,.10,-.26],[x,.58,-.27],[x,.88,-.30],[x,1.10,-.32]],.026,iron,14);tube(g,[[x,.50,.20],[x,.69,.18],[x,.72,-.13],[x,.88,-.26]],.022,iron,16);}
 g.position.set(b.x,0,b.z);g.rotation.y=b.rotation;return g;
}
export function buildPlazaBackdrop(){const geo=new THREE.PlaneGeometry(70,40,70,50);geo.rotateX(-Math.PI/2);geo.translate(0,0,-52);const p=geo.attributes.position,c=[],color=new THREE.Color();for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),fade=THREE.MathUtils.smoothstep(-z,36,47);p.setY(i,-.07+fade*(.22+.24*Math.sin(x*.13+z*.11)+.13*Math.cos(z*.21)));color.setHSL(.24,.24,.44+.025*Math.sin(x*.17)*Math.cos(z*.13)).convertSRGBToLinear();c.push(...color.toArray());}geo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geo.computeVertexNormals();const g=new THREE.Group(),m=mesh(g,geo,lawnMaterial(70,40));m.castShadow=false;return g;}
