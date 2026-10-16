import './city.css';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {compileCity,cityCanOccupy,rectCorners,footprint} from './city-plan.js';
import {CITY_PAVER_BASE,initCityMaterials,buildCityBlocks,buildCityBacks,buildCityGround,buildCityEdges} from './city-assets.js';
import {initMaterials,skyTexture} from './materials.js';
import {loadHeroMaterials,buildHeroHouse,buildHeroStreet} from './hero.js';
import {initPlazaMaterials,buildPlazaPaving,buildPlazaTurf,buildRoyalFountain,buildGardenBench,animateRoyalFountain} from './plaza.js';
import {initSceneryMaterials,buildRoyalBackdrop,buildGardenTree,sceneryMaterials} from './scenery.js';
import {initTheaterMaterials,buildTheaterCorner,buildRefinedTheaterShip} from './theater.js';
import {buildStreetGate,buildFantasyCitizen} from './fantasy.js';
import {buildProp} from './assets.js';
import {loadMoogleAsset} from './moogle.js';
import {loadMageAsset,loadMageFarAsset,createMage} from './mage.js';
import {loadChocoboAsset} from './chocobo.js';
import {batchStatic} from './batch.js';
import {createMovementInput,createLookInput} from './input-state.js';
import {makeCityLifeSpecs,createCityLife} from './city-life.js';
import {createTownsfolk} from './townsfolk.js';
import {advanceCityTour} from './city-tour.js'
import {createCityAtmosphere,CITY_TIMES} from './city-atmosphere.js'
import {buildCityDressing} from './city-dressing.js'
import {buildCityCastle,GATE_LAMPS} from './city-castle.js'
import {buildCityOutskirts} from './city-outskirts.js'
import './city-postal.css'
import {createCityPostal,COURIER_ID} from './city-postal.js';
import {createCityShop,SHOP_EYE} from './city-shop.js';
import {createCitySfx} from './city-sfx.js';
import {createStoryDirector} from './story-director.js';
import {createLamplighterEpisode} from './episode-lamplighter.js';
import {SPEAKERS} from './lamplighter-story.js';

const $=s=>document.querySelector(s),canvas=$('#city'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let noticeTimer;function notice(text){$('#notice').textContent=text;$('#notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('visible'),3200);}
try{
  const response=await fetch('/data/v4/workshops.json');if(!response.ok)throw new Error('街道资料未能加载，请刷新重试。');const raw=await response.json(),plan=compileCity(raw);
  initMaterials();const hero=await loadHeroMaterials();initPlazaMaterials(hero);initSceneryMaterials(hero);initCityMaterials(hero);await initTheaterMaterials(hero);
  const characterNames=['moogle','mage','chocobo'],characterLoads=await Promise.allSettled([loadMoogleAsset(),loadMageAsset(),loadChocoboAsset(),loadMageFarAsset()]);
  const failed=new Set(characterNames.filter((n,i)=>characterLoads[i].status==='rejected'));
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const scene=new THREE.Scene(),sky=skyTexture();sky.mapping=THREE.EquirectangularReflectionMapping;scene.background=sky;scene.fog=new THREE.FogExp2(0xd8e2d2,.0013);
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(sky);scene.environment=env.texture;scene.environmentIntensity=.24;pmrem.dispose();
  const hemi=new THREE.HemisphereLight(0xd3efff,0xafa37a,.65);scene.add(hemi);const sun=new THREE.DirectionalLight(0xffe5b6,2.7);sun.position.set(-45,72,30);sun.target.position.set(0,0,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-62,right:62,top:105,bottom:-90,near:1,far:250});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun,sun.target);const fill=new THREE.DirectionalLight(0x879bbc,.33);fill.position.set(20,18,-60);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.15,460);camera.rotation.order='YXZ';const composer=new EffectComposer(renderer),renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,12);ao.kernelRadius=.4;ao.minDistance=.00012;ao.maxDistance=.012;composer.addPass(ao);composer.addPass(new OutputPass());const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
  function resize(){const ratio=Math.min(devicePixelRatio,$('#quality').value==='smooth'?1:1.25);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);composer.setPixelRatio(ratio);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();aa.material.uniforms.resolution.value.set(1/(innerWidth*ratio),1/(innerHeight*ratio));}
  addEventListener('resize',resize);resize();$('#quality').addEventListener('change',()=>{ao.enabled=$('#quality').value==='quality';sun.shadow.mapSize.set(ao.enabled?2048:1024,ao.enabled?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;resize();});
  const animated={people:[],flags:[]},main=new THREE.Group();main.add(buildHeroStreet({...plan.street,paverBase:CITY_PAVER_BASE}));for(const b of plan.buildings.filter(b=>b.detail==='hero'))main.add(buildHeroHouse(b));main.add(buildStreetGate());batchStatic(main);scene.add(main);
  const staticGround=new THREE.Group();staticGround.add(buildCityGround(plan),buildCityEdges(plan),buildCityBacks(plan),buildPlazaPaving(),buildPlazaTurf(),buildRoyalBackdrop({gate:false}),buildCityCastle());for(const tree of plan.trees)staticGround.add(buildGardenTree(tree));for(const b of plan.benches)staticGround.add(buildGardenBench(b));for(const p of plan.props)staticGround.add(buildProp(p));staticGround.add(buildTheaterCorner(plan.street.theaterStage));batchStatic(staticGround);scene.add(staticGround);const dressing=buildCityDressing(plan);scene.add(dressing.group);const outskirts=buildCityOutskirts(plan.seed);scene.add(outskirts.group);
  const blocks=buildCityBlocks(plan);scene.add(...blocks.groups);const fountain=buildRoyalFountain(animated);batchStatic(fountain);scene.add(fountain);scene.add(buildRefinedTheaterShip(animated,plan.street.theaterStage.ship));
  const residents=new Map();plan.people.forEach((p,i)=>{const root=buildFantasyCitizen({...p,legacy:failed.has(p.species)},i,animated);scene.add(root);const a=root.userData[p.species]||{root,play(){},update(){}};residents.set('neighbor-'+i,a);});
  const liveBase=plan,lifeRecipe=makeCityLifeSpecs(liveBase);
  for(const spec of lifeRecipe.specs){if(residents.has(spec.id))continue;let a;if(spec.kind==='npc')a=createTownsfolk(spec.style,spec.seed);else if(!failed.has('mage')){const root=createMage({x:0,z:0},null);a=root.userData.mage;}else{const root=buildFantasyCitizen({species:'mage',legacy:true,x:0,z:0},0,{people:[]});a={root,play(){},update(){}};}scene.add(a.root);residents.set(spec.id,a);}
  const NEAR_SHADOW=22,FAR_DETAIL=12,FAR_HIDE=42,AERIAL_HIDE=95;const residentLod=[...residents.values()].map(a=>({root:a.root,setDetail:a.setDetail,casters:[],near:true,shown:true,detailed:true}));for(const r of residentLod)r.root.traverse(o=>{if(o.isMesh&&o.castShadow)r.casters.push(o);});
  function updateResidentLod(){const far=mode==='aerial'?AERIAL_HIDE:FAR_HIDE;for(const r of residentLod){const p=r.root.position,d=Math.hypot(p.x-camera.position.x,p.z-camera.position.z),shown=d<far,near=d<NEAR_SHADOW&&mode!=='aerial';if(shown!==r.shown){r.shown=shown;r.root.visible=shown;}if(near!==r.near){r.near=near;for(const o of r.casters)o.castShadow=near;}const detailed=d<FAR_DETAIL;if(r.setDetail&&detailed!==r.detailed){r.detailed=detailed;r.setDetail(detailed);}}}
  const life=createCityLife(liveBase,residents,{reduced,external:new Set([COURIER_ID])}),walkPlan=life.plan;
  const atmosphere=createCityAtmosphere({scene,renderer,sun,fill,hemi,reduced,halo:dressing.haloMaterial,extraLamps:GATE_LAMPS,castleWindows:sceneryMaterials().windowMat});
  const storedTime=(()=>{try{return localStorage.getItem('ff-garden.city-time');}catch{return null;}})();
  function setTime(name,remember=true){const t=atmosphere.set(name),next=t==='day'?'dusk':'day';$('#time-toggle').textContent='时辰 '+CITY_TIMES[t].label;$('#time-toggle').setAttribute('aria-pressed',String(t!=='day'));$('#time-toggle').title='切换到'+CITY_TIMES[next].label;if(remember)try{localStorage.setItem('ff-garden.city-time',t);}catch{}}
  setTime(new URLSearchParams(location.search).get('time')||storedTime||'day',false);
  $('#time-toggle').addEventListener('click',()=>setTime(atmosphere.time==='day'?'dusk':'day'));
  $('#life-toggle').textContent='街坊活动 '+(life.active?'开':'关');$('#life-toggle').setAttribute('aria-pressed',String(life.active));$('#life-toggle').addEventListener('click',()=>{life.setActive(!life.active);$('#life-toggle').textContent='街坊活动 '+(life.active?'开':'关');$('#life-toggle').setAttribute('aria-pressed',String(life.active));});
  let postalHost=null,director=null,episode=null;
  const shop=createCityShop({plan,timeOf:()=>atmosphere.time}),shopFrame=shop.layout.frame;let inside=false,shopBusy=false,talkIndex=0;
  const pose={x:plan.spawn.x,z:plan.spawn.z,y:1.7,yaw:0,pitch:0},movement=createMovementInput(),look=createLookInput();let mode='walk',view='street',touring=false,cursor=1,distance=0,travelled=0,completed=0,blockedSteps=0;let walkReturn={...pose};
  function clearInput(){movement.clear();look.clear();}addEventListener('resize',clearInput);addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
  // The visitor's place in the city: inside the bakery they stand at its door.
  function worldPose(){return inside?{x:shopFrame.outside.x,z:shopFrame.outside.z,y:plan.height(shopFrame.outside.x,shopFrame.outside.z)+1.7,yaw:shopFrame.outside.yaw+Math.PI,pitch:0}:mode==='walk'?pose:walkReturn;}
  function canStand(x,z){return inside?shop.canOccupy(x,z):cityCanOccupy(walkPlan,x,z);}
  function showScene(target){renderPass.scene=target;ao.scene=target;}
  function fadeThrough(change){if(shopBusy)return;shopBusy=true;clearInput();const veil=$('#shop-fade');veil.classList.add('on');setTimeout(()=>{change();setTimeout(()=>{veil.classList.remove('on');shopBusy=false;},90);},reduced?0:340);}
  const SHOP_HINT='和面包师聊聊 · 走出门口、按 E 或 Esc 回到街上';
  function enterShop(){if(inside||mode!=='walk'||shopBusy)return;stopTour();toggleMap(false);fadeThrough(()=>{inside=true;const s=shop.layout.spawn;Object.assign(pose,{x:s.x,z:s.z,yaw:s.yaw,pitch:-.06,y:SHOP_EYE});showScene(shop.scene);document.body.classList.add('in-shop');$('#where').textContent=shop.name;$('#hint').textContent=SHOP_HINT;talkIndex=0;apply();});}
  function placeOutside(){inside=false;const o=shopFrame.outside;Object.assign(pose,{x:o.x,z:o.z,yaw:o.yaw+Math.PI,pitch:-.04,y:plan.height(o.x,o.z)+1.7});showScene(scene);document.body.classList.remove('in-shop');$('#shop-talk').hidden=true;$('#where').textContent=plan.views.market.label;$('#hint').textContent='WASD / 方向键行走 · 拖动转向';apply();}
  function leaveShop(fade=true){if(!inside)return;if(fade)fadeThrough(placeOutside);else placeOutside();}
  $('#shop-door-action').addEventListener('click',()=>inside?leaveShop():enterShop());
  $('#shop-talk-more').addEventListener('click',()=>{talkIndex++;updateShopCards(true);});
  function updateShopCards(force=false){const door=$('#shop-door'),talk=$('#shop-talk');
    if(inside){const lines=shop.lines(),nearDoor=pose.z>-1.6&&Math.abs(pose.x-shopFrame.doorX)<1.2;door.hidden=!nearDoor;if(nearDoor){$('#shop-door-name').textContent='回到集市巷';$('#shop-door-text').textContent='门外是集市巷的石板路。';$('#shop-door-action').innerHTML='推门出去 <kbd>E</kbd>';}
      const near=shop.nearBaker(pose);if(near!==!talk.hidden||force){talk.hidden=!near;if(near)$('#shop-talk-text').textContent=lines[talkIndex%lines.length];}}
    else{talk.hidden=true;const near=mode==='walk'&&!touring&&!postalHost?.isOpen()&&shop.nearDoorOutside(pose);if(near!==!door.hidden){door.hidden=!near;if(near){$('#shop-door-name').textContent=shop.name;$('#shop-door-text').textContent=atmosphere.time==='dusk'?'窗里亮着炉火，最后一炉快出炉了。':'刚出炉的面包香从门缝里飘出来。';$('#shop-door-action').innerHTML='推门进去 <kbd>E</kbd>';}}}}
  function apply(){camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0);}
  function stopTour(){touring=false;$('#tour').innerHTML='沿街绕一圈 <span>↗</span>';$('#tour').setAttribute('aria-pressed','false');}
  function setView(name){if(!plan.views[name])return;leaveShop(false);stopTour();clearInput();const v=plan.views[name];if(name==='aerial'){if(mode==='walk')walkReturn={...pose};mode='aerial';}else{mode='walk';view=name;}
    camera.position.set(...v.position);camera.lookAt(...v.target);Object.assign(pose,{x:v.position[0],y:v.position[1],z:v.position[2],yaw:camera.rotation.y,pitch:camera.rotation.x});
    $('#where').textContent=v.label;$('#overview').textContent=mode==='aerial'?'回到街巷 ↙':'看整座城 ↗';$('#overview').setAttribute('aria-pressed',String(mode==='aerial'));$('#hint').textContent=mode==='aerial'?'屋顶、支巷与上城区，都连在这座城里。':'WASD / 方向键行走 · 拖动转向';for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(name===b.dataset.view));apply();
  }
  function focusResident(name){leaveShop(false);const v=life.view(name);if(!v){notice('街坊正走过这里，稍等一下再看。');return;}stopTour();clearInput();mode='walk';camera.position.set(...v.position);camera.lookAt(...v.target);Object.assign(pose,{x:v.position[0],y:v.position[1],z:v.position[2],yaw:camera.rotation.y,pitch:camera.rotation.x});$('#where').textContent=({patrol:'魔导士巡逻队',moogle:'蹦跳的莫古力',chocobo:'游走的陆行鸟'}[name]);$('#overview').textContent='看整座城 ↗';$('#overview').setAttribute('aria-pressed','false');apply();}
  document.querySelectorAll('[data-life]').forEach(b=>b.addEventListener('click',()=>focusResident(b.dataset.life)));
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('#overview').addEventListener('click',()=>{if(mode!=='aerial'){leaveShop(false);setView('aerial');}else{mode='walk';Object.assign(pose,walkReturn);$('#overview').textContent='看整座城 ↗';$('#overview').setAttribute('aria-pressed','false');$('#where').textContent=plan.views[view].label;$('#hint').textContent='WASD / 方向键行走 · 拖动转向';apply();}});
  $('#reset').addEventListener('click',()=>setView('street'));
  $('#tour').setAttribute('aria-pressed','false');$('#tour').addEventListener('click',()=>{if(touring){stopTour();return;}setView('street');Object.assign(pose,{x:plan.tour[0].x,z:plan.tour[0].z,y:plan.height(plan.tour[0].x,plan.tour[0].z)+1.7});cursor=1;travelled=0;distance=0;blockedSteps=0;touring=true;$('#tour').innerHTML='停下来看看 <span>Ⅱ</span>';$('#tour').setAttribute('aria-pressed','true');$('#where').textContent='沿街游览';notice('主街 → 集市巷 → 住宅巷 → 广场 → 上城，再绕回来。');});
  const ns='http://www.w3.org/2000/svg',map=$('#city-map');function svg(tag,attributes){const e=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,v));map.append(e);return e;}
  svg('rect',{x:-34,y:-69,width:68,height:117,fill:'#e6d6b5',stroke:'#a39168','stroke-width':1});
  for(const road of plan.roads)svg('polyline',{points:road.points.map(p=>p.x+','+p.z).join(' '),fill:'none',stroke:'#f8f0dc','stroke-width':road.width,'stroke-linecap':'round','stroke-linejoin':'round'});
  for(const b of plan.buildings)svg('polygon',{points:[0,1,3,2].map(i=>rectCorners(footprint(b))[i]).map(p=>p.x+','+p.z).join(' '),fill:b.district==='upper'?'#adad97':b.assembly.roof==='teal'?'#899a8b':'#b58666',stroke:'#8e7853','stroke-width':.25});
  svg('circle',{cx:-1,cy:-24,r:2.1,fill:'#6e9b99'});const marker=svg('circle',{cx:pose.x,cy:pose.z,r:1.2,class:'marker'});
  function toggleMap(value){$('#map-panel').hidden=!value;$('#map-toggle').setAttribute('aria-expanded',String(value));}$('#map-toggle').addEventListener('click',()=>toggleMap($('#map-panel').hidden));$('#map-close').addEventListener('click',()=>toggleMap(false));
  const MOVE_CODES={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'};const normalizeKey=e=>MOVE_CODES[e.code]||({'ArrowUp':'w','ArrowDown':'s','ArrowLeft':'a','ArrowRight':'d'}[e.key]||String(e.key).toLowerCase());
  addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||e.key==='Meta'){movement.keyboard.clear();return;}if(e.target.matches('select,input,textarea'))return;if(director?.handleKey(e)){e.preventDefault();return;}if(e.key==='Escape'&&postalHost?.handleEscape()){e.preventDefault();return;}if(e.key==='Escape'&&inside){e.preventDefault();leaveShop();return;}if(e.code==='KeyE'&&!e.repeat&&!postalHost?.isOpen()){if(inside){e.preventDefault();leaveShop();return;}if(!$('#shop-door').hidden){e.preventDefault();enterShop();return;}}const k=normalizeKey(e);if(['w','a','s','d'].includes(k)&&postalHost?.isOpen()){notice('请先收起手记，再继续走动。');return;}if(['w','a','s','d'].includes(k)&&mode==='walk'){e.preventDefault();if(touring)stopTour();movement.keyboard.add(k);}if(e.key==='Escape'){stopTour();clearInput();toggleMap(false);}});addEventListener('keyup',e=>{if(e.key==='Meta'){movement.keyboard.clear();return;}movement.keyboard.delete(normalizeKey(e));});addEventListener('contextmenu',clearInput);
  canvas.addEventListener('pointerdown',e=>{if(director?.locked()){director.tap();return;}if(postalHost?.isOpen())return;if(look.start(e.pointerId,e.clientX,e.clientY)){canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}});canvas.addEventListener('pointermove',e=>{const d=look.move(e.pointerId,e.clientX,e.clientY);if(d&&mode==='walk'&&!director?.locked()){if(touring)stopTour();pose.yaw-=d.x*.003;pose.pitch=THREE.MathUtils.clamp(pose.pitch-d.y*.0025,-1.2,1.2);}});for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>look.end(e.pointerId,event!=='pointerup'));
  for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{if(mode!=='walk')return;stopTour();b.setPointerCapture(e.pointerId);movement.press(e.pointerId,b.dataset.move);});for(const event of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>movement.release(e.pointerId));}
  function move(dx,dz){let moved=false;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.10));for(let i=0;i<steps;i++){const x=pose.x+dx/steps,z=pose.z+dz/steps;if(canStand(x,z)){pose.x=x;pose.z=z;moved=true;}else{blockedSteps++;if(!touring){if(canStand(x,pose.z)){pose.x=x;moved=true;}if(canStand(pose.x,z)){pose.z=z;moved=true;}}}}return moved;}
  function advanceTour(dt){const state={pose,cursor,travelled},r=advanceCityTour(state,plan.tour,Number($('#speed').value),dt,move);cursor=state.cursor;travelled=state.travelled;if(r.bearing!==null){const diff=Math.atan2(Math.sin(r.bearing-pose.yaw),Math.cos(r.bearing-pose.yaw));pose.yaw+=diff*Math.min(1,dt*4.5);pose.pitch=THREE.MathUtils.lerp(pose.pitch,.035,Math.min(1,dt*4));}if(r.finished){completed++;stopTour();$('#where').textContent='又回到了街道入口';notice('已经绕了一圈。还有小院和巷口，可以慢慢看看。');}}
  let storage=null;try{storage=window.localStorage;}catch{}
  postalHost=createCityPostal({plan,scene,animated,life,failed,storage,reduced,map,getPose:worldPose,getMode:()=>mode==='walk'?'street':'map',toast:notice,clearInput,stopTour,
    openMap:()=>{postalHost.postal.hide();toggleMap(true);},returnToStreet:()=>{if(mode==='aerial')$('#overview').click();toggleMap(false);}});
  // You are the city's postal apprentice: side stories begin from letters like this one.
  const sfx=createCitySfx();director=createStoryDirector({camera,getPose:()=>pose,sfx,names:SPEAKERS});
  episode=createLamplighterEpisode({director,sfx,plan,scene,camera,pose,atmosphere,setTime,life,residents,shop,isInside:()=>inside,canInteract:()=>mode==='walk'&&!touring&&!shopBusy&&!postalHost.isOpen(),notice,map,failed,storage});
  {const b=document.createElement('button');b.id='sound-toggle';const label=()=>{b.textContent='声音 '+(sfx.on?'开':'关');b.setAttribute('aria-pressed',String(sfx.on));};label();b.addEventListener('click',()=>{sfx.setOn(!sfx.on);label();});$('.top-right').insertBefore(b,$('#map-toggle'));}
  // Browser QA only (?qa): place the visitor directly, as a walk would.
  if(new URLSearchParams(location.search).has('qa'))window.__cityQA={episode,director,enterShop,leaveShop:()=>leaveShop(false),shop,setShopPose(x,z,yaw,pitch=-.08){if(!inside)return false;clearInput();Object.assign(pose,{x,z,yaw,pitch});apply();return shop.canOccupy(x,z);},setPose(x,z,yaw,pitch=pose.pitch){Object.assign(pose,{x,z,yaw,pitch});apply();},teleport(x,z,yaw=pose.yaw){leaveShop(false);stopTour();clearInput();if(mode!=='walk')setView(view);Object.assign(pose,{x,z,yaw,pitch:-.12,y:plan.height(x,z)+1.7});apply();return cityCanOccupy(walkPlan,x,z);},debug:{THREE,scene,renderer,composer,camera,sun,ao}};
  setView(new URLSearchParams(location.search).get('view')||'street');if(failed.size)notice('部分邻居暂时使用简化造型，请稍后刷新。');$('#loading').hidden=true;
  // Frame pacing: at most ~60 fps (120 Hz screens would otherwise double the work),
  // 30 fps after a quiet spell, 20 fps while another window has focus.
  let lastActive=performance.now();const wake=()=>{lastActive=performance.now();};for(const type of['keydown','pointerdown','pointermove','wheel'])addEventListener(type,wake,{passive:true});
  function frameInterval(now){if(!document.hasFocus())return 1000/20;if(touring||director.locked()||movement.keyboard.size||movement.pointerCount||now-lastActive<10000)return 1000/64;return 1000/31;}
  let last=performance.now(),frames=[],lastState=0,lodClock=0;function frame(now){if(now-last<frameInterval(now)){requestAnimationFrame(frame);return;}const wallDt=(now-last)/1000,dt=Math.min(.06,wallDt);last=now;if(document.hidden){requestAnimationFrame(frame);return;}
    life.update(dt,worldPose());director.update(dt);episode.update(dt);postalHost.update(dt,{paused:mode!=='walk'});if(inside){shop.update(dt,pose);if($('#hint').textContent!==SHOP_HINT)$('#hint').textContent=SHOP_HINT;}updateShopCards();
    if(mode==='walk'){if(touring)advanceTour(dt);else if(!director.locked()){let x=Number(movement.has('d'))-Number(movement.has('a')),z=Number(movement.has('w'))-Number(movement.has('s')),l=Math.hypot(x,z);if(l){x/=l;z/=l;move((Math.cos(pose.yaw)*x-Math.sin(pose.yaw)*z)*3.0*dt,(-Math.sin(pose.yaw)*x-Math.cos(pose.yaw)*z)*3.0*dt);}}
      if(inside&&!shopBusy&&shop.layout.leaving(pose.x,pose.z))leaveShop();
      pose.y=THREE.MathUtils.lerp(pose.y,inside?SHOP_EYE:plan.height(pose.x,pose.z)+1.7,Math.min(1,dt*16));}
    if(animated.royalPlaza)animateRoyalFountain(animated,now/1000);if(animated.crystal)animated.crystal.rotation.y=now*.00022;for(const r of animated.rotors||[])r.rotation.y=now*.004;
    apply();director.frame();atmosphere.update(now/1000,camera);if(!reduced)outskirts.update(now/1000);lodClock+=dt;if(lodClock>.2&&!inside){lodClock=0;updateResidentLod();}renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();frames.push(wallDt);if(frames.length>90)frames.shift();{const w=worldPose();marker.setAttribute('cx',w.x);marker.setAttribute('cy',w.z);}
    if(now-lastState>300){lastState=now;$('#city-state').dataset.ready='true';$('#city-state').textContent=JSON.stringify({ready:true,revision:plan.revision,mode,view,pose:{x:pose.x,y:pose.y,z:pose.z},touring,tourCursor:cursor,travelled,completedTours:completed,blockedSteps,metrics:plan.metrics,render:{fps:frames.length/frames.reduce((a,b)=>a+b,0),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,chunks:blocks.metrics.districtBatches.length,farChunks:blocks.groups.filter(g=>g.getCurrentLevel()>0).length},charactersFailed:[...failed],life:life.snapshot(),atmosphere:atmosphere.snapshot(),postal:postalHost.snapshot(),episode:episode.snapshot(),story:director.snapshot(),shop:{inside,door:!$('#shop-door').hidden,talk:!$('#shop-talk').hidden,...shop.snapshot()},royals:[],royalArtStatus:'withdrawn-after-human-rejection'});}requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
}catch(e){$('#loading').hidden=false;$('#loading span').textContent='街巷暂时没有打开。';$('#loading small').textContent=e.message;$('#city-state').textContent=JSON.stringify({ready:false,error:e.message});console.error(e);}
