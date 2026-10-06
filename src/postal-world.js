import {chapters} from './postal-content.js';
import {questTargetName} from './quest-guidance.js';

export const interactionRadius={moogle:1.85,mage:3.2,chocobo:3.7};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function createPostalWorld({plan,getActors,getCouriers,getView,getFailed}){
  function actorFor(species){
    const actors=getActors()[species]||[],player=getView().player;
    return species==='moogle'?actors.reduce((best,actor)=>!best||distance(actor.root.position,player)<distance(best.root.position,player)?actor:best,null):actors[0]||null;
  }
  function targetFor(species){
    const actor=actorFor(species),player=getView().player;
    const people=plan.people.map((person,index)=>({...person,index})).filter(person=>person.species===species);
    const person=actor?plan.people[actor.personIndex]:species==='moogle'?people.sort((a,b)=>distance(a,player)-distance(b,player))[0]:people[0];
    const position=actor?.root.position||person;
    const name=species==='chocobo'?(person?.label||'广场边的陆行鸟'):questTargetName(species,person);
    return {species,name,position,exists:!!position,loaded:!!actor,failed:getFailed().has(species)};
  }
  function interaction(species){
    const actor=actorFor(species),view=getView(),courier=species==='moogle'?getCouriers().find(c=>c.actor===actor):null;
    const behavior=courier?.snapshot();
    return {species,actorReady:!!actor,near:!!actor&&distance(actor.root.position,view.player)<=interactionRadius[species],streetMode:view.mode==='street',approaching:!!behavior?.approaching,busy:!!behavior&&(behavior.state==='deliver'||behavior.waiting)};
  }
  return {
    interaction,targetFor,
    currentTarget(snapshot){if(snapshot.state==='completed')return null;return targetFor(chapters[snapshot.chapter][snapshot.state==='available'?'sender':'recipient']);},
    view:()=>getView(),
    handoff(kind,species){
      const context=interaction(species);if(!context.actorReady||!context.near||!context.streetMode||context.busy)return false;
      const actor=actorFor(species);
      if(kind==='accept'&&species==='moogle')return getCouriers().find(c=>c.actor===actor).deliver(getView().player);
      if(kind==='deliver'&&species==='moogle')return getCouriers().find(c=>c.actor===actor).receive(getView().player);
      actor.play(species==='mage'?'Greet':'Chirp');return true;
    },
    replay(species){const context=interaction(species);if(!context.actorReady||!context.near||!context.streetMode)return false;actorFor(species).play(species==='chocobo'?'Chirp':'Greet');return true;}
  };
}
