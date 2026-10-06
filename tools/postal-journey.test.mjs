import test from 'node:test';import assert from 'node:assert/strict';
import {createPostalJourney,decodeJourney,JOURNEY_KEY,LEGACY_BACKUP_KEY,UNREADABLE_BACKUP_KEY} from '../src/postal-journey.js';
import {QUEST_KEY} from '../src/letter-quest.js';
import {chapters,discoveries} from '../src/postal-content.js';
function memory(){const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);},removeItem:key=>data.delete(key)};}
const at=species=>({species,actorReady:true,near:true,streetMode:true,busy:false});
function finishChapter(journey,index){assert(journey.accept(at(chapters[index].sender)));assert(journey.deliver(at(chapters[index].recipient)));if(chapters[index].correctAnswer)assert(journey.answer(chapters[index].correctAnswer,at(chapters[index].recipient)).ok);}

test('three linked commissions require manual handoffs and end once without collecting',()=>{
 const storage=memory(),j=createPostalJourney(storage);
 for(let chapter=0;chapter<chapters.length;chapter++){assert.equal(j.snapshot().chapter,chapter);finishChapter(j,chapter);assert(!j.accept(at(chapters[chapter].sender)));assert(!j.deliver(at(chapters[chapter].recipient)));if(chapter<chapters.length-1){assert(!j.snapshot().ending);assert(j.continue());}else{assert(j.snapshot().ending);assert(!j.continue());}}
 assert.equal(j.snapshot().discoveries.length,0);assert(createPostalJourney(storage).snapshot().ending);
});
test('rhythm reply stays at recipient until a correct text response',()=>{
 const j=createPostalJourney(memory());finishChapter(j,0);j.continue();j.accept(at('mage'));j.deliver(at('chocobo'));assert.equal(j.snapshot().state,'reply');assert(!j.continue());assert.deepEqual(j.answer('three-short',at('chocobo')),{ok:false,reason:'wrong-answer'});assert.equal(j.snapshot().state,'reply');assert.deepEqual(j.answer('short-short-long',at('mage')),{ok:false,reason:'not-ready'});assert(j.answer('short-short-long',at('chocobo')).ok);assert(!j.answer('short-short-long',at('chocobo')).ok);
});
test('every handoff rejects wrong actor, loading, distance, view and busy actors',()=>{
 const j=createPostalJourney(memory());
 for(let chapter=0;chapter<chapters.length;chapter++){
  for(const action of ['accept','deliver']){
   const species=chapters[chapter][action==='accept'?'sender':'recipient'];
   for(const bad of [{species:'human'},{actorReady:false},{near:false},{streetMode:false},{busy:true}])assert(!j[action]({...at(species),...bad}));
   assert(j[action](at(species)));
  }
  if(chapters[chapter].correctAnswer){for(const bad of [{actorReady:false},{near:false},{streetMode:false},{busy:true}])assert(!j.answer('short-short-long',{...at('chocobo'),...bad}).ok);assert(j.answer('short-short-long',at('chocobo')).ok);}
  if(chapter<chapters.length-1)j.continue();
 }
});
test('pending reset/recovery prevents unrelated progress; cancel leaves exact state',()=>{
 const storage=memory();storage.setItem(QUEST_KEY,JSON.stringify({version:1,state:'carrying'}));const j=createPostalJourney(storage),before=storage.getItem(JOURNEY_KEY);
 j.requestReset();assert(!j.deliver(at('mage')));assert(!j.discover({id:discoveries[0].id,near:true,streetMode:true}));j.cancelReset();assert.equal(storage.getItem(JOURNEY_KEY),before);assert(j.requestRecovery());assert(!j.deliver(at('mage')));j.cancelRecovery();assert.equal(storage.getItem(JOURNEY_KEY),before);assert(j.deliver(at('mage')));
});
test('three unique observations are optional, nearby and player-initiated',()=>{
 const storage=memory(),j=createPostalJourney(storage);
 assert(!j.discover({id:'unknown',near:true,streetMode:true}));for(const entry of discoveries){assert(!j.discover({id:entry.id,near:false,streetMode:true}));assert(!j.discover({id:entry.id,near:true,streetMode:false}));assert(j.discover({id:entry.id,near:true,streetMode:true}));assert(!j.discover({id:entry.id,near:true,streetMode:true}));}
 assert.equal(j.snapshot().state,'available');assert.equal(createPostalJourney(storage).snapshot().discoveries.length,discoveries.length);
});
test('all legacy states migrate with raw backup before new save, leaving v1 untouched',()=>{
 for(const state of ['available','carrying','completed']){const storage=memory(),raw=JSON.stringify({version:1,state});storage.setItem(QUEST_KEY,raw);storage.writes.length=0;const j=createPostalJourney(storage);assert.equal(j.snapshot().chapter,0);assert.equal(j.snapshot().state,state);assert.equal(storage.getItem(QUEST_KEY),raw);assert.equal(storage.getItem(LEGACY_BACKUP_KEY),raw);assert.deepEqual(storage.writes,[LEGACY_BACKUP_KEY,JOURNEY_KEY]);assert(j.snapshot().hasLegacyBackup);}
});
test('new version takes precedence and refresh never repeatedly imports old progress',()=>{
 const storage=memory();storage.setItem(QUEST_KEY,JSON.stringify({version:1,state:'completed'}));const j=createPostalJourney(storage);j.continue();j.accept(at('mage'));const writes=storage.writes.length,loaded=createPostalJourney(storage);assert.equal(loaded.snapshot().chapter,1);assert.equal(loaded.snapshot().state,'carrying');assert.equal(storage.writes.length,writes);
});
test('each meaningful phase and optional observations survive fresh module restoration',()=>{
 const storage=memory();let j=createPostalJourney(storage);
 for(let i=0;i<chapters.length;i++){assert(j.accept(at(chapters[i].sender)));j=createPostalJourney(storage);assert.equal(j.snapshot().state,'carrying');assert.equal(j.snapshot().chapter,i);assert(j.deliver(at(chapters[i].recipient)));j=createPostalJourney(storage);if(i===1){assert.equal(j.snapshot().state,'reply');assert(j.answer('short-short-long',at('chocobo')).ok);j=createPostalJourney(storage);}assert.equal(j.snapshot().state,'completed');if(i<2)j.continue();}
});
test('decode rejects future versions, invalid combinations and undefined/duplicate observations',()=>{
 const base={version:2,chapter:0,state:'available',discoveries:[]};
 for(const change of [{version:3},{chapter:-1},{chapter:3},{chapter:1.5},{state:'reply'},{state:'bogus'},{discoveries:['unknown']},{discoveries:[discoveries[0].id,discoveries[0].id]},{discoveries:null}])assert.throws(()=>decodeJourney(JSON.stringify({...base,...change})));
 assert.throws(()=>decodeJourney('broken'));
});
test('unreadable/future saves are preserved while a clearly unsaved session remains playable',()=>{
 for(const raw of ['broken',JSON.stringify({version:99,chapter:0,state:'available',discoveries:[]})]){const storage=memory();storage.setItem(JOURNEY_KEY,raw);const j=createPostalJourney(storage);assert.equal(j.snapshot().saved,false);assert.equal(storage.getItem(UNREADABLE_BACKUP_KEY),raw);assert(j.accept(at('moogle')));assert(j.deliver(at('mage')));j.requestReset();assert(j.confirmReset());assert.equal(storage.getItem(JOURNEY_KEY),raw);assert.equal(j.snapshot().saved,false);}
});
test('quota failures never erase legacy progress and do not prevent in-memory play',()=>{
 const storage=memory(),raw=JSON.stringify({version:1,state:'carrying'});storage.setItem(QUEST_KEY,raw);storage.setItem=()=>{throw Error('quota');};const j=createPostalJourney(storage);assert.equal(j.snapshot().saved,false);assert.equal(j.snapshot().state,'carrying');assert(j.deliver(at('mage')));assert(j.continue());assert.equal(storage.getItem(QUEST_KEY),raw);assert.equal(storage.getItem(JOURNEY_KEY),null);
});
test('denied reads cannot accidentally replace an unknown existing save',()=>{
 let writes=0;const storage={getItem(){throw Error('denied');},setItem(){writes++;}};const j=createPostalJourney(storage);assert(j.accept(at('moogle')));j.requestReset();j.confirmReset();assert.equal(j.snapshot().saved,false);assert.equal(writes,0);
});
test('reset is confirmed and saves a blank v2 rather than re-importing completed v1',()=>{
 const storage=memory(),raw=JSON.stringify({version:1,state:'completed'});storage.setItem(QUEST_KEY,raw);storage.setItem('ff-garden.render-profile','smooth');const j=createPostalJourney(storage);assert(!j.confirmReset());j.requestReset();j.cancelReset();assert.equal(j.snapshot().state,'completed');j.requestReset();assert.equal(createPostalJourney(storage).snapshot().resetPending,false);assert(j.confirmReset());assert(!j.confirmReset());assert.equal(createPostalJourney(storage).snapshot().state,'available');assert.equal(storage.getItem(QUEST_KEY),raw);assert.equal(storage.getItem('ff-garden.render-profile'),'smooth');assert.equal(storage.getItem(LEGACY_BACKUP_KEY),raw);
});
test('legacy recovery is explicit, cancelable and never auto-replayed on refresh',()=>{
 const storage=memory();storage.setItem(QUEST_KEY,JSON.stringify({version:1,state:'completed'}));const j=createPostalJourney(storage);j.continue();j.accept(at('mage'));const before=storage.getItem(JOURNEY_KEY);assert(!j.confirmRecovery());assert(j.requestRecovery());j.cancelRecovery();assert.equal(storage.getItem(JOURNEY_KEY),before);assert(j.requestRecovery());assert.equal(createPostalJourney(storage).snapshot().recoveryPending,false);assert(j.confirmRecovery());assert.equal(j.snapshot().chapter,0);assert.equal(j.snapshot().state,'completed');assert(!j.confirmRecovery());assert(!createPostalJourney(memory()).requestRecovery());
});
test('snapshot copies cannot mutate saved discoveries or mission state',()=>{
 const j=createPostalJourney(memory());const snapshot=j.snapshot();snapshot.chapter=2;snapshot.discoveries.push(discoveries[0].id);assert.equal(j.snapshot().chapter,0);assert.equal(j.snapshot().discoveries.length,0);
});
