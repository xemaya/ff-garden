import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostalJourney,JOURNEY_KEY,PREVIOUS_JOURNEYS_KEY} from '../src/postal-journey.js';
const at=species=>({species,actorReady:true,near:true,streetMode:true,busy:false});
function memory(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
const seed=(chapter,state)=>JSON.stringify({version:2,chapter,state,discoveries:[]});

test('every ordinary story or observation write preserves a newly arrived future-version save',()=>{
  const cases=[{chapter:0,state:'available',act:j=>j.accept(at('moogle'))},{chapter:0,state:'carrying',act:j=>j.deliver(at('mage'))},{chapter:1,state:'reply',act:j=>j.answer('short-short-long',at('chocobo')).ok},{chapter:0,state:'completed',act:j=>j.continue()},{chapter:1,state:'available',act:j=>j.discover({id:'royal-gate-message',near:true,streetMode:true})}];
  for(const c of cases){const s=memory();s.setItem(JOURNEY_KEY,seed(c.chapter,c.state));const j=createPostalJourney(s),future=JSON.stringify({version:99,futurePayload:'untouched'});s.setItem(JOURNEY_KEY,future);assert(c.act(j));assert.equal(s.getItem(JOURNEY_KEY),future);assert.equal(j.snapshot().saved,false);assert.equal(j.snapshot().protectedData,true);}
});
test('a stale tab adopts newer progress and rejects its outdated action before replacing the save',()=>{
  const s=memory(),old=createPostalJourney(s),newer=createPostalJourney(s);newer.accept(at('moogle'));newer.deliver(at('mage'));newer.continue();const raw=s.getItem(JOURNEY_KEY);
  assert.equal(old.accept(at('moogle')),false);assert.equal(s.getItem(JOURNEY_KEY),raw);assert.equal(old.snapshot().chapter,1);assert(old.snapshot().syncNotice);assert(!old.accept(at('moogle')));assert(old.accept(at('mage')));assert.equal(old.snapshot().syncNotice,false);assert.equal(old.snapshot().state,'carrying');
});
test('quota failures keep the unsaved session and later saving does not discard its intervening chapters',()=>{
  const s=memory(),write=s.setItem,j=createPostalJourney(s);s.setItem=()=>{throw Error('quota');};assert(j.accept(at('moogle')));assert(j.deliver(at('mage')));assert(j.continue());assert.equal(j.snapshot().chapter,1);assert.equal(j.snapshot().saved,false);
  s.setItem=write;assert(j.accept(at('mage')));const reload=createPostalJourney(s);assert.equal(reload.snapshot().chapter,1);assert.equal(reload.snapshot().state,'carrying');
});
test('backup-list refresh leaves an unsaved session alone and cancels a stale confirmation',()=>{
  const s=memory(),j=createPostalJourney(s);s.setItem=()=>{throw Error('quota');};j.accept(at('moogle'));j.requestReset();j.refreshBackups();assert.equal(j.snapshot().state,'carrying');assert.equal(j.snapshot().saved,false);assert.equal(j.snapshot().resetPending,false);
});
test('external removal is recognized instead of letting an old carrying tab recreate stale progress',()=>{
  const s=memory(),j=createPostalJourney(s);j.accept(at('moogle'));s.data.delete(JOURNEY_KEY);assert.equal(j.deliver(at('mage')),false);assert.equal(j.snapshot().state,'available');assert(j.snapshot().syncNotice);assert.equal(s.getItem(JOURNEY_KEY),null);
});
test('an unsaved tab cannot overwrite another tab during reset merely because its own saved flag is false',()=>{
  const s=memory(),write=s.setItem,j=createPostalJourney(s);s.setItem=()=>{throw Error('quota');};j.accept(at('moogle'));s.setItem=write;s.setItem(JOURNEY_KEY,seed(2,'carrying'));j.requestReset();assert.equal(j.confirmReset(),false);assert.equal(j.snapshot().chapter,2);assert.equal(j.snapshot().recoveryError,'changed-elsewhere');assert.equal(s.getItem(JOURNEY_KEY),seed(2,'carrying'));
});
test('a storage event protecting future progress leaves the current in-memory chapter readable',()=>{
  const s=memory(),j=createPostalJourney(s);j.accept(at('moogle'));j.deliver(at('mage'));j.continue();const future=JSON.stringify({version:99});s.setItem(JOURNEY_KEY,future);j.syncStoredJourney();assert.equal(j.snapshot().chapter,1);assert.equal(j.snapshot().saved,false);assert.equal(s.getItem(JOURNEY_KEY),future);assert.equal(s.getItem(PREVIOUS_JOURNEYS_KEY),null);
});
