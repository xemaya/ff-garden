import {canOccupy} from './layout.js';

export function createMoogleBehavior(actor,plan,personIndex,{reduced=false,onDelivered=()=>{}}={}){
 const root=actor.root,anchor={x:root.position.x,z:root.position.z},own=plan.colliders.find(c=>c.id==='person-'+personIndex),safePlan={...plan,colliders:plan.colliders.filter(c=>c!==own)};
 let state='idle',approaching=false,idleTime=0,wait=0,time=0,lastGreeting=-100,nearSeen=false,patrolOut=true,target=null,delivered=0;
 const labels={idle:'在广场边等信',walk:'沿街散步',wave:'向你招手',deliver:'把信递给你'};
 function choose(next){state=next;idleTime=0;if(next!=='walk')approaching=false;actor.play({idle:'Idle',walk:'Walk',wave:'Wave',deliver:'Deliver'}[next]);}
 function face(x,z,dt){const wanted=Math.atan2(x-root.position.x,z-root.position.z),diff=Math.atan2(Math.sin(wanted-root.rotation.y),Math.cos(wanted-root.rotation.y));root.rotation.y+=diff*Math.min(1,dt*5);}
 function move(dt,player){if(!target)return;const dx=target.x-root.position.x,dz=target.z-root.position.z,d=Math.hypot(dx,dz);if(d<.025){choose('idle');return;}const step=Math.min(d,.20*dt),x=root.position.x+dx/d*step,z=root.position.z+dz/d*step;
  if(canOccupy(safePlan,x,z,.26)&&Math.hypot(player.x-x,player.z-z)>.72){root.position.x=x;root.position.z=z;face(target.x,target.z,dt);if(own){own.x=x;own.z=z;}}else choose('idle');}
 function update(dt,player,{paused=false}={}){
  if(paused)return;time+=dt;wait=Math.max(0,wait-dt);actor.update(reduced&&state==='idle'?0:dt);
  const done=actor.consumeFinished();if(done==='Deliver'&&state==='deliver'){delivered++;wait=3;onDelivered(delivered);choose('idle');}else if(done==='Wave'&&state==='wave')choose('idle');
  const d=Math.hypot(player.x-root.position.x,player.z-root.position.z);
  if(state==='deliver'||state==='wave'){face(player.x,player.z,dt);return;}
  if(d>4){nearSeen=false;if(approaching)choose('idle');}
  if(d<3.2){face(player.x,player.z,dt);
   if(!nearSeen&&!reduced&&d>1.55&&wait===0){const dx=player.x-root.position.x,dz=player.z-root.position.z;target={x:player.x-dx/d*1.40,z:player.z-dz/d*1.40};approaching=true;if(state!=='walk')choose('walk');move(dt,player);return;}
   if(!nearSeen&&!reduced&&time-lastGreeting>4&&wait===0){lastGreeting=time;choose('wave');}else if(state==='walk')choose('idle');nearSeen=true;return;
  }
  if(reduced)return;
  if(state==='idle'){idleTime+=dt;if(idleTime>4.2){target={x:anchor.x,z:anchor.z+(patrolOut?1.25:0)};if(canOccupy(safePlan,target.x,target.z,.26)){patrolOut=!patrolOut;approaching=false;choose('walk');}else idleTime=0;}}
  if(state==='walk')move(dt,player);
 }
 function deliver(player){if(Math.hypot(player.x-root.position.x,player.z-root.position.z)>1.85||state==='deliver'||wait>0)return false;lastGreeting=time;nearSeen=true;choose('deliver');return true;}
 return{actor,update,deliver,snapshot(){return{...actor.snapshot(),state,approaching,label:approaching?'正向你走来':labels[state],delivered,waiting:wait>0,collider:own?{x:own.x,z:own.z,r:own.r}:null,anchor};}};
}
