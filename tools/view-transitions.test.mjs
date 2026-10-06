import test from 'node:test';
import assert from 'node:assert/strict';
import {captureStreetPose} from '../src/view-transitions.js';

test('reopening the map during return keeps the original street pose, not the flying camera',()=>{
  const original={x:3,z:48,y:1.68,yaw:.4,pitch:.13},enter=captureStreetPose(original,null);
  const flying={x:1,z:19,y:70,yaw:0,pitch:-1.3},reopen=captureStreetPose(flying,{returningToStreet:true,target:enter});
  assert.deepEqual(reopen,original);reopen.x=20;assert.equal(enter.x,3);
  assert.deepEqual(captureStreetPose(flying,{returningToStreet:false,target:original}),flying);
});
test('a completed return or ordinary street position becomes the next anchor without an old target',()=>{
  const walked={x:-4,z:-20,y:1.68,yaw:-.3,pitch:.2};assert.deepEqual(captureStreetPose(walked,null),walked);assert.deepEqual(captureStreetPose(walked,{target:{x:0,z:48}}),walked);
});
