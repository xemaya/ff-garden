import test from 'node:test';
import assert from 'node:assert/strict';
import {selectStreet} from '../src/street-selection.js';
import {playPostalChime,postalChime,cancelPostalChime} from '../src/postal-chime.js';
const manifest={defaultStreet:'residential',streets:['residential','market','workshops'].map(id=>({id,path:'data/v4/'+id+'.json'}))};
test('first entry and unknown districts use royalty while explicit old links retain their destinations',()=>{
  for(const query of ['', 'district=royal','district=missing','district=../../other'])assert.equal(selectStreet(new URLSearchParams(query),manifest).street.id,'royal');
  for(const id of ['residential','market','workshops'])for(const extra of ['', '&district=royal','&district=missing'])assert.equal(selectStreet(new URLSearchParams('street='+id+extra),manifest).street.id,id);
  assert.equal(selectStreet(new URLSearchParams('sample=1&study=1'),manifest).sample,true);assert.equal(selectStreet(new URLSearchParams('moogle=1'),manifest).street.id,'residential');assert.equal(selectStreet(new URLSearchParams('study=1'),manifest).street.id,'residential');
  assert.throws(()=>selectStreet(new URLSearchParams('street=missing'),manifest),/未知街道/);
});
function audio(state='running',on=true){
  const notes=[],gains=[],master={};const ac={state,currentTime:12,resume(){assert.fail('ending must never resume audio');},createOscillator(){const o={type:null,frequency:{value:null},connect(){},disconnect(){},start(time){o.startTime=time;},stop(time){o.stopTime=time;}};notes.push(o);return o;},createGain(){const events=[],o={gain:{setValueAtTime:(value,time)=>events.push({value,time}),exponentialRampToValueAtTime:(value,time)=>events.push({value,time})},connect(destination){assert.equal(destination,master);},disconnect(){},events};gains.push(o);return o;}};
  return {ac,on,master,notes,gains};
}
test('ending respects off, missing and blocked audio and does not resume or toggle it',()=>{
  assert(!playPostalChime(null));for(const state of ['suspended','closed']){const a=audio(state);assert(!playPostalChime(a));assert.equal(a.notes.length,0);assert.equal(a.on,true);}
  const a=audio('running',false);assert(!playPostalChime(a));assert.equal(a.on,false);assert.equal(a.notes.length,0);
});
test('enabled ending schedules exactly two short notes and one longer note at the existing volume',()=>{
  const a=audio();assert(playPostalChime(a));assert.equal(a.notes.length,3);
  assert.deepEqual(a.notes.map(o=>o.startTime),postalChime.map(n=>12+n.offset));assert.equal(postalChime[0].duration,postalChime[1].duration);assert.ok(postalChime[2].duration>postalChime[0].duration*3);
  assert(a.gains.every(g=>Math.max(...g.events.map(e=>e.value))===.07));assert.equal(a.chimeUntil,13.8);
});

test('switching sound off cancels pending completion notes so re-enabling does not replay them',()=>{const a=audio();playPostalChime(a);cancelPostalChime(a);assert.equal(a.postalNodes.length,0);assert.equal(a.chimeUntil,0);assert(a.notes.every(note=>note.stopTime===a.ac.currentTime));});
