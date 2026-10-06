import './style.css';
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
import {streetMetrics} from './kit.js';
import {loadMoogleAsset} from './moogle.js';
import {loadMageAsset} from './mage.js';
import {loadChocoboAsset} from './chocobo.js';
import {createMoogleBehavior} from './moogle-behavior.js';
import {loadHeroMaterials,buildHeroHouse,buildHeroStreet,heroMetrics} from './hero.js';

const $=s=>document.querySelector(s),canvas=$('#world');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer;function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').classList.remove('visible');$('#toast').textContent='';},3500);}
const descriptions={bakery:'看看窗台上刚出炉的面包。旁边的小推车里还有甜甜的麦穗饼。',florist:'挑一束喜欢的花，或者只是闻一闻。每个窗台都留了一点花的位置。',inn:'蓝色屋顶下面有一间温暖的客房，旅人可以在这里歇一晚。',toys:'小小的木头飞空艇、星星积木，还有一些说不出名字的宝贝。',cafe:'一杯热茶，一张朝向街道的小桌。今天可以慢一点。',books:'给旅程带一本书，也可以在路边读完一个短故事。',home:'有人把花摆在窗外，也把这个晴天留在了窗里。',apothecary:'森林里的药草与透明小瓶，店主总有许多植物的故事。'};
try{
  const query=new URLSearchParams(location.search);let sample=query.has('sample');
  const manifestResponse=await fetch('/data/v4/manifest.json');if(!manifestResponse.ok)throw new Error('三条街道目录尚未准备好');const manifest=await manifestResponse.json();
  if(!manifest.streets.length&&!query.has('street'))sample=true;const street=manifest.streets.find(s=>s.id===(query.get('street')||manifest.defaultStreet));if(!sample&&!street)throw new Error('未知街道');
  const response=await fetch(sample?'/data/town.json':'/'+street.path);if(!response.ok)throw new Error('街区资料加载失败');
  const raw=await response.json(),plan=compileTown(raw),generated=raw.version===4;
  $('h1').textContent=generated?street.label:raw.title;$('h1').title=raw.title;document.title=raw.title+' · 王城街区';$('header p').textContent=raw.subtitle;
  for(const a of document.querySelectorAll('[data-street]'))if(a.dataset.street===(sample?'sample':street.id))a.setAttribute('aria-current','page');
  $('#layout-record').href=sample?'/data/town.json':'/'+street.path;
  $('#layout-record').title=generated?'查看小模型输出的模块组合和布局':'查看入口样板固定布局';
  if(generated)document.querySelectorAll('[data-stop]').forEach((button,i)=>{const stop=plan.stops.find(s=>s.id===button.dataset.stop);button.textContent=String(i+1).padStart(2,'0')+' '+stop.title;});

  const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.info.autoReset=false;
  const scene=new THREE.Scene(),sky=skyTexture();sky.mapping=THREE.EquirectangularReflectionMapping;scene.background=sky;scene.fog=new THREE.FogExp2(0xd4e8df,.0042);
  const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(sky);scene.environment=environment.texture;scene.environmentIntensity=.24;pmrem.dispose();
  const hemi=new THREE.HemisphereLight(0xd3efff,0xb3ab80,.58);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe5b6,2.7);sun.position.set(-24,42,24);sun.target.position.set(0,0,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:49,bottom:-45,near:1,far:135});sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight(0x879bbc,.32);fill.position.set(18,12,-30);scene.add(fill);
  const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.07,330);camera.rotation.order='YXZ';
  const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.65;ao.minDistance=.00015;ao.maxDistance=.009;composer.addPass(ao);composer.addPass(new OutputPass());const aa=new ShaderPass(FXAAShader);composer.addPass(aa);
  function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();aa.material.uniforms.resolution.value.set(1/(w*renderer.getPixelRatio()),1/(h*renderer.getPixelRatio()));}addEventListener('resize',resize);resize();
  initMaterials();const heroMaterials=await loadHeroMaterials();if(generated)initPlazaMaterials(heroMaterials);await loadMoogleAsset();await loadMageAsset();await loadChocoboAsset();
  const animated={flags:[],people:[],water:null,drops:null,crystal:null,airship:null};
  const town=new THREE.Group();town.add(buildGround(plan,animated));town.add(buildHeroStreet(plan));plan.buildings.forEach(b=>{const hero=generated||['bakery','florist'].includes(b.kind),house=hero?buildHeroHouse(b):buildHouse(b,animated);if(!hero)enrichHouse(house,b);town.add(house);});plan.props.forEach(p=>town.add(buildProp(p)));plan.trees.forEach(t=>town.add(buildTree(t)));plan.benches.forEach(b=>town.add(generated?buildGardenBench(b):bench(b)));plan.people.forEach((p,i)=>town.add(p.species?buildFantasyCitizen({...p,legacy:query.has('legacyMoogle')&&p.species==='moogle'},i,animated):person(p,i,animated)));town.add(generated?buildRoyalFountain(animated):buildFountain(animated));town.add(buildRoyalCity());town.add(buildStreetGate());town.add(buildLandscape(generated));town.add(buildTheaterShip(animated));
  const batches=batchStatic(town);scene.add(town);
  const pose={x:plan.spawn.x,y:1.68,z:plan.spawn.z,yaw:0,pitch:.13},initialYaw=-.04;pose.yaw=initialYaw;
  let castView=false,artStudy=false,studyPose=null,mapMode=false,oldPose={...pose},transition=null,touring=false,tourFinished=false,tourPath=[],cursor=0,tourTarget=0,afternoon=false;
  const keys=new Set(),pendingKeys=new Set();let drag=null,stepClock=0;
  const couriers=(animated.moogles||[]).map(a=>createMoogleBehavior(a,plan,a.personIndex,{reduced,onDelivered:()=>toast('收到一封小信：愿你今天的旅程轻快。库啵！')}));let nearestCourier=null;
  const magi=animated.mages||[],mageSeen=new WeakMap();
  $('#cast').disabled=!plan.castStage;$('#cast').addEventListener('click',()=>focusCast());
  function focusCast(){if(!plan.castStage)return;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;keys.clear();pendingKeys.clear();castView=true;const c=plan.castStage.camera;Object.assign(pose,{x:c.x,y:c.y,z:c.z});camera.position.set(c.x,c.y,c.z);camera.lookAt(c.target.x,c.target.y,c.target.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;for(const actor of [...magi,...(animated.chocobos||[])])actor.root.rotation.y=plan.people[actor.personIndex].facing;apply();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}

  const birds=animated.chocobos||[],birdSeen=new WeakMap();
  $('#chocobo').disabled=!birds.length;$('#chocobo').addEventListener('click',()=>focusBird());
  function focusBird(){if(!birds.length)return;castView=false;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;const b=birds[0],p=b.root.position,target={x:p.x+.55,z:p.z+2.9};if(!canOccupy(plan,target.x,target.z))return;Object.assign(pose,{x:target.x,z:target.z,y:1.55});camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(p.x,1.05,p.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;b.root.rotation.y=Math.atan2(pose.x-p.x,pose.z-p.z);apply();}
  $('#mage').disabled=!magi.length;
  $('#mage').addEventListener('click',()=>focusMage());
  function focusMage(){if(!magi.length)return;castView=false;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;const m=magi[0],p=m.root.position;const target=plan.people[m.personIndex].view||{x:p.x-.48,z:p.z+2.30};if(!canOccupy(plan,target.x,target.z))return;Object.assign(pose,{x:target.x,z:target.z,y:target.y||1.25});camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(p.x,.88,p.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;m.root.rotation.y=Math.atan2(pose.x-p.x,pose.z-p.z);apply();}
  $('#moogle').disabled=!couriers.length;$('#moogle-letter').addEventListener('click',()=>{if(nearestCourier?.deliver(pose))toast('莫古利从邮包里取出一封信…');});
  const pathLengths=[0];for(let i=1;i<plan.path.length;i++)pathLengths.push(pathLengths.at(-1)+Math.hypot(plan.path[i].x-plan.path[i-1].x,plan.path[i].z-plan.path[i-1].z));
  function apply(){camera.position.set(pose.x,pose.y,pose.z);camera.rotation.set(pose.pitch,pose.yaw,0);}
  function reset(){castView=false;Object.assign(pose,{x:plan.spawn.x,y:1.68,z:plan.spawn.z,yaw:initialYaw,pitch:.13});touring=false;tourFinished=false;keys.clear();pendingKeys.clear();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';apply();}
  function setMap(value){
    if(artStudy)setStudy(false);if(mapMode===value)return;castView=false;mapMode=value;document.body.classList.toggle('map-mode',value);touring=false;$('#stroll').innerHTML=tourFinished?'回到街角 <span>↶</span>':'慢慢逛一圈 <span>↗</span>';keys.clear();pendingKeys.clear();drag=null;canvas.classList.remove('dragging');$('#map').setAttribute('aria-pressed',String(value));$('#map-panel').hidden=!value;$('#nearby').hidden=true;$('#map span').textContent=value?'回到街道':'游览地图';
    const start={...pose};let target;
    if(value){oldPose={...pose};camera.position.set(19,46,25);camera.lookAt(-1,0,-3);target={x:19,y:46,z:25,yaw:camera.rotation.y,pitch:camera.rotation.x};}else target={...oldPose};
    transition={start,target,startTime:performance.now(),duration:reduced?1:800};scene.fog.density=value?.001:.0042;apply();drawMap();
  }
  function setStudy(value){
    if(artStudy===value)return;
    if(value){castView=false;if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;studyPose={...pose};Object.assign(pose,{x:-.20,y:3.15,z:33.9,yaw:-.055,pitch:.09});}
    else if(studyPose)Object.assign(pose,studyPose);
    $('#stroll').innerHTML=tourFinished?'回到街角 <span>↶</span>':'慢慢逛一圈 <span>↗</span>';artStudy=value;document.body.classList.toggle('art-study',value);$('#study').setAttribute('aria-pressed',String(value));
    animated.people.forEach(p=>p.visible=!value);animated.airship.visible=!value;keys.clear();pendingKeys.clear();apply();
  }
  function focusCourier(distance=2.15){castView=false;
    if(!couriers.length)return;if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);}transition=null;touring=false;keys.clear();pendingKeys.clear();
    const c=couriers.reduce((a,b)=>Math.hypot(a.actor.root.position.x-pose.x,a.actor.root.position.z-pose.z)<Math.hypot(b.actor.root.position.x-pose.x,b.actor.root.position.z-pose.z)?a:b),p=c.actor.root.position;
    const target={x:p.x+.68,z:p.z+distance};if(!canOccupy(plan,target.x,target.z))return;
    pose.x=target.x;pose.z=target.z;pose.y=1.48;camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(p.x,.66,p.z);pose.yaw=camera.rotation.y;pose.pitch=camera.rotation.x;apply();$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';toast('库啵！广场边的莫古利向你招手。');
  }
  $('#moogle').addEventListener('click',()=>focusCourier());
  $('#study').addEventListener('click',()=>setStudy(!artStudy));$('#study-exit').addEventListener('click',()=>setStudy(false));
  function beginTour(targetIndex=plan.path.length-1){castView=false;
    if(artStudy)setStudy(false);if(mapMode){setMap(false);Object.assign(pose,oldPose);transition=null;}
    const route=routeTo(plan,{x:pose.x,z:pose.z},targetIndex);
    if(!route){toast('先走回石板路上，再跟着风铃声慢慢逛。');return;}
    tourPath=route;cursor=1;tourTarget=targetIndex;touring=true;tourFinished=false;keys.clear();pendingKeys.clear();$('#stroll').innerHTML='在这里停一停 <span>Ⅱ</span>';toast('跟着石板路慢慢走 · WASD 随时接管');
  }
  $('#stroll').addEventListener('click',()=>{if(touring){touring=false;$('#stroll').innerHTML='继续慢慢逛 <span>↗</span>';}else if(tourFinished){reset();toast('又回到了花香与面包之间。');}else beginTour();});
  $('#map').addEventListener('click',()=>setMap(!mapMode));
  for(const button of document.querySelectorAll('[data-stop]'))button.addEventListener('click',()=>{const stop=plan.stops.find(s=>s.id===button.dataset.stop);beginTour(nearestPathIndex(plan.path,{x:(plan.center||center)(stop.z),z:stop.z}));});
  $('#light').addEventListener('click',()=>{afternoon=!afternoon;$('#light').setAttribute('aria-pressed',String(afternoon));$('#light span').textContent=afternoon?'晴天上午':'午后时光';sun.position.set(afternoon?-32:-24,afternoon?28:42,afternoon?3:24);sun.color.set(afternoon?0xffdba5:0xffe5b6);sun.intensity=afternoon?2.4:2.7;renderer.toneMappingExposure=afternoon?1.00:.96;toast(afternoon?'阳光落在屋檐和花瓣上。':'又是一个清亮的晴天。');});
  const keyMap={KeyW:'w',ArrowUp:'w',KeyS:'s',ArrowDown:'s',KeyA:'a',ArrowLeft:'a',KeyD:'d',ArrowRight:'d',ShiftLeft:'shift',ShiftRight:'shift'};
  addEventListener('keydown',e=>{if(keyMap[e.code]){if(artStudy)setStudy(false);e.preventDefault();keys.add(keyMap[e.code]);pendingKeys.add(keyMap[e.code]);touring=false;tourFinished=false;$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}if(e.code==='Home'){if(artStudy)setStudy(false);if(mapMode)setMap(false);transition=null;reset();}if(e.code==='KeyM'&&!e.repeat)setMap(!mapMode);if(e.code==='Escape'){if(artStudy)setStudy(false);touring=false;keys.clear();pendingKeys.clear();drag=null;$('#stroll').innerHTML='慢慢逛一圈 <span>↗</span>';}});
  addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});addEventListener('blur',()=>{keys.clear();pendingKeys.clear();drag=null;canvas.classList.remove('dragging');});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();pendingKeys.clear();}});
  canvas.addEventListener('pointerdown',e=>{if(mapMode)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.classList.add('dragging');});canvas.addEventListener('pointermove',e=>{if(!drag||transition)return;pose.yaw-=(e.clientX-drag.x)*.0032;pose.pitch=THREE.MathUtils.clamp(pose.pitch-(e.clientY-drag.y)*.0032,-.85,1.2);drag.x=e.clientX;drag.y=e.clientY;});const end=()=>{drag=null;canvas.classList.remove('dragging');};for(const ev of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,end);
  for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);pendingKeys.add(button.dataset.key);touring=false;tourFinished=false;});for(const ev of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(ev,()=>keys.delete(button.dataset.key));}
  function drawMap(){
    const c=$('#minimap'),ctx=c.getContext('2d'),xScale=6,zScale=3.8,ox=115,oy=153;ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle='#e1e5c9';ctx.beginPath();ctx.arc(ox-6,oy-24*zScale,12*xScale,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#cfbd94';ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();plan.path.forEach((p,i)=>i?ctx.lineTo(ox+p.x*xScale,oy+p.z*zScale):ctx.moveTo(ox+p.x*xScale,oy+p.z*zScale));ctx.stroke();
    for(const b of plan.buildings){ctx.fillStyle={coral:'#b47767',sage:'#8ca487',blue:'#869dad',lavender:'#a294ac'}[b.roof];ctx.beginPath();const co=Math.cos(b.rotation),si=Math.sin(b.rotation);[[-b.width/2,0],[b.width/2,0],[b.width/2,-b.depth],[-b.width/2,-b.depth]].forEach(([x,z],i)=>{const px=ox+(b.x+co*x+si*z)*xScale,py=oy+(b.z-si*x+co*z)*zScale;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.fill();}
    ctx.fillStyle='#90bdc1';ctx.beginPath();ctx.arc(ox-6,oy-24*zScale,11,0,Math.PI*2);ctx.fill();
    const p=mapMode?oldPose:pose;ctx.fillStyle='#7b8656';ctx.beginPath();ctx.arc(ox+p.x*xScale,oy+p.z*zScale,4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#8c9a76';ctx.font="10px 'Noto Serif SC',serif";ctx.textAlign='center';ctx.fillText('城堡与远山',120,12);ctx.fillText('街道入口',120,292);
  }
  let audio=null;
  $('#sound').addEventListener('click',async()=>{try{if(!audio){const ac=new AudioContext(),master=ac.createGain();master.gain.value=.025;master.connect(ac.destination);const buffer=ac.createBuffer(1,ac.sampleRate*3,ac.sampleRate),data=buffer.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*.03-.015)/1.015;data[i]=last;}const noise=ac.createBufferSource();noise.buffer=buffer;noise.loop=true;const filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1050;noise.connect(filter);filter.connect(master);noise.start();const chime=()=>{if(ac.state!=='running')return;const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.value=[523.25,659.25,783.99,1046.5][Math.floor(Math.random()*4)];gain.gain.setValueAtTime(.001,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.07,ac.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+1.8);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+2);};const timer=setInterval(chime,4300);audio={ac,on:true,timer};}else{audio.on=!audio.on;if(audio.on)await audio.ac.resume();else await audio.ac.suspend();}$('#sound').setAttribute('aria-pressed',String(audio.on));$('#sound span').textContent=audio.on?'环境声 开':'环境声 关';}catch{toast('这里暂时听不到风铃声。');}});
  let lastHud=0;const clock=new THREE.Clock(),frames=[];let lastRender={calls:0,triangles:0};
  function animate(){requestAnimationFrame(animate);const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05),time=clock.elapsedTime;
    if(transition){const u=Math.min(1,(performance.now()-transition.startTime)/transition.duration),t=u*u*(3-2*u);for(const k of['x','y','z','yaw','pitch'])pose[k]=THREE.MathUtils.lerp(transition.start[k],transition.target[k],t);if(u===1)transition=null;}
    else if(!mapMode&&!artStudy){
      if(touring){let left=2.5*dt;while(left>0&&cursor<tourPath.length){const p=tourPath[cursor],dx=p.x-pose.x,dz=p.z-pose.z,d=Math.hypot(dx,dz);if(d<.001){cursor++;continue;}const s=Math.min(left,d),x=pose.x+dx/d*s,z=pose.z+dz/d*s;if(!canOccupy(plan,x,z)){touring=false;toast('在这里停一停，再自己走走。');break;}pose.x=x;pose.z=z;left-=s;if(s===d)cursor++;}
        const next=tourPath[Math.min(cursor+8,tourPath.length-1)]||plan.destination;let yaw=Math.atan2(-(next.x-pose.x),-(next.z-pose.z));let diff=THREE.MathUtils.euclideanModulo(yaw-pose.yaw+Math.PI,Math.PI*2)-Math.PI;pose.yaw+=diff*Math.min(1,dt*2);pose.pitch=THREE.MathUtils.lerp(pose.pitch,.08,dt*2);
        if(cursor>=tourPath.length){touring=false;tourFinished=tourTarget===plan.path.length-1;if(tourFinished){pose.yaw=Math.atan2(3.2,74.5);pose.pitch=.34;$('#stroll').innerHTML='回到街角 <span>↶</span>';toast('到广场了。看看城堡，也可以再逛回去。');}else{$('#stroll').innerHTML='继续慢慢逛 <span>↗</span>';if(tourTarget<15)pose.yaw=initialYaw;toast('在这里停一停，看看街边的小店。');}}
      }
      const has=k=>keys.has(k)||pendingKeys.has(k);let f=(has('w')?1:0)-(has('s')?1:0),r=(has('d')?1:0)-(has('a')?1:0);if(f||r){castView=false;const n=Math.hypot(f,r);f/=n;r/=n;const sp=(keys.has('shift')?4.7:3.0)*dt,dx=(-Math.sin(pose.yaw)*f+Math.cos(pose.yaw)*r)*sp,dz=(-Math.cos(pose.yaw)*f-Math.sin(pose.yaw)*r)*sp;if(canOccupy(plan,pose.x+dx,pose.z))pose.x+=dx;if(canOccupy(plan,pose.x,pose.z+dz))pose.z+=dz;stepClock+=dt;pose.y=1.68+(reduced?0:Math.sin(stepClock*10)*.01);}else if(!castView)pose.y=THREE.MathUtils.lerp(pose.y,1.68,.12);
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
    if(time-lastHud>.12){const p=mapMode?oldPose:pose,index=nearestPathIndex(plan.path,p),progress=pathLengths[index]/plan.length;$('#progress').style.width=`${progress*100}%`;$('#location').textContent=castView?'喷泉边的街坊':generated?(p.z>17?street.label+'入口':p.z>0?street.label+'中段':p.z>-17?'街道在转弯':p.z>-29?'喷泉广场':'望向城堡'):(p.z>17?'花香与面包':p.z>0?'树荫小花园':p.z>-17?'街道在转弯':p.z>-29?'喷泉广场':'望向城堡');
      nearestCourier=couriers.length?couriers.reduce((a,b)=>Math.hypot(a.actor.root.position.x-p.x,a.actor.root.position.z-p.z)<Math.hypot(b.actor.root.position.x-p.x,b.actor.root.position.z-p.z)?a:b):null;
      const courierNear=nearestCourier&&Math.hypot(nearestCourier.actor.root.position.x-p.x,nearestCourier.actor.root.position.z-p.z)<3.2&&!mapMode&&!artStudy;
      $('#moogle-panel').hidden=!courierNear;if(courierNear){const s=nearestCourier.snapshot();$('#moogle-status').textContent=s.label;$('#moogle-letter').disabled=s.state==='deliver'||s.waiting||Math.hypot(nearestCourier.actor.root.position.x-p.x,nearestCourier.actor.root.position.z-p.z)>1.85;$('#moogle-letter').textContent=s.delivered?'再接一封信':'接一封信';}
      const near=plan.buildings.map(b=>({b,d:Math.hypot(b.x-p.x,b.z-p.z)})).sort((a,b)=>a.d-b.d)[0];$('#nearby').hidden=mapMode||artStudy||courierNear||near.d>5.7;if(!$('#nearby').hidden){$('#nearby-name').textContent=near.b.name;$('#nearby-text').textContent=descriptions[near.b.kind];}if(mapMode)drawMap();
      canvas.dataset.state=JSON.stringify({ready:true,theme:'ff9-alexandria-crafted-corner',revision:generated?4:3,layoutId:generated?raw.provenance.caseId:'sample',generated,assemblyMetrics:generated?streetMetrics(raw,plan):null,newImageGenerationCalls:generated?0:null,artStudy,castView,castStage:plan.castStage||null,plaza:generated?plazaMetrics():null,hero:heroMetrics(),ambientOcclusion:ao.enabled,landmarks:['blade-spire','theater-airship','layered-royal-city'],fantasyCitizens:plan.people.filter(p=>p.species).map(p=>p.species),authoredLayout:!generated,moogles:couriers.map(c=>c.snapshot()),mages:magi.map(m=>m.snapshot()),chocobos:birds.map(b=>b.snapshot()),mapMode,touring,tourFinished,afternoon,pose:{...pose},location:$('#location').textContent,progress,buildings:plan.buildings.length,pathLength:plan.length,batches,render:lastRender,meanFrameMs:frames.reduce((a,b)=>a+b,0)/frames.length});lastHud=time;
    }
  }
  if(new URLSearchParams(location.search).has('study'))setStudy(true);if(query.has('cast'))focusCast();if(query.has('chocobo'))focusBird();if(query.has('mage'))focusMage();if(query.has('moogle'))focusCourier(query.get('moogle')==='patrol'?4.6:2.15);apply();drawMap();animate();$('#loading').classList.add('done');setTimeout(()=>{$('#loading').hidden=true;},550);
}catch(error){console.error(error);$('#loading').textContent='街角还没准备好：'+error.message;}
