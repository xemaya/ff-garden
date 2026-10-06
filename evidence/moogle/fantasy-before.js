import * as THREE from 'three';
import {palette,mat,plain,glow} from './materials.js';
import {batchStatic} from './batch.js';

const stone=()=>mat('stone',0xe7d6b6),brass=()=>plain(0xb99550,.55,.35),slate=()=>mat('roof',0x4d6876);
function mesh(p,g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
function box(p,w,h,d,m,x=0,y=0,z=0){return mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function ball(p,r,m,x=0,y=0,z=0,sx=1,sy=1,sz=1){const o=mesh(p,new THREE.SphereGeometry(r,14,9),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function cyl(p,rt,rb,h,m,x=0,y=0,z=0,n=16){return mesh(p,new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);}
function beam(p,a,b,r,m){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from);const o=cyl(p,r,r,v.length(),m);o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function ring(p,r,t,m,x,y,z,vertical=false){const o=mesh(p,new THREE.TorusGeometry(r,t,6,32),m,x,y,z);if(!vertical)o.rotation.x=Math.PI/2;return o;}
function curvedRoof(p,r,h,m,x,y,z){const pts=[new THREE.Vector2(r*1.22,0),new THREE.Vector2(r*1.04,h*.07),new THREE.Vector2(r*.77,h*.19),new THREE.Vector2(r*.43,h*.47),new THREE.Vector2(r*.17,h*.78),new THREE.Vector2(0,h)];return mesh(p,new THREE.LatheGeometry(pts,20),m,x,y,z);}
function crest(p,x,y,z,r=1){const s=new THREE.Shape();s.moveTo(0,-r*.72);s.quadraticCurveTo(-r*.73,-r*.18,-r*.54,r*.58);s.lineTo(r*.54,r*.58);s.quadraticCurveTo(r*.73,-r*.18,0,-r*.72);const o=mesh(p,new THREE.ExtrudeGeometry(s,{depth:.04,bevelEnabled:false}),plain(0x445568),x,y,z);beam(p,[x-r*.42,y+r*.45,z+.06],[x,y-r*.48,z+.06],r*.035,brass());beam(p,[x+r*.42,y+r*.45,z+.06],[x,y-r*.48,z+.06],r*.035,brass());ball(p,r*.12,brass(),x,y+.12,z+.07,1,1,.3);return o;}
function pointedWindow(p,x,y,z,w=1,h=2,m=plain(0x668087)){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h*.7);s.quadraticCurveTo(-w*.4,h*.94,0,h);s.quadraticCurveTo(w*.4,h*.94,w/2,h*.7);s.lineTo(w/2,0);s.closePath();mesh(p,new THREE.ShapeGeometry(s),m,x,y,z);for(const side of[-1,1])beam(p,[x+side*w*.51,y,z+.03],[x+side*w*.51,y+h*.7,z+.03],.055,stone());beam(p,[x,y,z+.04],[x,y+h*.9,z+.04],.022,brass());}
function clockFace(p,r,x,y,z){mesh(p,new THREE.CircleGeometry(r,48),plain(0xe9d6a2),x,y,z);ring(p,r,.075,brass(),x,y,z+.04,true);for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(p,[x+Math.sin(a)*r*.78,y+Math.cos(a)*r*.78,z+.07],[x+Math.sin(a)*r*.93,y+Math.cos(a)*r*.93,z+.07],.027,plain(0x514c40));}beam(p,[x,y,z+.10],[x-r*.30,y+r*.20,z+.10],.04,plain(0x514c40));beam(p,[x,y,z+.11],[x+r*.10,y+r*.66,z+.11],.03,plain(0x514c40));}
function pennant(p,x,y,z,h=3){beam(p,[x,y,z],[x,y+h,z],.04,brass());const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(1.0,-.10);s.lineTo(.65,-.48);s.lineTo(1,-.95);s.lineTo(0,-.82);s.closePath();const o=mesh(p,new THREE.ShapeGeometry(s),plain(0x793846),x,y+h-.2,z);o.material.side=THREE.DoubleSide;}

// Street buildings gain different silhouettes and historical accretions. All
// projecting structures are above the existing walking-height collision boxes.
export function enrichHouse(g,b){const w=b.width,h=b.height,d=b.depth,wood=mat('wood',0x715134),roof=mat('roof',palette[b.roof]);
  if(['inn','apothecary','florist'].includes(b.kind)){
    const x=b.kind==='florist'?-w*.29:w*.27,y=b.kind==='inn'?4.5:3.55,r=b.kind==='inn'?1.15:.83;
    const bay=new THREE.Group();bay.position.set(x,y,.1);g.add(bay);
    cyl(bay,r,r*.78,h-y+.5,mat('plaster',palette[b.wall]),0,(h-y)/2+.25,.12,8);
    for(const xx of[-r*.55,r*.55]){box(bay,.065,h-y+.65,.12,wood,xx,(h-y)/2+.22,r*.85);pointedWindow(bay,xx,(h-y)*.35,r*.89,.52,1.22);}
    ring(bay,r*1.01,.08,wood,0,0,.12);ring(bay,r*1.02,.08,wood,0,h-y+.45,.12);
    curvedRoof(bay,r,3.8,roof,0,h-y+.4,.12);ball(bay,.13,brass(),0,h-y+4.23,.12);pennant(bay,0,h-y+4.1,.12,1.1);
  }
  if(['books','cafe','home'].includes(b.kind)){
    const x=b.kind==='books'?-w*.18:w*.20,y=4.10;
    box(g,w*.63,.16,1.06,wood,x,y,.62);for(let i=0;i<11;i++)box(g,.055,.70,.055,wood,x-w*.29+i*w*.058,y+.40,1.12);
    box(g,w*.65,.09,.07,wood,x,y+.78,1.12);for(const xx of[x-w*.25,x+w*.25])beam(g,[xx,y-.75,.06],[xx,y-.03,1.02],.075,wood);
    for(let i=0;i<4;i++)ball(g,.13,plain(0x587058),x-w*.23+i*w*.16,y+.18,1.06,1,.6,.7);
  }
  if(b.kind==='toys'){
    clockFace(g,.68,-w*.23,h+.66,.23);crest(g,w*.31,3.63,.55,.62);
    for(const side of[-1,1])curvedRoof(g,.42,1.6,roof,side*w*.40,h-.15,-.06);
  }
  if(b.kind==='bakery'){
    const oven=new THREE.Group();oven.position.set(-w*.40,0,-d*.74);g.add(oven);cyl(oven,.47,.7,h+2.7,mat('stone',0xb88c61),0,(h+2.7)/2,0);ring(oven,.58,.10,stone(),0,h+2.7,0);
    for(const xx of[-w*.35,w*.36]){const sill=box(g,.62,.19,.18,stone(),xx,1.1,.1);}
  }
  // Old masonry, uneven quoins and narrow gilt frame details break the toy-house finish.
  for(const side of[-1,1])for(let y=.5;y<2.65;y+=.36)box(g,.29+(Math.round(y*10)%2)*.10,.23,.17,mat('stone',0xcab99b),side*(w/2-.05),y,.09);
  for(let j=0;j<5;j++)box(g,.12,.07,.035,plain(0x8a7356),-w*.3+j*w*.13,3.07,.20);
  crest(g,w*.36,3.48,.30,.47);
  if(b.kind==='inn'){const pipe=mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-w*.46,.2,.15),new THREE.Vector3(-w*.46,4,.15),new THREE.Vector3(-w*.40,4.9,.35),new THREE.Vector3(-w*.32,5.15,.4)]),12,.055,7,false),brass());}
}

export function buildRoyalCity(){const g=new THREE.Group(),s=stone(),blue=slate(),gold=brass();
  // Layered lower town and an elevated viaduct locate the street inside a city.
  const district=new THREE.Group();district.position.set(0,0,-64);g.add(district);
  box(district,77,5.5,7,s,0,2.6,-5);for(let x=-33;x<=33;x+=11){box(district,1.1,12,7,s,x,6,-5);const arc=mesh(district,new THREE.TorusGeometry(4.8,.60,5,28,Math.PI),s,x+5.5,4.5,-1.42);arc.rotation.z=0;}
  for(let i=0;i<15;i++){
    const x=-33+i*4.8,z=-13-(i%3)*4,h=7+(i*7%9),w=3.7+(i%2)*1.0;
    box(district,w,h,4.5,mat('plaster',[0xc9b187,0xdac7a2,0xbbad90][i%3]),x,5+h/2,z);
    const roof=mesh(district,new THREE.ConeGeometry(w*.90,w*.80,4),mat('roof',[0x995b47,0x697970,0x77534c][i%3]),x,5+h+w*.38,z);roof.rotation.y=Math.PI/4;
    for(const xx of[-w*.29,w*.29])pointedWindow(district,x+xx,6+h*.35,z+2.27,.48,1.3);
    box(district,.42,2,.5,s,x+w*.25,5+h+w*.40,z-.60);
  }
  // Royal cathedral silhouette: clustered buttresses and a long blade-like spire.
  const palace=new THREE.Group();palace.position.set(-1,8,-107);g.add(palace);
  box(palace,29,6,20,s,0,3,0);box(palace,16,18,15,s,0,14,-2);box(palace,10,11,9,s,0,26,-3);
  for(const [x,z,r,h]of[[-13,5,2.3,23],[13,5,2.3,23],[-8,-3,2.25,31],[8,-3,2.25,31],[-5,-8,1.4,38],[5,-8,1.4,38]]){
    cyl(palace,r,r*1.12,h,s,x,h/2,z,18);cyl(palace,r*1.2,r*1.2,.6,s,x,h-.7,z);curvedRoof(palace,r,7.2,blue,x,h,z);ball(palace,.16,gold,x,h+7.4,z);pennant(palace,x,h+7.5,z,1.5);
    for(let y=8;y<h-3;y+=6){pointedWindow(palace,x,y,z+r+.035,.65,2.0);box(palace,.2,h*.87,.28,s,x-r*.7,h*.44,z+r*.73);}
  }
  for(const x of[-6,-3,3,6]){box(palace,.60,24,.78,s,x,15,5.58);curvedRoof(palace,.45,3.0,blue,x,27,5.58);}
  pointedWindow(palace,0,4,8.04,3.6,9,plain(0x4c6672));clockFace(palace,1.9,0,23,5.68);
  for(const x of[-4.8,4.8])pointedWindow(palace,x,14,5.60,1.4,4.7);
  // The spire is deliberately tall, slender and faceted, rather than another round turret.
  const blade=new THREE.Shape();blade.moveTo(-2.7,31);blade.lineTo(-2.3,58);blade.lineTo(-1.1,72);blade.lineTo(0,80);blade.lineTo(1.1,72);blade.lineTo(2.3,58);blade.lineTo(2.7,31);blade.closePath();
  mesh(palace,new THREE.ExtrudeGeometry(blade,{depth:2.1,bevelEnabled:true,bevelSize:.13,bevelThickness:.12,bevelSegments:1}),mat('stone',0xf3e3bd),0,0,-4.5);
  beam(palace,[0,32,-2.3],[0,78,-2.3],.085,gold);for(const x of[-3.4,3.4])curvedRoof(palace,.72,4.3,blue,x,31,-3.4);
  ring(palace,4.3,.30,s,0,32,-3.4);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(palace,.32,5,.38,s,Math.cos(a)*3.4,28.5,-3.4+Math.sin(a)*3.4);}
  // Side clock tower and city walls lend the far skyline an asymmetric profile.
  const clock=new THREE.Group();clock.position.set(-27,5,-72);g.add(clock);box(clock,5.8,23,5.5,s,0,11.5,0);clockFace(clock,2,0,19.2,2.78);curvedRoof(clock,4.0,8.5,mat('roof',0x765b58),0,23,0);pennant(clock,0,31.7,0,2.0);
  return g;
}

export function buildStreetGate(){const g=new THREE.Group(),s=stone();g.position.set(0,0,-15.4);
  // Outboard columns leave the entire central walking lane clear.
  for(const x of[-5.35,5.35]){box(g,1.2,8.3,1.6,s,x,4.15,0);cyl(g,.87,.87,.32,s,x,7.2,0);curvedRoof(g,.90,3.0,slate(),x,8.3,0);crest(g,x,5.5,.83,.75);}
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-5.35,7.1,0),new THREE.Vector3(-3,8.7,0),new THREE.Vector3(0,9.7,0),new THREE.Vector3(3,8.7,0),new THREE.Vector3(5.35,7.1,0)]);
  mesh(g,new THREE.TubeGeometry(curve,32,.42,8,false),s);mesh(g,new THREE.TubeGeometry(curve,32,.48,8,false),s,0,.70,0);crest(g,0,9.35,.47,1.2);
  for(const x of[-2.3,2.3]){const fabric=box(g,.82,2.5,.06,plain(x<0?0x803d49:0x394e6e),x,7.3,.35);crest(g,x,7.3,.40,.51);}
  return g;
}

function wing(p,side,x,y,z,scale=1){const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(.33*side,.63,.76*side,.44);s.quadraticCurveTo(.58*side,.15,.42*side,.18);s.quadraticCurveTo(.42*side,-.06,.18*side,-.10);s.closePath();const o=mesh(p,new THREE.ExtrudeGeometry(s,{depth:.05,bevelEnabled:false}),plain(0x825a83),x,y,z);o.scale.setScalar(scale);return o;}
export function buildFantasyCitizen(p,index,animated){const g=new THREE.Group();g.userData.dynamic=true;const kind=p.species;
  if(kind==='mage'){
    const blue=mat('plaster',0x345579),brown=mat('wood',0x997146);cyl(g,.25,.48,.69,blue,0,.59,0,12);box(g,.20,.38,.30,plain(0xc99a71),-.17,.20,.07);box(g,.20,.38,.30,plain(0xc99a71),.17,.20,.07);
    for(const x of[-.21,.21])ball(g,.16,plain(0x9c6a42),x,.14,.14,1,.48,1.3);
    ball(g,.29,plain(0x111827),0,1.02,0,1,1,.80);for(const x of[-.09,.09])ball(g,.053,glow(0xffd658,.8),x,1.06,.232,.65,1.30,.45);
    cyl(g,.64,.64,.045,brown,0,1.25,0,24);const hatPts=[new THREE.Vector2(.38,0),new THREE.Vector2(.31,.26),new THREE.Vector2(.18,.68),new THREE.Vector2(.03,.94)];const hat=mesh(g,new THREE.LatheGeometry(hatPts,20),brown,0,1.23,0);hat.rotation.z=-.13;ball(g,.11,brown,-.11,2.13,0,1.3,.5,1);
    ring(g,.34,.045,plain(0x633d27),0,1.39,0);for(const x of[-.39,.39]){beam(g,[x,.89,0],[x*.95,.51,.13],.115,blue);ball(g,.095,plain(0xe7caa0),x*.95,.48,.14);}box(g,.11,.21,.035,plain(0xa2b6c9),0,.95,.38);
  }else if(kind==='moogle'){
    const fur=plain(0xe9dfca),rose=plain(0xd09180);ball(g,.39,fur,0,.44,0,.86,1.1,.75);ball(g,.36,fur,0,.94,.01,1,.92,.80);
    for(const side of[-1,1]){const ear=mesh(g,new THREE.ConeGeometry(.145,.38,3),fur,side*.25,1.24,0);ear.rotation.z=-side*.3;mesh(g,new THREE.ConeGeometry(.082,.23,3),rose,side*.25,1.26,.10).rotation.z=-side*.3;ball(g,.11,fur,side*.23,.09,.08,1,.55,1.2);ball(g,.13,fur,side*.35,.52,.05,.65,1.2,.8);wing(g,side,side*.20,.56,-.21,.77);}
    for(const side of[-1,1]){const eye=mesh(g,new THREE.TorusGeometry(.05,.016,5,12,Math.PI),plain(0x52483f),side*.13,.98,.276);eye.rotation.z=Math.PI;}
    ball(g,.075,rose,0,.89,.30,1,.8,.7);beam(g,[0,1.24,0],[.10,1.58,0],.018,plain(0x5d5144));ball(g,.15,plain(0xcb504d),.10,1.67,0);ball(g,.18,rose,0,.50,.255,1,.72,.30);
    const pouch=box(g,.29,.29,.11,mat('wood',0xb78453),-.29,.40,.19);beam(g,[-.27,.95,.16],[.23,.43,.23],.018,plain(0x896140));
  }else if(kind==='chocobo'){
    const feathers=plain(0xd9ad4d),tips=plain(0xe7c36d),orange=plain(0xb2783e);ball(g,.58,feathers,0,.88,0,.84,1.10,1.18);ball(g,.40,feathers,0,1.66,.27,.74,1.03,.88);
    for(const x of[-.15,.15]){beam(g,[x,.68,0],[x,.23,.05],.07,orange);for(let j=-1;j<=1;j++)beam(g,[x,.11,.03],[x+j*.10,.05,.28],.04,orange);ball(g,.032,plain(0x302b27),x*.92,1.76,.53,1,1,.5);}
    const beak=mesh(g,new THREE.ConeGeometry(.18,.47,4),orange,0,1.57,.66);beak.rotation.x=Math.PI/2;
    for(const side of[-1,1]){const w=ball(g,.35,tips,side*.42,.94,-.05,.34,.60,1.24);w.rotation.x=-.24;}
    for(let i=-1;i<=1;i++){const tail=mesh(g,new THREE.ConeGeometry(.18,.8,5),tips,i*.10,1.08,-.57);tail.rotation.x=-.9-i*.13;tail.rotation.z=i*.22;const crest=mesh(g,new THREE.ConeGeometry(.12,.52,5),tips,i*.1,2.10,.17);crest.rotation.x=-.20;crest.rotation.z=-i*.23;}
    box(g,.5,.12,.65,mat('wood',0x794a34),0,1.33,-.05);ring(g,.33,.04,plain(0x684737),0,1.18,-.08,true);
  }else if(kind==='ratfolk'){
    const coat=plain(0x793d43),fur=plain(0xb4a699);cyl(g,.22,.34,.75,coat,0,.62,0);ball(g,.25,fur,0,1.20,0);for(const side of[-1,1]){ball(g,.15,fur,side*.21,1.38,0,1,1,.45);ball(g,.07,plain(0xb17f79),side*.21,1.39,.08,1,1,.35);ball(g,.026,plain(0x342e2b),side*.10,1.23,.23);beam(g,[side*.26,.88,0],[side*.28,.48,.06],.08,coat);box(g,.15,.30,.18,plain(0x5a5149),side*.13,.17,.08);}
    ball(g,.18,fur,0,1.13,.17,.6,.45,1.4);ball(g,.05,plain(0x615346),0,1.15,.40);const tail=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.4,-.20),new THREE.Vector3(.25,.16,-.5),new THREE.Vector3(.39,.20,-.82)]);mesh(g,new THREE.TubeGeometry(tail,12,.035,6,false),fur);cyl(g,.37,.37,.045,mat('wood',0x8f704e),0,1.43,0);curvedRoof(g,.25,.37,mat('wood',0x8f704e),0,1.43,0);
  }
  batchStatic(g);g.position.set(p.x,0,p.z);g.rotation.y=p.facing??0;animated.people.push(g);return g;
}

export function buildTheaterShip(animated){const g=new THREE.Group(),wood=mat('wood',0x965d36),gold=brass(),roof=mat('roof',0x48566e);g.userData.dynamic=true;
  // Boat hull + a towered stage on the deck. No balloon: mechanical rotors carry it.
  ball(g,1,wood,0,0,0,7.4,1.75,2.4);box(g,12.7,.40,4.3,wood,0,1.04,0);box(g,10.7,.22,4.6,gold,0,1.37,0);
  for(let x=-5.3;x<=5.4;x+=1.16){beam(g,[x,-.2,-2.27],[x,-1.25,-1.1],.08,gold);beam(g,[x,-.2,2.27],[x,-1.25,1.1],.08,gold);}
  const prow=new THREE.Group();g.add(prow);beam(prow,[5.9,.2,0],[9.3,1.9,0],.17,gold);beam(prow,[8.4,1.3,0],[9.1,2.6,0],.13,gold);ball(prow,.35,gold,8.7,2.5,0,1.8,.55,.9);
  // Gilded theatre façade and enclosed rear balcony.
  box(g,4.3,3.8,3.4,mat('plaster',0xc0a575),-2,3.30,0);for(let x=-3.5;x<=-.5;x+=.75)pointedWindow(g,x,2.35,1.74,.48,1.75,plain(0x364c59));
  curvedRoof(g,2.95,3.5,roof,-2,5.20,0);pennant(g,-2,8.70,0,2.2);
  for(const [x,z]of[[2.7,-2.1],[2.7,2.1],[-5.2,-1.65],[-5.2,1.65]]){
    cyl(g,.56,.68,3.7,gold,x,3.2,z,12);cyl(g,.82,.82,.24,gold,x,2.0,z);cyl(g,.82,.82,.25,gold,x,4.75,z);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;beam(g,[x+Math.sin(a)*.69,2.1,z+Math.cos(a)*.69],[x+Math.sin(a+.7)*.69,4.8,z+Math.cos(a+.7)*.69],.035,plain(0xd1b778));}
    curvedRoof(g,.83,2.1,roof,x,4.9,z);ball(g,.1,gold,x,7.1,z);
  }
  for(let i=0;i<16;i++){const x=-5.6+i*.72;box(g,.055,.80,.055,gold,x,1.85,2.27);box(g,.055,.80,.055,gold,x,1.85,-2.27);}box(g,11.8,.07,.07,gold,0,2.28,2.27);box(g,11.8,.07,.07,gold,0,2.28,-2.27);
  const theater=new THREE.Group();theater.position.set(.5,2.8,0);theater.rotation.y=Math.PI/2;g.add(theater);clockFace(theater,1.18,0,1.6,0);crest(theater,0,.15,.06,.75);
  const propellers=[];for(const [x,z]of[[-4,-3.8],[3.6,-3.8],[-4,3.8],[3.6,3.8]]){
    beam(g,[x,1.3,z*.52],[x,4.9,z],.12,gold);beam(g,[x,4.9,z],[x,7.55,z],.045,gold);cyl(g,.39,.39,.8,plain(0x394550,.45,.4),x,5.24,z,12);
    const rotor=new THREE.Group();rotor.userData.dynamic=true;rotor.position.set(x,7.60,z);g.add(rotor);for(const a of[0,Math.PI/2]){const blade=box(rotor,3.8,.055,.18,plain(0x67533f),0,0,0);blade.rotation.y=a;}ball(rotor,.20,gold,0,.04,0);propellers.push(rotor);
  }
  for(const [x,z]of[[-3,-1.6],[2.5,-1.6],[-3,1.6],[2.5,1.6]]){box(g,.10,1.6,.13,gold,x,-1.76,z);ball(g,.20,gold,x,-2.65,z);}
  // A red fabric tail gives the ship a legible silhouette against the sky.
  const tail=mesh(g,new THREE.PlaneGeometry(2.6,2.1),plain(0x743744),-6.7,1.9,0);tail.rotation.y=Math.PI/2;tail.material.side=THREE.DoubleSide;
  batchStatic(g);g.position.set(7,23,-38);g.rotation.y=-.18;g.scale.setScalar(1.25);animated.airship=g;animated.rotors=propellers;return g;
}
