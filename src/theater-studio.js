import './startup-feedback.css';
import {waitForStartup} from './startup-loading.js';
import {showStartupFailure} from './startup-feedback.js';
import './theater-studio.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {initMaterials,skyTexture,plain} from './materials.js';
import {loadHeroMaterials,useBasicHeroMaterials} from './hero.js';
import {batchStatic} from './batch.js';
import {initTheaterMaterials,loadTheaterPapers,failedTheaterPapers,buildTheaterCorner,buildRefinedTheaterShip,theaterMetrics} from './theater.js';
const $=s=>document.querySelector(s),canvas=$('#portrait');
try{
 initMaterials();const load=()=>loadHeroMaterials();load.cancel=useBasicHeroMaterials;const hero=await waitForStartup(load,{document,events:window,root:$('#loading')});initTheaterMaterials(hero);void loadTheaterPapers();
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe8e1d1);scene.fog=new THREE.FogExp2(0xe8e1d1,.012);const sky=skyTexture(),pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(sky);scene.environment=env.texture;scene.environmentIntensity=.25;pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe6eeea,0xa89a77,.95));const sun=new THREE.DirectionalLight(0xffe5b9,3.0);sun.position.set(-12,18,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:18,bottom:-16,near:1,far:70});sun.shadow.normalBias=.025;scene.add(sun);const fill=new THREE.DirectionalLight(0x98adb6,.35);fill.position.set(12,4,-10);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),plain(0xd4c8ae,1));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;scene.add(floor);
 const corner=buildTheaterCorner({booth:{x:0,z:0,rotation:0},poster:{x:-1.78,z:.10,rotation:.12}});batchStatic(corner);scene.add(corner);
 const animated={};const ship=buildRefinedTheaterShip(animated,{x:0,y:2.35,z:0,rotation:0,scale:1});ship.visible=false;scene.add(ship);
 const camera=new THREE.PerspectiveCamera(40,1,.04,200);const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.52;controls.minDistance=2.8;controls.maxDistance=48;
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.23;ao.minDistance=.0001;ao.maxDistance=.04;composer.addPass(ao);composer.addPass(new OutputPass());
 let mode='corner',lastHud=0;
 function reset(){const mobile=innerWidth<=760;camera.position.set(...(mode==='ship'?(mobile?[22,11,30]:[17,8.5,20]):(mobile?[3.0,3.1,7.8]:[4.2,3.15,6.5])));controls.target.set(mode==='ship'?0:-.6,mode==='ship'?4.6:1.50,0);controls.update();}
 function resize(){renderer.setSize(innerWidth,innerHeight,false);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();camera.setViewOffset(innerWidth,innerHeight,innerWidth>760?-100:0,innerWidth>760?0:55,innerWidth,innerHeight);reset();}addEventListener('resize',resize);resize();
 function select(value){mode=value;corner.visible=mode==='corner';ship.visible=mode==='ship';floor.position.y=mode==='ship'?-1.3:-.035;scene.fog.density=mode==='ship'?.006:.012;$('.chapter').textContent=mode==='ship'?'02 / THE AIRBORNE STAGE':'01 / THE BOX OFFICE';$('#asset-note').textContent=mode==='ship'?'绕到侧面和船底，看看船肋、幕布、包厢与四组旋翼。':'围绕柜台转一转：戏票、铜铃与节目海报都在这里。';for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));reset();}
 for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>select(b.dataset.mode));$('#view-reset').addEventListener('click',reset);
 function paper(kind){$('#paper-image').src='/assets/theater/'+kind+'.svg';$('#paper-image').alt=kind==='ticket'?'剧团戏票，包含单人入场信息与副券':'空中剧场节目海报';$('#paper-caption').textContent=kind==='ticket'?'戏票 · 王城广场 · 单人入场':'今夜演目 · 我想成为你的金丝雀';$('#paper-dialog').showModal();}
 $('#ticket-open').addEventListener('click',()=>paper('ticket'));$('#poster-open').addEventListener('click',()=>paper('poster'));$('#paper-close').addEventListener('click',()=>$('#paper-dialog').close());
 $('#paper-retry').addEventListener('click',async()=>{const button=$('#paper-retry');button.disabled=true;try{await loadTheaterPapers();}finally{button.disabled=false;}});
 const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const time=clock.getElapsedTime();controls.update();if($('#motion').checked&&!matchMedia('(prefers-reduced-motion: reduce)').matches){ship.position.y=2.35+Math.sin(time*.7)*.10;for(const r of animated.rotors)r.rotation.y=time*3.5;}renderer.info.reset();composer.render();if(time-lastHud>.15){$('#paper-retry').hidden=!failedTheaterPapers().length;canvas.dataset.state=JSON.stringify({ready:true,mode,theater:theaterMetrics(),motion:$('#motion').checked,ship:{x:ship.position.x,y:ship.position.y,z:ship.position.z},render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}});lastHud=time;}}animate();$('#loading').hidden=true;
 if(new URLSearchParams(location.search).has('ship'))select('ship');
}catch(error){console.error(error);showStartupFailure({document,root:$('#loading'),error,label:'剧场'});}
