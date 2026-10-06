import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetLoader,AssetLoadTimeoutError,AssetLoadCancelledError} from '../src/asset-loading.js';

import {clock,deferred,flush} from './asset-test-support.mjs';

test('hung download aborts, late success is disposed and cannot replace a newer successful request',async()=>{
 const time=clock(),works=[],disposed=[],accepted=[];
 const loader=createAssetLoader(context=>{const work=deferred();works.push({...work,context});return work.promise;},{timeoutMs:100,decodeTimeoutMs:40,...time,accept:value=>accepted.push(value),dispose:value=>disposed.push(value)});
 const first=loader(),failed=assert.rejects(first,error=>error instanceof AssetLoadTimeoutError&&error.phase==='network');assert.equal(first,loader());await flush();time.advance(100);await failed;assert(works[0].context.signal.aborted);
 const second=loader();await flush();assert.equal(works.length,2);works[1].resolve('new');assert.equal(await second,'new');works[0].resolve('old');await flush();
 assert.deepEqual(accepted,['new']);assert.deepEqual(disposed,['old']);assert.equal(loader(),second);assert.equal(time.count(),0);
});
test('late old rejection does not clear a newer shared request',async()=>{
 const time=clock(),works=[],loader=createAssetLoader(()=>{const work=deferred();works.push(work);return work.promise;},{timeoutMs:10,...time});
 const first=loader(),failed=assert.rejects(first,AssetLoadTimeoutError);await flush();time.advance(10);await failed;
 const second=loader();await flush();works[0].reject(Error('late'));await flush();assert.equal(loader(),second);works[1].resolve('valid');assert.equal(await second,'valid');assert.equal(time.count(),0);
});
test('complete data near the network deadline gets a fresh decode grace window',async()=>{
 const time=clock(),work=deferred();let context;const loader=createAssetLoader(value=>{context=value;return work.promise;},{timeoutMs:100,decodeTimeoutMs:40,...time});
 const result=loader();await flush();time.advance(99);context.downloaded();time.advance(30);assert(!context.signal.aborted);assert.equal(time.count(),1);work.resolve('decoded');assert.equal(await result,'decoded');assert.equal(time.count(),0);
});
test('decode timeout retries share surviving work and only an explicit current waiter commits',async()=>{
 const time=clock(),work=deferred(),accepted=[],disposed=[];let calls=0;
 const loader=createAssetLoader(context=>{calls++;context.downloaded();return work.promise;},{timeoutMs:100,decodeTimeoutMs:20,...time,accept:value=>accepted.push(value),dispose:value=>disposed.push(value)});
 const first=loader(),failed=assert.rejects(first,error=>error.phase==='decode');await flush();time.advance(20);await failed;
 const second=loader();assert.equal(second,loader());await flush();assert.equal(calls,1);const timedOut=assert.rejects(second,AssetLoadTimeoutError);time.advance(20);await timedOut;
 const third=loader();work.resolve('decoded');assert.equal(await third,'decoded');assert.equal(calls,1);assert.deepEqual(accepted,['decoded']);assert.deepEqual(disposed,[]);assert.equal(time.count(),0);
});
test('cancelled native decode completes with disposal and does not populate success cache',async()=>{
 const time=clock(),works=[],disposed=[];const loader=createAssetLoader(context=>{context.downloaded();const work=deferred();works.push(work);return work.promise;},{timeoutMs:100,decodeTimeoutMs:20,...time,dispose:value=>disposed.push(value)});
 const first=loader(),cancelled=assert.rejects(first,AssetLoadCancelledError);await flush();assert(loader.cancel());await cancelled;assert.equal(time.count(),0);assert(!loader.cancel());works[0].resolve('unused');await flush();assert.deepEqual(disposed,['unused']);
 const next=loader();await flush();assert.equal(works.length,2);works[1].resolve('used');assert.equal(await next,'used');assert(!loader.cancel());
});
test('validation failures release decoded assets and retain retryability without timers',async()=>{
 const time=clock(),disposed=[];let calls=0;const loader=createAssetLoader(()=>++calls,{timeoutMs:100,...time,accept:value=>{if(value===1)throw Error('invalid');},dispose:value=>disposed.push(value)});
 await assert.rejects(loader(),/invalid/);assert.deepEqual(disposed,[1]);assert.equal(time.count(),0);assert.equal(await loader(),2);assert.equal(time.count(),0);
});
test('cancel before dispatch prevents a download and an empty rejection never becomes a cached success',async()=>{
 let calls=0;const loader=createAssetLoader(()=>{calls++;return Promise.reject();});
 const result=loader(),cancelled=assert.rejects(result,AssetLoadCancelledError);loader.cancel();await cancelled;await flush();assert.equal(calls,0);
 let rejected=false;try{await loader();}catch{rejected=true;}assert(rejected);assert.equal(calls,1);
 try{await loader();}catch{}assert.equal(calls,2);
});
