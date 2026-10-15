import * as THREE from 'three';
import {plain,glow} from './materials.js';
import {rng} from './layout.js';
import {cityKit} from './city-assets.js';
import {batchStatic} from './batch.js';

// Builds the street-dressing kit placed by planCityDressing. Static parts are batched;
// lantern halos stay separate so the time of day can fade them.
function mesh(g,geo,m,x=0,y=0,z=0,shadow=true){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;g.add(o);return o;}
const CLOTH=[0xe8dcc4,0xb5584a,0x5f7d9a,0xe2c06a,0x7e9a6c,0xd9a1a0,0xf2efe6];
const BLOOM=[0xd8616b,0xf0c35a,0xe9e3f2,0xb06fb5,0xf08a5d];

function barrel(g,k,x,z){mesh(g,new THREE.CylinderGeometry(.30,.27,.82,12),k.wood,x,.41,z);for(const y of[.14,.68])mesh(g,new THREE.TorusGeometry(.295,.025,4,16),k.iron,x,y,z).rotation.x=Math.PI/2;mesh(g,new THREE.CircleGeometry(.27,12),k.wood,x,.821,z).rotation.x=-Math.PI/2;}
function crate(g,k,x,z,s=.5,y=0,turn=0){const c=mesh(g,new THREE.BoxGeometry(s,s,s),k.wood,x,y+s/2,z);c.rotation.y=turn;for(const yy of[.06,s-.06]){const band=mesh(g,new THREE.BoxGeometry(s+.02,.05,s+.02),plain(0x6f5a44),x,y+yy,z);band.rotation.y=turn;}}
function sack(g,x,z,color,turn=0){const s=mesh(g,new THREE.SphereGeometry(.24,10,8),plain(color,.98),x,.2,z);s.scale.set(1,.85,.8);s.rotation.y=turn;mesh(g,new THREE.ConeGeometry(.08,.14,6),plain(color,.98),x,.42,z);}
function pot(g,x,z,random,s=1){const clay=plain(0xb46a4c,.9);mesh(g,new THREE.CylinderGeometry(.2*s,.14*s,.32*s,10),clay,x,.16*s,z);mesh(g,new THREE.TorusGeometry(.2*s,.03*s,4,12),clay,x,.32*s,z).rotation.x=Math.PI/2;
  const leaf=plain([0x5f7a45,0x6d8a4c,0x55703f][Math.floor(random()*3)]);for(let i=0;i<4;i++){const a=i*1.7+random(),f=mesh(g,new THREE.IcosahedronGeometry(.16*s,0),leaf,x+Math.cos(a)*.08*s,.44*s+random()*.12*s,z+Math.sin(a)*.08*s);f.scale.y=.8;}
  if(random()<.7)for(let i=0;i<5;i++){const a=random()*6.28;mesh(g,new THREE.IcosahedronGeometry(.045*s,0),plain(BLOOM[Math.floor(random()*BLOOM.length)],.7),x+Math.cos(a)*.15*s,.52*s+random()*.12*s,z+Math.sin(a)*.15*s,false);}}
function produce(g,k,x,z,random){mesh(g,new THREE.CylinderGeometry(.34,.28,.36,12),plain(0xa57f52,.95),x,.18,z);const fruit=[0xc8452f,0xe39a32,0x8fae44][Math.floor(random()*3)];for(let i=0;i<9;i++){const a=i*2.4,r=.08+(i%3)*.08;mesh(g,new THREE.SphereGeometry(.075,8,6),plain(fruit,.6),x+Math.cos(a)*r,.39+(i%2)*.04,z+Math.sin(a)*r,false);}}

function groundProp(g,k,p){const random=rng(p.seed),local=new THREE.Group();local.position.set(p.x,p.y,p.z);local.rotation.y=p.rotation;g.add(local);const L=local;
  switch(p.kind){
    case'barrel':barrel(L,k,0,0);break;
    case'crates':crate(L,k,-.08,0,.52,0,.1);crate(L,k,.04,.02,.4,.52,-.25);break;
    case'produce':produce(L,k,0,0,random);break;
    case'sacks':sack(L,-.12,0,0xcdb88f,.3);sack(L,.16,.05,0xbfa77c,-.4);break;
    case'sack':sack(L,0,0,0xcdb88f,random()*3);break;
    case'pots':pot(L,-.13,0,random,1.1);pot(L,.17,.06,random,.8);break;
    case'pot':pot(L,0,0,random,.9);break;
    case'bench-pot':mesh(L,new THREE.BoxGeometry(.6,.06,.3),k.wood,0,.36,0);for(const x of[-.24,.24])mesh(L,new THREE.BoxGeometry(.06,.36,.26),k.wood,x,.18,0);{const top=new THREE.Group();top.position.y=.39;L.add(top);pot(top,0,0,random,.6);}break;
    case'planter':mesh(L,new THREE.BoxGeometry(.7,.38,.36),k.stone,0,.19,0);for(let i=0;i<5;i++)mesh(L,new THREE.IcosahedronGeometry(.17,0),k.ivy,-.24+i*.12,.45+(i%2)*.05,0);break;
  }}

function vine(g,k,v){const random=rng(v.seed),local=new THREE.Group();local.position.set(v.x,v.y,v.z);local.rotation.y=v.rotation;g.add(local);
  const leaf=[k.ivy,plain(0x5b6e43),plain(0x7a8a55)];let x=0,y=.05;
  for(let i=0;y<v.height;i++){x+=(random()-.5)*.22;x=Math.max(-.12,Math.min(.55,x));y+=.12+random()*.1;const s=.12+random()*.13+(y<1?.05:0);
    const f=mesh(local,new THREE.IcosahedronGeometry(s,0),leaf[i%3],x,y,.04+random()*.06,false);f.scale.z=.45;
    if(random()<.35){const f2=mesh(local,new THREE.IcosahedronGeometry(s*.8,0),leaf[(i+1)%3],x+(random()-.3)*.5,y-.1,.04,false);f2.scale.z=.45;}}}

function wallLantern(g,k,l,halos,haloMaterial){const local=new THREE.Group();local.position.set(l.x,l.y,l.z);local.rotation.y=l.rotation;g.add(local);
  mesh(local,new THREE.BoxGeometry(.05,.05,.3),k.iron,0,.22,-.06,false);mesh(local,new THREE.CylinderGeometry(.1,.08,.26,6),glow(0xffdb9a,.12),0,0,.08,false);mesh(local,new THREE.ConeGeometry(.15,.13,6),k.iron,0,.19,.08,false);
  const halo=new THREE.Sprite(haloMaterial);halo.scale.set(1.9,1.9,1);halo.position.set(l.x,l.y-.05,l.z);halo.position.x+=Math.sin(l.rotation)*.28;halo.position.z+=Math.cos(l.rotation)*.28;halos.add(halo);}

function hangingLine(g,k,line){const random=rng(line.seed),a=new THREE.Vector3(line.a.x,line.a.y,line.a.z),b=new THREE.Vector3(line.b.x,line.b.y,line.b.z),sag=.35+a.distanceTo(b)*.04;
  const point=t=>a.clone().lerp(b,t).add(new THREE.Vector3(0,-Math.sin(t*Math.PI)*sag,0));
  const curve=new THREE.CatmullRomCurve3([0,.25,.5,.75,1].map(point));mesh(g,new THREE.TubeGeometry(curve,16,.012,4,false),plain(0x8a7a62),0,0,0,false);
  for(const end of[a,b])mesh(g,new THREE.BoxGeometry(.05,.05,.22),k.iron,end.x,end.y,end.z,false);
  const dir=b.clone().sub(a).setY(0).normalize(),yaw=Math.atan2(dir.x,dir.z)+Math.PI/2;
  if(line.kind==='laundry'){for(let t=.14;t<.88;t+=.12+random()*.08){const p=point(t),w=.32+random()*.3,h=.42+random()*.4,cloth=mesh(g,new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({color:CLOTH[Math.floor(random()*CLOTH.length)],roughness:1,side:THREE.DoubleSide}),p.x,p.y-h/2,p.z,true);cloth.rotation.y=yaw;cloth.rotation.x=(random()-.5)*.12;}}
  else{const colors=[0xb5584a,0xe2c06a,0x5f7d9a,0xf2efe6];const tri=new THREE.BufferGeometry();tri.setAttribute('position',new THREE.Float32BufferAttribute([-.14,0,0,.14,0,0,0,-.32,0],3));tri.computeVertexNormals();
    for(let i=1;i<14;i++){const p=point(i/14),f=mesh(g,tri,new THREE.MeshStandardMaterial({color:colors[i%4],roughness:1,side:THREE.DoubleSide}),p.x,p.y,p.z,false);f.rotation.y=yaw;}}}

export function buildCityDressing(plan){const k=cityKit(),g=new THREE.Group(),halos=new THREE.Group();halos.userData.dynamic=true;
  const haloMaterial=new THREE.SpriteMaterial({map:haloTexture(),color:0xffb76a,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  for(const p of plan.dressing.props)groundProp(g,k,p);for(const v of plan.dressing.vines)vine(g,k,v);for(const l of plan.dressing.lanterns)wallLantern(g,k,l,halos,haloMaterial);for(const line of plan.dressing.lines)hangingLine(g,k,line);
  // Cloth and pennants use one material per colour; share them before batching.
  const shared=new Map();g.traverse(o=>{if(o.isMesh&&!o.material.userData.shared&&o.material.side===THREE.DoubleSide){const key=o.material.color.getHex();if(!shared.has(key))shared.set(key,o.material);o.material=shared.get(key);}});
  const stats=batchStatic(g);g.add(halos);return{group:g,haloMaterial,stats};}

function haloTexture(){const s=64,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),r=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,.85)');r.addColorStop(.25,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,s,s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
