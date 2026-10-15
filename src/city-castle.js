import * as THREE from 'three';
import {sceneryMaterials} from './scenery.js';
import {glow,plain} from './materials.js';

// The city's royal gatehouse, the curtain wall on the palace hill, palace
// battlements and pennants, and the moat. Reuses the limestone and slate of the
// existing royal backdrop; no new downloads.
let M;
function mesh(g,geo,m,x=0,y=0,z=0,shadow=true){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,m,x=0,y=0,z=0){return mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
// A hole path lifted off the outline's bottom edge so the extrusion triangulates cleanly.
const hole=(w,h)=>new THREE.Path(arch(w,h).getPoints(24).reverse().map(p=>new THREE.Vector2(p.x,Math.max(p.y,.02))));
function arch(w,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h-w*.5);s.quadraticCurveTo(-w/2,h,0,h);s.quadraticCurveTo(w/2,h,w/2,h-w*.5);s.lineTo(w/2,0);s.closePath();return s;}

// Merlons along the edges of a w×d rectangle whose top is at y.
function battlements(g,w,d,y,{x=0,z=0,sides='fblr',merlon=.72,gap=.5,h=.95,t=.42,skip=null}={}){
  const run=(len,place)=>{const n=Math.max(1,Math.floor((len+gap)/(merlon+gap))),span=n*merlon+(n-1)*gap;for(let i=0;i<n;i++){const u=-span/2+merlon/2+i*(merlon+gap);if(skip&&skip(u))continue;place(u);}};
  if(sides.includes('f'))run(w,u=>box(g,merlon,h,t,M.edge,x+u,y+h/2,z+d/2-t/2));
  if(sides.includes('b'))run(w,u=>box(g,merlon,h,t,M.edge,x+u,y+h/2,z-d/2+t/2));
  if(sides.includes('l'))run(d-2*t,u=>box(g,t,h,merlon,M.edge,x-w/2+t/2,y+h/2,z+u));
  if(sides.includes('r'))run(d-2*t,u=>box(g,t,h,merlon,M.edge,x+w/2-t/2,y+h/2,z+u));
}
function ringBattlements(g,x,z,r,y,count=12){for(let i=0;i<count;i++){const a=i/count*Math.PI*2,o=box(g,.62,.85,.36,M.edge,x+Math.cos(a)*r,y+.42,z+Math.sin(a)*r);o.rotation.y=-a+Math.PI/2;}}
// A tall, slightly concave slate cone in the FF9 manner, with a gold finial.
function cone(g,x,y,z,r,h){const pts=[[r*1.22,0],[r*1.22,.12],[r,.42],[r*.74,h*.28],[r*.45,h*.55],[r*.2,h*.8],[0,h]].map(([a,b])=>new THREE.Vector2(a,b));mesh(g,new THREE.LatheGeometry(pts,28),M.roof,x,y,z);mesh(g,new THREE.CylinderGeometry(.04,.05,1.2,6),M.gold,x,y+h+.5,z);mesh(g,new THREE.SphereGeometry(.13,8,6),M.gold,x,y+h+.15,z);return y+h+1.1;}
function pennant(g,x,y,z,color,yaw=0){const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(1.9,-.22);shape.lineTo(1.5,-.36);shape.lineTo(1.9,-.55);shape.lineTo(0,-.62);shape.closePath();const f=mesh(g,new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}),x+.03,y,z,false);f.rotation.y=yaw;}
function drumTower(g,x,z,r,h,{slits=true,pennantColor=0x7a3640}={}){mesh(g,new THREE.CylinderGeometry(r,r*1.06,h,28),M.masonry,x,h/2,z);
  for(const y of[h*.35,h*.7])mesh(g,new THREE.CylinderGeometry(r+.12,r+.12,.22,28),M.edge,x,y,z);
  // Machicolation corbels carry the projecting crown.
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;box(g,.26,.5,.3,M.edge,x+Math.cos(a)*(r+.14),h-.15,z+Math.sin(a)*(r+.14)).rotation.y=-a;}
  mesh(g,new THREE.CylinderGeometry(r+.32,r+.32,.42,28),M.edge,x,h+.25,z);ringBattlements(g,x,z,r+.2,h+.46,14);
  if(slits)for(const y of[h*.22,h*.52,h*.82])box(g,.16,.9,.1,M.windowMat,x,y,z+r+.01);
  const top=cone(g,x,h+.46,z,r*.92,r*3.4);mesh(g,new THREE.CylinderGeometry(.03,.03,1.6,5),M.iron,x,top+.6,z);pennant(g,x,top+1.35,z,pennantColor);}
function banner(g,x,y,z,color,len=4.2){const s=new THREE.Shape();s.moveTo(-.55,0);s.lineTo(.55,0);s.lineTo(.55,-len);s.lineTo(0,-len+.45);s.lineTo(-.55,-len);s.closePath();mesh(g,new THREE.ShapeGeometry(s),new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide}),x,y,z,false);box(g,1.35,.08,.1,M.gold,x,y+.02,z+.02);
  const stripe=new THREE.Shape();stripe.moveTo(-.12,-.25);stripe.lineTo(.12,-.25);stripe.lineTo(.12,-len+.7);stripe.lineTo(-.12,-len+.7);stripe.closePath();mesh(g,new THREE.ShapeGeometry(stripe),M.gold,x,y,z+.012,false);}
function crest(g,x,y,z){const s=new THREE.Shape();s.moveTo(-.85,.9);s.lineTo(.85,.9);s.lineTo(.85,-.1);s.quadraticCurveTo(.8,-.85,0,-1.15);s.quadraticCurveTo(-.8,-.85,-.85,-.1);s.closePath();mesh(g,new THREE.ExtrudeGeometry(s,{depth:.12,bevelEnabled:true,bevelSize:.06,bevelThickness:.05,bevelSegments:1}),plain(0x3e5873,.7),x,y,z);
  mesh(g,new THREE.OctahedronGeometry(.42,0),M.gold,x,y-.05,z+.22).scale.set(.75,1.15,.3);box(g,1.9,.12,.2,M.gold,x,y+1.0,z+.05);}

function gatehouse(){const g=new THREE.Group();g.position.set(-1,3,-76.5);const W=9,H=12.5,D=6,front=D/2;
  // Main block with a deep arched passage; the portcullis hangs half raised.
  const wall=new THREE.Shape();wall.moveTo(-W/2,0);wall.lineTo(W/2,0);wall.lineTo(W/2,H);wall.lineTo(-W/2,H);wall.closePath();wall.holes.push(hole(4.0,6.6));
  mesh(g,new THREE.ExtrudeGeometry(wall,{depth:D,bevelEnabled:false,curveSegments:24}),M.masonry,0,0,-front);
  mesh(g,new THREE.ShapeGeometry(arch(4.0,6.6),24),plain(0x1d2526,.95),0,0,-front+.6);
  const ring=arch(4.9,7.2);ring.holes.push(hole(4.0,6.6));mesh(g,new THREE.ExtrudeGeometry(ring,{depth:.35,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:1}),M.edge,0,0,front);
  for(let i=-4;i<=4;i++)box(g,.07,2.6,.07,M.iron,i*.46,5.2,front-.4);for(const y of[4.3,5.1,5.9])box(g,3.9,.07,.07,M.iron,0,y,front-.4);for(let i=-4;i<=4;i++)mesh(g,new THREE.ConeGeometry(.06,.24,4),M.iron,i*.46,3.8,front-.4).rotation.x=Math.PI;
  for(const y of[.2,H*.62])box(g,W+.2,.22,D+.2,M.edge,0,y,0);
  for(let i=0;i<11;i++)box(g,.32,.55,.42,M.edge,-W/2+.45+i*(W-.9)/10,H-.2,front+.2);box(g,W+.6,.45,D+.9,M.edge,0,H+.2,.2);battlements(g,W+.6,D+.9,H+.42,{z:.2});
  for(const x of[-2.6,2.6])box(g,.16,1.0,.1,M.windowMat,x,H*.78,front+.01);
  crest(g,0,9.4,front+.2);for(const x of[-3.35,3.35])banner(g,x,H-.6,front+.08,0x7a3640,5.6);
  for(const side of[-1,1])drumTower(g,side*(W/2+2.1),.6,2.55,15.5,{pennantColor:side<0?0x7a3640:0x3e5873});
  // Lanterns either side of the passage are lit at dusk.
  for(const x of[-2.75,2.75]){box(g,.06,.06,.42,M.iron,x,4.2,front+.42);mesh(g,new THREE.CylinderGeometry(.16,.12,.42,6),glow(0xffdb9a,.12),x,3.95,front+.62,false);mesh(g,new THREE.ConeGeometry(.22,.18,6),M.iron,x,4.25,front+.62);}
  return g;}

// Curtain wall on the palace hill (top at y=7), open at the central stairs.
function curtain(){const g=new THREE.Group(),y=7,h=3.3,t=1.1,x0=-25,x1=23,z0=-100.6,z1=-137.4,cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z0-z1,gap=[-8,6];
  const seg=(ax,az,bx,bz)=>{const len=Math.hypot(bx-ax,bz-az),o=box(g,len,h,t,M.masonry,(ax+bx)/2,y+h/2,(az+bz)/2);o.rotation.y=-Math.atan2(bz-az,bx-ax);const top=box(g,len,.22,t+.25,M.edge,(ax+bx)/2,y+h+.1,(az+bz)/2);top.rotation.y=o.rotation.y;};
  seg(x0,z0,gap[0],z0);seg(gap[1],z0,x1,z0);seg(x0,z1,x1,z1);seg(x0,z0,x0,z1);seg(x1,z0,x1,z1);
  battlements(g,w,d,y+h+.2,{x:cx,z:cz,t:.4,sides:'f',skip:u=>u+cx>gap[0]-.4&&u+cx<gap[1]+.4});battlements(g,w,d,y+h+.2,{x:cx,z:cz,t:.4,sides:'blr'});
  for(const [x,z]of[[x0,z0],[x1,z0],[x0,z1],[x1,z1]]){const tower=new THREE.Group();tower.position.set(x,y-.2,z);g.add(tower);drumTower(tower,0,0,2.1,8.6,{pennantColor:0x3e5873});}
  for(const x of gap){const tower=new THREE.Group();tower.position.set(x+(x<0?-1.1:1.1),y-.2,z0);g.add(tower);drumTower(tower,0,0,1.45,6.4,{slits:false});}
  return g;}

// Palace additions in the palace's own frame (see buildRoyalBackdrop).
function palaceDressing(){const g=new THREE.Group();g.position.set(-1,7,-119);g.rotation.y=-.10;
  battlements(g,38,26,4.08,{t:.45});
  for(const [x,z,r,h]of[[-16,7,1.8,21],[16,7,1.8,22],[-9,-7,1.75,30],[9,-7,1.75,32],[-4.5,-13,1.1,35],[4.5,-13,1.1,36]]){mesh(g,new THREE.CylinderGeometry(.03,.03,1.4,5),M.iron,x,h+7.3,z);pennant(g,x,h+7.95,z,x<0?0x7a3640:0x3e5873);}
  // Two slender spires flank the sword tower and sharpen the skyline.
  for(const side of[-1,1]){const x=side*12.5,z=-12,h=27;mesh(g,new THREE.CylinderGeometry(1.05,1.15,h,20),M.masonry,x,h/2,z);mesh(g,new THREE.CylinderGeometry(1.3,1.3,.35,20),M.edge,x,h,z);ringBattlements(g,x,z,1.15,h+.15,9);const top=cone(g,x,h+.2,z,1.0,6.4);pennant(g,x,top+.4,z,0x3e5873);}
  return g;}

function moat(){const shape=new THREE.Shape(),n=64;for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=1+.06*Math.sin(a*5)+.04*Math.sin(a*11);const x=-1+Math.cos(a)*54*r,z=-128+Math.sin(a)*40*r;i?shape.lineTo(x,-z):shape.moveTo(x,-z);}
  const geo=new THREE.ShapeGeometry(shape,64);geo.rotateX(-Math.PI/2);
  const water=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0x4f7f93,roughness:.12,metalness:.05,envMapIntensity:1.6}));water.position.y=-.25;water.receiveShadow=true;return water;}

export function buildCityCastle(){M=sceneryMaterials();const g=new THREE.Group();g.add(gatehouse(),curtain(),palaceDressing(),moat());
  const shared=new Map();g.traverse(o=>{if(o.isMesh&&o.material.side===THREE.DoubleSide&&!o.material.userData.shared){const k=o.material.color.getHex();if(!shared.has(k))shared.set(k,o.material);o.material=shared.get(k);}});
  return g;}
export const GATE_LAMPS=[[-3.75,-72.9],[1.75,-72.9]];
