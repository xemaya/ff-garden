import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import {compileTown} from '../src/layout.js';
import {questGuidance,questTargetName} from '../src/quest-guidance.js';
const ready={state:'available',targetName:'花车旁的邮差莫古利',targetExists:true,loaded:true,near:true};
test('next step names sender/recipient and ready action matches quest stage',()=>{
 const source={...ready};const accept=questGuidance(source);assert(accept.canAct);assert(accept.next.includes(source.targetName));assert(accept.step.startsWith('1'));
 const deliver=questGuidance({...ready,state:'carrying',targetName:'入口旁的魔导士'});assert(deliver.canAct);assert(deliver.next.includes('入口旁的魔导士'));assert(deliver.step.startsWith('2'));assert.deepEqual(source,ready);
});
test('loading and failure can locate planned target without permitting completion',()=>{
 for(const failed of [false,true]){const g=questGuidance({...ready,loaded:false,failed});assert(!g.canAct);assert(g.canLocate);assert(g.hint.includes(failed?'加载失败':'正在加载'));}
 assert(!questGuidance({...ready,targetExists:false,loaded:false}).canLocate);
});
test('distance, busy courier, transition and reset never claim that action is ready',()=>{
 for(const change of [{near:false},{busy:true},{mode:'map'},{mode:'study'},{mode:'transition'},{resetPending:true}]){const g=questGuidance({...ready,...change});assert(!g.canAct);assert(!g.hint.includes('已到邮差身边'));}
 assert(!questGuidance({...ready,resetPending:true}).canLocate);
});
test('completed state has no target, action or locator even after refresh',()=>{
 const g=questGuidance({...ready,state:'completed'});assert(!g.canAct);assert(!g.canLocate);assert(g.step.startsWith('3'));assert.equal(g.mapLabel,'送信已完成');
});
test('recipient names reflect actual sample and street layouts instead of assuming a book table',()=>{
 const sample=compileTown(JSON.parse(fs.readFileSync(new URL('../public/data/town.json',import.meta.url),'utf8')));
 assert.equal(questTargetName('mage',sample.people.find(p=>p.species==='mage')),'入口旁的魔导士');
 for(const street of ['residential','market','workshops']){const plan=compileTown(JSON.parse(fs.readFileSync(new URL('../public/data/v4/'+street+'.json',import.meta.url),'utf8')));assert.equal(questTargetName('mage',plan.people.find(p=>p.species==='mage')),'书桌旁的魔导士');assert(questTargetName('moogle',plan.people.find(p=>p.species==='moogle')).includes('莫古利'));}
});
