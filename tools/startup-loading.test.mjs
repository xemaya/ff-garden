import test from 'node:test';import assert from 'node:assert/strict';
import {createStartupJsonLoader,waitForStartup} from '../src/startup-loading.js';import {showStartupFailure} from '../src/startup-feedback.js';import {AssetLoadTimeoutError,AssetLoadCancelledError} from '../src/asset-loading.js';import {clock,deferred,flush} from './asset-test-support.mjs';

function dom(){const document={activeElement:null,createElement:()=>new Element(document)};return {document,root:new Element(document),events:new EventTarget()};}
class Element extends EventTarget{
 constructor(document){super();this.document=document;this.children=[];this.attributes={};const classes=new Set(['done']);this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)};}
 append(child){child.parent=this;this.children.push(child);}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 setAttribute(key,value){this.attributes[key]=value;}replaceChildren(...children){this.children=children;}focus(){this.document.activeElement=this;}click(){this.dispatchEvent(new Event('click'));}
}

test('hung JSON headers are aborted on the existing network budget and late response cannot replace a successful retry',async()=>{
 let lateParsed=false;const time=clock(),requests=[],loader=createStartupJsonLoader('/data/royal-city.json',{...time,timeoutMs:100,fetcher:(url,options)=>{const work=deferred();requests.push({...work,options,url});return work.promise;}});
 const first=loader(),rejected=assert.rejects(first,AssetLoadTimeoutError);await flush();time.advance(100);await rejected;assert(requests[0].options.signal.aborted);
 const next=loader();await flush();requests[1].resolve({ok:true,json:async()=>({name:'new'})});assert.deepEqual(await next,{name:'new'});requests[0].resolve({ok:true,json:async()=>{lateParsed=true;return {name:'late'};}});await flush();assert(!lateParsed);assert.equal(loader(),next);assert.deepEqual(await loader(),{name:'new'});assert.equal(time.count(),0);
});
test('a hung response body retains the deadline and cancelling it cannot commit its late JSON',async()=>{
 const time=clock(),old=deferred();let calls=0,signal;
 const loader=createStartupJsonLoader('/data/town.json',{...time,timeoutMs:50,fetcher:async(url,options)=>{signal=options.signal;calls++;return {ok:true,json:()=>calls===1?old.promise:Promise.resolve({valid:true})};}});
 const first=loader(),rejected=assert.rejects(first,AssetLoadTimeoutError);await flush();time.advance(50);await rejected;assert(signal.aborted);const retry=loader();assert.deepEqual(await retry,{valid:true});old.resolve({stale:true});await flush();assert.deepEqual(await loader(),{valid:true});assert.equal(time.count(),0);
});
test('HTTP and malformed JSON fail explicitly and remain retryable rather than supplying an empty layout',async()=>{
 const time=clock();let calls=0;const loader=createStartupJsonLoader('/data/v4/manifest.json',{...time,timeoutMs:100,fetcher:async()=>{calls++;return calls===1?{ok:false,status:503}:calls===2?{ok:true,json:async()=>{throw new SyntaxError('bad JSON');}}:{ok:true,json:async()=>({streets:['real']})};}});
 await assert.rejects(loader(),/HTTP 503/);await assert.rejects(loader(),SyntaxError);assert.deepEqual(await loader(),{streets:['real']});assert.equal(calls,3);assert.equal(time.count(),0);
});
test('startup waiting removes its cancel and pagehide listeners after both cancellation and success',async()=>{
 const d=dom(),time=clock(),work=deferred();let calls=0;const loader=createStartupJsonLoader('/data/v4/residential.json',{...time,timeoutMs:100,fetcher:()=>{calls++;return work.promise;}});
 const pending=waitForStartup(loader,d),rejected=assert.rejects(pending,AssetLoadCancelledError),cancel=d.root.children[0];cancel.click();await rejected;assert.equal(d.root.children.length,0);assert.equal(d.root.attributes['aria-busy'],'false');await flush();assert.equal(calls,0);assert.equal(time.count(),0);
 const ready=createStartupJsonLoader('/data/v4/workshops.json',{...time,timeoutMs:100,fetcher:async()=>({ok:true,json:async()=>({real:true})})});assert.deepEqual(await waitForStartup(ready,d),{real:true});assert.equal(d.root.children.length,0);d.events.dispatchEvent(new Event('pagehide'));cancel.click();assert.deepEqual(await ready(),{real:true});assert.equal(time.count(),0);
});
test('pagehide cancels a pending request instead of retaining an abandoned startup waiter',async()=>{
 const d=dom(),time=clock();let signal;const loader=createStartupJsonLoader('/data/v4/market.json',{...time,timeoutMs:100,fetcher:(url,options)=>{signal=options.signal;return new Promise(()=>{});}});
 const pending=waitForStartup(loader,d),rejected=assert.rejects(pending,AssetLoadCancelledError);await flush();d.events.dispatchEvent(new Event('pagehide'));await rejected;assert(signal.aborted);assert.equal(time.count(),0);assert.equal(d.root.children.length,0);
});
test('failure recovery uses clear text, reloads only the current page once and leaves saved progress untouched',()=>{
 const d=dom(),oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location'),oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let reloads=0;const href='https://local.invalid/?street=market&mage=1';
 Object.defineProperty(globalThis,'location',{configurable:true,value:{href,reload(){reloads++;}}});Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){assert.fail('recovery must not touch saved progress');}});
 try{
 for(const error of[new AssetLoadTimeoutError('network'),new AssetLoadCancelledError(),new SyntaxError('payload'),new Error('<script>')]){
  showStartupFailure({...d,error,label:'角色'});assert(!d.root.hidden);assert(!d.root.classList.contains('done'));assert(d.root.classList.contains('startup-recovery'));const [title,message,note,retry,home]=d.root.children;assert.equal(title.textContent,'角色暂未准备好');assert(message.textContent);assert(!message.textContent.includes('<script>'));assert.match(note.textContent,/保留/);assert.equal(home.href,'/');assert.equal(d.document.activeElement,retry);const before=reloads;retry.click();retry.click();assert.equal(reloads,before+1);
 }
 assert.equal(globalThis.location.href,href);
 }finally{for(const [key,descriptor]of[['location',oldLocation],['localStorage',oldStorage]]){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
