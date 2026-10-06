import test from 'node:test';
import assert from 'node:assert/strict';
import {createLetterQuest,QUEST_KEY} from '../src/letter-quest.js';
function memory(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
const courier={courierReady:true,near:true,streetMode:true},recipient={recipientReady:true,near:true,streetMode:true};
test('complete letter workflow survives refresh and rejects repeated actions',()=>{
 const storage=memory();let quest=createLetterQuest(storage);assert.equal(quest.deliver(recipient),false);assert(quest.accept(courier));assert(!quest.accept(courier));quest=createLetterQuest(storage);assert.equal(quest.snapshot().state,'carrying');assert(quest.deliver(recipient));assert(!quest.deliver(recipient));assert.equal(createLetterQuest(storage).snapshot().state,'completed');
});
test('missing assets, distance and map/study transitions cannot advance progress',()=>{
 const quest=createLetterQuest(memory());for(const key of Object.keys(courier))assert(!quest.accept({...courier,[key]:false}));assert(quest.accept(courier));for(const key of Object.keys(recipient))assert(!quest.deliver({...recipient,[key]:false}));assert.equal(quest.snapshot().state,'carrying');
});
test('reset deletes only task progress and permits a new run',()=>{
 const storage=memory();storage.setItem('ff-garden.render-profile','smooth');const quest=createLetterQuest(storage);quest.accept(courier);quest.deliver(recipient);quest.requestReset();quest.confirmReset();assert.equal(storage.getItem(QUEST_KEY),null);assert.equal(storage.getItem('ff-garden.render-profile'),'smooth');assert.equal(createLetterQuest(storage).snapshot().state,'available');assert(quest.accept(courier));
});
test('malformed/version-mismatched progress never produces a completed task',()=>{
 for(const raw of ['broken','null','{}','{"version":2,"state":"completed"}','{"version":1,"state":"invalid"}']){const storage=memory();storage.setItem(QUEST_KEY,raw);const quest=createLetterQuest(storage);assert.deepEqual(quest.snapshot(),{state:'available',saved:false,resetPending:false});assert(quest.accept(courier));assert.equal(createLetterQuest(storage).snapshot().state,'carrying');}
});
test('denied reads, quota errors and denied resets retain usable session progress with a warning',()=>{
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');},removeItem(){throw Error('denied');}};
 const quest=createLetterQuest(denied);assert.equal(quest.snapshot().saved,false);assert(quest.accept(courier));assert(quest.deliver(recipient));assert.deepEqual(quest.snapshot(),{state:'completed',saved:false,resetPending:false});quest.requestReset();quest.confirmReset();assert.deepEqual(quest.snapshot(),{state:'available',saved:false,resetPending:false});assert(quest.accept(courier));
 const quota=memory();quota.setItem=()=>{throw Error('quota');};const q=createLetterQuest(quota);assert(q.accept(courier));assert.equal(q.snapshot().saved,false);
});

test('reset requires explicit confirmation, cancellation and refresh preserve progress',()=>{
 const storage=memory();storage.setItem('ff-garden.render-profile','smooth');let deletes=0;const remove=storage.removeItem;storage.removeItem=key=>{deletes++;remove(key);};
 const quest=createLetterQuest(storage);quest.accept(courier);const before=storage.getItem(QUEST_KEY);
 assert(!quest.confirmReset());quest.requestReset();quest.requestReset();assert.equal(deletes,0);assert.equal(storage.getItem(QUEST_KEY),before);assert(!quest.deliver(recipient));
 quest.cancelReset();assert.equal(quest.snapshot().state,'carrying');assert(!quest.confirmReset());assert.equal(storage.getItem(QUEST_KEY),before);
 quest.requestReset();const refreshed=createLetterQuest(storage);assert.equal(refreshed.snapshot().resetPending,false);assert.equal(refreshed.snapshot().state,'carrying');assert(!refreshed.confirmReset());
 quest.cancelReset();quest.deliver(recipient);quest.requestReset();quest.cancelReset();assert.equal(quest.snapshot().state,'completed');
 quest.requestReset();assert(quest.confirmReset());assert(!quest.confirmReset());assert.equal(deletes,1);assert.equal(storage.getItem(QUEST_KEY),null);assert.equal(storage.getItem('ff-garden.render-profile'),'smooth');assert.equal(createLetterQuest(storage).snapshot().state,'available');
});
