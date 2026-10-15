import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {initMaterials,skyTexture,plain} from './materials.js';
import {loadHeroMaterials} from './hero.js';
import {initTheaterMaterials,buildTheaterCorner} from './theater.js';
import {loadMoogleAsset,createMoogle} from './moogle.js';
import {initPlazaMaterials,buildPlazaPaving} from './plaza.js';
import {initSceneryMaterials,buildGardenTree,buildRoyalBackdrop} from './scenery.js';
import {batchStatic} from './batch.js';
const canvas=document.querySelector('#frame');
try{
 initMaterials();const hero=await loadHeroMaterials();await initTheaterMaterials(hero);initPlazaMaterials(hero);initSceneryMaterials(hero);await loadMoogleAsset();
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(864,480,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),sky=skyTexture();sky.mapping=THREE.EquirectangularReflectionMapping;scene.background=sky;scene.fog=new THREE.FogExp2(0xd4e8df,.0050);const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(sky);scene.environment=env.texture;scene.environmentIntensity=.24;pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd3efff,0xb3ab80,.65));const sun=new THREE.DirectionalLight(0xffe5b6,2.8);sun.position.set(-9,14,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-14,right:14,top:18,bottom:-14,near:.1,far:80});sun.shadow.normalBias=.03;sun.shadow.bias=-.00015;scene.add(sun);const fill=new THREE.DirectionalLight(0x879bbc,.35);fill.position.set(8,6,-7);scene.add(fill);
 const set=new THREE.Group();set.add(buildTheaterCorner({booth:{x:-1.15,z:-1.20,rotation:.12},poster:{x:1.22,z:-1.28,rotation:-.14}}));const paving=buildPlazaPaving();paving.position.set(0,-.035,0);set.add(paving);const floor=new THREE.Mesh(new THREE.PlaneGeometry(170,170),plain(0x87916e));floor.rotation.x=-Math.PI/2;floor.position.y=-.07;set.add(floor);set.add(buildRoyalBackdrop());set.add(buildGardenTree({x:-4.7,z:-3.7,scale:.8}));batchStatic(set);scene.add(set);
 const actor=createMoogle({x:1.15,z:1.22,facing:.26});actor.position.y=.01;const ctl=actor.userData.moogle;ctl.seek(.08);scene.add(actor);
 const camera=new THREE.PerspectiveCamera(39,864/480,.04,250);camera.position.set(3.30,1.72,5.5);camera.lookAt(.06,1.46,-.12);
 const composer=new EffectComposer(renderer);composer.setSize(864,480);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,864,480,16);ao.kernelRadius=.24;ao.minDistance=.00012;ao.maxDistance=.015;composer.addPass(ao);composer.addPass(new OutputPass());
 let frames=0;function render(){composer.render();frames++;if(frames>6){canvas.dataset.state=JSON.stringify({ready:true,size:[864,480],model:'/assets/characters/moogle/moogle-courier-v3.glb',pose:'Idle@0.08',camera:{position:camera.position.toArray(),target:[.06,1.46,-.12]},theater:'tantalus-theater-v1',animated:false});document.querySelector('#status').hidden=true;}requestAnimationFrame(render);}render();
}catch(e){document.querySelector('#status').textContent=e.message;console.error(e);}
