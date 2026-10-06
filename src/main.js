import './style.css';
import {createMovementInput,createLookInput} from './input-state.js';
import {createPostalJourney} from './postal-journey.js';
import {createPostalWorld} from './postal-world.js';
import {createPostalController} from './postal-controller.js';
import {compileRoyalLayout,royalLocation,mapProjection} from './royal-layout.js';
import {buildRoyalDistrict,buildRoyalLandscape} from './royal-city.js';
import {observationSites,attachObservationSites,observationView} from './postal-observations.js';
import {buildObservationMarkers} from './observation-markers.js';
import {captureStreetPose} from './view-transitions.js';
import {selectStreet} from './street-selection.js';
import {createNpcConversation} from './npc-conversation.js';
import {createPostalMemorial,attachPostalMemorial} from './postal-memorial.js';
import {playPostalChime,cancelPostalChime} from './postal-chime.js';
import {renderProfiles,readPreference,writePreference} from './preferences.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {compileTown,canOccupy,nearestPathIndex,routeTo,center} from './layout.js';
import {initMaterials,skyTexture} from './materials.js';
import {buildHouse,buildProp,buildGround,buildTree,bench,person,buildFountain,buildLandscape} from './assets.js';
import {enrichHouse,buildRoyalCity,buildStreetGate,buildFantasyCitizen,buildTheaterShip} from './fantasy.js';
import {batchStatic} from './batch.js';
import {initPlazaMaterials,buildRoyalFountain,buildGardenBench,animateRoyalFountain,plazaMetrics} from './plaza.js';
import {initSceneryMaterials,buildGardenTree,buildRoyalBackdrop,sceneryMetrics} from './scenery.js';
import {streetMetrics} from './kit.js';
import {loadMoogleAsset} from './moogle.js';
import {loadMageAsset} from './mage.js';
import {loadChocoboAsset} from './chocobo.js';
import {createMoogleBehavior} from './moogle-behavior.js';
import {loadCharacterAssets} from './asset-loading.js';
import {loadHeroMaterials,failedHeroTextures,refreshHeroTextureClones,buildHeroHouse,buildHeroStreet,heroMetrics} from './hero.js';

const $=s=>document.querySelector(s),canvas=$('#world');
// Repeated Enter/Space must not activate the next button after focus moves.
document.addEventListener('keydown',event=>{if(event.repeat&&event.target.tagName==='BUTTON'&&['Enter','Space'].includes(event.code))event.preventDefault();},{capture:true});
let storage=null;try{storage=window.localStorage;}catch{}
const startedAt=performance.now();let readyAt=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer;function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').classList.remove('visible');$('#toast').textContent='';},3500);}
const descriptions={bakery:'看看窗台上刚出炉的面包。旁边的小推车里还有甜甜的麦穗饼。',florist:'挑一束喜欢的花，或者只是闻一闻。每个窗台都留了一点花的位置。',inn:'蓝色屋顶下面有一间温暖的客房，旅人可以在这里歇一晚。',toys:'小小的木头飞空艇、星星积木，还有一些说不出名字的宝贝。',cafe:'一杯热茶，一张朝向街道的小桌。今天可以慢一点。',books:'给旅程带一本书，也可以在路边读完一个短故事。',home:'有人把花摆在窗外，也把这个晴天留在了窗里。',apothecary:'森林里的药草与透明小瓶，店主总有许多植物的故事。'};
try{
  const query=new URLSearchParams(location.search);
  const manifestResponse=await fetch('/data/v4/manifest.json');if(!manifestResponse.ok)throw new Error('三条街道目录尚未准备好');const manifest=await manifestResponse.json();
  const {sample,royal,street}=selectStreet(query,manifest);
  const response=await fetch(sample?'/data/town.json':'/'+street.path);if(!response.ok)throw new Error('街区资料加载失败');
  const raw=await response.json(),plan=royal?compileRoyalLayout(raw):compileTown(raw),generated=raw.version===4;
  const observations=observationSites(plan,royal?'royal':null);attachObservationSites(plan,observations);attachPostalMemorial(plan);
  $('h1').textContent=generated?street.label:raw.title;$('h1').title=raw.title;document.title=raw.title+' · 王城街区';$('header p').textContent=raw.subtitle;
  for(const a of document.querySelectorAll('[data-street]'))if(a.dataset.street===(sample?'sample':street.id))a.setAttribute('aria-current','page');
  $('#layout-record').href=sample?'/data/town.json':'/'+street.path;
  $('#layout-record').title=royal?'查看手工设计的王城布局与通路':generated?'查看小模型输出的模块组合和布局':'查看入口样板固定布局';
  if(generated)document.querySelectorAll('[data-stop]').forEach((button,i)=>{const stop=plan.stops.find(s=>s.id===button.dataset.stop);button.textContent=String(i+1).padStart(2,'0')+' '+stop.title;});

  if(royal){$('#study span').textContent='看城门';$('#study').title='安静欣赏城门，Esc 返回街道';canvas.setAttribute('aria-label','听风王城可步行街区');}
  let profile=readPreference(storage,'ff-garden.render-profile','quality');if(!renderProfiles[profile])profile='quality';
  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,renderProfiles[profile].pixelRatio));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.info.autoReset=false;
  const scene=new THREE.Scene(),sky=skyTexture();sky.mapping=THREE.EquirectangularReflectionMapping;scene.background=sky;scene.fog=new THREE.FogExp2(0xd4e8df,.0042);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(sky);scene.environment=environment.texture;scene.environmentIntensity=.24;pmrem.dispose();
  const hemi=new THREE.HemisphereLight(0xd3efff,0xb3ab80,.58);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe5b6,2.7);sun.position.set(-24,42,24);sun.target.position.set(0,0,-4);sun.castShadow=true;sun.shadow.mapSize.set(renderProfiles[profile].shadowSize,renderProfiles[profile].shadowSize);Object.assign(sun.shadow.camera,{left:-32,right:32,top:49,bottom:-45,near:1,far:135});if(royal){sun.position.set(-38,64,45);sun.target.position.set(0,0,-12);Object.assign(sun.shadow.camera,{left:-48,right:48,top:77,bottom:-65,far:190});}sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight(0x879bbc,.32);fill.position.set(18,12,-30);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.07,330);camera.rotation.order='YXZ';
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.65;ao.minDistance=.00015;ao.maxDistance=.009;ao.enabled=renderProfiles[profile].ao;composer.addPass(ao);composer.addPass(new OutputPass());const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
  function resize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,renderProfiles[profile].pixelRatio));composer.setPixelRatio(renderer.getPixelRatio());renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();aa.material.uniforms.resolution.value.set(1/(w*renderer.getPixelRatio()),1/(h*renderer.getPixelRatio()));}addEventListener('resize',resize);resize();
  const characterLoaders={moogle:loadMoogleAsset,mage:loadMageAsset,chocobo:loadChocoboAsset};
  // The street can open before optional GLBs finish. Keep early results until
  // scene construction is complete, then restore each role as it arrives.
  const characterResults={},pendingCharacters=new Set(Object.keys(characterLoaders));let refreshCharacter=null;
  void loadCharacterAssets(characterLoaders,(name,result)=>{characterResults[name]=result;pendingCharacters.delete(name);refreshCharacter?.(name,result);});
  initMaterials();const heroMaterials=await loadHeroMaterials();if(generated){initPlazaMaterials(heroMaterials);initSceneryMaterials(heroMaterials);}
  const failedCharacters=new Set(Object.keys(characterResults).filter(name=>characterResults[name].status==='rejected'));
  const deferredFocus=new Set([...pendingCharacters].filter(name=>query.has(name)));
  // Once the visitor interacts, late assets must not change their viewpoint.
  document.addEventListener('pointerdown',()=>deferredFocus.clear(),{once:true});
  document.addEventListener('keydown',()=>deferredFocus.clear(),{once:true});
  const fallbackCharacters=new Map();
  const missingAsset=p=>p.species in characterLoaders&&characterResults[p.species]?.status!=='fulfilled';
  const useLegacy=p=>(query.has('legacyMoogle')&&p.species==='moogle')||missingAsset(p);
  const animated={flags:[],people:[],water:null,drops:null,crystal:null,airship:null};
  const town=new THREE.Group(),memorial=createPostalMemorial();town.add(memorial.root);const royalScene=royal?buildRoyalDistrict(plan):null;const royalMetrics=royalScene?.userData.royalMetrics||null;town.add(royalScene||buildGround(plan,animated));if(!royal)town.add(buildHeroStreet(plan));town.add(buildObservationMarkers(observations));plan.buildings.forEach(b=>{const hero=generated||['bakery','florist'].includes(b.kind),house=hero?buildHeroHouse(b):buildHouse(b,animated);if(!hero)enrichHouse(house,b);town.add(house);});plan.props.forEach(p=>town.add(buildProp(p)));plan.trees.forEach(t=>town.add(generated?buildGardenTree(t):buildTree(t)));plan.benches.forEach(b=>town.add(generated?buildGardenBench(b):bench(b)));plan.people.forEach((p,i)=>{const actor=p.species?buildFantasyCitizen({...p,legacy:useLegacy(p)},i,animated):person(p,i,animated);town.add(actor);if(missingAsset(p)&&!(query.has('legacyMoogle')&&p.species==='moogle'))fallbackCharacters.set(i,actor);});town.add(generated?buildRoyalFountain(animated):buildFountain(animated));if(!royal){town.add(generated?buildRoyalBackdrop():buildRoyalCity());town.add(buildStreetGate());}town.add(royal?buildRoyalLandscape(plan):buildLandscape(generated));town.add(buildTheaterShip(animated));
  const batches=batchStatic(town);scene.add(town);
  const pose={x:plan.spawn.x,y:1.68,z:plan.spawn.z,yaw:0,pitch:.13},initialYaw=-.04;pose.yaw=initialYaw;
  let castView=false,artStudy=false,studyPose=null,mapMode=false,oldPose={...pose},transition=null,touring=false,tourFinished=false,tourPath=[],cursor=0,tourTarget=0,afternoon=false;
  const movement=createMovementInput(),keys=movement.keyboard,pendingKeys=new Set(),look=createLookInput();let stepClock=0;
  function clearInput(){movement.clear();pendingKeys.clear();look.clear();canvas.classList.remove('dragging');}
  addEventListener('resize',clearInput);
  $('#render-profile').value=profile;$('#render-profile').addEventListener('change',()=>{profile=$('#render-profile').value;const settings=renderProfiles[profile];ao.enabled=settings.ao;sun.shadow.mapSize.set(settings.shadowSize,settings.shadowSize);sun.shadow.map?.dispose();sun.shadow.map=null;resize();const saved=writePreference(storage,'ff-garden.render-profile',profile);toast((profile==='quality'?'画质优先：完整阴影与环境遮蔽。':'流畅优先：降低分辨率与阴影，关闭环境遮蔽。')+(saved?'':' 本次选择未能保存。'));});
  const journey=createPostalJourney(storage);let postal=null,audio=null,soundBusy=false;
  function onCourierDelivered(){if(journey.snapshot().chapter===0&&journey.snapshot().state==='carrying')toast('问候信已交到你手里，手记会标出收件人。');}
  const couriers=(animated.moogles||[]).map(a=>createMoogleBehavior(a,plan,a.personIndex,{reduced,onDelivered:onCourierDelivered}));
  const magi=animated.mages||(animated.mages=[]),mageSeen=new WeakMap();
  $('#cast').disabled=!plan.castStage;$('#cast').addEventListener('click',()=>focusCast());
  function focusCast(){if(!plan.castStage)return;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;clearInput();castView=true;const c=plan.castStage.camera;Object.assign(pose,{x:c.x,y:c.y,z:c.z});camera.position.set(c.x,c.y,c.z);camera.lookAt(c.target.x,c.target.y,c.target.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;for(const actor of [...magi,...(animated.chocobos||[])])actor.root.rotation.y=plan.people[actor.personIndex].facing;apply();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}

  const birds=animated.chocobos||(animated.chocobos=[]),birdSeen=new WeakMap();
  $('#chocobo').disabled=!birds.length;$('#chocobo').addEventListener('click',()=>focusBird());
  function focusBird(){if(!birds.length)return;castView=false;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;clearInput();const b=birds[0],p=b.root.position,target={x:p.x+.55,z:p.z+2.9};if(!canOccupy(plan,target.x,target.z))return;Object.assign(pose,{x:target.x,z:target.z,y:1.55});camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(p.x,1.05,p.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;b.root.rotation.y=Math.atan2(pose.x-p.x,pose.z-p.z);apply();}
  $('#mage').disabled=!magi.length;
  $('#mage').addEventListener('click',()=>focusMage());
  function focusMage(){if(!magi.length)return;castView=false;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;clearInput();const m=magi[0],p=m.root.position;const target=plan.people[m.personIndex].view||{x:p.x-.48,z:p.z+2.30};if(!canOccupy(plan,target.x,target.z))return;Object.assign(pose,{x:target.x,z:target.z,y:target.y||1.25});camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(p.x,.88,p.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;m.root.rotation.y=Math.atan2(pose.x-p.x,pose.z-p.z);apply();}
  $('#moogle').disabled=!couriers.length;
  const pathLengths=[0];for(let i=1;i<plan.path.length;i++)pathLengths.push(pathLengths.at(-1)+Math.hypot(plan.path[i].x-plan.path[i-1].x,plan.path[i].z-plan.path[i-1].z));
  function apply(){camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0);}
  function reset(){castView=false;Object.assign(pose,{x:plan.spawn.x,y:1.68,z:plan.spawn.z,yaw:initialYaw,pitch:.13});touring=false;tourFinished=false;clearInput();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';apply();}
  function setMap(value){
    if(artStudy)setStudy(false);if(mapMode===value)return;postal?.cancelConfirmations();castView=false;mapMode=value;document.body.classList.toggle('map-mode',value);touring=false;$('#stroll').innerHTML=tourFinished?'回到街角 <span>↶</span>':'慢慢逛一圈 <span>↗</span>';clearInput();$('#map').setAttribute('aria-pressed',String(value));$('#map-panel').hidden=!value;$('#nearby').hidden=true;$('#map span').textContent=value?'回到街道':'游览地图';
    const start={...pose};let target;
    if(value){oldPose=captureStreetPose(pose,transition);camera.position.set(royal?0:19,royal?104:46,royal?10:25);camera.lookAt(royal?0:-1,0,royal?-12:-3);target={x:camera.position.x,y:camera.position.y,z:camera.position.z,yaw:camera.rotation.y,pitch:camera.rotation.x};}else target={...oldPose};
    transition={start,target,returningToStreet:!value,startTime:performance.now(),duration:reduced?1:800};scene.fog.density=value?.001:.0042;apply();drawMap();
  }
  function setStudy(value){
    if(artStudy===value)return;postal?.cancelConfirmations();
    if(value){castView=false;if(mapMode){setMap(false);Object.assign(pose,oldPose);}else if(transition?.returningToStreet)Object.assign(pose,transition.target);transition=null;touring=false;studyPose={...pose};Object.assign(pose,royal?{x:0,y:2.7,z:49,yaw:0,pitch:.17}:{x:-.20,y:3.15,z:33.9,yaw:-.055,pitch:.09});}
    else if(studyPose)Object.assign(pose,studyPose);
    $('#stroll').innerHTML=tourFinished?'回到街角 <span>↶</span>':'慢慢逛一圈 <span>↗</span>';artStudy=value;document.body.classList.toggle('art-study',value);$('#study').setAttribute('aria-pressed',String(value));
    animated.people.forEach(p=>p.visible=!value);animated.airship.visible=!value;clearInput();apply();
  }
  function focusCourier(distance=reduced?1.65:2.15){castView=false;
    if(!couriers.length)return;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;clearInput();
    const c=couriers.reduce((a,b)=>Math.hypot(a.actor.root.position.x-pose.x,a.actor.root.position.z-pose.z)<Math.hypot(b.actor.root.position.x-pose.x,b.actor.root.position.z-pose.z)?a:b),p=c.actor.root.position;
    const target={x:p.x+.68,z:p.z+distance};if(!canOccupy(plan,target.x,target.z))return;
    pose.x=target.x;pose.z=target.z;pose.y=1.48;camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(p.x,.66,p.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;apply();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';toast('库啵！广场边的莫古利向你招手。');
  }
  $('#moogle').addEventListener('click',()=>focusCourier());
  const postalWorld=createPostalWorld({
    plan,getActors:()=>({moogle:couriers.map(c=>c.actor),mage:magi,chocobo:birds}),getCouriers:()=>couriers,
    getFailed:()=>failedCharacters,
    getView:()=>({player:mapMode?oldPose:pose,mode:mapMode?'map':artStudy?'study':transition?'transition':'street'})
  });
  let conversation=null;
  postal=createPostalController({
    document,events:window,journey,world:postalWorld,toast,clearInput,onVisibilityChange:()=>conversation?.update(),onEnding:()=>playPostalChime(audio),getObservation:()=>observationView(observations,postalWorld.view().player,postalWorld.view().mode,journey.snapshot().discoveries),openMap:()=>setMap(true),
    returnToStreet(){if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);transition=null;apply();}else if(transition){Object.assign(pose,transition.target);transition=null;apply();}}
  });
  conversation=createNpcConversation({document,world:postalWorld,journey,isNotebookOpen:()=>postal.isOpen(),openNotebook:()=>postal.show(),clearInput:()=>{touring=false;clearInput();}});
  const characterLabels={moogle:'莫古利',mage:'魔导士',chocobo:'陆行鸟'};let retrying=false,textureRetrying=false;
  function showCharacterStatus(){
    const loading=[...pendingCharacters],failed=[...failedCharacters].filter(name=>!pendingCharacters.has(name));
    const textures=failedHeroTextures();$('#character-warning').hidden=!loading.length&&!failed.length&&!textures.length;
    const labels=names=>names.map(name=>characterLabels[name]).join('、');
    $('#character-warning-text').textContent=[loading.length?labels(loading)+'正在加载，先用简化造型陪你逛街。':'',failed.length?labels(failed)+'暂时无法加载，可稍后重试。':'',textures.length?'部分表面纹理未加载，暂用简化材质，仍可继续游览。':''].filter(Boolean).join(' ');
    $('#character-retry').hidden=!failedCharacters.size;$('#character-retry').disabled=retrying;
    $('#texture-retry').hidden=!textures.length;$('#texture-retry').disabled=textureRetrying;
  }
  function restoreCharacters(name){
    for(const [index,fallback] of fallbackCharacters){
      const p=plan.people[index];if(p.species!==name)continue;
      const actor=buildFantasyCitizen(p,index,animated);actor.visible=!artStudy;town.add(actor);
      fallback.removeFromParent();animated.people.splice(animated.people.indexOf(fallback),1);fallbackCharacters.delete(index);
      // Fallback geometry is unique; materials are shared with the art kit.
      fallback.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
      if(name==='moogle')couriers.push(createMoogleBehavior(actor.userData.moogle,plan,index,{reduced,onDelivered:onCourierDelivered}));
    }
  }
  refreshCharacter=(name,result)=>{
    try{
      if(result.status==='fulfilled'){restoreCharacters(name);failedCharacters.delete(name);}else failedCharacters.add(name);
      $('#moogle').disabled=!couriers.length;$('#mage').disabled=!magi.length;$('#chocobo').disabled=!birds.length;
      // Honour an initial character link only while the visitor is still at
      // the entry; background loading and retries never interrupt exploration.
      if(deferredFocus.delete(name)&&result.status==='fulfilled'&&!mapMode&&!artStudy&&!castView&&!touring&&pose.x===plan.spawn.x&&pose.z===plan.spawn.z){
        if(name==='moogle')focusCourier(query.get('moogle')==='patrol'?4.6:reduced?1.65:2.15);else if(name==='mage')focusMage();else focusBird();
      }
    }catch(error){console.error(error);failedCharacters.add(name);}
    showCharacterStatus();
  };
  showCharacterStatus();
  $('#texture-retry').addEventListener('click',async()=>{
    if(textureRetrying)return;textureRetrying=true;showCharacterStatus();$('#texture-retry').textContent='正在重试纹理…';
    try{await loadHeroMaterials();refreshHeroTextureClones(town);toast(failedHeroTextures().length?'部分纹理仍未加载，简化材质保留。':'表面纹理已恢复。');}
    finally{textureRetrying=false;$('#texture-retry').textContent='重试纹理';showCharacterStatus();}
  });
  $('#character-retry').addEventListener('click',async()=>{
    if(retrying)return;
    const names=[...failedCharacters],button=$('#character-retry');retrying=true;button.textContent='正在重试…';names.forEach(name=>pendingCharacters.add(name));showCharacterStatus();
    try{
      await loadCharacterAssets(Object.fromEntries(names.map(name=>[name,characterLoaders[name]])),(name,result)=>{characterResults[name]=result;pendingCharacters.delete(name);refreshCharacter(name,result);});
      toast(failedCharacters.size?'部分角色仍未加载，请稍后再试。':'角色已加载，可以继续逛街。');
    }finally{retrying=false;button.textContent='重试角色';showCharacterStatus();}
  });
  $('#study').addEventListener('click',()=>setStudy(!artStudy));$('#study-exit').addEventListener('click',()=>setStudy(false));
  function beginTour(targetIndex=plan.path.length-1){castView=false;
    if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);transition=null;}else if(transition?.returningToStreet){Object.assign(pose,transition.target);transition=null;}
    const route=routeTo(plan,{x:pose.x,z:pose.z},targetIndex);
    if(!route){toast('先走回石板路上，再跟着风铃声慢慢逛。');return;}
    tourPath=route;cursor=1;tourTarget=targetIndex;touring=true;tourFinished=false;clearInput();$('#stroll').innerHTML='在这里停一停 <span>Ⅱ</span>';toast('跟着石板路慢慢走 · WASD 随时接管');
  }
  $('#stroll').addEventListener('click',()=>{if(touring){touring=false;$('#stroll').innerHTML='继续慢慢逛 <span>↗</span>';}else if(tourFinished){reset();toast(royal?'回到了敞开的听风城门。':'又回到了花香与面包之间。');}else beginTour();});
  $('#map').addEventListener('click',()=>setMap(!mapMode));
  for(const button of document.querySelectorAll('[data-stop]'))button.addEventListener('click',()=>{const stop=plan.stops.find(s=>s.id===button.dataset.stop);beginTour(nearestPathIndex(plan.path,{x:stop.x??(plan.center||center)(stop.z),z:stop.z}));});
  $('#light').addEventListener('click',()=>{afternoon=!afternoon;$('#light').setAttribute('aria-pressed',String(afternoon));$('#light span').textContent=afternoon?'晴天上午':'午后时光';sun.position.set(afternoon?-32:-24,afternoon?28:42,afternoon?3:24);sun.color.set(afternoon?0xffdba5:0xffe5b6);sun.intensity=afternoon?2.4:2.7;renderer.toneMappingExposure=afternoon?1.00:.96;toast(afternoon?'阳光落在屋檐和花瓣上。':'又是一个清亮的晴天。');});
  const keyMap={KeyW:'w',ArrowUp:'w',KeyS:'s',ArrowDown:'s',KeyA:'a',ArrowLeft:'a',KeyD:'d',ArrowRight:'d',ShiftLeft:'shift',ShiftRight:'shift'};
  addEventListener('keydown',e=>{if(e.defaultPrevented||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Escape'&&postal.handleEscape()){e.preventDefault();return;}if(keyMap[e.code]){if(artStudy)setStudy(false);e.preventDefault();keys.add(keyMap[e.code]);pendingKeys.add(keyMap[e.code]);touring=false;tourFinished=false;$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}if(e.code==='Home'){if(artStudy)setStudy(false);if(mapMode)setMap(false);transition=null;reset();}if(e.code==='KeyM'&&!e.repeat)setMap(!mapMode);if(e.code==='Escape'){if(artStudy)setStudy(false);touring=false;clearInput();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}});
  addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
  function takeControl(){if(artStudy)setStudy(false);touring=false;tourFinished=false;$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}
  const raycaster=new THREE.Raycaster(),tapPoint=new THREE.Vector2();
  function selectCharacter(x,y){
    const rect=canvas.getBoundingClientRect();tapPoint.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);raycaster.setFromCamera(tapPoint,camera);
    const hit=raycaster.intersectObjects(town.children,true)[0];if(!hit)return;
    for(let o=hit.object;o&&o!==town;o=o.parent){if(o.userData.refinedMoogle){focusCourier(1.65);return;}if(o.userData.refinedMage){focusMage();return;}if(o.userData.refinedChocobo){focusBird();return;}}
  }
  canvas.addEventListener('pointerdown',e=>{if(mapMode||transition||e.button!==0)return;if(artStudy)setStudy(false);if(look.start(e.pointerId,e.clientX,e.clientY)){takeControl();canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');}});
  canvas.addEventListener('pointermove',e=>{if(transition)return;const delta=look.move(e.pointerId,e.clientX,e.clientY);if(!delta)return;pose.yaw-=delta.x*.0032;pose.pitch=THREE.MathUtils.clamp(pose.pitch-delta.y*.0032,-.85,1.2);});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{const result=look.end(e.pointerId,ev!=='pointerup');if(!result)return;canvas.classList.remove('dragging');if(result.tap&&!mapMode&&!artStudy)selectCharacter(result.x,result.y);});
  for(const button of document.querySelectorAll('[data-key]')){
    button.addEventListener('pointerdown',e=>{if(mapMode||transition||e.button!==0)return;e.preventDefault();takeControl();button.setPointerCapture(e.pointerId);movement.press(e.pointerId,button.dataset.key);pendingKeys.add(button.dataset.key);});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,e=>{movement.release(e.pointerId);if(!movement.has(button.dataset.key))pendingKeys.delete(button.dataset.key);});
    button.addEventListener('click',e=>{if(e.detail===0&&!mapMode&&!transition){takeControl();pendingKeys.add(button.dataset.key);}});
  }
  function drawMap(){
    const c=$('#minimap'),ctx=c.getContext('2d'),{xScale,zScale,ox,oy}=royal?mapProjection(plan.bounds,c.width,c.height):{xScale:6,zScale:3.8,ox:115,oy:153};ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle='#e1e5c9';ctx.beginPath();ctx.arc(ox-xScale,oy-24*zScale,12*xScale,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cfbd94';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();plan.path.forEach((p,i)=>i?ctx.lineTo(ox+p.x*xScale,oy+p.z*zScale):ctx.moveTo(ox+p.x*xScale,oy+p.z*zScale));ctx.stroke();
    for(const b of plan.buildings){ctx.fillStyle={coral:'#b47767',sage:'#8ca487',blue:'#869dad',lavender:'#a294ac'}[b.roof];ctx.beginPath();const co=Math.cos(b.rotation),si=Math.sin(b.rotation);[[-b.width/2,0],[b.width/2,0],[b.width/2,-b.depth],[-b.width/2,-b.depth]].forEach(([x,z],i)=>{const px=ox+(b.x+co*x+si*z)*xScale,py=oy+(b.z-si*x+co*z)*zScale;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.fill();}
    if(royal){ctx.fillStyle='#b7b19b';for(const s of plan.structures){if(s.type==='circle'){ctx.beginPath();ctx.arc(ox+s.x*xScale,oy+s.z*zScale,s.r*xScale,0,Math.PI*2);ctx.fill();}else ctx.fillRect(ox+(s.x-s.w/2)*xScale,oy+(s.z-s.d/2)*zScale,s.w*xScale,s.d*zScale);}}
    ctx.fillStyle='#90bdc1';ctx.beginPath();ctx.arc(ox-xScale,oy-24*zScale,11,0,Math.PI*2);ctx.fill();
    const p=mapMode?oldPose:pose;ctx.fillStyle='#7b8656';ctx.beginPath();ctx.arc(ox+p.x*xScale,oy+p.z*zScale,4,0,Math.PI*2);ctx.fill();
    const target=postalWorld.currentTarget(journey.snapshot());if(target?.exists){const x=ox+target.position.x*xScale,y=oy+target.position.z*zScale;ctx.fillStyle='#fff9e9';ctx.strokeStyle='#8d6544';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#64482f';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText(journey.snapshot().state==='available'?'信':'收',x,y+3);}
    ctx.fillStyle='#8c9a76';ctx.font="10px 'Noto Serif SC',serif";ctx.textAlign='center';ctx.fillText(royal?'听风议事厅 · 外庭可游览':'城堡与远山',120,12);ctx.fillText(royal?'城门 ⇄ 住宅巷':'街道入口',120,royal?310:292);if(royal){ctx.textAlign='left';for(const l of plan.landmarks)ctx.fillText(l.name,178,oy+l.z*zScale+3);}
  }
  $('#sound').addEventListener('click',async()=>{if(soundBusy)return;soundBusy=true;$('#sound').disabled=true;try{if(!audio){const ac=new AudioContext(),master=ac.createGain();master.gain.value=.025;master.connect(ac.destination);const buffer=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.03-.015)/1.015;data[i]=last;}const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1050;noise.connect(filter);filter.connect(master);noise.start();const chime=()=>{if(ac.state!=='running'||(audio?.chimeUntil||0)>ac.currentTime)return;const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.value=[523.25,659.25,783.99,1046.5][Math.floor(Math.random()*4)];gain.gain.setValueAtTime(.001,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.07,ac.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.8);osc.connect(gain);gain.connect(ac.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start();osc.stop(ac.currentTime+2);if(audio)audio.ambientGain=gain;};const timer=setInterval(chime,4300);audio={ac,master,on:false,timer};if(ac.state!=='running')await ac.resume();audio.on=ac.state==='running';}else{const enable=!audio.on;if(enable)await audio.ac.resume();else{cancelPostalChime(audio);await audio.ac.suspend();}audio.on=enable&&audio.ac.state==='running';}$('#sound').setAttribute('aria-pressed',String(audio.on));$('#sound span').textContent=audio.on?'环境声 开':'环境声 关';}catch{toast('这里暂时听不到风铃声。');}finally{soundBusy=false;$('#sound').disabled=false;}});
  let lastHud=0;const clock=new THREE.Clock(),frames=[];let lastRender={calls:0,triangles:0};
  function animate(){requestAnimationFrame(animate);const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05),time=clock.elapsedTime;
    if(transition){const u=Math.min(1,(performance.now()-transition.startTime)/transition.duration),t=u*u*(3-2*u);for(const k of['x','y','z','yaw','pitch'])pose[k]=THREE.MathUtils.lerp(transition.start[k],transition.target[k],t);if(u===1)transition=null;}
    else if(!mapMode&&!artStudy){
      if(touring){let left=2.5*dt;while(left>0&&cursor<tourPath.length){const p=tourPath[cursor],dx=p.x-pose.x,dz=p.z-pose.z,d=Math.hypot(dx,dz);if(d<.001){cursor++;continue;}const s=Math.min(left,d),x=pose.x+dx/d*s,z=pose.z+dz/d*s;if(!canOccupy(plan,x,z)){touring=false;toast('在这里停一停，再自己走走。');break;}pose.x=x;pose.z=z;left-=s;if(s===d)cursor++;}
        const next=tourPath[Math.min(cursor+8,tourPath.length-1)]||plan.destination;let yaw=Math.atan2(-(next.x-pose.x),-(next.z-pose.z));let diff=THREE.MathUtils.euclideanModulo(yaw-pose.yaw+Math.PI,Math.PI*2)-Math.PI;pose.yaw+=diff*Math.min(1,dt*2);pose.pitch=THREE.MathUtils.lerp(pose.pitch,.08,dt*2);
        if(cursor>=tourPath.length){touring=false;tourFinished=tourTarget===plan.path.length-1;if(tourFinished){pose.yaw=royal?0:Math.atan2(3.2,74.5);pose.pitch=royal?.20:.34;$('#stroll').innerHTML='回到街角 <span>↶</span>';toast(royal?'到王宫外庭了。听风议事厅在前方，室内不开放；可以沿原路逛回去。':'到广场了。看看城堡，也可以再逛回去。');}else{$('#stroll').innerHTML='继续慢慢逛 <span>↗</span>';if(tourTarget<15)pose.yaw=initialYaw;toast('在这里停一停，看看街边的小店。');}}
      }
      const has=k=>movement.has(k)||pendingKeys.has(k);let f=(has('w')?1:0)-(has('s')?1:0),r=(has('d')?1:0)-(has('a')?1:0);if(f||r){castView=false;const n=Math.hypot(f,r);f/=n;r/=n;const sp=(keys.has('shift')?4.7:3.0)*dt,dx=(-Math.sin(pose.yaw)*f+Math.cos(pose.yaw)*r)*sp,dz=(-Math.cos(pose.yaw)*f-Math.sin(pose.yaw)*r)*sp;if(canOccupy(plan,pose.x+dx,pose.z))pose.x+=dx;if(canOccupy(plan,pose.x,pose.z+dz))pose.z+=dz;stepClock+=dt;pose.y=1.68+(reduced?0:Math.sin(stepClock*10)*.01);}else if(!castView)pose.y=THREE.MathUtils.lerp(pose.y,1.68,.12);
    }
    pendingKeys.clear();apply();
    if(!reduced){
      for(const flag of animated.flags){const a=flag.geometry.attributes.position,base=flag.userData.base;for(let i=0;i<a.count;i++){const x=base[i*3],y=base[i*3+1];a.array[i*3+2]=base[i*3+2]+Math.sin(time*1.8+x*5+flag.userData.phase)*.035*(.5-y);}a.needsUpdate=true;flag.geometry.computeVertexNormals();}
      animated.people.forEach((p,i)=>{if(!p.userData.refinedMoogle&&!p.userData.refinedMage&&!p.userData.refinedChocobo)p.rotation.z=Math.sin(time*.9+i)*.012;});
      animated.airship.position.x=7+Math.sin(time*.023)*4;animated.airship.position.y=23+Math.sin(time*.35)*.25;for(const rotor of animated.rotors||[])rotor.rotation.y=time*4;
      animated.crystal.rotation.y=time*.25;animated.crystal.position.y=(animated.crystal.userData.baseY||2.1)+Math.sin(time*.9)*.035;
      if(animated.royalPlaza)animateRoyalFountain(animated,time);else{const a=animated.drops.geometry.attributes.position;for(let i=0;i<a.count;i++){const u=(time*.65+i*.013)%1,theta=i*2.3999;a.array[i*3]=Math.cos(theta)*(.7+u*.9);a.array[i*3+1]=1.48+Math.sin(u*Math.PI)*.32-u*1.1;a.array[i*3+2]=Math.sin(theta)*(.7+u*.9);}a.needsUpdate=true;}
    }
    couriers.forEach(c=>c.update(dt,pose,{paused:mapMode||artStudy}));
    for(const m of magi){const near=Math.hypot(m.root.position.x-pose.x,m.root.position.z-pose.z)<3.2;if(!mapMode&&!artStudy&&!reduced){if(near&&!mageSeen.get(m))m.play('Greet');if(near){const wanted=Math.atan2(pose.x-m.root.position.x,pose.z-m.root.position.z);m.root.rotation.y+=Math.atan2(Math.sin(wanted-m.root.rotation.y),Math.cos(wanted-m.root.rotation.y))*Math.min(1,dt*3);}m.update(dt);if(m.consumeFinished())m.play('Idle');}mageSeen.set(m,near);}
    for(const b of birds){const near=Math.hypot(b.root.position.x-pose.x,b.root.position.z-pose.z)<3.7;if(!mapMode&&!artStudy&&!reduced){if(near&&!birdSeen.get(b))b.play('Chirp');if(near){const wanted=Math.atan2(pose.x-b.root.position.x,pose.z-b.root.position.z);b.root.rotation.y+=Math.atan2(Math.sin(wanted-b.root.rotation.y),Math.cos(wanted-b.root.rotation.y))*Math.min(1,dt*2);}b.update(dt);if(b.consumeFinished())b.play('Idle');}birdSeen.set(b,near);}
    renderer.info.reset();composer.render();lastRender={calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};if(rawDt>0){frames.push(rawDt*1000);if(frames.length>180)frames.shift();}
    if(time-lastHud>.12){const p=mapMode?oldPose:pose,index=nearestPathIndex(plan.path,p),progress=pathLengths[index]/plan.length;$('#progress').style.width=`${progress*100}%`;$('#location').textContent=castView?'喷泉边的街坊':royal?royalLocation(p.z):generated?(p.z>17?street.label+'入口':p.z>0?street.label+'中段':p.z>-17?'街道在转弯':p.z>-29?'喷泉广场':'望向城堡'):(p.z>17?'花香与面包':p.z>0?'树荫小花园':p.z>-17?'街道在转弯':p.z>-29?'喷泉广场':'望向城堡');
      const nearbyPerson=conversation.update(),courierNear=!!nearbyPerson;memorial.setCompleted(journey.snapshot().ending);
      const observation=observationView(observations,p,postalWorld.view().mode,journey.snapshot().discoveries);const portal=plan.portal||{x:2.2,z:-32.5,href:'/?district=royal',name:'通往听风王城',text:'城门、青瓦主街和王宫外庭已经向旅人开放。带上手记，继续这一日邮路。'},portalNear=Math.hypot(p.x-portal.x,p.z-portal.z)<5.5;const near=plan.buildings.map(b=>({b,d:Math.hypot(b.x-p.x,b.z-p.z)})).sort((a,b)=>a.d-b.d)[0];$('#nearby').hidden=mapMode||artStudy||courierNear||(!portalNear&&!observation&&near.d>5.7);$('#district-link').hidden=!portalNear;document.body.classList.toggle('observation-near',!!observation&&!portalNear&&!courierNear);$('#postal-observe').hidden=!observation||portalNear;$('#postal-observe').disabled=!observation?.recorded&&!observation?.canObserve;$('#postal-observe').textContent=observation?.recorded?'重读这段见闻':observation?.canObserve?'停下来看看':'转身看看石牌';if(!$('#nearby').hidden){$('#nearby-name').textContent=portalNear?portal.name:observation?observation.entry.title:near.b.name;$('#nearby-text').textContent=portalNear?portal.text:observation?(observation.recorded?'你已经读过这块石牌，故事留在手记的“见闻”页。':observation.entry.prompt):(near.b.description||descriptions[near.b.kind]);if(portalNear){$('#district-link').href=portal.href;$('#district-link').textContent=portal.name+' ↗';}}if(mapMode)drawMap();
      const currentQuestTarget=postal.update();canvas.dataset.state=JSON.stringify({postalJourney:journey.snapshot(),letterQuest:journey.snapshot(),questTarget:currentQuestTarget&&{name:currentQuestTarget.name,species:currentQuestTarget.species,loaded:currentQuestTarget.loaded},questOpen:postal.isOpen(),ready:true,readyMs:readyAt-startedAt,renderProfile:profile,pixelRatio:renderer.getPixelRatio(),shadowSize:sun.shadow.mapSize.x,inputPointers:movement.pointerCount,pendingCharacters:[...pendingCharacters],failedCharacters:[...failedCharacters],postalAudio:{enabled:!!audio?.on,state:audio?.ac.state||'not-created',completionChimesPlayed:audio?.completionChimesPlayed||0},postalMemorial:memorial.snapshot(),royalCity:royalMetrics,theme:royal?'listening-wind-royal-city':'ff9-alexandria-crafted-corner',revision:generated?4:3,layoutId:royal?'royal':generated?raw.provenance.caseId:'sample',generated,assemblyMetrics:generated?streetMetrics(raw,plan):null,newImageGenerationCalls:generated?0:null,artStudy,castView,castStage:plan.castStage||null,plaza:generated?plazaMetrics():null,scenery:generated?sceneryMetrics():null,hero:heroMetrics(),ambientOcclusion:ao.enabled,landmarks:royal?plan.landmarks.map(l=>l.name):['blade-spire','theater-airship','layered-royal-city'],fantasyCitizens:plan.people.filter(p=>p.species).map(p=>p.species),authoredLayout:royal||!generated,moogles:couriers.map(c=>c.snapshot()),mages:magi.map(m=>m.snapshot()),chocobos:birds.map(b=>b.snapshot()),mapMode,touring,tourFinished,afternoon,pose:{...pose},location:$('#location').textContent,progress,buildings:plan.buildings.length,pathLength:plan.length,batches,render:lastRender,meanFrameMs:frames.reduce((a,b)=>a+b,0)/frames.length});lastHud=time;
    }
  }
  if(new URLSearchParams(location.search).has('study'))setStudy(true);if(query.has('cast'))focusCast();if(query.has('chocobo'))focusBird();if(query.has('mage'))focusMage();if(query.has('moogle'))focusCourier(query.get('moogle')==='patrol'?4.6:reduced?1.65:2.15);apply();drawMap();readyAt=performance.now();animate();$('#loading').classList.add('done');setTimeout(()=>{$('#loading').hidden=true;},550);
}catch(error){console.error(error);$('#loading').textContent='街角还没准备好：'+error.message;}
