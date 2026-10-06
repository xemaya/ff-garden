import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {royalGreetings,canLeaveRoyalGreeting,royalGreetingReply} from '../src/royal-greetings.js';

test('one existing gate discovery opens three expressions without requiring the other plaques or a story phase',()=>{
 const empty={chapter:0,state:'available',discoveries:[]},gate={...empty,discoveries:['royal-gate-message']};
 assert(!canLeaveRoyalGreeting(empty,true));assert(!canLeaveRoyalGreeting(gate,false));assert(canLeaveRoyalGreeting(gate,true));
 for(const phase of [{chapter:0,state:'available'},{chapter:1,state:'reply'},{chapter:2,state:'completed'}]){
  const snapshot={...gate,...phase},before=JSON.stringify(snapshot),answers=royalGreetings.map(choice=>royalGreetingReply(choice.id,snapshot,true));
  assert(answers.every(Boolean));assert.equal(new Set(answers).size,3);assert.equal(JSON.stringify(snapshot),before);
 }
 assert.equal(royalGreetingReply('unknown',gate,true),null);assert.equal(royalGreetingReply('return',empty,true),null);
});
test('responses use actual street landmarks and acknowledge optional plaques already read',()=>{
 const base={discoveries:['royal-gate-message']},seen={discoveries:['royal-gate-message','royal-square-pause','royal-court-guest']};
 const text=royalGreetings.map(choice=>royalGreetingReply(choice.id,base,true)).join('');
 const city=JSON.parse(readFileSync(new URL('../public/data/royal-city.json',import.meta.url)));for(const building of city.buildings)assert(text.includes(building.name));
 assert.match(royalGreetingReply('slow',seen,true),/你看过小谱/);assert.doesNotMatch(royalGreetingReply('slow',base,true),/你看过小谱/);
 assert.match(royalGreetingReply('seat',seen,true),/给你留着/);assert.match(royalGreetingReply('seat',base,true),/有空去/);
});
