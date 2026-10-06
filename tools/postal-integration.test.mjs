import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPostalJourney,JOURNEY_KEY} from '../src/postal-journey.js';
import {createPostalWorld} from '../src/postal-world.js';
import {createPostalController} from '../src/postal-controller.js';
import {createMoogleBehavior} from '../src/moogle-behavior.js';
import {postalView} from '../src/postal-view.js';
import {createNpcConversation} from '../src/npc-conversation.js';
import {chapters,discoveries} from '../src/postal-content.js';

function setup(){
 const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const player={x:0,z:0},view={player,mode:'street'},clips=[],counts={deliver:0,receive:0};
 const people=['moogle','mage','chocobo'].map(species=>({species,x:0,z:0}));
 const actors=Object.fromEntries(people.map((p,personIndex)=>[p.species,[{personIndex,root:{position:{x:0,z:0}},play:clip=>clips.push(clip)}]]));
 const couriers=[{actor:actors.moogle[0],snapshot:()=>({state:'idle',waiting:false}),deliver(){counts.deliver++;return true;},receive(){counts.receive++;return true;}}];
 const world=createPostalWorld({plan:{people},getActors:()=>actors,getCouriers:()=>couriers,getView:()=>view,getFailed:()=>new Set()});
 return {data,storage,world,view,actors,counts,clips,journey:createPostalJourney(storage)};
}

test('scene bridge and view agree with each chapter without moving the player',()=>{
 const s=setup(),before={...s.view.player};
 for(let chapter=0;chapter<3;chapter++){
  let snapshot=s.journey.snapshot(),target=s.world.currentTarget(snapshot),context=s.world.interaction(target.species);
  assert(postalView(snapshot,target,context,s.view.mode).canAct);assert(s.world.handoff('accept',target.species));assert(s.journey.accept(context));
  snapshot=s.journey.snapshot();target=s.world.currentTarget(snapshot);context=s.world.interaction(target.species);assert(s.world.handoff('deliver',target.species));assert(s.journey.deliver(context));
  if(chapter===1){const reply=postalView(s.journey.snapshot(),s.world.currentTarget(s.journey.snapshot()),s.world.interaction('chocobo'),'street');assert(reply.showReplies);assert(s.journey.answer('short-short-long',s.world.interaction('chocobo')).ok);}
  assert.equal(s.world.currentTarget(s.journey.snapshot()),null);if(chapter<2)assert(s.journey.continue());
 }
 assert.deepEqual(s.view.player,before);assert.deepEqual(s.counts,{deliver:1,receive:1});assert(s.journey.snapshot().ending);
});
test('planned fallback can be located but cannot act; camera mode and distance block handoffs',()=>{
 const s=setup();s.actors.moogle.length=0;const target=s.world.currentTarget(s.journey.snapshot()),context=s.world.interaction('moogle');assert(target.exists);assert(!target.loaded);const vm=postalView(s.journey.snapshot(),target,context,'street');assert(vm.canLocate);assert(!vm.canAct);assert(!s.world.handoff('accept','moogle'));
 s.view.mode='map';assert(!s.world.handoff('deliver','mage'));s.view.mode='street';s.view.player.x=100;assert(!s.world.handoff('deliver','mage'));
});
test('returning a letter uses a greeting rather than handing another letter out',()=>{
 let finished=null,delivered=0;const clips=[],actor={root:{position:{x:0,z:0},rotation:{y:0}},play:clip=>clips.push(clip),update(){},consumeFinished(){const value=finished;finished=null;return value;},snapshot:()=>({})};
 const courier=createMoogleBehavior(actor,{colliders:[]},0,{onDelivered:()=>delivered++});assert(!courier.receive({x:3,z:0}));assert(courier.receive({x:0,z:1}));assert.equal(courier.snapshot().state,'wave');finished='Wave';courier.update(.1,{x:0,z:1});assert.equal(delivered,0);assert.equal(courier.snapshot().delivered,0);assert.equal(clips[0],'Wave');
});

// This lightweight event fixture tests application wiring, not browser layout,
// actual pointer input or rendering. Independent Chrome QA covers those later.
class Element{
 constructor(document,id=''){this.document=document;this.id=id;this.hidden=false;this.disabled=false;this.textContent='';this.children=[];this.dataset={};this.events=new Map();}
 addEventListener(type,fn){if(!this.events.has(type))this.events.set(type,[]);this.events.get(type).push(fn);}
 emit(type,event={}){for(const fn of this.events.get(type)||[])fn({detail:1,...event});}
 click(detail=1){if(!this.hidden&&!this.disabled)this.emit('click',{detail});}
 append(...children){this.children.push(...children);}focus(){this.document.activeElement=this;}setAttribute(key,value){this[key]=value;}scrollIntoView(){}
}
function dom(){const document={activeElement:null,nodes:new Map(),getElementById(id){assert(this.nodes.has(id),'missing '+id);return this.nodes.get(id);},createElement(){return new Element(this);}};const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');for(const [,id] of html.matchAll(/id="([^"]+)"/g))document.nodes.set(id,new Element(document,id));return document;}
function mount(s){const document=dom(),events=new Element(document),toast=[];const controller=createPostalController({document,events,journey:s.journey,world:s.world,toast:text=>toast.push(text),openMap:()=>{s.view.mode='map';},returnToStreet:()=>{s.view.mode='street';},clearInput(){},getObservation:()=>s.observation||null,onVisibilityChange:open=>s.onVisibilityChange?.(open),onEnding:()=>{s.endings=(s.endings||0)+1;}});return {document,events,controller,toast,$:id=>document.getElementById(id)};}

test('complete UI-event slice: separate handoffs, wrong/correct reply, final keepsake',()=>{
 const s=setup(),ui=mount(s);ui.$('letter-quest-open').click();assert(!ui.$('letter-quest-panel').hidden);
 for(let chapter=0;chapter<3;chapter++){
  ui.$('letter-quest-action').click();assert.equal(s.journey.snapshot().state,'carrying');ui.$('letter-quest-action').click(2);assert.equal(s.journey.snapshot().state,'carrying');
  ui.$('letter-quest-action').click();
  if(chapter===1){assert.equal(s.journey.snapshot().state,'reply');const options=ui.$('postal-replies').children;options.find(b=>b.dataset.reply==='three-short').click();assert.equal(s.journey.snapshot().state,'reply');assert.equal(ui.$('postal-feedback').textContent,chapters[1].wrongAnswer);options.find(b=>b.dataset.reply==='short-short-long').click();assert.equal(s.journey.snapshot().state,'completed');}
  if(chapter<2)ui.$('postal-continue').click();
 }
 assert(s.journey.snapshot().ending);assert(!ui.$('postal-ending').hidden);assert(ui.$('letter-quest-action').hidden);assert(ui.$('letter-quest-guide').hidden);assert(ui.$('postal-remembrance').textContent.includes('两短一长'));
});
test('controller locator, refresh and reset cancellation do not advance or lose a journey',()=>{
 const s=setup(),ui=mount(s),before={...s.view.player};ui.$('letter-quest-open').click();ui.$('letter-quest-guide').click();assert.equal(s.view.mode,'map');assert.equal(s.journey.snapshot().state,'available');assert.deepEqual(s.view.player,before);ui.$('letter-quest-open').click();assert.equal(s.view.mode,'street');
 ui.$('letter-quest-action').click();assert.equal(s.journey.snapshot().state,'carrying');ui.$('letter-quest-reset').click();assert.equal(ui.document.activeElement.id,'letter-quest-reset-cancel');assert(ui.controller.handleEscape());assert.equal(s.journey.snapshot().state,'carrying');assert(ui.controller.handleEscape());assert(!ui.controller.isOpen());assert.equal(ui.document.activeElement.id,'letter-quest-open');assert(!ui.controller.handleEscape());ui.controller.show();
 const refreshed=createPostalJourney(s.storage);assert.equal(refreshed.snapshot().state,'carrying');assert.equal(refreshed.snapshot().resetPending,false);
 ui.$('letter-quest-reset').click();ui.$('letter-quest-reset-confirm').click();assert.equal(createPostalJourney(s.storage).snapshot().state,'available');assert(s.data.has(JOURNEY_KEY));
});

test('observation event records a nearby story once and switches to a readable notebook page',()=>{
 const s=setup(),ui=mount(s),entry=discoveries.find(e=>e.district==='royal');s.observation={entry,near:true,canObserve:false,recorded:false};ui.$('postal-observe').click();assert.equal(s.journey.snapshot().discoveries.length,0);
 s.observation.canObserve=true;ui.$('postal-observe').click();assert.deepEqual(s.journey.snapshot().discoveries,[entry.id]);assert(!ui.$('postal-observations-page').hidden);assert(ui.$('postal-letter-page').hidden);assert.equal(ui.document.activeElement.id,'postal-observation-title');assert.equal(s.journey.snapshot().state,'available');
 s.observation.recorded=true;s.observation.canObserve=false;const rewards=ui.toast.length;ui.$('postal-observe').click();assert.equal(ui.toast.length,rewards);assert.equal(s.journey.snapshot().discoveries.length,1);
 ui.$('postal-tab-letters').click();assert(!ui.$('postal-letter-page').hidden);assert.equal(ui.$('postal-tab-letters')['aria-selected'],'true');
});
test('recovery UI defaults to cancel, preserves progress on Escape, and exposes undo after reset',()=>{
 const s=setup();s.storage.setItem('ff-garden.letter-quest.v1',JSON.stringify({version:1,state:'completed'}));s.journey=createPostalJourney(s.storage);s.journey.continue();s.journey.accept(s.world.interaction('mage'));const ui=mount(s);
 ui.$('postal-recover-legacy').click();assert.equal(ui.document.activeElement.id,'postal-recovery-cancel');assert(!ui.$('postal-recovery-confirmation').hidden);assert(ui.controller.handleEscape());assert.equal(s.journey.snapshot().chapter,1);assert.equal(ui.document.activeElement.id,'postal-recover-legacy');
 ui.$('letter-quest-reset').click();ui.$('letter-quest-reset-confirm').click();assert.equal(s.journey.snapshot().chapter,0);assert(!ui.$('postal-recover-journey').hidden);ui.$('postal-recover-journey').click();assert(ui.$('postal-recovery-title').textContent.includes('携信途中'));ui.$('postal-recovery-confirm').click();assert.equal(s.journey.snapshot().chapter,1);assert.equal(s.journey.snapshot().state,'carrying');
 ui.$('postal-recover-legacy').click();s.storage.setItem=()=>{throw Error('quota');};ui.$('postal-recovery-confirm').click();assert.equal(s.journey.snapshot().chapter,1);assert(!ui.$('postal-recovery-error').hidden);assert(ui.$('postal-recovery-error').textContent.includes('没有替换进度'));
});

test('backup storage events refresh recovery choices without discarding an unsaved carrying session',()=>{
 const s=setup(),ui=mount(s);s.storage.setItem=()=>{throw Error('quota');};ui.$('letter-quest-open').click();ui.$('letter-quest-action').click();assert.equal(s.journey.snapshot().state,'carrying');assert.equal(s.journey.snapshot().saved,false);ui.events.emit('storage',{key:'ff-garden.postal-journey.previous.v1'});assert.equal(s.journey.snapshot().state,'carrying');assert.equal(s.journey.snapshot().saved,false);
});

test('the ending callback only follows an active final handoff, not renders, refresh or restore',()=>{
 const s=setup(),ui=mount(s);ui.$('letter-quest-open').click();for(let chapter=0;chapter<3;chapter++){ui.$('letter-quest-action').click();ui.$('letter-quest-action').click();if(chapter===1)ui.$('postal-replies').children.find(button=>button.dataset.reply==='short-short-long').click();if(chapter<2)ui.$('postal-continue').click();}
 assert.equal(s.endings,1);for(let i=0;i<12;i++)ui.controller.update();ui.$('letter-quest-action').click(2);assert.equal(s.endings,1);const loaded={...s,journey:createPostalJourney(s.storage),endings:0};mount(loaded);assert.equal(loaded.endings,0);ui.$('letter-quest-reset').click();ui.$('letter-quest-reset-confirm').click();ui.$('postal-recover-journey').click();ui.$('postal-recovery-confirm').click();assert(s.journey.snapshot().ending);assert.equal(s.endings,1);
});
test('nearby conversation changes with the letter and optional observation without granting progress',()=>{
 const s=setup(),ui=mount(s),conversation=createNpcConversation({document:ui.document,world:s.world,journey:s.journey,clearInput(){},openNotebook:ui.controller.show});conversation.update();const before=ui.$('npc-response').textContent;
 ui.$('npc-talk').click();assert.equal(s.journey.snapshot().state,'available');assert.equal(s.data.get(JOURNEY_KEY),undefined);assert.equal(s.counts.receive,1);s.journey.accept(s.world.interaction('moogle'));conversation.update();assert.notEqual(ui.$('npc-response').textContent,before);
 s.journey.discover({id:'royal-gate-message',near:true,streetMode:true});conversation.update();ui.$('npc-talk').click();assert.match(ui.$('npc-response').textContent,/守门人/);assert.equal(s.journey.snapshot().state,'carrying');s.view.mode='map';conversation.update();assert(ui.$('moogle-panel').hidden);
});

test('notebook immediately hides nearby NPC controls and Escape restores them with safe focus',()=>{
 const s=setup(),ui=mount(s),conversation=createNpcConversation({document:ui.document,world:s.world,journey:s.journey,isNotebookOpen:ui.controller.isOpen,clearInput(){},openNotebook:ui.controller.show});
 s.onVisibilityChange=()=>conversation.update();conversation.update();assert(!ui.$('moogle-panel').hidden);
 ui.$('moogle-letter').click();assert(ui.controller.isOpen());assert(ui.$('moogle-panel').hidden);assert.equal(ui.document.activeElement.id,'postal-tab-letters');
 const before=s.counts.receive;ui.$('npc-talk').emit('click');assert.equal(s.counts.receive,before);assert.equal(s.journey.snapshot().state,'available');
 ui.$('letter-quest-reset').click();assert(ui.controller.handleEscape());assert(ui.controller.isOpen());assert(ui.$('moogle-panel').hidden);assert.equal(ui.document.activeElement.id,'letter-quest-reset');
 assert(ui.controller.handleEscape());assert(!ui.controller.isOpen());assert(!ui.$('moogle-panel').hidden);assert.equal(ui.document.activeElement.id,'letter-quest-open');
 ui.$('letter-quest-open').click();assert(ui.$('moogle-panel').hidden);ui.$('letter-quest-close').click();assert(!ui.$('moogle-panel').hidden);assert.equal(ui.document.activeElement.id,'letter-quest-open');
});

test('an observation card cannot act while the notebook already owns the interaction',()=>{
 const s=setup();s.observation={entry:discoveries[0],recorded:false,near:true,canObserve:true};const ui=mount(s);ui.controller.show();
 ui.$('postal-observe').emit('click');assert.deepEqual(s.journey.snapshot().discoveries,[]);ui.$('letter-quest-close').click();ui.$('postal-observe').click();assert.deepEqual(s.journey.snapshot().discoveries,[discoveries[0].id]);
});
