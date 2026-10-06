import test from 'node:test';
import assert from 'node:assert/strict';
import {createMovementInput,createLookInput} from '../src/input-state.js';
import {readPreference,writePreference,renderProfiles} from '../src/preferences.js';
test('two fingers and keyboard retain independent ownership until cancelled',()=>{
 const input=createMovementInput();input.keyboard.add('w');input.press(1,'w');input.press(2,'w');input.press(3,'d');input.release(1);input.keyboard.delete('w');assert(input.has('w'));input.release(2);assert(!input.has('w'));assert(input.has('d'));input.clear();assert(!input.has('d'));assert.equal(input.pointerCount,0);
});
test('look ignores other fingers and cancellations never select a character',()=>{
 const look=createLookInput();assert(look.start(1,10,10));assert(!look.start(2,30,30));assert.equal(look.move(2,40,40),null);assert.equal(look.end(2),null);assert.deepEqual(look.move(1,30,10),{x:20,y:0});assert.equal(look.end(1).tap,false);look.start(3,0,0);assert.equal(look.end(3,true).tap,false);look.start(4,2,2);assert.equal(look.end(4).tap,true);look.start(5,0,0);look.clear();assert.equal(look.move(5,1,1),null);
});
test('blocked storage is optional and quality remains unchanged by default',()=>{
 const blocked={getItem(){throw Error('denied');},setItem(){throw Error('full');}};assert.equal(readPreference(blocked,'quality','quality'),'quality');assert.equal(writePreference(blocked,'quality','smooth'),false);assert.deepEqual(renderProfiles.quality,{pixelRatio:1.5,shadowSize:2048,ao:true});assert(renderProfiles.smooth.pixelRatio<renderProfiles.quality.pixelRatio);
});
