import {buildPlazaPaving,buildPlazaTurf,buildPlazaLawn,buildPlazaBackdrop} from './plaza.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {palette,mat,plain,glow,shopSign} from './materials.js';
import {rng,center,roadside} from './layout.js';

export function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,w,h,d,m,x=0,y=0,z=0,round=false){return mesh(p,round?new RoundedBoxGeometry(w,h,d,2,Math.min(.09,w/5,h/5,d/5)):new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function cyl(p,r,rt,h,m,x=0,y=0,z=0,n=14){return mesh(p,new THREE.CylinderGeometry(r,rt,h,n),m,x,y,z);}
function sphere(p,r,m,x,y,z,sx=1,sy=1,sz=1){const o=mesh(p,new THREE.SphereGeometry(r,10,7),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function beam(p,a,b,r,m,n=8){const x=new THREE.Vector3(...a),y=new THREE.Vector3(...b),d=y.clone().sub(x);const o=cyl(p,r,r,d.length(),m);o.position.copy(x).add(y).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
function arch(w,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h-w/2);s.quadraticCurveTo(-w/2,h,0,h);s.quadraticCurveTo(w/2,h,w/2,h-w/2);s.lineTo(w/2,0);s.closePath();return s;}
function archedFrame(p,w,h,m,x,y,z,th=.13){const s=arch(w+th*2,h+th);const points=arch(w,h).getPoints(16).reverse();s.holes.push(new THREE.Path(points));return mesh(p,new THREE.ExtrudeGeometry(s,{depth:.11,bevelEnabled:true,bevelSegments:1,bevelSize:.025,bevelThickness:.025,steps:1}),m,x,y-.035,z);}
function archedPane(p,w,h,m,x,y,z){const o=mesh(p,new THREE.ShapeGeometry(arch(w,h),16),m,x,y,z);o.castShadow=false;return o;}
function window(p,x,y,w=1.0,h=1.6,shutterColor=palette.blue){
  archedPane(p,w,h,plain(0x9dbec3,.22,.07),x,y,.035);archedFrame(p,w,h,plain(palette.wood),x,y,.08,.10);
  box(p,.045,h-.06,.06,plain(0xe8d7a5),x,y+h/2,.20);box(p,w,.055,.06,plain(0xe8d7a5),x,y+h*.38,.20);
  for(const side of[-1,1]){const shutter=box(p,w*.31,h*.77,.09,mat('wood',shutterColor,w*.31,h*.77),x+side*(w*.66),y+h*.42,.14,true);shutter.rotation.y=side*.17;for(let yy=0;yy<4;yy++)box(p,w*.30,.055,.025,plain(shutterColor),x+side*w*.66,y+.18+yy*.26,.20);}
  box(p,w+.45,.11,.35,mat('stone',palette.stone),x,y-.1,.11,true);
}
function loaf(p,x,y,z,scale=1){const o=sphere(p,.15*scale,plain(0xc78f4b),x,y,z,1.8,.62,.8);for(let i=-1;i<=1;i++){const cut=beam(p,[x+i*.09*scale,y+.055*scale,z-.075*scale],[x+i*.09*scale+.05*scale,y+.07*scale,z+.075*scale],.012*scale,plain(0xe9c98b));}return o;}
function pot(p,x,y,z,color=0xa96e4d,scale=1){cyl(p,.20*scale,.145*scale,.34*scale,plain(color),x,y+.17*scale,z,12);cyl(p,.225*scale,.225*scale,.065*scale,plain(color),x,y+.34*scale,z,12);cyl(p,.18*scale,.18*scale,.025*scale,plain(0x69543a),x,y+.37*scale,z,12);}
function flowers(p,x,y,z,seed=3,scale=1,count=7){const random=rng(seed);for(let i=0;i<count;i++){const xx=x+(random()-.5)*.42*scale,zz=z+(random()-.5)*.42*scale,hh=(.27+random()*.32)*scale;beam(p,[xx,y,zz],[xx,y+hh,zz],.013*scale,plain(0x69935c),5);sphere(p,.1*scale,plain(0x79a565),xx+.055*scale,y+hh*.55,zz,1,.35,.65);const c=[0xe7a083,0xf3d99c,0xb4a2c4,0xf6ead1][i%4];for(let j=0;j<5;j++){const a=j*Math.PI*2/5;sphere(p,.051*scale,plain(c),xx+Math.cos(a)*.055*scale,y+hh,zz+Math.sin(a)*.055*scale,1,.45,1);}sphere(p,.033*scale,plain(0xdab964),xx,y+hh+.008*scale,zz);}}
function flowerBox(p,x,y,z,w=1.3,seed=7){box(p,w,.28,.4,mat('wood',0xb29770,w,.4),x,y,z,true);flowers(p,x,y+.16,z,seed,1,Math.round(w*8));}
function roofGeometry(w,d,rise){
  const vertices=[],uv=[];const nx=20,nz=12,half=w/2;
  const point=(i,j)=>{const x=-half+i/nx*w,z=-d/2+j/nz*d,edge=Math.abs(x)/half;const y=rise*Math.pow(Math.max(0,1-edge),1.55)+.12*edge*edge+.12*Math.cos((z/d)*Math.PI);return[x,y,z];};
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){for(const[a,b]of[[i,j],[i,j+1],[i+1,j],[i+1,j],[i,j+1],[i+1,j+1]]){vertices.push(...point(a,b));uv.push(a/nx,b/nz);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
function sign(p,name,kind,x,y,z,w=3.0){const texture=shopSign(name,kind),material=new THREE.MeshStandardMaterial({map:texture,roughness:.85});box(p,w+.13,1.18,.15,plain(0x866b44),x,y,z,true);const s=mesh(p,new THREE.PlaneGeometry(w,1.06),material,x,y,z+.083);s.castShadow=false;return s;}
function canopy(p,w,color){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#f4e4bf';c.fillRect(0,0,256,128);for(let x=0;x<256;x+=64){c.fillStyle=new THREE.Color(color).getStyle();c.fillRect(x,0,32,128);}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;t.repeat.x=2;
  const material=new THREE.MeshStandardMaterial({map:t,roughness:1,side:THREE.DoubleSide});const awn=box(p,w,.08,1.25,material,0,2.72,.64);awn.rotation.x=.22;
  for(let x=-w/2+.14;x<w/2;x+=.31){const scallop=mesh(p,new THREE.CircleGeometry(.18,12,Math.PI,Math.PI),plain(color),x,2.49,1.27);scallop.rotation.z=Math.PI;}
  for(const side of[-1,1])beam(p,[side*w/2,2.62,1.20],[side*w/2,3.11,.05],.04,plain(0x927446));
}

export function buildHouse(b,animated){
  const g=new THREE.Group(),w=b.width,h=b.height,d=b.depth,random=rng(b.seed),roofColor=palette[b.roof],wall=mat('plaster',palette[b.wall],w,h),wood=mat('wood',palette.wood);
  box(g,w,.72,d,mat('stone',0xe5d5b0,w,d),0,.36,-d/2,true);
  box(g,w,h-.7,d,wall,0,.7+(h-.7)/2,-d/2,true);
  // Slightly overhanging upper floor and timber brackets give the town its shape.
  box(g,w+.23,h-3.2,d+.14,wall,0,3.2+(h-3.2)/2,-d/2,true);
  for(const x of[-w/2+.08,0,w/2-.08])box(g,.15,h+.05,.16,wood,x,h/2,.08);
  for(const y of[.8,3.18,h-.08])box(g,w+.3,.16,.18,wood,0,y,.09);
  for(const side of[-1,1]){
    beam(g,[side*w*.43,3.32,.14],[side*w*.20,h-.25,.14],.055,wood);beam(g,[side*w*.20,3.32,.14],[side*w*.43,h-.25,.14],.055,wood);
    for(let z=-.5;z>-d;z-=1.1){box(g,.14,h,.14,wood,side*w/2,h/2,z);beam(g,[side*(w/2+.04),2.4,z],[side*(w/2+.18),3.18,z],.065,wood);}
  }
  const rise=b.kind==='inn'?4.55:b.kind==='books'?4.1:b.kind==='toys'?3.9:3.35;
  const roof=mesh(g,roofGeometry(w+.85,d+1.0,rise),mat('roof',roofColor,w,d),0,h,-d/2);roof.material.side=THREE.DoubleSide;
  // Gable is geometry with a timber ridge, not a painted triangle.
  const s=new THREE.Shape(),half=(w+.35)/2;const gableY=x=>rise*Math.pow(Math.max(0,1-Math.abs(x)/half),1.55)+.12*(x/half)**2;
  s.moveTo(-half,0);for(let i=0;i<=32;i++){const x=-half+i*half/16;s.lineTo(x,gableY(x));}s.lineTo(half,0);s.closePath();mesh(g,new THREE.ShapeGeometry(s),wall,0,h,-.01);
  for(let i=0;i<16;i++){const x1=-half+i*half/8,x2=x1+half/8;beam(g,[x1,h+gableY(x1),.10],[x2,h+gableY(x2),.10],.085,wood);}
  beam(g,[0,h,.12],[0,h+rise-.1,.12],.065,wood);window(g,0,h+.45,.72,1.3,roofColor);
  const doorX=w*.27;
  archedPane(g,1.2,2.32,mat('wood',0x8c704b),doorX,.11,.13);archedFrame(g,1.2,2.32,plain(palette.stone),doorX,.11,.22,.14);
  const handle=mesh(g,new THREE.TorusGeometry(.085,.016,5,12),plain(0xb29758,.5,.5),doorX+.32,1.16,.37);
  box(g,1.56,.13,.46,mat('stone',0xe5d2ae),doorX,.065,.27,true);
  const winX=-w*.22,winW=w*.42;
  archedPane(g,winW,1.7,plain(0x807b61),winX,.68,.10);archedFrame(g,winW,1.7,plain(palette.wood),winX,.68,.16,.12);
  box(g,winW+.18,.12,.58,mat('wood',0x9b7a50),winX,.59,.33,true);
  // Shop goods are small original 3D props, so each facade reads differently.
  if(b.kind==='bakery')for(let i=0;i<6;i++)loaf(g,winX-winW*.35+i*.26,.79,.40,1.2);
  else if(b.kind==='florist'){for(let i=0;i<4;i++){const xx=winX-winW*.3+i*.45;pot(g,xx,.65,.39,0xbc876b,.64);flowers(g,xx,.9,.39,b.seed+i,.8,5);}}
  else if(b.kind==='toys'){for(let i=0;i<4;i++){const xx=winX-winW*.3+i*.42;box(g,.22,.24,.20,plain([palette.coral,palette.blue,palette.sage,palette.lavender][i]),xx,.83,.43,true);mesh(g,new THREE.ConeGeometry(.16,.18,4),plain(0xe4b574),xx,1.02,.43);}}
  else if(b.kind==='books'){for(let i=0;i<9;i++){const o=box(g,.14,.28+random()*.16,.24,plain([0xa57a65,0x7b9874,0x7596a4,0xd5b679][i%4]),winX-winW*.34+i*.18,.9,.39);o.rotation.z=(random()-.5)*.14;}}
  else if(b.kind==='apothecary'){for(let i=0;i<5;i++){cyl(g,.075,.09,.30,plain([0x94aaa1,0xb4a184,0x6f9481][i%3],.25),winX-winW*.3+i*.32,.83,.42);cyl(g,.04,.04,.08,plain(0xd9c79b),winX-winW*.3+i*.32,1.02,.42);}}
  else for(let i=0;i<4;i++){cyl(g,.08,.09,.14,plain(0xe7d5ac),winX-winW*.3+i*.4,.78,.42);}
  // Clear daylight windows use small muntins, no electric neon.
  const glass=new THREE.MeshPhysicalMaterial({color:0xc7e0df,transparent:true,opacity:.30,roughness:.12,metalness:0,envMapIntensity:.65});archedPane(g,winW-.10,1.62,glass,winX,.72,.60);
  for(let xx=-winW/2;xx<=winW/2;xx+=winW/3)box(g,.04,1.52,.07,plain(0xe3d1a2),winX+xx,1.43,.66);box(g,winW,.045,.07,plain(0xe3d1a2),winX,1.50,.66);
  canopy(g,w*.82,roofColor);
  sign(g,b.name,b.kind,-w*.08,3.70,.32,w*.54);
  const upperY=4.35;
  for(const x of[-w*.27,w*.27]){window(g,x,upperY,.95,1.55,roofColor);flowerBox(g,x,upperY-.30,.27,1.2,b.seed+Math.round(x*5));}
  if(h>7.5){window(g,w*.26,6.4,.85,1.1,roofColor);}
  // Projecting wooden sign, bracket and rounded medallion.
  const x=-w*.39,bracket=plain(0x89724b,.7,.15);
  beam(g,[x,4.7,.1],[x,4.7,1.34],.05,bracket);beam(g,[x,4.7,1.32],[x,5.15,.1],.035,bracket);
  const plaque=new THREE.Group();plaque.position.set(x,4.05,1.25);plaque.rotation.y=Math.PI/2;g.add(plaque);
  cyl(plaque,.53,.53,.12,plain(0xa99066),0,0,0,20).rotation.x=Math.PI/2;
  for(const direction of[-1,1]){const face=new THREE.Group();if(direction<0)face.rotation.y=Math.PI;plaque.add(face);mesh(face,new THREE.CircleGeometry(.48,20),plain(0xf2dfbb),0,0,.075);
    if(b.kind==='bakery'){loaf(face,0,0,.13,1.6);}else if(b.kind==='florist'){for(let j=0;j<5;j++){const a=j*Math.PI*2/5;sphere(face,.115,plain(0xd18c7a),Math.cos(a)*.12,Math.sin(a)*.12,.13,1,1,.30);}sphere(face,.07,plain(0xe6c975),0,0,.17);}
    else if(b.kind==='inn'){mesh(face,new THREE.TorusGeometry(.21,.035,6,20,Math.PI*1.7),plain(0xa48c57),0,0,.13).rotation.z=.35;}
    else if(b.kind==='toys'){const star=mesh(face,new THREE.OctahedronGeometry(.22,0),plain(0xd7ac64),0,0,.14);star.scale.z=.25;}
    else{box(face,.30,.25,.10,plain(roofColor),0,0,.14,true);}
  }
  box(g,.66,1.3,.66,mat('stone',0xcfab86),w*.30,h+rise*.44,-d*.69,true);box(g,.82,.15,.82,plain(0xc3a482),w*.30,h+rise*.44+.67,-d*.69,true);
  // Small street lanterns are warm metal and glass, not light-emitting panels.
  for(const lx of[-w*.43,w*.43]){beam(g,[lx,2.1,.1],[lx,2.1,.45],.024,bracket);cyl(g,.13,.13,.35,glow(0xffdb9a,.12),lx,1.77,.45,6);mesh(g,new THREE.ConeGeometry(.21,.15,6),bracket,lx,2.02,.45);}
  g.position.set(b.x,0,b.z);g.rotation.y=b.rotation;g.userData.building=b.id;
  return g;
}

export function buildProp(p){const g=new THREE.Group(),wood=mat('wood',0xb38b5b);
  if(p.kind==='flowerCart'||p.kind==='breadCart'){
    box(g,1.0,.48,.82,wood,0,.6,0,true);for(const x of[-.52,.52])for(const z of[-.3,.3]){const wheel=mesh(g,new THREE.TorusGeometry(.2,.04,5,14),plain(0x816748),x,.26,z);wheel.rotation.y=Math.PI/2;}
    if(p.kind==='flowerCart'){for(let i=0;i<5;i++){const x=(i%3-.9)*.3,z=(Math.floor(i/3)-.5)*.25;pot(g,x,.85,z,palette.peach,.75);flowers(g,x,1.14,z,p.seed+i,.83,6);}}
    else{for(let i=0;i<6;i++)loaf(g,(i%3-1)*.27,.93,(Math.floor(i/3)-.5)*.28,1.05);beam(g,[-.43,.8,-.4],[-.43,1.65,-.4],.023,plain(0x816747));const plate=box(g,.51,.31,.045,plain(0xf2dfb5),-.2,1.58,-.39,true);}
  }else if(p.kind==='cafeTable'||p.kind==='bookTable'){
    const radius=p.kind==='bookTable'?.32:.48,foot=p.kind==='bookTable'?.25:.35;cyl(g,radius,radius,.10,wood,0,.80,0,20);cyl(g,.07,.07,.8,plain(0x8d764b),0,.40,0);for(const a of[0,Math.PI*2/3,Math.PI*4/3])beam(g,[0,.18,0],[Math.cos(a)*foot,.035,Math.sin(a)*foot],.035,plain(0x8d764b));
    if(p.kind==='bookTable'){
      for(let i=0;i<3;i++){box(g,.30,.045,.21,plain([0x755e47,0x536a75,0x8a6057][i]),-.12,.887+i*.055,0,true);box(g,.274,.027,.186,plain(0xe6d8b6),-.12,.904+i*.055,0);}
      const pages=new THREE.Group();pages.position.set(.18,.89,.02);g.add(pages);for(const side of[-1,1]){const page=box(pages,.15,.017,.20,plain(0xf0e4cb),side*.068,.025,0,true);page.rotation.z=side*.18;}
      cyl(g,.054,.062,.09,plain(0xb68b60),.21,.90,-.24);
    }else{cyl(g,.075,.08,.12,plain(0xf3e5c3),.14,.91,.07);pot(g,-.12,.88,-.09,palette.blue,.28);flowers(g,-.12,.98,-.09,p.seed,.25,3);}
  }else if(p.kind==='postBox'){
    const red=plain(0xa76051);box(g,.22,.68,.22,wood,0,.34,0,true);box(g,.58,.64,.43,red,0,.99,0,true);box(g,.67,.10,.52,wood,0,1.36,0,true);box(g,.38,.046,.012,plain(0x4f4537),0,1.10,.224);box(g,.30,.19,.012,plain(0xe8d6af),0,.83,.226,true);
    beam(g,[-.14,.914,.24],[0,.815,.24],.007,plain(0x9b815a));beam(g,[0,.815,.24],[.14,.914,.24],.007,plain(0x9b815a));
  }else if(p.kind==='feedTrough'){
    box(g,.85,.12,.44,wood,0,.26,0,true);for(const z of[-.23,.23])box(g,.92,.20,.045,wood,0,.36,z,true);for(const x of[-.44,.44])box(g,.045,.20,.44,wood,x,.36,0,true);for(const x of[-.29,.29])box(g,.065,.24,.37,wood,x,.12,0);
    for(let i=0;i<7;i++)beam(g,[-.35+i*.105,.34,-.13],[.30-i*.082,.35,.14],.012,plain(0xc6a25b));
  }else if(p.kind==='hitchRail'){
    for(const x of[-.72,.72]){box(g,.10,1.13,.10,wood,x,.565,0,true);sphere(g,.077,wood,x,1.13,0);}box(g,1.58,.13,.09,wood,0,.91,0,true);box(g,1.58,.085,.07,wood,0,.52,0,true);
  }else if(p.kind==='toyDisplay'){
    box(g,.85,.58,.75,wood,0,.30,0,true);const boat=sphere(g,.19,plain(palette.coral),0,.70,0,1.8,.5,.8);beam(g,[0,.75,0],[0,1.35,0],.016,plain(0xa7854b));const sail=mesh(g,new THREE.PlaneGeometry(.32,.4),plain(0xf4e1b7),.16,1.1,0);sail.rotation.y=.2;
  }else{pot(g,0,0,0,palette.coral,1.25);flowers(g,0,.43,0,p.seed,1.25,11);}
  g.position.set(p.x,0,p.z);g.rotation.y=p.rotation||0;return g;}

export function buildTree(t){const g=new THREE.Group(),random=rng(Math.round((t.x+30)*10));
  beam(g,[0,0,0],[.15,3.2,.06],.13,mat('wood',0x8b7658));for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(g,[.1,2.4,0],[Math.cos(a)*.85,3.4+random()*.4,Math.sin(a)*.85],.06,plain(0x957b59));sphere(g,1.2,plain([0x8caf77,0x9cbc7d,0x7d9f69][i%3]),Math.cos(a)*.58,3.65+random()*.4,Math.sin(a)*.55,1.1,.9,1);}
  sphere(g,1.2,plain(0xa1be81),0,4.4,0,1.18,.84,1.10);g.position.set(t.x,0,t.z);g.scale.setScalar(t.scale);return g;}
export function bench(b){const g=new THREE.Group();for(const z of[-.21,0,.21])box(g,1.8,.085,.15,mat('wood',0xb39366),0,.47,z,true);for(const y of[.7,.91])box(g,1.8,.12,.065,mat('wood',0xb39366),0,y,-.27,true);for(const x of[-.63,.63]){box(g,.1,.5,.58,plain(0x8d7758),x,.25,0);box(g,.075,.96,.08,plain(0x8d7758),x,.48,-.28);}g.position.set(b.x,0,b.z);g.rotation.y=b.rotation;return g;}
export function person(p,index,animated){const g=new THREE.Group();const cloth=plain(palette[p.color]);cyl(g,.18,.27,.68,cloth,0,.76,0,10);sphere(g,.18,plain(0xf0d0b2),0,1.25,0);for(const x of[-.048,.048])sphere(g,.021,plain(0x594a3c),x,1.27,.16,1,1,.5);sphere(g,.028,plain(0xe0b796),0,1.225,.18,.75,.8,1);sphere(g,.16,plain(0x8b7354),0,1.30,-.025,1,.60,1);for(const x of[-.10,.10]){box(g,.11,.36,.12,plain(0x857a64),x,.25,0,true);box(g,.12,.08,.22,plain(0x695b46),x,.065,.04,true);}for(const x of[-.24,.24])beam(g,[x,.94,0],[x*1.10,.58,.06],.056,cloth);if(p.hat){cyl(g,.23,.25,.11,plain(0xc4a575),0,1.39,0);cyl(g,.14,.18,.18,plain(0xcfb482),0,1.51,0);}g.position.set(p.x,0,p.z);g.rotation.y=index*.71;g.userData.dynamic=true;animated.people.push(g);return g;}

function groundRibbon(parent,plan){const c=plan.center||center,half=plan.roadWidth?plan.roadWidth/2:4.45;const positions=[],uv=[];for(let z=33;z>=-15;z-=.5){const a={x:c(z),z},b={x:c(z-.5),z:z-.5};for(const [p,side]of[[a,-1],[a,1],[b,-1],[a,1],[b,1],[b,-1]]){positions.push(p.x+side*half,.035,p.z);uv.push((side+1)*1.12,(33-p.z)/4);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const material=mat('pavers',0xf4e8c9);material.side=THREE.DoubleSide;mesh(parent,geo,material);}
function flag(parent,x,y,z,color,animated,scale=1){const geo=new THREE.PlaneGeometry(.56*scale,.8*scale,7,4),material=new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.85});if(scale<.9){const a=geo.attributes.position;for(let i=0;i<a.count;i++)a.array[i*3]*=a.array[i*3+1]/(.8*scale)+.5;geo.computeVertexNormals();}const o=mesh(parent,geo,material,x,y,z);o.userData.dynamic=true;o.userData.base=Float32Array.from(geo.attributes.position.array);o.userData.phase=x+z;animated.flags.push(o);beam(parent,[x-.35*scale,y+.44*scale,z],[x+.35*scale,y+.44*scale,z],.024,plain(0xaa8a50));return o;}
export function buildGround(plan,animated){const g=new THREE.Group(),rs=plan.roadside||roadside,c=plan.center||center,edge=plan.roadWidth?plan.roadWidth/2:4.5;
  if(plan.castStage)g.add(buildPlazaLawn(plan));else box(g,75,.3,115,mat('grass',0xb3c792,75,115),0,-.19,-12);groundRibbon(g,plan);
  if(plan.castStage){g.add(buildPlazaPaving(),buildPlazaTurf());}else{const plaza=mesh(g,new THREE.CircleGeometry(12,64),mat('pavers',0xf5e5bf,24,24),-1,.04,-24);plaza.rotation.x=-Math.PI/2;const ring=mesh(g,new THREE.RingGeometry(10.5,10.85,64),plain(0xbcad84),-1,.052,-24);ring.rotation.x=-Math.PI/2;}
  const garden=mesh(g,new THREE.CircleGeometry(4.9,32),mat('pavers',0xe7dfbb,10,10),-7.7,.037,4);garden.rotation.x=-Math.PI/2;
  for(let z=32;z>-14;z-=1.4){for(const side of[-1,1]){const p=rs(z,side,edge);box(g,.15,.08,1.30,mat('stone',0xe7d6af),p.x,.04,p.z,true);}}
  // Flower beds are low decorative planting; pots remain outside the clear path.
  for(const [x,z,length,seed]of[[-7.7,1.7,3.2,7],[7.7,-19.2,4.2,8],[-8.2,-29,3.2,9],[5.8,28.3,2.0,10]]){
    const bed=box(g,1.1,.12,length,plain(0xb8c38b),x,.04,z,true);for(let i=0;i<Math.round(length*4);i++)flowers(g,x+(i%3-1)*.26,.10,z-length*.4+i/(length*4)*length*.8,seed+i,.9,3);
  }
  for(const z of[27,9,-8])for(const side of[-1,1]){
    const p=rs(z,side,edge-.3);beam(g,[p.x,.1,p.z],[p.x,3.4,p.z],.055,plain(0x89785b));sphere(g,.16,plain(0xf0dfb2,.35),p.x,3.25,p.z,1,.95,1);mesh(g,new THREE.ConeGeometry(.25,.22,6),plain(0xa39269),p.x,3.48,p.z);
  }
  // Gentle festival bunting, with an open sky above it.
  for(const z of[17,-1]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(c(z)-edge,5.6,z),new THREE.Vector3(c(z),4.7,z+.2),new THREE.Vector3(c(z)+edge,5.6,z)]);mesh(g,new THREE.TubeGeometry(curve,30,.014,5,false),plain(0x9a8c68));for(let i=0;i<9;i++){const p=curve.getPoint((i+1)/10);flag(g,p.x,p.y-.2,p.z,[palette.coral,palette.blue,0xddc68b,palette.sage][i%4],animated,.58);}}
  return g;}

export function buildFountain(animated){const g=new THREE.Group();
  cyl(g,2.18,2.28,.3,mat('stone',0xe7d5ae),0,.15,0,40);cyl(g,1.93,1.93,.14,plain(0x6c9b9c),0,.34,0,40);
  const basin=mesh(g,new THREE.TorusGeometry(2.03,.14,9,48),mat('stone',0xf0deb8),0,.43,0);basin.rotation.x=Math.PI/2;
  const water=mesh(g,new THREE.CircleGeometry(1.95,48),new THREE.MeshPhysicalMaterial({color:0x78c3cc,transparent:true,opacity:.82,roughness:.09,metalness:0,envMapIntensity:.8}),0,.397,0);water.rotation.x=-Math.PI/2;water.userData.dynamic=true;animated.water=water;
  cyl(g,.42,.55,1.18,mat('stone',0xe9d8b5),0,.86,0,16);cyl(g,.82,.67,.18,mat('stone',0xf1dfb7),0,1.49,0,24);
  const crystal=mesh(g,new THREE.OctahedronGeometry(.45,0),new THREE.MeshPhysicalMaterial({color:0x92d1df,roughness:.14,metalness:.10,transparent:true,opacity:.83,emissive:0x70bdd0,emissiveIntensity:.08}),0,2.1,0);crystal.scale.y=1.5;crystal.userData.dynamic=true;animated.crystal=crystal;
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(Math.cos(a)*.65,1.48,Math.sin(a)*.65),new THREE.Vector3(Math.cos(a)*1.25,2.0,Math.sin(a)*1.25),new THREE.Vector3(Math.cos(a)*1.55,.41,Math.sin(a)*1.55));const jet=mesh(g,new THREE.TubeGeometry(curve,20,.022,6,false),new THREE.MeshPhysicalMaterial({color:0xb9e8ed,transparent:true,opacity:.7,roughness:.1}),0,0,0);jet.castShadow=false;}
  const positions=new Float32Array(90*3);const particles=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3)),new THREE.PointsMaterial({color:0xe4f9f7,size:.035,transparent:true,opacity:.7,depthWrite:false}));particles.userData.dynamic=true;g.add(particles);animated.drops=particles;
  g.position.set(-1,0,-24);return g;
}
export function buildCastle(animated){const g=new THREE.Group(),stone=mat('stone',0xf5e7c9),roof=mat('roof',0x688ea3),gold=plain(0xc3a267,.55,.25);
  box(g,30,4,16,stone,0,2,0,true);box(g,16,12,11,stone,0,10,-1,true);
  archedPane(g,3.1,5.7,plain(0x8a876b),0,.1,8.1);archedFrame(g,3.1,5.7,plain(0xe8d8b4),0,.1,8.18,.25);
  const towers=[[-11,4,2.9,20],[11,4,2.9,22],[-6,-4,2.4,26],[6,-4,2.4,24],[0,-2,2.7,34]];
  for(const [x,z,r,h]of towers){cyl(g,r,r*1.12,h,stone,x,h/2,z,18);cyl(g,r*1.12,r*1.12,.65,stone,x,h-1.3,z,18);mesh(g,new THREE.ConeGeometry(r*1.47,r*2.4,18),roof,x,h+r*1.15,z);
    sphere(g,.15,gold,x,h+r*2.4,z);beam(g,[x,h+r*2.4,z],[x,h+r*2.4+1.7,z],.035,gold);
    flag(g,x+.37,h+r*2.4+1.0,z,palette.coral,animated,1.0);
    for(const yy of[h*.35,h*.61,h*.8]){archedPane(g,.72,1.7,plain(0x809ea6,.25),x,yy,z+r+.03);archedFrame(g,.72,1.7,plain(0xd8c69e),x,yy,z+r+.07,.13);}
  }
  for(let x=-13.5;x<=13.5;x+=1.5){box(g,.76,.85,.9,stone,x,4.4,8,true);}
  // A small clock and stone ribs make the silhouette readable from the plaza.
  const clock=mesh(g,new THREE.CircleGeometry(1.2,24),plain(0xf4e6bc),0,14,4.64);mesh(g,new THREE.TorusGeometry(1.22,.06,7,24),gold,0,14,4.7);
  beam(g,[0,14,4.75],[0,14.8,4.75],.035,gold);beam(g,[0,14,4.75],[.62,14.25,4.75],.035,gold);
  for(const x of[-7,7])box(g,.42,12,.54,stone,x,10,4.7);
  g.position.set(-1,3.8,-77);return g;
}
export function buildLandscape(polished=false){const g=new THREE.Group(),random=rng(81);
  if(polished)g.add(buildPlazaBackdrop());else for(let i=0;i<22;i++){const x=(i%2?-1:1)*(25+random()*90),z=-35-random()*115;const hill=sphere(g,16+random()*22,plain([0x9cbb8e,0xacc49b,0x8fac88][i%3]),x,-6,z,1.3,.42,1.1);hill.castShadow=false;}
  for(let i=0;i<12;i++){const x=-145+i*26,z=-170-random()*25,r=18+random()*14,h=24+random()*22;const m=mesh(g,new THREE.ConeGeometry(r,h,7),plain([0xa5bec0,0xb5c9c6,0x9bb5ba][i%3]),x,h/2-7,z);m.castShadow=false;}
  // Cloud puffs are distant geometry with daylight haze.
  for(let i=0;i<15;i++){const c=new THREE.Group();for(let j=0;j<5;j++)sphere(c,3+random()*2,plain(0xf2f2dd),j*2.8,random()*.7,0,1.3,.65,.8);c.position.set(-75+random()*150,35+random()*25,-70-random()*70);c.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});g.add(c);}
  return g;
}
export function buildAirship(animated){const g=new THREE.Group();
  sphere(g,1,mat('plaster',0xebd2a3),0,0,0,6.2,2.1,2.0);for(const x of[-4,-2,0,2,4]){const ring=mesh(g,new THREE.TorusGeometry(1.88*Math.sqrt(Math.max(.05,1-(x/6.3)**2)),.045,5,24),plain(0xb99863),x,0,0);ring.rotation.y=Math.PI/2;}
  sphere(g,1,mat('wood',0xac8350),.1,-2.65,0,2.7,.62,.65);for(const x of[-1.5,1.5])for(const z of[-.55,.55])beam(g,[x,-1.1,z*1.3],[x,-2.5,z],.035,plain(0xb2925d));
  const tail=mesh(g,new THREE.PlaneGeometry(1.7,2.5),plain(palette.coral),-5.1,.75,0);tail.rotation.y=Math.PI/2;
  g.position.set(18,26,-44);g.rotation.y=.1;g.userData.dynamic=true;animated.airship=g;return g;
}
