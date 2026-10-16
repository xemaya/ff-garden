import * as THREE from 'three';
import {mat,plain} from './materials.js';
import {batchStatic} from './batch.js';
import {createTownsfolk} from './townsfolk.js';
import {rng} from './layout.js';

// The bakery on the market lane (city-8) can be entered. Its interior is a small
// scene of its own, laid out in the building's local frame (front wall at z=0,
// back at z=-depth, door at x=width*.28 as on the facade), so the shop window,
// door and side windows sit where the street shows them. The city keeps running
// outside while only this room is drawn.
export const BAKERY_ID='city-8';
const EYE=1.62,DOOR_REACH=1.7,BARREL={x:.12,z:-.62};

export function shopFrame(b){
  const c=Math.cos(b.rotation),s=Math.sin(b.rotation);
  const toWorld=(lx,lz)=>({x:b.x+lx*c+lz*s,z:b.z-lx*s+lz*c});
  const doorX=b.width*.28,outside=toWorld(doorX,.95);
  // Facing the door from the street means looking along local -z.
  return{toWorld,doorX,door:toWorld(doorX,0),outside:{...outside,yaw:b.rotation},halfW:b.width/2-.3,depth:b.depth-.3};
}

// Walkable room: inside the walls, around the furniture, plus the doorway gap.
export function bakeryLayout(b){
  const f=shopFrame(b),W=b.width/2,D=b.depth,d=f.doorX;
  const rects=[
    {x0:-2.15,x1:.75,z0:-2.95,z1:-2.05},          // counter and its front shelf
    {x0:-W,x1:-.45,z0:-.8,z1:0},                  // shop-window display
    {x0:W-.62,x1:W,z0:-D+.25,z1:-2.35},           // bread racks
  ];
  const circles=[{x:-1.55,z:-D+.75,r:1.0},{x:.95,z:-D+.4,r:.5},{...BARREL,r:.33}]; // oven, flour sacks, baguette barrel
  function canOccupy(x,z,r=.3){
    const inDoorway=Math.abs(x-d)<.5-r*.5&&z>-.6&&z<.05;
    if(!inDoorway&&(Math.abs(x)>W-.12-r||z>-.12-r||z<-D+.12+r))return false;
    for(const q of rects)if(x>q.x0-r&&x<q.x1+r&&z>q.z0-r&&z<q.z1+r)return false;
    for(const c of circles)if(Math.hypot(x-c.x,z-c.z)<c.r+r)return false;
    return true;
  }
  return{frame:f,spawn:{x:d,z:-1.0,yaw:0},canOccupy,leaving:(x,z)=>Math.abs(x-d)<.55&&z>-.32,counter:{x:-.7,z:-2.6}};
}

const LINES={
  day:['早上第一炉是黄油卷。邮差莫古利总是闻着味道就来了。','长棍要等外壳“咔”地裂开才算好。你听见了吗？','城门那边的旅人爱买葡萄干面包，走远路不容易饿。','面粉是城外风车磨的，河水推不动的日子，就靠风。'],
  dusk:['这是最后一炉。卖不完的，我会分给喷泉边的街坊。','黄昏的炉火最稳，面包也烤得最香。','要回家了吗？巷子里的灯笼都点起来了。','明早天不亮我就生火，路过的话，门是开着的。'],
};
export function bakerLines(time){return LINES[time==='dusk'?'dusk':'day'];}

function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,m,x,y,z){return mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}

function breads(g,random){
  const crust=[0xc8843f,0xb8732f,0xd59a52,0xa9652a].map(c=>plain(c,.72)),score=plain(0xe8c48a,.8);
  const loaf=(x,y,z,yaw=0,s=1)=>{const o=mesh(g,new THREE.SphereGeometry(1,14,9),crust[Math.floor(random()*4)],x,y+.05*s,z);o.scale.set(.15*s,.075*s,.085*s);o.rotation.y=yaw;for(let i=-1;i<=1;i++){const cut=box(g,.012,.004,.07*s,score,x+Math.cos(yaw)*i*.06*s,y+.12*s,z-Math.sin(yaw)*i*.06*s);cut.rotation.y=yaw+.5;}};
  const boule=(x,y,z,s=1)=>{const o=mesh(g,new THREE.SphereGeometry(1,14,9,0,Math.PI*2,0,Math.PI/2),crust[Math.floor(random()*4)],x,y,z);o.scale.set(.11*s,.08*s,.11*s);};
  const roll=(x,y,z)=>{const o=mesh(g,new THREE.SphereGeometry(.05,10,7),crust[2],x,y+.03,z);o.scale.y=.7;};
  const croissant=(x,y,z,yaw)=>{const o=mesh(g,new THREE.TorusGeometry(.065,.03,8,12,Math.PI*1.15),crust[0],x,y+.03,z);o.rotation.set(Math.PI/2,0,yaw);};
  const baguette=(x,y,z,tilt=0,yaw=0)=>{const o=mesh(g,new THREE.CapsuleGeometry(.033,.52,4,8),crust[1],x,y,z);o.rotation.set(tilt,yaw,0);};
  return{loaf,boule,roll,croissant,baguette};
}

export function createCityShop({plan,timeOf}){
  const building=plan.buildings.find(b=>b.id===BAKERY_ID);if(!building)throw new Error('面包房不在城里');
  const layout=bakeryLayout(building),f=layout.frame,W=building.width/2,D=building.depth,H=3.25,random=rng(4417);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x231a12);
  const room=new THREE.Group();scene.add(room);
  const wall=mat('plaster',0xe9dcc0,6,4),floor=mat('wood',0x9c7550,6,6),beamWood=plain(0x5e4330,.85),wood=mat('wood',0xa98258,2,2),dark=plain(0x3b2c22,.9),stone=mat('stone',0xc4b59c,3,3),brick=mat('stone',0xb26e4c,2,2),iron=plain(0x3c3a36,.6,.4);
  // Shell: floor, ceiling and four walls with openings for the door and windows.
  const fl=mesh(room,new THREE.PlaneGeometry(W*2,D),floor,0,0,-D/2);fl.rotation.x=-Math.PI/2;fl.castShadow=false;
  const ceil=mesh(room,new THREE.PlaneGeometry(W*2,D),plain(0x7a5f45,.95),0,H,-D/2);ceil.rotation.x=Math.PI/2;
  for(let z=-.45;z>-D;z-=1.05)box(room,W*2,.2,.18,beamWood,0,H-.1,z);box(room,.22,.24,D,beamWood,0,H-.24,-D/2);
  const pane=new THREE.MeshBasicMaterial({color:0xf4f1e4,toneMapped:false}),panes=[pane];
  function wallWithHoles(width,holes){const s=new THREE.Shape();s.moveTo(-width/2,0);s.lineTo(width/2,0);s.lineTo(width/2,H);s.lineTo(-width/2,H);s.closePath();
    for(const h of holes){const p=new THREE.Path();if(h.arch){p.moveTo(h.x-h.w/2,h.y);p.lineTo(h.x+h.w/2,h.y);p.lineTo(h.x+h.w/2,h.y+h.h-h.w/2);p.absarc(h.x,h.y+h.h-h.w/2,h.w/2,0,Math.PI,false);p.lineTo(h.x-h.w/2,h.y);}else{p.moveTo(h.x-h.w/2,h.y);p.lineTo(h.x+h.w/2,h.y);p.lineTo(h.x+h.w/2,h.y+h.h);p.lineTo(h.x-h.w/2,h.y+h.h);p.lineTo(h.x-h.w/2,h.y);}s.holes.push(p);}
    const geo=new THREE.ShapeGeometry(s,12),uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/4,uv.getY(i)/4);return geo;}
  function windowFill(g,x,y,w,h){mesh(g,new THREE.PlaneGeometry(w,h),pane,x,y+h/2,-.06).userData.noShadow=true;box(g,w+.1,.08,.16,wood,x,y-.02,.0);box(g,w+.1,.08,.12,wood,x,y+h,.0);box(g,.06,h,.08,wood,x,y+h/2,-.03);box(g,w,.05,.08,wood,x,y+h*.55,-.03);for(const sx of[-1,1])box(g,.07,h,.12,wood,x+sx*w/2,y+h/2,0);}
  const shopWin={x:-building.width*.22,y:.84,w:1.66,h:1.62},door={x:f.doorX,y:0,w:1.03,h:2.38,arch:true};
  // Front wall, seen from inside: build it facing +z, then turn it to face -z.
  const front=new THREE.Group();front.rotation.y=Math.PI;room.add(front);
  mesh(front,wallWithHoles(W*2,[{...shopWin,x:-shopWin.x},{...door,x:-door.x}]),wall);windowFill(front,-shopWin.x,shopWin.y,shopWin.w,shopWin.h);
  const doorFrame=new THREE.Group();doorFrame.position.x=-door.x;front.add(doorFrame);for(const sx of[-1,1])box(doorFrame,.1,2.0,.14,wood,sx*.56,1.0,.02);mesh(doorFrame,new THREE.TorusGeometry(.56,.06,6,16,Math.PI),wood,0,1.86,.02);
  {const leaf=new THREE.Shape();leaf.moveTo(-.5,0);leaf.lineTo(.5,0);leaf.lineTo(.5,1.86);leaf.absarc(0,1.86,.5,0,Math.PI,false);leaf.lineTo(-.5,0);const g=new THREE.Group();g.position.set(-door.x,0,-.02);front.add(g);mesh(g,new THREE.ShapeGeometry(leaf,12),mat('wood',0x6e4a30,1,2));for(const x of[-.25,0,.25])box(g,.02,2.2,.02,beamWood,x,1.1,.01);for(const y of[.45,1.55])box(g,.96,.1,.04,beamWood,0,y,.03);mesh(g,new THREE.TorusGeometry(.07,.012,6,14),iron,.33,1.05,.06);box(g,.16,.22,.03,pane,0,1.95,.02);}
  mesh(room,wallWithHoles(W*2,[{x:1.35,y:0,w:.9,h:2.1}]),wall,0,0,-D);
  box(room,.92,2.12,.06,wood,1.35,1.06,-D+.03);for(const y of[.35,1.06,1.77])box(room,.86,.09,.04,beamWood,1.35,y,-D+.07);for(const sx of[-1,1])box(room,.1,2.2,.1,beamWood,1.35+sx*.5,1.1,-D+.05);box(room,1.1,.12,.1,beamWood,1.35,2.2,-D+.05);mesh(room,new THREE.SphereGeometry(.035,8,6),iron,1.0,1.05,-D+.1);
  for(const side of[-1,1]){const g=new THREE.Group();g.position.set(side*W,0,-D/2);g.rotation.y=-side*Math.PI/2;room.add(g);const holes=[-1,1].map(k=>({x:k*building.depth*.27,y:1.0-.725,w:.65,h:1.45}));mesh(g,wallWithHoles(D,holes),wall);for(const h of holes)windowFill(g,h.x,h.y,h.w,h.h);}
  for(const z of[-.08,-D+.08])box(room,W*2,.16,.12,beamWood,0,.08,z);for(const x of[-W+.06,W-.06])box(room,.12,.16,D,beamWood,x,.08,-D/2);
  const b=breads(room,random);
  // Counter with a glass-less display top and a cash tin.
  box(room,2.9,.92,.7,wood,-.7,.46,-2.6);box(room,3.0,.06,.78,mat('wood',0x8a6440,3,1),-.7,.95,-2.6);box(room,2.7,.06,.5,wood,-.7,.5,-2.3);
  for(let i=0;i<5;i++)b.loaf(-1.9+i*.36,.98,-2.55,(random()-.5)*.6,.9);for(let i=0;i<6;i++)b.roll(-1.95+i*.1,.53,-2.25);for(let i=0;i<5;i++)b.croissant(-.9+i*.24,.53,-2.3,random()*6);
  mesh(room,new THREE.CylinderGeometry(.22,.17,.16,14,1,true),new THREE.MeshStandardMaterial({color:0x9a7446,roughness:.9,side:THREE.DoubleSide}),.35,1.06,-2.6);for(let i=0;i<4;i++)b.roll(.27+(i%2)*.15,1.0,-2.68+Math.floor(i/2)*.15);
  box(room,.22,.12,.16,iron,-.05,1.04,-2.75);
  // Shop-window display under the street-facing window.
  box(room,-shopWin.x*2-.1,.76,.7,wood,(-W+(-.45))/2,.38,-.42);for(let i=0;i<4;i++)b.boule(-2.15+i*.42,.77,-.4,1.1);for(let i=0;i<3;i++)b.loaf(-2.0+i*.5,.77,-.62,.3,1);
  // Bread racks on the right wall.
  const rx=W-.3;for(const y of[.35,.85,1.35,1.85])box(room,.55,.04,D-2.65,wood,rx,y,-(D+2.1)/2);for(const z of[-2.38,-D+.27])for(const sx of[-1,1])box(room,.05,2.05,.05,beamWood,rx+sx*.25,1.02,z);
  for(const y of[.37,.87,1.37,1.87])for(let z=-2.6;z>-D+.45;z-=.36){const k=random();if(k<.45)b.loaf(rx,y,z,Math.PI/2,.95);else if(k<.8)b.boule(rx,y,z,1);else{b.roll(rx-.08,y,z);b.roll(rx+.08,y,z);}}
  // Brick oven in the back-left corner, with a hood and a chimney flue.
  const ox=-1.55,oz=-D+.75;box(room,1.9,.85,1.5,stone,ox,.42,oz);const dome=mesh(room,new THREE.SphereGeometry(.92,20,12,0,Math.PI*2,0,Math.PI/2),brick,ox,.85,oz);dome.scale.set(1,.82,.9);
  box(room,.95,1.1,.5,brick,ox,2.75,-D+.3);const mouth=new THREE.Shape();mouth.moveTo(-.32,0);mouth.lineTo(.32,0);mouth.lineTo(.32,.18);mouth.absarc(0,.18,.32,0,Math.PI,false);mouth.lineTo(-.32,0);
  const fire=new THREE.MeshStandardMaterial({color:0x1a0c05,emissive:0xff7a26,emissiveIntensity:2.4,roughness:1});const fireMesh=mesh(scene,new THREE.ShapeGeometry(mouth,10),fire,ox,.9,oz+.82);fireMesh.castShadow=false;
  mesh(room,new THREE.TorusGeometry(.36,.05,6,14,Math.PI),stone,ox,1.08,oz+.84);box(room,.9,.08,.3,stone,ox,.88,oz+.9);
  const peel=new THREE.Group();peel.position.set(ox+1.0,0,oz+.7);peel.rotation.z=.18;room.add(peel);box(peel,.04,1.7,.04,wood,0,.95,0);box(peel,.3,.36,.02,wood,0,1.85,0);
  // Flour sacks and a baguette barrel.
  const sack=plain(0xe6dcc4,.98);for(const [x,z,s]of[[.75,-D+.4,1],[1.1,-D+.5,.85],[.92,-D+.2,.75]]){const o=mesh(room,new THREE.SphereGeometry(.3,12,9),sack,x,.27*s,z);o.scale.set(s,1.05*s,.85*s);box(room,.18*s,.06,.18*s,plain(0xb59f78),x,.6*s,z);}
  mesh(room,new THREE.CylinderGeometry(.27,.23,.62,14),wood,BARREL.x,.31,BARREL.z);for(const y of[.12,.5])mesh(room,new THREE.TorusGeometry(.265,.015,4,18),iron,BARREL.x,y,BARREL.z).rotation.x=Math.PI/2;
  for(let i=0;i<7;i++)b.baguette(BARREL.x+Math.cos(i)*.11,.75,BARREL.z+Math.sin(i)*.11,(random()-.5)*.35,random());
  // Chalk menu board and a string of dried herbs on the left wall.
  const menu=canvasTexture(512,384,(c,w,h)=>{c.fillStyle='#2e352f';c.fillRect(0,0,w,h);c.strokeStyle='#8a6a45';c.lineWidth=18;c.strokeRect(0,0,w,h);c.fillStyle='#ece6d4';c.textAlign='center';c.font='44px "Songti SC",serif';c.fillText('今日出炉',w/2,78);c.font='30px "Songti SC",serif';['黄油卷','葡萄干面包','长棍','蜂蜜圆面包'].forEach((t,i)=>c.fillText(t,w/2,140+i*52));c.font='22px Georgia,serif';c.fillStyle='#d6c79f';c.fillText('— Alexandria —',w/2,h-26);});
  const board=mesh(room,new THREE.PlaneGeometry(1.0,.75),new THREE.MeshStandardMaterial({map:menu,roughness:.95}),-W+.03,1.75,-2.75);board.rotation.y=Math.PI/2;board.castShadow=false;
  box(room,.04,.04,1.6,beamWood,-W+.1,2.6,-1.6);for(let i=0;i<6;i++){const herb=mesh(room,new THREE.ConeGeometry(.07,.32,6),plain([0x6f7a45,0x8a7d4a,0x7d6a52][i%3],.95),-W+.12,2.4,-.95-i*.26);herb.rotation.x=Math.PI;}
  // Pendant lamps over the counter and the door.
  const shade=new THREE.MeshStandardMaterial({color:0x3c3a36,roughness:.6,metalness:.4,side:THREE.DoubleSide}),lampGlass=new THREE.MeshStandardMaterial({color:0xffe2a8,emissive:0xffc070,emissiveIntensity:1.6,roughness:.4});const lamps=[];
  for(const [x,z]of[[-.7,-2.6],[f.doorX-.2,-1.4]]){box(room,.02,.55,.02,iron,x,H-.28,z);mesh(room,new THREE.ConeGeometry(.2,.16,10,1,true),shade,x,H-.6,z);mesh(room,new THREE.SphereGeometry(.08,10,8),lampGlass,x,H-.68,z).castShadow=false;const l=new THREE.PointLight(0xffc98a,4,7.5,1.6);l.position.set(x,H-.78,z);scene.add(l);lamps.push(l);}
  room.traverse(o=>{if(o.userData.noShadow)o.castShadow=false;});batchStatic(room);
  // Light: warm fill, the oven's flicker, and daylight through the street window.
  const hemi=new THREE.HemisphereLight(0xf1ede2,0x5a4434,.38);scene.add(hemi);
  const ovenLight=new THREE.PointLight(0xff8a3a,6,6,1.5);ovenLight.position.set(ox,1.0,oz+1.15);scene.add(ovenLight);
  const daylight=new THREE.DirectionalLight(0xfff0d8,2.2);daylight.position.set(shopWin.x+1.6,4.6,4.2);daylight.target.position.set(shopWin.x+.4,0,-2.0);daylight.castShadow=true;daylight.shadow.mapSize.set(2048,2048);Object.assign(daylight.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:20});daylight.shadow.bias=-.0004;daylight.shadow.normalBias=.02;scene.add(daylight,daylight.target);
  // The baker tends the oven, then comes back to the counter.
  const baker=createTownsfolk(0,2203);baker.root.position.set(layout.counter.x,0,-3.45);scene.add(baker.root);
  const stops=[{x:-.7,z:-3.45,face:0,wait:7},{x:ox+.15,z:oz+1.45,face:Math.PI,wait:4.5},{x:.2,z:-3.5,face:0,wait:5}];let stop=0,waiting=stops[0].wait,bakerYaw=0;
  function setTime(time){const dusk=time==='dusk';pane.color.setHex(dusk?0xe0884a:0xf4f1e4);daylight.color.setHex(dusk?0xff9a55:0xfff3e2);daylight.intensity=dusk?.7:3.8;hemi.color.setHex(dusk?0xb7a6c4:0xf1ede2);hemi.intensity=dusk?.1:.38;lampGlass.emissiveIntensity=dusk?2.4:1.0;for(const l of lamps)l.intensity=dusk?3.6:1.6;ovenBase=dusk?7:5;}
  let lastTime=null,clock=0,ovenBase=6,held=0;
  function update(dt,player){clock+=dt;const time=timeOf();if(time!==lastTime){lastTime=time;setTime(time);}
    const flicker=.82+.12*Math.sin(clock*7.1)+.08*Math.sin(clock*13.7+1.3)+.05*Math.sin(clock*23.1);ovenLight.intensity=ovenBase*flicker;fire.emissiveIntensity=2.4*flicker;
    const s=stops[stop],p=baker.root.position,dx=s.x-p.x,dz=s.z-p.z,dist=Math.hypot(dx,dz);let moving=false,want=s.face;
    if(held>0){held-=dt;if(player)want=Math.atan2(player.x-p.x,player.z-p.z);}
    else if(dist>.05){moving=true;const step=Math.min(dist,.55*dt);p.x+=dx/dist*step;p.z+=dz/dist*step;want=Math.atan2(dx,dz);}
    else{const near=player&&Math.hypot(player.x-p.x,player.z-p.z)<3.2;if(near&&stop!==1)want=Math.atan2(player.x-p.x,player.z-p.z);waiting-=dt;if(waiting<=0){stop=(stop+1)%stops.length;waiting=stops[stop].wait;}}
    bakerYaw+=Math.atan2(Math.sin(want-bakerYaw),Math.cos(want-bakerYaw))*Math.min(1,dt*5);baker.root.rotation.y=bakerYaw;baker.update(dt,moving);}
  const canOccupy=(x,z,r=.3)=>layout.canOccupy(x,z,r)&&Math.hypot(x-baker.root.position.x,z-baker.root.position.z)>r+.28;
  return{scene,layout,canOccupy,name:'面包房',building,update,baker:baker.root,
    // Keep the baker at the counter, facing the visitor, while they talk.
    hold(seconds){held=seconds;},
    lines:()=>bakerLines(timeOf()),
    nearBaker:p=>Math.hypot(p.x-baker.root.position.x,p.z-baker.root.position.z)<2.6,
    nearDoorOutside:p=>Math.hypot(p.x-f.outside.x,p.z-f.outside.z)<DOOR_REACH,
    snapshot:()=>({baker:{x:baker.root.position.x,z:baker.root.position.z,stop},time:lastTime})};
}
export {EYE as SHOP_EYE};
