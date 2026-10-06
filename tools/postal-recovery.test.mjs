import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostalJourney,JOURNEY_KEY,LEGACY_BACKUP_KEY,PREVIOUS_JOURNEYS_KEY} from '../src/postal-journey.js';
import {QUEST_KEY} from '../src/letter-quest.js';
const at=species=>({species,actorReady:true,near:true,streetMode:true,busy:false});
function memory(){const data=new Map(),writes=[];return {data,writes,getItem:key=>data.get(key)??null,setItem(key,value){writes.push(key);data.set(key,value);}};}
function withLegacy(){const s=memory();s.setItem(QUEST_KEY,JSON.stringify({version:1,state:'completed'}));const j=createPostalJourney(s);j.continue();j.accept(at('mage'));j.discover({id:'royal-gate-message',near:true,streetMode:true});return {s,j};}
const progress=j=>{const s=j.snapshot();return {chapter:s.chapter,state:s.state,discoveries:s.discoveries};};

test('legacy recovery backs up current journey first and undo restores both chapter and observations',()=>{
  const {s,j}=withLegacy(),before=progress(j),legacy=s.getItem(QUEST_KEY);s.writes.length=0;
  assert(j.requestRecovery());assert(j.confirmRecovery());assert.deepEqual(s.writes,[PREVIOUS_JOURNEYS_KEY,JOURNEY_KEY]);
  assert.deepEqual(progress(j),{chapter:0,state:'completed',discoveries:[]});assert(j.snapshot().hasJourneyBackup);
  const refreshed=createPostalJourney(s);assert(refreshed.requestRecovery('journey'));assert(refreshed.confirmRecovery());assert.deepEqual(progress(refreshed),before);
  assert.equal(s.getItem(QUEST_KEY),legacy);assert.equal(s.getItem(LEGACY_BACKUP_KEY),legacy);
});
test('reset backups support explicit undo; cancel and repeated confirms never replace data',()=>{
  const {s,j}=withLegacy(),before=progress(j),raw=s.getItem(JOURNEY_KEY);j.requestReset();j.cancelReset();assert.equal(s.getItem(JOURNEY_KEY),raw);
  j.requestReset();assert(j.confirmReset());assert(!j.confirmReset());assert(j.snapshot().hasJourneyBackup);assert(j.requestRecovery('journey'));j.cancelRecovery();assert.equal(j.snapshot().state,'available');assert(j.requestRecovery('journey'));assert(j.confirmRecovery());assert.deepEqual(progress(j),before);assert(!j.confirmRecovery());
});
test('backup write failures block destructive recovery and reset while keeping current source untouched',()=>{
  for(const operation of ['reset','recovery']){const {s,j}=withLegacy(),before=progress(j),raw=s.getItem(JOURNEY_KEY);s.setItem=()=>{throw Error('quota');};operation==='reset'?j.requestReset():j.requestRecovery();assert.equal(operation==='reset'?j.confirmReset():j.confirmRecovery(),false);assert.deepEqual(progress(j),before);assert.equal(s.getItem(JOURNEY_KEY),raw);assert.equal(j.snapshot().recoveryError,'backup-unavailable');}
});
test('a failed replacement keeps current state and retry does not evict selected recovery target',()=>{
  const {s,j}=withLegacy();j.requestReset();j.confirmReset();const before=progress(j),write=s.setItem.bind(s);assert(j.requestRecovery('journey'));s.setItem=(key,value)=>{if(key===JOURNEY_KEY)throw Error('quota');write(key,value);};
  for(let i=0;i<5;i++){assert(!j.confirmRecovery());assert.deepEqual(progress(j),before);assert.equal(j.snapshot().recoveryError,'save-failed');}
  s.setItem=write;assert(j.confirmRecovery());assert.equal(j.snapshot().chapter,1);assert.equal(j.snapshot().state,'carrying');assert.deepEqual(j.snapshot().discoveries,['royal-gate-message']);
});
test('future v2 saves and future backup journals are preserved even during a pending confirmation',()=>{
  const future=JSON.stringify({version:99,payload:'future-data'});
  for(const key of [JOURNEY_KEY,PREVIOUS_JOURNEYS_KEY]){const {s,j}=withLegacy(),before=progress(j);j.requestRecovery();s.setItem(key,future);assert(!j.confirmRecovery());assert.equal(s.getItem(key),future);assert.deepEqual(progress(j),before);assert.equal(j.snapshot().recoveryError,key===JOURNEY_KEY?'protected':'backup-unavailable');}
  const {s,j}=withLegacy();s.setItem(JOURNEY_KEY,future);const reload=createPostalJourney(s);assert.equal(reload.requestRecovery(),false);reload.requestReset();assert(reload.confirmReset());assert.equal(s.getItem(JOURNEY_KEY),future);assert.equal(reload.snapshot().saved,false);
});
test('missing backup sources and another tab updating the journey never cause silent replacement',()=>{
  const {s,j}=withLegacy();j.requestRecovery();s.data.delete(QUEST_KEY);s.data.delete(LEGACY_BACKUP_KEY);const before=progress(j);assert(!j.confirmRecovery());assert.equal(j.snapshot().recoveryError,'source-unavailable');assert.deepEqual(progress(j),before);
  const other=withLegacy();other.j.requestReset();const next={version:2,chapter:2,state:'carrying',discoveries:[]};other.s.setItem(JOURNEY_KEY,JSON.stringify(next));assert(!other.j.confirmReset());assert.equal(other.j.snapshot().recoveryError,'changed-elsewhere');assert.equal(other.j.snapshot().chapter,2);assert.equal(other.j.snapshot().resetPending,false);
});
test('journal stays bounded across repeated restore/reset without touching legacy or preferences',()=>{
  const {s,j}=withLegacy(),legacy=s.getItem(QUEST_KEY);s.setItem('ff-garden.render-profile','smooth');
  for(let i=0;i<12;i++){j.requestRecovery();assert(j.confirmRecovery());j.continue();j.accept(at('mage'));j.requestReset();assert(j.confirmReset());}
  const journal=JSON.parse(s.getItem(PREVIOUS_JOURNEYS_KEY));assert.equal(journal.entries.length,3);assert.ok(journal.entries[2].id>3);assert.equal(s.getItem(QUEST_KEY),legacy);assert.equal(s.getItem('ff-garden.render-profile'),'smooth');
});
