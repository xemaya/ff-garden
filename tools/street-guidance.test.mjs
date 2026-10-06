import test from 'node:test';import assert from 'node:assert/strict';
import {targetDirection,streetGuidance} from '../src/street-guidance.js';
const player={x:0,z:0,yaw:0},target={species:'moogle',exists:true,loaded:true,position:{x:0,z:-42}},snapshot={chapter:0,state:'available',ending:false},base={snapshot,target,interaction:{near:false,busy:false},player};
test('eight directions use camera yaw, not world north, and wrap correctly',()=>{
 for(const [x,z,direction]of[[0,-10,'前方'],[10,-10,'右前方'],[10,0,'右侧'],[10,10,'右后方'],[0,10,'后方'],[-10,10,'左后方'],[-10,0,'左侧'],[-10,-10,'左前方']])assert.equal(targetDirection(player,{x,z}).direction,direction);
 assert.equal(targetDirection({...player,yaw:Math.PI/2},{x:-10,z:0}).direction,'前方');
 for(const yaw of[-Math.PI,Math.PI,Math.PI*3])assert.equal(targetDirection({...player,yaw},{x:0,z:10}).direction,'前方');
 assert.equal(targetDirection({...player,yaw:NaN},target.position),null);assert.equal(targetDirection(player,{x:0,z:-.2}).meters,1);
});
test('distant guidance labels a straight estimate and cannot claim a walkable route',()=>{
 const before=JSON.stringify(base),g=streetGuidance(base);assert.equal(g.kind,'direction');assert.match(g.text,/前方 约42米/);assert.match(g.text,/直线估计.*沿路绕行/);assert.equal(JSON.stringify(base),before);
});
test('nearby, busy, reply, approaching and incomplete chapters replace directional text',()=>{
 for(const [state,expected]of[['available','接取委托'],['carrying','交出信件'],['reply','节拍回应']]){const g=streetGuidance({...base,snapshot:{...snapshot,state},interaction:{near:true}});assert.equal(g.kind,'near');assert(g.text.includes(expected));assert(!g.text.includes('约'));}
 assert.match(streetGuidance({...base,interaction:{near:true,busy:true}}).text,/稍候/);
 assert.equal(streetGuidance({...base,interaction:{approaching:true}}).kind,'approaching');
 assert.equal(streetGuidance({...base,snapshot:{...snapshot,state:'completed'}}).kind,'next');
 assert.equal(streetGuidance({...base,snapshot:{chapter:2,state:'completed',ending:true}}),null);
});
test('planned unloaded or failed people do not claim interaction readiness or a live distance',()=>{
 for(const failed of[false,true]){const g=streetGuidance({...base,target:{...target,loaded:false,failed},interaction:{near:true}});assert.equal(g.kind,'loading');assert.match(g.text,/加载/);assert.doesNotMatch(g.text,/就在身边|约42|接取委托/);}
 assert.equal(streetGuidance({...base,target:{exists:false}}),null);
});
test('caption stays within two short lines and relinquishes maps, notebooks, study and constrained viewports',()=>{
 for(const width of[320,600,1024]){const g=streetGuidance({...base,width,height:600,target:{...target,species:'chocobo',position:{x:80,z:80}}});assert(g);assert.equal(g.text.split('\n').length,2);assert(g.text.split('\n').every(line=>line.length<=18));if(width<=600)for(const line of g.text.split('\n'))assert([...line].reduce((sum,c)=>sum+(/[\u3400-\u9fff]/.test(c)?10:5),0)<=105,'compact caption fits existing 105px column at nominal 10px font');}
 for(const mode of['map','study','transition'])assert.equal(streetGuidance({...base,mode}),null);
 for(const extra of[{notebookOpen:true},{width:319},{height:399},{snapshot:{...snapshot,resetPending:true}},{snapshot:{...snapshot,recoveryPending:true}}])assert.equal(streetGuidance({...base,...extra}),null);
});
