import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {initMaterials,skyTexture} from './materials.js';
import {loadHeroMaterials,buildHeroHouse,buildHeroStreet} from './hero.js';
import {compileTown} from './layout.js';
import {buildGround,buildProp,buildLandscape} from './assets.js';
import {buildStreetGate,buildFantasyCitizen} from './fantasy.js';
import {loadMoogleAsset} from './moogle.js';
import {loadMageAsset} from './mage.js';
import {loadChocoboAsset} from './chocobo.js';
import {initPlazaMaterials,buildRoyalFountain,buildGardenBench} from './plaza.js';
import {initSceneryMaterials,buildGardenTree,buildRoyalBackdrop} from './scenery.js';
import {initTheaterMaterials,buildTheaterCorner,buildRefinedTheaterShip} from './theater.js';
import {batchStatic} from './batch.js';
const canvas=document.querySelector('#frame'),select=document.querySelector('#shot');
try{
 const raw=await (await fetch('/data/v4/workshops.json')).json(),plan=compileTown(raw),c=plan.center;
 const shots=[
 {time:0,label:'高空迎向飞空剧场',position:[-7,29,76],target:[2,24,43]},
 {time:5,label:'飞空剧场接近',position:[-6,27,69],target:[2,23,43]},
 {time:10,label:'掠过飞空剧场之前',position:[-4,24,62],target:[2,21,42]},
 {time:15,label:'向下看见长街入口',position:[-1,14,46],target:[c(24),3.4,23]},
 {time:20,label:'下降到街口',position:[c(32),6.2,34],target:[c(23),3.0,23]},
 {time:30,label:'浏览前半段店铺',position:[c(17),3.2,18],target:[c(7),2.7,6]},
 {time:35,label:'街道中段低位机位',position:[.888,3.1,10.5],target:[.89,2.65,-1.5]},
 {time:40,label:'浏览后半段店铺',position:[c(2),3.0,3],target:[c(-8),2.6,-9]},
 {time:45,label:'通过石拱门前',position:[1.56,3.15,-7.5],target:[-.12,3.15,-20.5]},
 {time:50,label:'抵达喷泉广场',position:[2.1,3.3,-18],target:[-1,3.7,-32]},
 {time:55,label:'广场抬头望向王城',position:[2.15,5.35,-25.5],target:[-1,17.85,-75.5]},
 {time:60,label:'王城与剑塔收尾',position:[2.2,7.4,-33],target:[-1,32,-119]}
 ];
 for(const s of shots){const o=document.createElement('option');o.value=String(s.time);o.textContent=s.time+'秒 · '+s.label;select.append(o);}
 initMaterials();const hero=await loadHeroMaterials();initPlazaMaterials(hero);initSceneryMaterials(hero);await initTheaterMaterials(hero);await Promise.all([loadMoogleAsset(),loadMageAsset(),loadChocoboAsset()]);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});renderer.setSize(864,480,false);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),sky=skyTexture();sky.mapping=THREE.EquirectangularReflectionMapping;scene.background=sky;scene.fog=new THREE.FogExp2(0xd4e8df,.0042);const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(sky);scene.environment=env.texture;scene.environmentIntensity=.24;pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xd3efff,0xb3ab80,.65));const sun=new THREE.DirectionalLight(0xffe5b6,2.8);sun.position.set(-24,42,24);sun.target.position.set(0,0,0);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-45,right:45,top:60,bottom:-60,near:1,far:165});sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun,sun.target);const fill=new THREE.DirectionalLight(0x879bbc,.34);fill.position.set(20,16,-35);scene.add(fill);
 const landGeo=new THREE.PlaneGeometry(600,420,100,70);landGeo.rotateX(-Math.PI/2);landGeo.translate(0,-.10,-60);const lp=landGeo.attributes.position,colors=[],landColor=new THREE.Color();for(let i=0;i<lp.count;i++){const x=lp.getX(i),z=lp.getZ(i),fade=THREE.MathUtils.smoothstep(Math.abs(x),40,75);lp.setY(i,-.10+fade*(2.5+2.1*Math.sin(x*.045+z*.025)+1.0*Math.cos(z*.065)));landColor.setHSL(.23,.21,.44+.025*Math.sin(x*.02+z*.015)).convertSRGBToLinear();colors.push(...landColor.toArray());}landGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));landGeo.computeVertexNormals();const land=new THREE.Mesh(landGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));land.receiveShadow=true;scene.add(land);
 const animated={people:[],flags:[]},town=new THREE.Group();town.add(buildGround(plan,animated),buildHeroStreet(plan));plan.buildings.forEach(b=>town.add(buildHeroHouse(b)));plan.props.forEach(p=>town.add(buildProp(p)));plan.trees.forEach(t=>town.add(buildGardenTree(t)));plan.benches.forEach(b=>town.add(buildGardenBench(b)));plan.people.forEach((p,i)=>town.add(buildFantasyCitizen(p,i,animated)));town.add(buildRoyalFountain(animated),buildRoyalBackdrop(),buildStreetGate(),buildLandscape(true),buildTheaterCorner(plan.theaterStage));
 const shipPlace={x:2,y:22,z:43,rotation:-1.30,scale:1.25};town.add(buildRefinedTheaterShip(animated,shipPlace));batchStatic(town);scene.add(town);for(const actor of [...(animated.moogles||[]),...(animated.mages||[]),...(animated.chocobos||[])])actor.seek(.08);
 const camera=new THREE.PerspectiveCamera(48,864/480,.08,330);const composer=new EffectComposer(renderer);composer.setSize(864,480);composer.addPass(new RenderPass(scene,camera));const ao=new SSAOPass(scene,camera,864,480,16);ao.kernelRadius=.35;ao.minDistance=.00012;ao.maxDistance=.015;composer.addPass(ao);composer.addPass(new OutputPass());
 let current=shots[0],frames=0;
 function apply(){current=shots.find(s=>s.time===Number(select.value));camera.position.set(...current.position);camera.lookAt(...current.target);frames=0;document.querySelector('#description').textContent='　'+current.label;}
 select.addEventListener('change',apply);apply();function render(){composer.render();if(++frames>6){canvas.dataset.shot=String(current.time);canvas.dataset.state=JSON.stringify({ready:true,time:current.time,label:current.label,camera:current,shipPlace,scene:'workshops-v4',size:[864,480],staticPose:true});document.querySelector('#status').hidden=true;}requestAnimationFrame(render);}render();
}catch(e){document.querySelector('#status').textContent=e.message;console.error(e);}
