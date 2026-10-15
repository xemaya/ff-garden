import {createPostalJourney} from './postal-journey.js';
import {createPostalWorld} from './postal-world.js';
import {createPostalController} from './postal-controller.js';
import {createNpcConversation} from './npc-conversation.js';
import {observationView} from './postal-observations.js';
import {buildObservationMarkers} from './observation-markers.js';
import {createPostalMemorial} from './postal-memorial.js';
import {createMoogleBehavior} from './moogle-behavior.js';
import {streetGuidance} from './street-guidance.js';
import {CITY_POSTAL} from './city-plan.js';

// Hosts 一日邮差 in the walled city. The journey, content, dialogue and notebook
// are the shared modules; this file supplies the city's actors, view and HUD.
// The fountain trio from the original staging keeps its roles: plan.people[0]
// is the courier moogle, [1] the chocobo, [2] the reading mage.
export const COURIER_ID='neighbor-0';
const COURIER=0,CHOCOBO=1,MAGE=2;

export function createCityPostal({plan,scene,animated,life,failed,storage,reduced,getPose,getMode,toast,clearInput,stopTour,openMap,returnToStreet,map}){
  const $=id=>document.getElementById(id);
  for(const site of plan.postalSites){const {x,z,rotation=0}=site.position,marker=buildObservationMarkers([{...site,position:{x:0,z:0}}]);marker.position.set(x,plan.height(x,z),z);marker.rotation.y=rotation;scene.add(marker);}
  const memorial=createPostalMemorial({},{marker:true,position:CITY_POSTAL.memorial,rotation:CITY_POSTAL.memorial.rotation});memorial.root.position.y=plan.height(CITY_POSTAL.memorial.x,CITY_POSTAL.memorial.z);scene.add(memorial.root);

  const journey=createPostalJourney(storage);
  const pick=(list,index)=>(list||[]).filter(a=>a.personIndex===index);
  const courierActor=pick(animated.moogles,COURIER)[0];
  const couriers=courierActor?[createMoogleBehavior(courierActor,life.plan,COURIER,{reduced,ownId:COURIER_ID,onDelivered(){if(journey.snapshot().chapter===0&&journey.snapshot().state==='carrying')toast('问候信已交到你手里，手记会标出收件人。');}})]:[];
  // A greeting from the mage or a chirp from the chocobo plays out before the resident schedule resumes.
  for(const [actor,id]of[[pick(animated.mages,MAGE)[0],'neighbor-'+MAGE],[pick(animated.chocobos,CHOCOBO)[0],'neighbor-'+CHOCOBO]])if(actor){const play=actor.play.bind(actor);actor.play=(name,...rest)=>{if(name==='Greet'||name==='Chirp')life.hold(id,2.6);return play(name,...rest);};}

  const view=()=>({player:getPose(),mode:getMode()});
  const world=createPostalWorld({plan,getActors:()=>({moogle:couriers.map(c=>c.actor),mage:pick(animated.mages,MAGE),chocobo:pick(animated.chocobos,CHOCOBO)}),getCouriers:()=>couriers,getFailed:()=>failed,getView:view});
  let conversation=null;
  const postal=createPostalController({document,events:window,journey,world,toast,clearInput,openMap,returnToStreet,
    getObservation:()=>observationView(plan.postalSites,getPose(),getMode(),journey.snapshot().discoveries),
    onVisibilityChange:open=>{conversation?.update();if(open){stopTour();clearInput();$('nearby').hidden=true;}}});
  conversation=createNpcConversation({document,world,journey,royal:true,isNotebookOpen:()=>postal.isOpen(),openNotebook:()=>postal.show(),clearInput:()=>{stopTour();clearInput();}});

  // Map markers: the current target, and the three plaques.
  const ns='http://www.w3.org/2000/svg',el=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));map.append(e);return e;};
  for(const site of plan.postalSites)el('rect',{x:site.position.x-.9,y:site.position.z-.9,width:1.8,height:1.8,class:'plaque-marker'});
  const targetMark=el('circle',{r:1.7,class:'target-marker',visible:'hidden'}),targetLabel=el('text',{class:'target-label','text-anchor':'middle'});

  let hudClock=0,target=null,guidance=null;const defaultHint=$('hint').textContent;
  function update(dt,{paused=false}={}){
    const pose=getPose();couriers.forEach(c=>c.update(dt,pose,{paused}));hudClock+=dt;if(hudClock<.12)return;hudClock=0;
    const nearbyPerson=conversation.update(),snapshot=journey.snapshot();memorial.setCompleted(snapshot.ending);
    const observation=observationView(plan.postalSites,pose,getMode(),snapshot.discoveries);
    $('nearby').hidden=postal.isOpen()||!!nearbyPerson||!observation;
    if(!$('nearby').hidden){$('nearby-name').textContent=observation.entry.title;$('nearby-text').textContent=observation.recorded?'你已经读过这块石牌，故事留在手记的“见闻”页。':observation.entry.prompt;
      const button=$('postal-observe');button.hidden=false;button.disabled=!observation.recorded&&!observation.canObserve;button.textContent=observation.recorded?'重读这段见闻':observation.canObserve?'停下来看看':'转身看看石牌';}
    target=postal.update();
    guidance=streetGuidance({snapshot,target,interaction:target?world.interaction(target.species):{},player:pose,mode:getMode(),notebookOpen:postal.isOpen(),width:innerWidth,height:innerHeight});
    const hint=guidance?.text||defaultHint;if($('hint').textContent!==hint)$('hint').textContent=hint;
    if(target?.position){targetMark.setAttribute('cx',target.position.x);targetMark.setAttribute('cy',target.position.z);targetMark.setAttribute('visibility','visible');targetLabel.setAttribute('x',target.position.x);targetLabel.setAttribute('y',target.position.z-2.4);targetLabel.textContent=snapshot.state==='available'?'信':'收';}
    else{targetMark.setAttribute('visibility','hidden');targetLabel.textContent='';}
  }
  return{journey,postal,world,update,isOpen:()=>postal.isOpen(),handleEscape:()=>postal.handleEscape(),
    snapshot:()=>({journey:journey.snapshot(),target:target&&{name:target.name,species:target.species,loaded:target.loaded,x:target.position?.x,z:target.position?.z},guidance:guidance?.text||null,notebookOpen:postal.isOpen(),courier:couriers[0]?.snapshot()||null,memorial:memorial.snapshot()})};
}
