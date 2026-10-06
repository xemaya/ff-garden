import './startup-feedback.css';
import {waitForStartup} from './startup-loading.js';
import {showStartupFailure} from './startup-feedback.js';
import './moogle-studio.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {loadMageAsset,createMage} from './mage.js';
import {initMaterials} from './materials.js';
import {buildFantasyCitizen} from './fantasy.js';
const $=s=>document.querySelector(s),canvas=$('#portrait');
try{
 await waitForStartup(loadMageAsset,{document,events:window,root:$('#loading')});initMaterials();
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;renderer.info.autoReset=false;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe7e0d3);const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.025);scene.environment=env.texture;scene.environmentIntensity=.5;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe9f0f3,0xb8a480,1.3));const sun=new THREE.DirectionalLight(0xffe5c4,3.0);sun.position.set(-2.4,4.5,3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:12});sun.shadow.normalBias=.008;sun.shadow.bias=-.00008;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xb8c8db,.6);fill.position.set(2,2,-1);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:0xe2d8c3,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.004;floor.receiveShadow=true;scene.add(floor);
 const avatar=createMage(),old=buildFantasyCitizen({species:'mage',legacy:true,x:0,z:0,facing:0},0,{people:[]});old.visible=false;scene.add(avatar,old);const actor=avatar.userData.mage;
 const camera=new THREE.PerspectiveCamera(40,1,.03,30);camera.position.set(1.35,1.10,3.0);const controls=new OrbitControls(camera,canvas);controls.target.set(0,.79,0);controls.minDistance=1.75;controls.maxDistance=6;controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.53;
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);ao.kernelRadius=.15;ao.minDistance=.00008;ao.maxDistance=.04;composer.addPass(ao);composer.addPass(new OutputPass());
 function fit(){const mobile=innerWidth<=760;camera.position.set(mobile?1.65:1.35,old.visible?1.35:1.10,old.visible?(mobile?4.5:3.7):(mobile?3.8:3.0));controls.target.set(0,old.visible?1.0:.79,0);}
 let wasMobile=null;
 function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();camera.setViewOffset(w,h,innerWidth>760?112:0,innerWidth>760?0:65,w,h);const mobile=w<=760;if(wasMobile!==mobile){fit();wasMobile=mobile;}}addEventListener('resize',resize);resize();
 const notes={Idle:'帽影下的黄眼，轻轻呼吸与转头。',Walk:'小步走路，衣摆和帽尖随脚步轻摆。',Greet:'点点头，向路过的人举手问好。',Magic:'伸出双手，点亮一团温暖的小魔法。'};let legacy=false,demo=false,demoClock=0,lastHud=0;
 function select(clip){actor.play(clip);$('#pose-frame').value='42';$('#freeze').setAttribute('aria-pressed','false');document.querySelectorAll('[data-clip]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.clip===clip)));$('#action-note').textContent=notes[clip];}
 document.querySelectorAll('[data-clip]').forEach(b=>b.addEventListener('click',()=>{demo=false;$('#demo').setAttribute('aria-pressed','false');select(b.dataset.clip);}));
 $('#freeze').addEventListener('click',()=>{demo=false;$('#demo').setAttribute('aria-pressed','false');actor.freeze(!actor.snapshot().frozen);if(actor.snapshot().frozen)$('#pose-frame').value='42';$('#freeze').setAttribute('aria-pressed',String(actor.snapshot().frozen));});
 $('#pose-frame').addEventListener('input',()=>{demo=false;$('#demo').setAttribute('aria-pressed','false');actor.seek(Number($('#pose-frame').value)/100);$('#freeze').setAttribute('aria-pressed','true');});
 $('#demo').addEventListener('click',()=>{demo=!demo;demoClock=0;$('#demo').setAttribute('aria-pressed',String(demo));if(demo)select('Idle');});
 $('#legacy').addEventListener('click',()=>{legacy=!legacy;avatar.visible=!legacy;old.visible=legacy;demo=false;$('#demo').setAttribute('aria-pressed','false');$('#legacy').setAttribute('aria-pressed',String(legacy));$('#mode').textContent=legacy?'原来的几何原型':'精修魔导士';document.querySelectorAll('[data-clip],#demo,#freeze,#pose-frame').forEach(b=>b.disabled=legacy);fit();if(!legacy)select('Idle');});
 select('Idle');const clock=new THREE.Clock();
 function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05),time=clock.elapsedTime;actor.update(dt);controls.update();
  if(demo){demoClock+=dt;const cycle=demoClock%12,clip=cycle<2.5?'Idle':cycle<5?'Walk':cycle<8?'Greet':'Magic';if(actor.snapshot().clip!==clip)select(clip);}
  old.rotation.z=Math.sin(time*.9)*.012;renderer.info.reset();composer.render();if(time-lastHud>.1){canvas.dataset.state=JSON.stringify({ready:true,legacy,demo,actor:actor.snapshot(),render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}});lastHud=time;}}
 animate();$('#loading').hidden=true;
}catch(e){console.error(e);showStartupFailure({document,root:$('#loading'),error:e,label:'角色'});}
