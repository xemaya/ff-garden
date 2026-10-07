import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceCityTour} from '../src/city-tour.js';
test('floating point remainder cannot spin forever at a waypoint',()=>{
 const state={pose:{x:100,z:100},cursor:0,travelled:0},path=[{x:100,z:100.3},{x:100,z:120}];let calls=0;
 advanceCityTour(state,path,9,1/30,(dx,dz)=>{calls++;state.pose.x+=dx;state.pose.z+=dz;return true;});assert.ok(calls<10);assert.equal(state.cursor,1);assert.ok(Math.abs(state.travelled-.3)<1e-10);
});
test('partial movement counts actual metres and preserves the blocked waypoint',()=>{
 const state={pose:{x:0,z:0},cursor:0,travelled:0};const r=advanceCityTour(state,[{x:0,z:2}],9,.05,()=>{state.pose.z+=.1;return true;});assert.equal(r.waiting,true);assert.equal(state.cursor,0);assert.equal(state.travelled,.1);
});
test('a successful callback with zero displacement yields instead of looping',()=>{
 const state={pose:{x:100,z:100},cursor:0,travelled:0};let calls=0;const r=advanceCityTour(state,[{x:100,z:101}],9,.05,()=>{calls++;return true;});assert.equal(calls,1);assert.equal(r.waiting,true);
});
test('completed route reports actual distance and finishes',()=>{
 const state={pose:{x:0,z:0},cursor:0,travelled:0},path=[{x:0,z:0},{x:1,z:0},{x:1,z:1}];for(let i=0;i<100;i++){const r=advanceCityTour(state,path,2,.03,(dx,dz)=>{state.pose.x+=dx;state.pose.z+=dz;return true;});if(r.finished)break;}assert.equal(state.cursor,path.length);assert.ok(Math.abs(state.travelled-2)<1e-8);
});
