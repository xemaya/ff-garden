import * as THREE from 'three';
import {createLamplighterState,LETTER,LINES,CARDS,ITEMS,TITLE,SPEAKERS,objective} from './lamplighter-story.js';
import {shopFrame} from './city-shop.js';
import {cityTerrainHeight,WINDMILLS} from './city-outskirts.js';
import {plain} from './materials.js';
import {createMage} from './mage.js';
import {createTownsfolk} from './townsfolk.js';

// 支线「寄给点灯人的信」in the walled city: the world objects (Vivi, the letter,
// the lantern, the wind post, the windmill's answering light) and the four
// cutscenes. Words and rules live in lamplighter-story.js; the story director
// runs dialogue, the cutscene camera and the world prompts.
export const LAMPLIGHTER_SITES={
  bench:{x:3.55,z:37.3},seat:{x:2.75,z:37.3},gate:{x:0,z:46.2},vivi:{x:.2,z:39.6},
  post:{x:-18.85,z:-64.62},windmill:{x:-79,z:12}
};
const WEST=[0,2,4,6],EAST=[1,3,5,7];
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const yawTo=(from,to)=>Math.atan2(-(to.x-from.x),-(to.z-from.z));
const faceYaw=(from,to)=>Math.atan2(to.x-from.x,to.z-from.z);
const turn=(a,b,u)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*u;

function glowTexture(){const s=64,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),r=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.18,'rgba(255,240,200,.85)');r.addColorStop(.45,'rgba(255,190,110,.28)');r.addColorStop(1,'rgba(255,160,80,0)');x.fillStyle=r;x.fillRect(0,0,s,s);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

function buildLetter(){
  const g=new THREE.Group(),paper=new THREE.MeshStandardMaterial({color:0xf3e8cc,roughness:.9}),edge=plain(0xd8c49a,.9);
  const body=new THREE.Mesh(new THREE.BoxGeometry(.24,.006,.16),paper);g.add(body);
  const flapShape=new THREE.Shape();flapShape.moveTo(-.12,0);flapShape.lineTo(.12,0);flapShape.lineTo(0,-.085);flapShape.closePath();
  const flap=new THREE.Mesh(new THREE.ShapeGeometry(flapShape),edge);flap.rotation.x=-Math.PI/2;flap.position.set(0,.0035,-.08);g.add(flap);
  const seal=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.006,14),plain(0xa3342c,.5));seal.position.set(0,.006,-.004);g.add(seal);
  g.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});return g;
}
function buildLantern(texture){
  const g=new THREE.Group(),iron=plain(0x3a3632,.55,.45),glass=new THREE.MeshStandardMaterial({color:0xffe7b0,emissive:0xffa94d,emissiveIntensity:0,roughness:.3,transparent:true,opacity:.62});
  const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=false;g.add(o);return o;};
  add(new THREE.CylinderGeometry(.075,.085,.03,10),iron,0,0,0);add(new THREE.CylinderGeometry(.062,.062,.17,10,1,true),glass,0,.1,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;add(new THREE.BoxGeometry(.012,.18,.012),iron,Math.cos(a)*.066,.1,Math.sin(a)*.066);}
  add(new THREE.ConeGeometry(.09,.07,10),iron,0,.22,0);const ring=add(new THREE.TorusGeometry(.04,.007,6,14),iron,0,.28,0);ring.rotation.y=Math.PI/2;
  const flame=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xffb35c,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false}));flame.position.y=.1;flame.scale.setScalar(.22);g.add(flame);
  g.userData={glass,flame};return g;
}
function buildPost(){
  const g=new THREE.Group(),wood=plain(0x6b4f39,.9),iron=plain(0x3a3632,.55,.45),cloth=new THREE.MeshStandardMaterial({color:0xb5584a,roughness:1,side:THREE.DoubleSide});
  const add=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
  add(new THREE.CylinderGeometry(.09,.12,2.6,8),wood,0,1.3,0);add(new THREE.BoxGeometry(.75,.07,.07),wood,.32,2.42,0);add(new THREE.CylinderGeometry(.16,.2,.12,8),plain(0x8c8577,.95),0,.06,0);
  const hook=add(new THREE.TorusGeometry(.035,.008,6,12,Math.PI*1.4),iron,.62,2.34,0);hook.rotation.z=Math.PI*.8;
  const pennant=new THREE.BufferGeometry();pennant.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,-.28,0,.5,-.14,0],3));pennant.computeVertexNormals();
  const flag=new THREE.Mesh(pennant,cloth);flag.position.set(0,2.58,0);g.add(flag);
  g.userData={hook:V(.62,2.24,0),flag};return g;
}
function buildBench(){
  const g=new THREE.Group(),stone=plain(0xb8ad97,.95);
  for(const z of[-.55,.55]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.42,.38,.22),stone);leg.position.set(0,.19,z);leg.castShadow=leg.receiveShadow=true;g.add(leg);}
  const top=new THREE.Mesh(new THREE.BoxGeometry(.5,.1,1.5),stone);top.position.y=.43;top.castShadow=top.receiveShadow=true;g.add(top);return g;
}

export function createLamplighterEpisode({director,sfx,plan,scene,camera,pose,atmosphere,setTime,life,residents,shop,isInside,canInteract,notice,map,failed,storage}){
  const state=createLamplighterState(storage),texture=glowTexture();
  const sites=LAMPLIGHTER_SITES,h=(x,z)=>plan.height(x,z);
  const colliders=life.plan.colliders;
  const addCollider=c=>{if(!colliders.some(o=>o.id===c.id))colliders.push(c);};
  const dropCollider=id=>{const i=colliders.findIndex(o=>o.id===id);if(i>=0)colliders.splice(i,1);};

  // Props that are always there: a stone bench by the gate and the wind post on the upper west corner.
  const bench=buildBench();bench.position.set(sites.bench.x,h(sites.bench.x,sites.bench.z),sites.bench.z);scene.add(bench);
  addCollider({id:'lamplighter-bench',type:'box',x:sites.bench.x,z:sites.bench.z,w:.5,d:1.5,rotation:0});
  const post=buildPost();post.position.set(sites.post.x,h(sites.post.x,sites.post.z),sites.post.z);post.rotation.y=-.6;scene.add(post);
  addCollider({id:'lamplighter-post',type:'circle',x:sites.post.x,z:sites.post.z,r:.2});
  post.updateMatrixWorld(true);const hookWorld=post.localToWorld(post.userData.hook.clone());

  // Vivi: the black mage, smaller. Falls back to a plain neighbour if the model did not load.
  let vivi;
  if(!failed.has('mage')){const root=createMage({x:sites.gate.x,z:sites.gate.z},null);vivi=root.userData.mage;root.scale.setScalar(.78);}
  else{const t=createTownsfolk(5,77);vivi={root:t.root,play(){},update:dt=>t.update(dt,false),setDetail:null};}
  vivi.root.visible=false;scene.add(vivi.root);
  const viviHead=()=>vivi.root.position.clone().add(V(0,1.12,0));
  const play=(name)=>{try{vivi.play(name,.2);}catch{}};

  // Held items follow the camera; flights detach them into the world.
  const holder=new THREE.Group();holder.name='lamplighter-hand';
  const letter=buildLetter(),lantern=buildLantern(texture);
  const HAND={letter:{pos:V(.34,-.3,-.95),rot:new THREE.Euler(1.1,-.4,.2),scale:.75},lantern:{pos:V(.36,-.46,-1.05),rot:new THREE.Euler(0,0,0),scale:.8}};
  let held=null,lanternLit=false,inFlight=new Set();
  function hold(kind){held=kind;for(const [k,o]of[['letter',letter],['lantern',lantern]]){if(inFlight.has(o))continue;if(k===kind){holder.add(o);o.position.copy(HAND[k].pos);o.rotation.copy(HAND[k].rot);o.scale.setScalar(HAND[k].scale);o.visible=true;}else if(o.parent===holder){holder.remove(o);o.scale.setScalar(1);}}}
  const light=new THREE.PointLight(0xffb066,0,9,1.6);light.position.set(0,-50,0);scene.add(light);

  // Sparks, their trails, and the flash on each lamp as it catches.
  const spriteMat=(color,opacity=1)=>new THREE.SpriteMaterial({map:texture,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity,fog:false});
  const sparks=[0,1].map(()=>{const s=new THREE.Sprite(spriteMat(0xffc46b));s.visible=false;scene.add(s);return s;});
  const trail=Array.from({length:28},()=>{const s=new THREE.Sprite(spriteMat(0xff9a45,0));s.visible=false;s.userData.life=0;scene.add(s);return s;});let trailAt=0;
  function puff(p,size=.5){const s=trail[trailAt++%trail.length];s.position.copy(p);s.userData.life=.55;s.userData.size=size;s.visible=true;}
  const lampHeads=atmosphere.lampPositions.map(p=>p.clone().add(V(0,.25,0)));
  const flashes=lampHeads.map(p=>{const s=new THREE.Sprite(spriteMat(0xffc074,0));s.position.copy(p);s.visible=false;s.userData.t=0;scene.add(s);return s;});
  let lampLevels=lampHeads.map(()=>1),lightsHeld=false;
  function holdLights(levels){lightsHeld=!!levels;if(levels){lampLevels=levels;atmosphere.setStreetLights({lamps:lampLevels,ambient:lampLevels.reduce((a,b)=>a+b,0)/lampLevels.length});}else atmosphere.setStreetLights(null);}

  // The windmill answers from the west hill.
  const mill=sites.windmill,toCity=V(Math.sin(WINDMILLS[1].yaw),0,Math.cos(WINDMILLS[1].yaw));
  const millGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0xffb347,transparent:true,depthWrite:false,opacity:0,fog:false}));millGlow.position.set(mill.x+toCity.x*2.6,cityTerrainHeight(mill.x,mill.z)+7.2,mill.z+toCity.z*2.6);millGlow.scale.setScalar(10);millGlow.visible=false;scene.add(millGlow);
  const millPane=new THREE.MeshBasicMaterial({color:0x2b2119,toneMapped:false}),millWindow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.5),millPane);millWindow.position.set(mill.x+toCity.x*2.32,millGlow.position.y,mill.z+toCity.z*2.32);millWindow.lookAt(millWindow.position.clone().add(toCity));scene.add(millWindow);
  let millLevel=0;

  // Map marker for the current target.
  const mapMark=document.createElementNS('http://www.w3.org/2000/svg','circle');mapMark.setAttribute('r','1.9');mapMark.setAttribute('class','story-map-target');mapMark.setAttribute('visibility','hidden');map.append(mapMark);

  const bakery=plan.buildings.find(b=>b.id==='city-8'),door=bakery?shopFrame(bakery).door:null;
  const readingMage=residents.get('neighbor-2');
  const patrols=()=>life.agents.filter(a=>a.role==='patrol'&&a.actor);
  const flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const facing=(target)=>{const dx=target.x-pose.x,dz=target.z-pose.z,d=Math.hypot(dx,dz)||1;return(-Math.sin(pose.yaw)*dx-Math.cos(pose.yaw)*dz)/d;};
  const activeScene=()=>isInside()?shop.scene:scene;
  let busy=false,revealing=false,viviTalk=0,duskToast=false,lastPose={x:pose.x,z:pose.z},bob=0,clock=0;

  // ---------- world sync after a step change or a reload ----------
  function sync(){
    const s=state.snapshot(),seen=state.reached('meet');
    vivi.root.visible=seen||revealing;
    if(seen){vivi.root.position.set(sites.vivi.x,h(sites.vivi.x,sites.vivi.z),sites.vivi.z);addCollider({id:'lamplighter-vivi',type:'circle',x:sites.vivi.x,z:sites.vivi.z,r:.34});}else dropCollider('lamplighter-vivi');
    if(['read','ask','wait','meet'].includes(s.step))hold('letter');else if(s.step==='carry'){hold('lantern');lanternLit=true;}else hold(null);
    if(s.step==='done'){if(lantern.parent!==scene)scene.add(lantern);lantern.position.copy(hookWorld).add(V(0,-.3,0));lantern.rotation.set(0,0,0);lantern.visible=true;lanternLit=true;}
    else if(lantern.parent===scene&&!inFlight.has(lantern)){scene.remove(lantern);if(s.step!=='carry')lanternLit=false;}
    if(!['carry','done'].includes(s.step))lanternLit=false;
    const hand=s.step==='read'?{name:ITEMS.letter.name,action:'读信',key:'R',onAction:readLetter}:['ask','wait','meet'].includes(s.step)?{name:ITEMS.letter.name,action:'再读一遍',key:'R',onAction:readLetter}:s.step==='carry'?{name:ITEMS.lantern.name,action:'',onAction:null}:null;
    director.setHand(hand);
    const o=objective(s,{dusk:atmosphere.time==='dusk'});
    director.setTracker({kicker:s.step==='invite'?'新委托 · 邮差':s.step==='done'?'支线完成':'支线 · 邮差',title:TITLE,text:o.text,items:o.items});
  }
  state.onChange(sync);

  // ---------- small helpers for cutscenes ----------
  function fly(c,obj,from,to,seconds,{arc=.35,spin=0,scene:target=null}={}){
    inFlight.add(obj);const parent=target||activeScene();parent.add(obj);obj.visible=true;const a=from.clone(),r0=obj.rotation.y;
    return c.tween(seconds,u=>{const b=typeof to==='function'?to():to;obj.position.lerpVectors(a,b,u);obj.position.y+=Math.sin(u*Math.PI)*arc;obj.rotation.y=r0+spin*u;},'inOut').then(()=>{inFlight.delete(obj);});
  }
  function handWorld(kind){camera.updateMatrixWorld();return HAND[kind].pos.clone().applyMatrix4(camera.matrixWorld);}
  function talkCam(c,head,{dist=1.6,side=.45,fov=48}={}){const dir=V(pose.x-head.x,0,pose.z-head.z).normalize(),s=V(-dir.z,0,dir.x);return c.camTo({pos:head.clone().addScaledVector(dir,dist).addScaledVector(s,side).setY(head.y+.12),look:head.clone().setY(head.y-.05),fov},.9);}
  const arcPoint=(a,b,u)=>{const p=a.clone().lerp(b,u);p.y+=Math.sin(u*Math.PI)*(3.5+a.distanceTo(b)*.07);return p;};
  function ignite(c,i,note){lampLevels=[...lampLevels];const from=lampLevels[i];c.tween(.6,u=>{lampLevels[i]=from+(1-from)*u;holdLights(lampLevels);},'out');const f=flashes[i];f.visible=true;f.userData.t=0;if(!c.skipping)sfx.ignite(note);}

  // ---------- A · the baker hands over the letter ----------
  async function sceneBaker(){
    busy=true;shop.hold(90);
    await director.run(async c=>{
      const b=shop.baker.position,head=V(b.x,1.42,b.z);
      await talkCam(c,head,{dist:1.5,side:.4,fov:46});
      await c.say(LINES.bakerInvite.slice(0,2));
      const counter=V(shop.layout.counter.x+.35,1.02,shop.layout.counter.z+.25);letter.position.copy(counter);letter.rotation.set(0,.4,0);
      sfx.paper();await fly(c,letter,counter,counter.clone().add(V(0,.32,.12)),.7,{arc:.05,spin:.6,scene:shop.scene});
      await c.say(LINES.bakerInvite.slice(2));
      await fly(c,letter,letter.position.clone(),()=>handWorld('letter'),.75,{arc:.12,spin:-.6,scene:shop.scene});
      state.accept();director.item(ITEMS.letter);await c.wait(.6);
    });
    shop.hold(0);busy=false;sync();
    await director.card(CARDS.start,{auto:3.4});sfx.quest();
  }
  async function readLetter(){if(director.locked())return;director.clearItem();await director.letter(LETTER);if(state.read())sfx.quest();}

  // ---------- clues: a short talk, no letterbox ----------
  async function sceneClue(kind,actor,agentId=null){
    busy=true;const root=actor.root,base=root.rotation.y;if(agentId)life.hold(agentId,60);
    const lines=kind==='mage'?LINES.mageClue:LINES.patrolClue;
    await director.run(async c=>{
      const head=root.position.clone().add(V(0,1.3,0)),want=faceYaw(root.position,pose);
      c.tween(.5,u=>{root.rotation.y=turn(base,want,u);});try{actor.play?.('Greet',.2);}catch{}
      await talkCam(c,head,{dist:1.9,side:.5,fov:50});
      await c.say(lines);
      state.clue(kind);
    },{letterbox:false});
    // The reading mage has no route to turn him back; ease him back to his page.
    if(kind==='mage'){const now=root.rotation.y;let u=0;const back=()=>{u=Math.min(1,u+.04);root.rotation.y=turn(now,base,u);if(u<1)requestAnimationFrame(back);};back();}
    if(agentId)life.hold(agentId,.4);busy=false;
    const s=state.snapshot();sfx.quest();if(s.step==='wait')notice('线索齐了：黄昏 · 城门 · 最小的魔导士。');
  }

  // ---------- B · the lamplighter ----------
  async function sceneLamps(){
    busy=true;revealing=true;const wasDay=atmosphere.time!=='dusk',seat=V(sites.seat.x,1.12,sites.seat.z);
    holdLights(lampHeads.map(()=>0));
    vivi.root.position.set(sites.gate.x,h(sites.gate.x,sites.gate.z),sites.gate.z);vivi.root.rotation.y=Math.PI;vivi.root.visible=true;vivi.setDetail?.(true);play('Idle');
    await director.run(async c=>{
      await c.fade(1,.6);
      Object.assign(pose,{x:seat.x,z:seat.z,y:1.12,pitch:.04,yaw:yawTo(seat,{x:0,z:43})});
      if(wasDay){setTime('dusk');holdLights(lampHeads.map(()=>0));}
      c.setCam({pos:seat.clone(),look:V(0,1.5,44),fov:52});await c.wait(.4);await c.fade(0,1.1);
      await c.say(LINES.dusk);
      play('Walk');if(vivi.mixer)vivi.mixer.timeScale=1.5;const start=vivi.root.position.clone(),end=V(sites.vivi.x,h(sites.vivi.x,sites.vivi.z),sites.vivi.z);
      await Promise.all([c.tween(4.2,u=>vivi.root.position.lerpVectors(start,end,u),'linear'),c.camTo(()=>({look:viviHead()}),4.2,'soft')]);
      if(vivi.mixer)vivi.mixer.timeScale=1;play('Idle');await c.wait(.3);
      await c.say(LINES.arrive);
      await c.camTo({pos:V(1.4,1.3,42.3),look:V(-.3,1.25,32),fov:50},1.3);
      play('Magic');if(!c.skipping)sfx.charge();
      const tip=vivi.root.position.clone().add(V(0,1.1,-.5));
      for(const s of sparks){s.position.copy(tip);s.scale.setScalar(.01);s.visible=true;}
      await c.tween(1.2,u=>{for(const s of sparks)s.scale.setScalar(.15+u*.85);puff(tip,.3+u*.3);},'out');
      if(!c.skipping)sfx.whoosh();
      // The spark splits: one runs the west side, one the east, lamp after lamp up to the palace gate.
      const chase=c.camera().pos,chaseLook=c.camera().look;
      for(let k=0;k<WEST.length;k++){
        const aW=k?lampHeads[WEST[k-1]]:tip,bW=lampHeads[WEST[k]],aE=k?lampHeads[EAST[k-1]]:tip,bE=lampHeads[EAST[k]];
        await c.tween(k===0?1.6:1.5,u=>{const w=arcPoint(aW,bW,u),e=arcPoint(aE,bE,u);sparks[0].position.copy(w);sparks[1].position.copy(e);for(const sp of sparks)sp.scale.setScalar(1.7);puff(w,.8);puff(e,.8);
          const mid=w.clone().add(e).multiplyScalar(.5);chase.lerp(V(mid.x*.35,Math.max(9,mid.y+7),mid.z+15),.07);chaseLook.lerp(V(mid.x*.5,mid.y-1.5,mid.z-5),.12);c.setCam({pos:chase,look:chaseLook,fov:56});},'inOut');
        ignite(c,WEST[k],k*2);ignite(c,EAST[k],k*2+1);
      }
      for(const s of sparks)s.visible=false;
      await c.camTo({pos:V(-1,13,-50),look:V(-1,7,-73),fov:50},1.4,'soft');await c.wait(1.0);
      await c.fade(1,.35);
      holdLights(lampHeads.map(()=>1));
      vivi.root.rotation.y=faceYaw(vivi.root.position,seat);c.setCam({pos:seat.clone(),look:viviHead(),fov:50});await c.wait(.2);await c.fade(0,.4);
      play('Greet');if(!c.skipping)sfx.surprise();director.bubble(()=>viviHead().add(V(0,.55,0)),'！',1.5);await c.wait(.6);
      await c.say(LINES.noticed);
      state.lit();
    });
    holdLights(null);busy=false;revealing=false;sync();
  }

  // ---------- C · Vivi reads the letter and lights the lantern ----------
  async function sceneGive(){
    busy=true;
    await director.run(async c=>{
      const r=vivi.root;r.rotation.y=faceYaw(r.position,pose);const front=()=>r.position.clone().add(V(Math.sin(r.rotation.y)*.34,.86,Math.cos(r.rotation.y)*.34));
      await talkCam(c,viviHead().add(V(0,-.3,0)),{dist:2.3,side:.7,fov:44});
      sfx.paper();await fly(c,letter,handWorld('letter'),front,.8,{arc:.18,spin:.8,scene});
      letter.rotation.set(1.2,r.rotation.y,0);
      await c.say(LINES.give.slice(0,2));play('Greet');
      await c.say(LINES.give.slice(2));
      letter.visible=false;scene.remove(letter);
      lantern.position.copy(front().add(V(0,-.12,0)));lantern.scale.setScalar(.01);scene.add(lantern);inFlight.add(lantern);lantern.visible=true;
      await c.tween(.5,u=>lantern.scale.setScalar(Math.max(.01,u)),'out');
      play('Magic');if(!c.skipping)sfx.charge();
      const tip=r.position.clone().add(V(Math.sin(r.rotation.y)*.5,1.1,Math.cos(r.rotation.y)*.5)),into=lantern.position.clone().add(V(0,.1,0));
      sparks[0].visible=true;sparks[0].scale.setScalar(.35);
      await c.tween(1.3,u=>{const p=tip.clone().lerp(into,u);p.y+=Math.sin(u*Math.PI)*.25;sparks[0].position.copy(p);puff(p,.2);},'inOut');
      sparks[0].visible=false;lanternLit=true;if(!c.skipping)sfx.ignite(4);await c.wait(.5);
      inFlight.delete(lantern);await fly(c,lantern,lantern.position.clone(),()=>handWorld('lantern'),.8,{arc:.15,scene});
      state.give();director.item(ITEMS.lantern);await c.wait(.4);
      await c.say(LINES.lantern);
    });
    busy=false;sync();
  }

  // ---------- D · the lantern on the wind post, and the windmill answers ----------
  async function sceneHang(){
    busy=true;const wasDay=atmosphere.time!=='dusk',millY=millGlow.position.y;
    await director.run(async c=>{
      if(wasDay){await c.fade(1,.5);setTime('dusk');await c.fade(0,.6);}
      const hookAt=hookWorld.clone().add(V(0,-.3,0));
      await fly(c,lantern,handWorld('lantern'),hookAt,.9,{arc:.25,scene});lantern.rotation.set(0,0,0);
      // Frame the lantern against the city, looking the way the windmill lies.
      const toMill=V(mill.x-hookAt.x,0,mill.z-hookAt.z).normalize(),side=V(toMill.z,0,-toMill.x);
      await c.camTo({pos:hookAt.clone().addScaledVector(toMill,-1.6).addScaledVector(side,-1.2).add(V(0,.35,0)),look:hookAt.clone().addScaledVector(toMill,3).add(V(0,-.35,0)),fov:50},1.1);
      await c.say(LINES.hang);
      const from=c.camera().pos;await c.camTo({pos:V(from.x-4,24,from.z+6),look:V(mill.x,millY-1.5,mill.z),fov:30},3.6,'soft');
      await c.wait(.8);
      const blink=async(on,off,long)=>{millGlow.visible=true;millLevel=1;if(!c.skipping)sfx.blink(long);await c.wait(on);millLevel=0;await c.wait(off);};
      await blink(.28,.32,false);await blink(.28,.5,false);millLevel=1;if(!c.skipping)sfx.blink(true);await c.wait(1.8);millLevel=.85;
      await c.say(LINES.answer);
      if(!c.skipping)sfx.finale();await c.wait(.6);
      state.hang();
    });
    busy=false;sync();
    const choice=await director.card({...CARDS.end,buttons:[{label:'继续在城里走走',value:'stay'},{label:'重新开始这段支线',value:'reset'}]});
    if(choice==='reset'){state.reset();notice('支线重新开始：面包房的面包师又在找邮差了。');}
  }

  async function sceneViviChat(){
    busy=true;const lines=LINES.viviAfter[viviTalk++%LINES.viviAfter.length];
    await director.run(async c=>{vivi.root.rotation.y=faceYaw(vivi.root.position,pose);play('Greet');await talkCam(c,viviHead().add(V(0,-.3,0)),{dist:2.3,side:.6,fov:48});await c.say(lines);},{letterbox:false});
    busy=false;
  }

  // ---------- per frame ----------
  function choose(){
    const s=state.snapshot(),inside=isInside();
    if(busy||director.locked()||!canInteract())return{prompt:null,markers:[]};
    const markers=[],near=(p,r)=>flat(p,pose)<r&&(flat(p,pose)<1.1||facing(p)>.3);let prompt=null;
    if(s.step==='invite'){
      if(inside){const b=shop.baker.position,head=V(b.x,1.95,b.z);markers.push({world:head,label:''});if(shop.nearBaker(pose)&&facing(b)>.2)prompt={id:'baker',verb:'搭话',name:SPEAKERS.baker,world:head,act:sceneBaker};}
      else if(door)markers.push({world:V(door.x,3.3,door.z),label:'面包房'});
    }
    if(s.step==='ask'&&!inside){
      if(!s.clues.includes('mage')&&readingMage){const p=readingMage.root.position,head=p.clone().add(V(0,1.75,0));markers.push({world:head,label:'看书的魔导士'});if(near(p,2.8))prompt={id:'mage',verb:'打听点灯人',name:SPEAKERS.mage,world:head,act:()=>sceneClue('mage',readingMage)};}
      if(!s.clues.includes('patrol')){const list=patrols().sort((a,b)=>flat(a.actor.root.position,pose)-flat(b.actor.root.position,pose)),p=list[0];
        if(p){const head=p.actor.root.position.clone().add(V(0,1.75,0));markers.push({world:head,label:'巡逻队'});if(!prompt&&near(p.actor.root.position,2.6))prompt={id:'patrol',verb:'打听点灯人',name:SPEAKERS.patrol,world:head,act:()=>sceneClue('patrol',p.actor,p.id)};}}
    }
    if(s.step==='wait'&&!inside){const seat=V(sites.seat.x,1.2,sites.seat.z);markers.push({world:seat.clone().setY(1.5),label:atmosphere.time==='dusk'?'城门石凳':'黄昏 · 城门'});if(flat(seat,pose)<1.8)prompt={id:'seat',verb:atmosphere.time==='dusk'?'坐下，等灯亮':'坐下，等黄昏',name:'城门边的石凳',world:seat,act:sceneLamps};}
    if(s.step==='meet'&&!inside){const head=viviHead().add(V(0,.55,0));markers.push({world:head,label:''});if(near(vivi.root.position,2.6))prompt={id:'vivi',verb:'把信交给他',name:SPEAKERS.unknown,world:head,act:sceneGive};}
    if(s.step==='carry'&&!inside){const top=hookWorld.clone().add(V(0,.6,0));markers.push({world:top,label:'观风柱'});if(near(sites.post,2.4))prompt={id:'post',verb:'挂上提灯',name:'观风柱',world:hookWorld,act:sceneHang};}
    if(s.step==='done'&&!inside&&near(vivi.root.position,2.4))prompt={id:'vivi-chat',verb:'聊聊',name:SPEAKERS.vivi,world:viviHead().add(V(0,.5,0)),act:sceneViviChat};
    return{prompt,markers};
  }
  function mapTarget(){const s=state.snapshot();if(s.step==='invite')return door;if(s.step==='ask'){if(!s.clues.includes('mage')&&readingMage)return readingMage.root.position;const p=patrols()[0];return p?.actor.root.position;}if(s.step==='wait')return sites.seat;if(s.step==='meet')return sites.vivi;if(s.step==='carry')return sites.post;return null;}

  let mapClock=0;
  function update(dt){
    clock+=dt;const s=state.snapshot(),dusk=atmosphere.time==='dusk';
    // Before the lamplighter comes, dusk falls on dark streets.
    if(!busy){const dark=s.step==='wait'&&dusk;if(dark&&!lightsHeld){holdLights(lampHeads.map(()=>0));if(!duskToast){duskToast=true;notice('天黑了，街上的灯却一盏也没亮……城门口好像有人。');}sync();}else if(!dark&&lightsHeld){holdLights(null);sync();}}
    const {prompt,markers}=choose();director.setPrompt(prompt);director.setMarkers(markers);
    // Vivi.
    if(vivi.root.visible){vivi.update(dt);if(vivi.setDetail&&!busy)vivi.setDetail(flat(vivi.root.position,camera.position)<14);}
    // Held items: hidden during cutscenes unless in flight.
    const scn=activeScene();if(holder.parent!==scn)scn.add(holder);
    const moved=flat(pose,lastPose);lastPose={x:pose.x,z:pose.z};bob+=moved*7;
    holder.visible=!director.running&&!!held;holder.position.copy(camera.position);holder.quaternion.copy(camera.quaternion);
    holder.position.add(V(0,Math.sin(bob)*.012,0).applyQuaternion(camera.quaternion));
    if(held==='lantern'&&lantern.parent===holder){lantern.rotation.z=Math.sin(clock*2.1)*.05+Math.sin(bob*.5)*.08;lantern.rotation.x=Math.sin(clock*1.7)*.03;}
    if(lantern.parent===scene&&s.step==='done')lantern.rotation.z=Math.sin(clock*1.3)*.06;
    // Lantern flame and its light.
    const flicker=.86+.1*Math.sin(clock*9.1)+.06*Math.sin(clock*15.3+1.1);
    lantern.userData.flame.material.opacity=lanternLit?.95*flicker:0;lantern.userData.glass.emissiveIntensity=lanternLit?1.6*flicker:0;lantern.userData.flame.scale.setScalar(.2+.03*flicker);
    const lanternShown=lanternLit&&lantern.visible&&(lantern.parent===scene||(lantern.parent===holder&&holder.visible&&scn===scene));
    if(lanternShown){lantern.getWorldPosition(light.position);light.position.y+=.12;light.intensity=(dusk?3.2:1.4)*flicker;}else light.intensity=0;
    // Spark trails and lamp flashes.
    for(const p of trail)if(p.userData.life>0){p.userData.life-=dt;const u=Math.max(0,p.userData.life/.55);p.material.opacity=u*.8;p.scale.setScalar(p.userData.size*(.4+u*.6));p.position.y+=dt*.3;if(p.userData.life<=0)p.visible=false;}
    for(const s2 of sparks)if(s2.visible)s2.material.opacity=.85+.15*Math.sin(clock*30);
    for(const f of flashes)if(f.visible){f.userData.t+=dt;const t=f.userData.t,u=t<.15?t/.15:Math.max(0,1-(t-.15)/1.4);f.material.opacity=u;f.scale.setScalar(1.2+3.2*Math.min(1,t/.15)*u);if(t>1.6)f.visible=false;}
    // The windmill keeps its light at dusk once it has answered.
    const millShown=busy?millLevel>0:(s.step==='done'&&dusk);millGlow.visible=millShown;const millU=millShown?(busy?millLevel:.85)*(.9+.1*Math.sin(clock*2.3)):0;millGlow.material.opacity=millU*.75;millPane.color.setRGB(.17+millU*.83,.13+millU*.66,.1+millU*.3);
    mapClock+=dt;if(mapClock>.3){mapClock=0;const t=mapTarget();if(t){mapMark.setAttribute('cx',t.x);mapMark.setAttribute('cy',t.z);mapMark.setAttribute('visibility','visible');}else mapMark.setAttribute('visibility','hidden');}
  }

  sync();
  if(state.snapshot().step==='invite')setTimeout(()=>{if(state.snapshot().step==='invite')notice('集市巷的面包房门口，面包师在张望——好像在找邮差。');},4500);
  return{update,state,busy:()=>busy,
    snapshot:()=>({...state.snapshot(),busy,lightsHeld,held,lanternLit,vivi:{visible:vivi.root.visible,x:vivi.root.position.x,z:vivi.root.position.z},windmill:millGlow.visible,prompt:director.prompt?.id||null}),
    qa:{jump(step){const ok=state.jump(step);sync();return ok;},reset(){state.reset();sync();},sites,hook:hookWorld,lampHeads}};
}
