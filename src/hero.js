import * as THREE from 'three';
import {rng,center,roadside} from './layout.js';
import {plain,mat} from './materials.js';
import {createHeroMaterialLoader} from './hero-textures.js';

let materials={};const materialLoader=createHeroMaterialLoader();let metrics={roofTiles:0,sculptedPavers:0,recessedWindows:0,heroBuildings:0,nameplates:0};
export async function loadHeroMaterials(){
  materials=await materialLoader.load();
  return materials;
}
export const failedHeroTextures=()=>materialLoader.failed();
export const useBasicHeroMaterials=()=>materialLoader.useFallbacks();
export const refreshHeroTextureClones=root=>materialLoader.refreshClones(root);
export function heroMetrics(){return{...metrics,generatedMaterials:Object.keys(materials),failedTextures:failedHeroTextures(),heroBuildings:metrics.heroBuildings};}
function mesh(p,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function sphere(p,r,m,x,y,z,sx=1,sy=1,sz=1){const o=mesh(p,new THREE.SphereGeometry(r,12,8),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function cyl(p,rt,rb,h,m,x,y,z,n=16){return mesh(p,new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);}
function beam(p,a,b,w=.13,d=w,m=materials.wood){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from);const geo=new THREE.BoxGeometry(w,v.length(),d,1,8,1),attr=geo.attributes.position;
  for(let i=0;i<attr.count;i++){const y=attr.getY(i),u=y/v.length();attr.setX(i,attr.getX(i)+Math.sin(u*Math.PI)*w*.11);attr.setZ(i,attr.getZ(i)+Math.sin(u*Math.PI*2+.7)*d*.055);}geo.computeVertexNormals();const o=mesh(p,geo,m);o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function tube(p,points,r,m,n=20){return mesh(p,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),n,r,7,false),m);}
function stoneBlock(p,w,h,d,x,y,z,seed=1){const geo=new THREE.BoxGeometry(w,h,d,2,2,2),a=geo.attributes.position,random=rng(seed),shifts=new Map();for(let i=0;i<a.count;i++){const key=`${a.getX(i).toFixed(4)},${a.getY(i).toFixed(4)},${a.getZ(i).toFixed(4)}`;if(!shifts.has(key))shifts.set(key,[(random()-.5)*.033,(random()-.5)*.024,(random()-.5)*.035]);const q=shifts.get(key);a.setXYZ(i,a.getX(i)+q[0],a.getY(i)+q[1],a.getZ(i)+q[2]);}geo.computeVertexNormals();return mesh(p,geo,mat('stone',0xb9ac95),x,y,z);}
function arch(w,h,x=0,y=0){const s=new THREE.Shape();s.moveTo(x-w/2,y);s.lineTo(x-w/2,y+h-w/2);s.quadraticCurveTo(x-w/2,y+h,x,y+h);s.quadraticCurveTo(x+w/2,y+h,x+w/2,y+h-w/2);s.lineTo(x+w/2,y);s.closePath();return s;}
function trim(p,x,y,w,h,z,th=.13,m=materials.wood){const shape=arch(w+th*2,h+th);shape.holes.push(new THREE.Path(arch(w,h).getPoints(20)));return mesh(p,new THREE.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:true,bevelThickness:.022,bevelSize:.025,bevelSegments:1}),m,x,y-.02,z);}
function window(p,x,y,w,h,z=-.03){metrics.recessedWindows++;
  const pane=mesh(p,new THREE.ShapeGeometry(arch(w,h)),plain(0x253d47,.39),x,y,z-.26);pane.castShadow=false;
  trim(p,x,y,w,h,z,.14);trim(p,x,y,w+.36,h+.12,z-.10,.045,mat('stone',0xcfc2a6));
  for(const sign of[-1,1])for(let i=0;i<5;i++){const start=-w/2+i*w/5,end=Math.min(w/2,start+w*.52);if(end>start)beam(p,[x+start,y+.13,z-.21],[x+end,y+.13+(end-start)*1.8,z-.21],.012,.014,plain(0x665a45,.6,.25));}
  beam(p,[x,y+.02,z-.18],[x,y+h-.16,z-.18],.025,.03,plain(0x887254));
  stoneBlock(p,w+.4,.12,.35,x,y-.12,z+.08,Math.round(y*14));
  for(const side of[-1,1]){
    const shutter=new THREE.Group();shutter.position.set(x+side*(w/2+.14),y+.12,z+.03);shutter.rotation.y=side*.42;p.add(shutter);
    box(shutter,w*.34,h*.75,.09,materials.wood,side*w*.18,h*.37,0);for(const yy of[.12,h*.55])beam(shutter,[0,yy,.06],[side*w*.35,yy,.06],.06,.045,materials.wood);
    beam(shutter,[0,.12,.07],[side*w*.34,h*.57,.07],.045,.03,plain(0x8c7758));for(const yy of[.17,h*.6])sphere(shutter,.016,plain(0x524839,.5,.3),side*.10,yy,.087);
  }
}
function wallWithOpenings(p,w,h,openings,z=0){const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();for(const o of openings)shape.holes.push(new THREE.Path(arch(o.w,o.h,o.x,o.y).getPoints(20)));mesh(p,new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false}),materials.plaster,0,0,z-.24);}
function leaf(p,x,y,z,scale,color,rotation=0){const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(-.09,.09,0,.24);s.quadraticCurveTo(.10,.10,0,0);const o=mesh(p,new THREE.ShapeGeometry(s,5),plain(color),x,y,z);o.material.side=THREE.DoubleSide;o.scale.setScalar(scale);o.rotation.z=rotation;o.rotation.y=Math.sin(x+y)*.5;return o;}
function vine(p,x,y,z,height,seed=1){const r=rng(seed),pts=[];for(let i=0;i<=12;i++)pts.push([x+Math.sin(i*.85)*.1,y+height*i/12,z+Math.sin(i*.70)*.03]);tube(p,pts,.018,plain(0x555d37));for(let i=0;i<28;i++){const yy=y+r()*height,xx=x+Math.sin((yy-y)/height*12*.85)*.1;leaf(p,xx,yy,z+.05,.5+r()*.5,[0x4a5b37,0x647544,0x78834e][i%3],(i%2?-1:1)*(.45+r()*.5));}}
function planter(p,x,y,z,seed=1,scale=1){const r=rng(seed),m=plain(0xa86f4d);const pts=[new THREE.Vector2(.14,0),new THREE.Vector2(.22,.06),new THREE.Vector2(.26,.35),new THREE.Vector2(.31,.43),new THREE.Vector2(.27,.49),new THREE.Vector2(.22,.45)];const o=mesh(p,new THREE.LatheGeometry(pts,14),m,x,y,z);o.scale.setScalar(scale);cyl(p,.22*scale,.22*scale,.018,plain(0x524b35),x,y+.44*scale,z);
  for(let i=0;i<11;i++){const xx=x+(r()-.5)*.42*scale,zz=z+(r()-.5)*.38*scale,hh=(.18+r()*.43)*scale;tube(p,[[xx,y+.45*scale,zz],[xx+.02,y+.45*scale+hh*.6,zz],[xx-.02,y+.45*scale+hh,zz]],.008*scale,plain(0x526640),8);leaf(p,xx,y+.45*scale+hh*.5,zz,.65*scale,0x667a45,i%2?.55:-.55);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;sphere(p,.034*scale,plain([0xd1b787,0xa488ac,0xd6cfb1][i%3]),xx+Math.cos(a)*.035*scale,y+.45*scale+hh,zz+Math.sin(a)*.035*scale,1,.35,1);}}
}
function loaf(p,x,y,z,scale=1){sphere(p,.115*scale,plain(0xb7813f),x,y,z,1.9,.75,.9);for(let i=-1;i<=1;i++)tube(p,[[x+i*.067*scale,y+.058*scale,z-.047*scale],[x+i*.067*scale+.025*scale,y+.078*scale,z],[x+i*.067*scale+.05*scale,y+.058*scale,z+.047*scale]],.008*scale,plain(0xe0b16b),6);}
function tileGeometry(x0,x1,z0,z1,h,rise,half,side,row,col){const pos=[],uv=[],ind=[],nx=4,nz=4;for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
  const u=i/nx,v=j/nz,apron=u>.75?Math.sin(v*Math.PI)*.055*((u-.75)/.25):0,x=side*(x0+(x1-x0)*u+apron),z=z0+(z1-z0)*v,edge=Math.min(1,Math.abs(x)/half),y=h+rise*(1-edge)**1.55+.12*edge*edge+.09+Math.sin(v*Math.PI)*.027;
  pos.push(x,y,z);uv.push((col%8+.08+v*.84)/8,(row%8+.06+u*.80)/8);
}
for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const a=i*(nz+1)+j,b=a+1,c=a+nz+1,d=c+1;const tri=side>0?[a,b,c,b,d,c]:[a,c,b,b,c,d];ind.push(...tri);}
const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;}
function tiledRoof(p,w,d,h,rise,m){const half=(w+1.0)/2,rows=Math.ceil(half/.38),cols=Math.ceil((d+1.0)/.39),dz=(d+1.0)/cols;
  for(const side of[-1,1])for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x0=row*half/rows,x1=Math.min(half,(row+1)*half/rows+.055),z0=-d-.5+col*dz-(row%2)*.06,z1=z0+dz+.04;mesh(p,tileGeometry(x0,x1,z0,z1,h,rise,half,side,row,col),m);metrics.roofTiles++;}
  // Curved bargeboards, a heavy ridge and supporting wooden eaves.
  for(const z of[.54,-d-.53])for(const side of[-1,1]){const pts=[];for(let i=0;i<=16;i++){const x=half*i/16,y=h+rise*(1-i/16)**1.55+.12*(i/16)**2;pts.push([side*x,y+.035,z]);}tube(p,pts,.10,materials.wood,24);}
  beam(p,[0,h+rise+.16,.58],[0,h+rise+.16,-d-.58],.13,.17,materials.wood);
  for(const side of[-1,1])beam(p,[side*half,h+.08,.54],[side*half,h+.08,-d-.54],.20,.23);
  const shape=new THREE.Shape();shape.moveTo(-half,0);for(let i=0;i<=32;i++){const x=-half+i*half/16;shape.lineTo(x,rise*(1-Math.abs(x)/half)**1.55+.12*(x/half)**2);}shape.lineTo(half,0);shape.closePath();mesh(p,new THREE.ShapeGeometry(shape),materials.plaster,0,h,.01);
  for(const side of[-1,1])beam(p,[side*w*.31,h+.06,.12],[side*w*.07,h+rise*.67,.12],.095,.13);
  window(p,.15,h+.48,.68,1.26,.02);
}
function wroughtSign(p,x,y,kind){const iron=plain(0x3c3932,.7,.25);tube(p,[[x,y,.05],[x,y+.3,.5],[x,y+.28,1.1],[x,y-.04,1.50]],.035,iron);tube(p,[[x,y+.25,.50],[x,y+.55,.63],[x,y+.50,.90],[x,y+.27,.78]],.022,iron);tube(p,[[x,y-.04,1.43],[x,y-.45,1.43]],.020,iron);
  const medallion=new THREE.Group();medallion.position.set(x,y-.82,1.45);medallion.rotation.y=Math.PI/2;p.add(medallion);
  mesh(medallion,new THREE.CircleGeometry(.44,32),materials.wood,0,0,0);mesh(medallion,new THREE.TorusGeometry(.455,.035,6,32),iron,0,0,.025);
  for(const side of[-1,1]){const icon=new THREE.Group();icon.rotation.y=side<0?Math.PI:0;medallion.add(icon);if(kind==='bakery')loaf(icon,0,0,.075,1.25);else{for(let j=0;j<8;j++){const a=j*Math.PI/4;sphere(icon,.09,plain(0xb4a074),Math.cos(a)*.18,Math.sin(a)*.18,.05,.85,1,.20);}sphere(icon,.07,plain(0x94794f),0,0,.07,1,1,.3);}}
}
function awning(p,w,y){const cloth=plain(0xe3d0ab),stripe=plain(0xaa745b);for(let i=0;i<12;i++){const x=-w/2+i*w/12;const pts=[],uv=[],ids=[];for(let j=0;j<=8;j++){const z=.05+j/8*1.20,yy=y-.30*(j/8)**.7;pts.push(x,yy,z,x+w/12+.015,yy,z);uv.push(0,j/8,1,j/8);if(j<8){const a=j*2;ids.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();const m=i%2?stripe:cloth;m.side=THREE.DoubleSide;mesh(p,g,m);const edge=box(p,w/12+.012,.22,.025,m,x+w/24,y-.41,1.24);}
  for(const side of[-1,1])tube(p,[[side*w/2,y+.12,.03],[side*w/2,y-.35,1.22]],.028,plain(0x544532));}
function turret(p,x,y,z,r,h){const bay=new THREE.Group();bay.position.set(x,y,z);p.add(bay);const fw=2*r*Math.sin(Math.PI/8),radius=r*Math.cos(Math.PI/8);for(let i=0;i<8;i++){const a=i*Math.PI/4,face=new THREE.Group();face.position.set(Math.sin(a)*radius,0,Math.cos(a)*radius);face.rotation.y=a;bay.add(face);wallWithOpenings(face,fw,h,(i===0||i===1||i===7)?[{x:0,y:.55,w:.49,h:1.72}]:[],0);}for(const yy of[.12,h-.12])cyl(bay,r*1.07,r*1.07,.13,mat('stone',0xbcac8e),0,yy,0,8);
  for(const a of[-Math.PI/4,0,Math.PI/4]){const face=new THREE.Group();face.position.set(Math.sin(a)*r*.94,0,Math.cos(a)*r*.94);face.rotation.y=a;bay.add(face);window(face,0,.56,.49,1.72,.035);beam(face,[-.42,.14,.06],[-.42,h-.13,.06],.10,.12);beam(face,[.42,.14,.06],[.42,h-.13,.06],.10,.12);}
  for(const side of[-1,1])tube(bay,[[side*.24,-.76,-.30],[side*.48,-.32,.30],[side*.63,.10,.58]],.095,materials.wood);
  const rh=3.6,pts=[];for(let i=0;i<=24;i++){const u=i/24;pts.push(new THREE.Vector2(r*1.35*(1-u)**1.6+.01*u,rh*u));}const roof=mesh(bay,new THREE.LatheGeometry(pts,32),materials['roof-teal'],0,h-.02,0);roof.material.side=THREE.DoubleSide;
  for(let i=0;i<11;i++){const u=i/11,rr=r*1.35*(1-u)**1.6+.01*u;const band=mesh(bay,new THREE.TorusGeometry(rr,.022,5,40),plain(0x60736e),0,h+rh*u,0);band.rotation.x=Math.PI/2;}
  sphere(bay,.085,plain(0x8e7548,.6,.25),0,h+rh+.02,0);beam(bay,[0,h+rh,0],[0,h+rh+.60,0],.02,.02,plain(0x7c6540));
}
export function buildShopNameplate(name,wood){
  const group=new THREE.Group(),canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const context=canvas.getContext('2d');context.fillStyle='#eee0be';context.fillRect(0,0,512,128);context.strokeStyle='#a58b55';context.lineWidth=4;context.strokeRect(12,12,488,104);
  context.fillStyle='#405647';context.textAlign='center';context.textBaseline='middle';context.font="66px 'Songti SC',serif";context.fillText(name,256,64,460);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const frame=new THREE.Mesh(new THREE.BoxGeometry(2.45,.50,.10),wood);frame.castShadow=true;frame.receiveShadow=true;group.add(frame);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(2.31,.40),new THREE.MeshStandardMaterial({map,roughness:.92}));face.position.z=.056;face.receiveShadow=true;face.material.userData.shared=true;group.add(face);
  // Project beyond facade beams and the hanging pictorial sign so the text has a clear frontage.
  for(const x of[-.95,.95]){const bracket=new THREE.Mesh(new THREE.BoxGeometry(.08,.08,1.52),wood);bracket.position.set(x,0,-.80);bracket.castShadow=true;group.add(bracket);}
  group.position.set(0,3.67,1.72);group.userData.shopName=name;return group;
}
export function buildHeroHouse(b,{nameplate=false}={}){metrics.heroBuildings++;const p=new THREE.Group(),w=b.width,h=b.height,d=b.depth,flower=b.kind==='florist',domestic=['home','inn'].includes(b.kind),wood=materials.wood,a=b.assembly||{stories:2,roof:flower?'teal':'clay',roofRise:flower?3.6:3.2,bay:flower?'octagonal':'none',awning:'striped',balcony:'none',chimney:flower?'none':'tall-stone'};
  const door={x:w*.28,y:.12,w:1.15,h:2.45},shop={x:-w*.19,y:.75,w:w*.40,h:1.75},upper=[{x:-w*.27,y:4.18,w:.96,h:1.7},{x:w*.27,y:4.34,w:.96,h:1.65}];if(a.stories===3)upper.push({x:-w*.24,y:6.48,w:.85,h:1.35},{x:w*.24,y:6.48,w:.85,h:1.35});
  for(const side of[-1,1]){
    const face=new THREE.Group();face.position.set(side*w/2,0,-d/2);face.rotation.y=side*Math.PI/2;p.add(face);
    const openings=[];for(let zz=-1.30;zz>-d+.6;zz-=1.30){const x=-side*(zz+d/2);openings.push({x,y:4.05,w:.72,h:1.5});if(domestic)openings.push({x,y:1.20,w:.72,h:1.5});if(a.stories===3)openings.push({x,y:6.48,w:.66,h:1.25});}
    wallWithOpenings(face,d,h,openings,0);for(const opening of openings)window(face,opening.x,opening.y,opening.w,opening.h,.02);
  }
  box(p,w,h,.24,materials.plaster,0,h/2,-d+.12);
  // Remove the central backing from the shop window by placing the inner wall deeper than the facade.
  wallWithOpenings(p,w,h,[door,shop,...upper],.20);
  for(const opening of[door,shop,...upper]){box(p,opening.w+.2,opening.h+.15,.20,plain(0x30372d),opening.x,opening.y+opening.h/2,-.52);}
  trim(p,door.x,door.y,door.w,door.h,.10,.19,mat('stone',0xc3b393));mesh(p,new THREE.ShapeGeometry(arch(door.w-.10,door.h-.12)),wood,door.x,door.y+.03,-.10);for(let i=0;i<3;i++)box(p,.06,2.20,.035,wood,door.x-.35+i*.35,1.20,-.064);
  for(const yy of[.63,1.83])box(p,1.04,.085,.045,plain(0x4a4339,.7,.2),door.x,yy,-.032);const handle=mesh(p,new THREE.TorusGeometry(.095,.019,6,18),plain(0x7d6745,.6,.25),door.x+.31,1.14,.03);
  stoneBlock(p,1.43,.13,.39,door.x,.066,.26,7);
  for(let row=0;row<3;row++)for(let col=0;col<Math.ceil(w/.67);col++){const x=-w/2+(col+.5)*w/Math.ceil(w/.67),yy=.13+row*.26;if(Math.abs(x-door.x)<.88||Math.abs(x-shop.x)<shop.w/2+.05)continue;stoneBlock(p,.62,.235,.27,x,yy,.17,row*20+col);}
  for(const side of[-1,1])for(let j=0;j<9;j++)stoneBlock(p,.38,.28,.27,side*(w/2-.08),.21+j*.31,.13,j+Math.round(w*8));
  // Shop contents are reused library props; residential windows omit shop counters.
  if(domestic)window(p,shop.x,shop.y,shop.w,shop.h,.13);
  else{
    trim(p,shop.x,shop.y,shop.w,shop.h,.13,.15);box(p,shop.w+.16,.14,.67,wood,shop.x,shop.y-.11,.27);
    box(p,shop.w-.12,.075,.55,wood,shop.x,1.20,-.13);box(p,shop.w-.12,.075,.48,wood,shop.x,1.73,-.19);
    if(b.kind==='florist'){for(let i=0;i<4;i++)planter(p,shop.x-shop.w*.30+i*.48,.80,.16,20+i,.64);}
    else if(b.kind==='books'){for(let level=0;level<2;level++)for(let i=0;i<9;i++){const m=plain([0x765743,0x667555,0x516f7b,0xb39462][i%4]);box(p,.13,.33+(i%3)*.05,.20,m,shop.x-shop.w*.36+i*shop.w*.09,1.42+level*.49,-.03);}}
    else if(b.kind==='apothecary'){for(let i=0;i<7;i++){cyl(p,.065,.085,.26,plain([0x819387,0xaa947a,0x597976][i%3],.35),shop.x-shop.w*.36+i*shop.w*.12,1.35,-.05);cyl(p,.03,.03,.07,plain(0xbaa27b),shop.x-shop.w*.36+i*shop.w*.12,1.515,-.05);}}
    else if(b.kind==='toys'){for(let i=0;i<5;i++){box(p,.20,.22,.22,plain([0xa86c4a,0x627976,0xb99b65][i%3]),shop.x-shop.w*.3+i*.34,1.39,-.02);mesh(p,new THREE.ConeGeometry(.14,.16,4),plain(0xbfa16a),shop.x-shop.w*.3+i*.34,1.58,-.02);}}
    else for(let level=0;level<3;level++)for(let i=0;i<7;i++)loaf(p,shop.x-shop.w*.40+i*shop.w*.13,.90+level*.48,.11-level*.13,.85);
    for(const xx of[shop.x-shop.w*.46,shop.x+shop.w*.46])beam(p,[xx,shop.y+.05,.21],[xx,shop.y+shop.h-.13,.21],.07,.08);
  }
  if(a.awning==='striped')awning(p,w*.78,2.82);
  for(const u of upper)window(p,u.x,u.y,u.w,u.h,.22);
  const floorY=3.34;beam(p,[-w/2-.17,floorY,.34],[w/2+.17,floorY-.075,.34],.19,.31);beam(p,[-w/2,h-.06,.18],[w/2,h+.04,.18],.18,.24);
  for(const x of[-w/2+.08,w*.03,w/2-.08])beam(p,[x,.92,.21],[x+(x<0?-.04:.055),h,.23],.20,.23);
  for(const side of[-1,1]){tube(p,[[side*w*.39,2.41,.16],[side*w*.40,2.88,.35],[side*w*.35,3.35,.63]],.075,wood);beam(p,[side*w*.36,3.58,.21],[side*w*.11,h-.24,.22],.12,.15);}
  for(const side of[-1,1])for(let z=-.65;z>-d;z-=1.30){beam(p,[side*w/2,.32,z],[side*w/2,h,z],.17,.19);beam(p,[side*w/2,2.42,z],[side*w/2,3.26,Math.max(-d+.10,z-.75)],.10,.13);}
  if(a.stories===3)beam(p,[-w/2,6.23,.28],[w/2,6.23,.28],.18,.26);
  tiledRoof(p,w,d,h,a.roofRise,materials[a.roof==='teal'?'roof-teal':'roof-clay']);
  if(a.bay==='octagonal')turret(p,-w*.18,a.stories===3?4.7:3.45,.34,1.07,a.stories===3?3.3:2.50);
  if(a.balcony==='timber'){const y=a.stories===3?6.24:4.05,x=w*.18;box(p,w*.62,.14,1.0,wood,x,y,.63);beam(p,[x-w*.29,y+.71,1.08],[x+w*.29,y+.71,1.08],.075,.09);for(let i=0;i<9;i++)beam(p,[x-w*.28+i*w*.07,y+.05,1.08],[x-w*.28+i*w*.07,y+.69,1.08],.045,.05);for(const side of[-1,1])tube(p,[[x+side*w*.24,y-.7,.03],[x+side*w*.25,y-.22,.58],[x+side*w*.25,y,.95]],.075,wood);}
  if(flower){vine(p,-w*.40,.78,.36,4.0,4);vine(p,w*.38,1.68,.38,3.7,12);for(let i=0;i<5;i++)planter(p,-w*.35+i*.54,.13,.52,30+i,.72);}
  else if(b.kind==='bakery'){for(let i=0;i<2;i++)planter(p,w*.36,0,.6+i*.42,13+i,.78);}
  if(a.chimney==='tall-stone'){const x=w*.32;for(let row=0;row<17;row++)for(let k=0;k<2;k++)stoneBlock(p,.37,.30,.72,x+(k-.5)*.37,h-1.4+row*.30,-d*.70,60+row+k);stoneBlock(p,.94,.18,.90,x,h+3.62,-d*.70,72);}
  wroughtSign(p,flower?w*.34:-w*.39,4.16,b.kind);if(!flower)vine(p,w*.44,.43,.35,3.3,8);
  if(nameplate){p.add(buildShopNameplate(b.name,wood));metrics.nameplates++;}
  for(const lx of[-w*.40,w*.42]){tube(p,[[lx,2.43,.08],[lx,2.62,.24],[lx,2.43,.43]],.025,plain(0x403b30));box(p,.18,.29,.16,plain(0xbcaa74,.42),lx,2.22,.43);for(const xx of[-.09,.09])beam(p,[lx+xx,2.07,.50],[lx+xx,2.36,.50],.016,.016,plain(0x454033));mesh(p,new THREE.ConeGeometry(.18,.17,4),plain(0x403b30),lx,2.44,.43).rotation.y=Math.PI/4;}
  p.position.set(b.x,0,b.z);p.rotation.y=b.rotation;p.userData.building=b.id;p.userData.heroAsset=true;return p;
}
export function buildHeroStreet(plan={}){const p=new THREE.Group(),pos=[],uv=[],random=rng(703),c=plan.center||center,rs=plan.roadside||roadside,half=plan.roadWidth?plan.roadWidth/2:4.40,end=plan.version===4?-15:14.5;
  for(let z=33;z>=end;z-=.5){const a={x:c(z),z},b={x:c(z-.5),z:z-.5};for(const[v,side]of[[a,-1],[a,1],[b,-1],[a,1],[b,1],[b,-1]]){pos.push(v.x+side*half,.055,v.z);uv.push((side+1)*half/4,(33-v.z)/4);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const base=mesh(p,geo,materials.pavers);base.castShadow=false;
  // Low raised stones in the foreground; a player still walks on the same flat navigation plane.
  for(let row=0;row<11;row++)for(let col=0;col<Math.floor(half*2/.59);col++){
    const z=32.55-row*.59+.10*Math.sin(col*.55),x=c(z)-half+.38+col*.59+(row%2)*.22;if(Math.abs(x-c(z))>half-.15)continue;
    const w=.54+random()*.035,d=.53+random()*.04,shape=new THREE.Shape();const bevel=.07;shape.moveTo(-w/2+bevel,-d/2);shape.lineTo(w/2-bevel,-d/2+.015);shape.lineTo(w/2,-d/2+bevel);shape.lineTo(w/2-.013,d/2-bevel);shape.lineTo(w/2-bevel,d/2);shape.lineTo(-w/2+bevel,d/2-.012);shape.lineTo(-w/2,d/2-bevel);shape.lineTo(-w/2,-d/2+bevel);shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelThickness:.01,bevelSize:.019,bevelSegments:1});g.rotateX(-Math.PI/2);
    const a=g.attributes.uv;for(let i=0;i<a.count;i++)a.setXY(i,(col%4+.32+a.getX(i)*.48)/4,(row%4+.33+a.getY(i)*.48)/4);
    const o=mesh(p,g,materials.pavers,x,.060+random()*.009,z);o.rotation.y=(random()-.5)*.05;metrics.sculptedPavers++;
  }
  for(let z=32.6;z>end+.3;z-=.66)for(const side of[-1,1]){const q=rs(z,side,half-.04);stoneBlock(p,.23,.14,.61,q.x,.075,q.z,Math.round(z*12)+side);}
  // A restrained drainage groove and pockets of moss at shaded kerbs.
  for(let z=32.2;z>end+.5;z-=1.2){const q=rs(z,-1,half-.50);box(p,.13,.011,.99,plain(0x635c48),q.x,.078,q.z);for(let j=0;j<5;j++)box(p,.10,.019,.035,plain(0x4e4b3e,.6,.25),q.x,.085,q.z-.36+j*.18);}
  for(let i=0;i<45;i++){const z=end+1+random()*(31-end),side=i%2?1:-1,q=rs(z,side,half-.13);const patch=mesh(p,new THREE.CircleGeometry(.065+random()*.10,6),plain([0x62694b,0x747853,0x596044][i%3]),q.x,.068,q.z);patch.rotation.x=-Math.PI/2;patch.castShadow=false;}
  p.userData.heroAsset=true;return p;
}
