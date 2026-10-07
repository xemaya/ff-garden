import './city.css';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {compileCity,cityCanOccupy,rectCorners,footprint} from './city-plan.js';
import {initCityMaterials,buildCityBlocks,buildCityBacks,buildCityGround,buildCityEdges} from './city-assets.js';
import {initMaterials,skyTexture} from './materials.js';
import {loadHeroMaterials,buildHeroHouse,buildHeroStreet} from './hero.js';
import {initPlazaMaterials,buildPlazaPaving,buildPlazaTurf,buildRoyalFountain,buildGardenBench,animateRoyalFountain} from './plaza.js';
import {initSceneryMaterials,buildRoyalBackdrop,buildGardenTree} from './scenery.js';
import {initTheaterMaterials,buildTheaterCorner,buildRefinedTheaterShip} from './theater.js';
import {buildStreetGate,buildFantasyCitizen} from './fantasy.js';
import {buildProp} from './assets.js';
import {loadMoogleAsset} from './moogle.js';
import {loadMageAsset} from './mage.js';
import {loadChocoboAsset} from './chocobo.js';
import {batchStatic} from './batch.js';
import {createMovementInput,createLookInput} from './input-state.js';

const $=s=>document.querySelector(s),canvas=$('#city'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let noticeTimer;function notice(text){$('#notice').textContent=text;$('#notice').classList.add('visible');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('visible'),3200);}
try{
  const response=await fetch('/data/v4/workshops.json');if(!response.ok)throw new Error('街道资料未能加载，请刷新重试。');const raw=await response.json(),plan=compileCity(raw);
  initMaterials();const hero=await loadHeroMaterials();initPlazaMaterials(hero);initSceneryMaterials(hero);initCityMaterials(hero);await initTheaterMaterials(hero);
  const characterNames=['moogle','mage','chocobo'],characterLoads=await Promise.allSettled([loadMoogleAsset(),loadMageAsset(),loadChocoboAsset()]);
  const failed=new Set(characterNames.filter((n,i)=>characterLoads[i].status==='rejected'));
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),sky=skyTexture();sky.mapping=THREE.EquirectangularReflectionMapping;scene.background=sky;scene.fog=new THREE.FogExp2(0xd8e2d2,.0013);
  const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(sky);scene.environment=env.texture;scene.environmentIntensity=.24;pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xd3efff,0xafa37a,.65));const sun=new THREE.DirectionalLight(0xffe5b6,2.7);sun.position.set(-45,72,30);sun.target.position.set(0,0,-20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-62,right:62,top:105,bottom:-90,near:1,far:250});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun,sun.target);const fill=new THREE.DirectionalLight(0x879bbc,.33);fill.position.set(20,18,-60);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(57,innerWidth/innerHeight,.08,460);camera.rotation.order='YXZ';const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,12);ao.kernelRadius=.4;ao.minDistance=.00012;ao.maxDistance=.012;composer.addPass(ao);composer.addPass(new OutputPass());const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
  function resize(){const ratio=Math.min(devicePixelRatio,$('#quality').value==='smooth'?1:1.25);renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);composer.setPixelRatio(ratio);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();aa.material.uniforms.resolution.value.set(1/(innerWidth*ratio),1/(innerHeight*ratio));}
  addEventListener('resize',resize);resize();$('#quality').addEventListener('change',()=>{ao.enabled=$('#quality').value==='quality';sun.shadow.mapSize.set(ao.enabled?2048:1024,ao.enabled?2048:1024);sun.shadow.map?.dispose();sun.shadow.map=null;resize();});
  const animated={people:[],flags:[]},main=new THREE.Group();main.add(buildHeroStreet(plan.street));for(const b of plan.buildings.filter(b=>b.detail==='hero'))main.add(buildHeroHouse(b));main.add(buildStreetGate());batchStatic(main);scene.add(main);
  const staticGround=new THREE.Group();staticGround.add(buildCityGround(plan),buildCityEdges(plan),buildCityBacks(plan),buildPlazaPaving(),buildPlazaTurf(),buildRoyalBackdrop());for(const tree of plan.trees)staticGround.add(buildGardenTree(tree));for(const b of plan.benches)staticGround.add(buildGardenBench(b));for(const p of plan.props)staticGround.add(buildProp(p));staticGround.add(buildTheaterCorner(plan.street.theaterStage));batchStatic(staticGround);scene.add(staticGround);
  const blocks=buildCityBlocks(plan);scene.add(...blocks.groups);const fountain=buildRoyalFountain(animated);batchStatic(fountain);scene.add(fountain);scene.add(buildRefinedTheaterShip(animated,plan.street.theaterStage.ship));
  plan.people.forEach((p,i)=>scene.add(buildFantasyCitizen({...p,legacy:failed.has(p.species)},i,animated)));
  const pose={x:plan.spawn.x,z:plan.spawn.z,y:1.7,yaw:0,pitch:0},movement=createMovementInput(),look=createLookInput();let mode='walk',view='street',touring=false,cursor=1,distance=0,travelled=0,completed=0,blockedSteps=0;let walkReturn={...pose};
  function clearInput(){movement.clear();look.clear();}addEventListener('resize',clearInput);addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
  function apply(){camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0);}
  function stopTour(){touring=false;$('#tour').innerHTML='沿街绕一圈 <span>↗</span>';$('#tour').setAttribute('aria-pressed','false');}
  function setView(name){if(!plan.views[name])return;stopTour();clearInput();const v=plan.views[name];if(name==='aerial'){if(mode==='walk')walkReturn={...pose};mode='aerial';}else{mode='walk';view=name;}
    camera.position.set(...v.position);camera.lookAt(...v.target);Object.assign(pose,{x:v.position[0],y:v.position[1],z:v.position[2],yaw:camera.rotation.y,pitch:camera.rotation.x});
    $('#where').textContent=v.label;$('#overview').textContent=mode==='aerial'?'回到街巷 ↙':'看整座城 ↗';$('#overview').setAttribute('aria-pressed',String(mode==='aerial'));$('#hint').textContent=mode==='aerial'?'屋顶、支巷与上城区，都连在这座城里。':'WASD / 方向键行走 · 拖动转向';for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(name===b.dataset.view));apply();
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('#overview').addEventListener('click',()=>{if(mode!=='aerial')setView('aerial');else{mode='walk';Object.assign(pose,walkReturn);$('#overview').textContent='看整座城 ↗';$('#overview').setAttribute('aria-pressed','false');$('#where').textContent=plan.views[view].label;$('#hint').textContent='WASD / 方向键行走 · 拖动转向';apply();}});
  $('#reset').addEventListener('click',()=>setView('street'));
  $('#tour').setAttribute('aria-pressed','false');$('#tour').addEventListener('click',()=>{if(touring){stopTour();return;}setView('street');Object.assign(pose,{x:plan.tour[0].x,z:plan.tour[0].z,y:plan.height(plan.tour[0].x,plan.tour[0].z)+1.7});cursor=1;travelled=0;distance=0;blockedSteps=0;touring=true;$('#tour').innerHTML='停下来看看 <span>Ⅱ</span>';$('#tour').setAttribute('aria-pressed','true');$('#where').textContent='沿街游览';notice('主街 → 集市巷 → 住宅巷 → 广场 → 上城，再绕回来。');});
  const ns='http://www.w3.org/2000/svg',map=$('#city-map');function svg(tag,attributes){const e=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,v));map.append(e);return e;}
  svg('rect',{x:-34,y:-69,width:68,height:117,fill:'#e6d6b5',stroke:'#a39168','stroke-width':1});
  for(const road of plan.roads)svg('polyline',{points:road.points.map(p=>p.x+','+p.z).join(' '),fill:'none',stroke:'#f8f0dc','stroke-width':road.width,'stroke-linecap':'round','stroke-linejoin':'round'});
  for(const b of plan.buildings)svg('polygon',{points:[0,1,3,2].map(i=>rectCorners(footprint(b))[i]).map(p=>p.x+','+p.z).join(' '),fill:b.district==='upper'?'#adad97':b.assembly.roof==='teal'?'#899a8b':'#b58666',stroke:'#8e7853','stroke-width':.25});
  svg('circle',{cx:-1,cy:-24,r:2.1,fill:'#6e9b99'});const marker=svg('circle',{cx:pose.x,cy:pose.z,r:1.2,class:'marker'});
  function toggleMap(value){$('#map-panel').hidden=!value;$('#map-toggle').setAttribute('aria-expanded',String(value));}$('#map-toggle').addEventListener('click',()=>toggleMap($('#map-panel').hidden));$('#map-close').addEventListener('click',()=>toggleMap(false));
  const normalizeKey=k=>({'ArrowUp':'w','ArrowDown':'s','ArrowLeft':'a','ArrowRight':'d'}[k]||k.toLowerCase());
  addEventListener('keydown',e=>{if(e.target.matches('select,input,textarea'))return;const k=normalizeKey(e.key);if(['w','a','s','d'].includes(k)&&mode==='walk'){e.preventDefault();if(touring)stopTour();movement.keyboard.add(k);}if(e.key==='Escape'){stopTour();clearInput();toggleMap(false);}});addEventListener('keyup',e=>movement.keyboard.delete(normalizeKey(e.key)));
  canvas.addEventListener('pointerdown',e=>{if(look.start(e.pointerId,e.clientX,e.clientY)){canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}});canvas.addEventListener('pointermove',e=>{const d=look.move(e.pointerId,e.clientX,e.clientY);if(d&&mode==='walk'){if(touring)stopTour();pose.yaw-=d.x*.003;pose.pitch=THREE.MathUtils.clamp(pose.pitch-d.y*.0025,-1.2,1.2);}});for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>look.end(e.pointerId,event!=='pointerup'));
  for(const b of document.querySelectorAll('[data-move]')){b.addEventListener('pointerdown',e=>{if(mode!=='walk')return;stopTour();b.setPointerCapture(e.pointerId);movement.press(e.pointerId,b.dataset.move);});for(const event of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>movement.release(e.pointerId));}
  function move(dx,dz){let moved=false;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.10));for(let i=0;i<steps;i++){const x=pose.x+dx/steps,z=pose.z+dz/steps;if(cityCanOccupy(plan,x,z)){pose.x=x;pose.z=z;moved=true;}else{blockedSteps++;if(!touring){if(cityCanOccupy(plan,x,pose.z)){pose.x=x;moved=true;}if(cityCanOccupy(plan,pose.x,z)){pose.z=z;moved=true;}}}}return moved;}
  function advanceTour(dt){let remaining=Number($('#speed').value)*dt;while(touring&&remaining>0&&cursor<plan.tour.length){const target=plan.tour[cursor],dx=target.x-pose.x,dz=target.z-pose.z,d=Math.hypot(dx,dz);if(d<.003){cursor++;continue;}const step=Math.min(d,remaining);if(!move(dx/d*step,dz/d*step)){stopTour();notice('前面暂时走不过去，已停下。');return;}travelled+=step;remaining-=step;const yaw=Math.atan2(-dx,-dz),diff=Math.atan2(Math.sin(yaw-pose.yaw),Math.cos(yaw-pose.yaw));pose.yaw+=diff*Math.min(1,dt*4.5);pose.pitch=THREE.MathUtils.lerp(pose.pitch,.035,Math.min(1,dt*4));if(step>=d-.001)cursor++;}if(touring&&cursor>=plan.tour.length){completed++;stopTour();$('#where').textContent='又回到了街道入口';notice('已经绕了一圈。还有小院和巷口，可以慢慢看看。');}}
  setView(new URLSearchParams(location.search).get('view')||'street');if(failed.size)notice('部分邻居暂时使用简化造型，请稍后刷新。');$('#loading').hidden=true;
  let last=performance.now(),frames=[],lastState=0;function frame(now){const wallDt=(now-last)/1000,dt=Math.min(.06,wallDt);last=now;if(document.hidden){requestAnimationFrame(frame);return;}
    if(mode==='walk'){if(touring)advanceTour(dt);else{let x=Number(movement.has('d'))-Number(movement.has('a')),z=Number(movement.has('w'))-Number(movement.has('s')),l=Math.hypot(x,z);if(l){x/=l;z/=l;move((Math.cos(pose.yaw)*x-Math.sin(pose.yaw)*z)*3.0*dt,(-Math.sin(pose.yaw)*x-Math.cos(pose.yaw)*z)*3.0*dt);}}
      pose.y=THREE.MathUtils.lerp(pose.y,plan.height(pose.x,pose.z)+1.7,Math.min(1,dt*16));}
    for(const actor of[...(animated.moogles||[]),...(animated.mages||[]),...(animated.chocobos||[])])actor.update(reduced?0:dt);if(animated.royalPlaza)animateRoyalFountain(animated,now/1000);if(animated.crystal)animated.crystal.rotation.y=now*.00022;for(const r of animated.rotors||[])r.rotation.y=now*.004;
    apply();renderer.info.reset();composer.render();frames.push(wallDt);if(frames.length>90)frames.shift();marker.setAttribute('cx',pose.x);marker.setAttribute('cy',pose.z);
    if(now-lastState>300){lastState=now;$('#city-state').dataset.ready='true';$('#city-state').textContent=JSON.stringify({ready:true,revision:plan.revision,mode,view,pose:{x:pose.x,y:pose.y,z:pose.z},touring,tourCursor:cursor,travelled,completedTours:completed,blockedSteps,metrics:plan.metrics,render:{fps:frames.length/frames.reduce((a,b)=>a+b,0),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,chunks:blocks.metrics.districtBatches.length,farChunks:blocks.groups.filter(g=>g.getCurrentLevel()>0).length},charactersFailed:[...failed]});}requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
}catch(e){$('#loading').hidden=false;$('#loading span').textContent='街巷暂时没有打开。';$('#loading small').textContent=e.message;$('#city-state').textContent=JSON.stringify({ready:false,error:e.message});console.error(e);}
