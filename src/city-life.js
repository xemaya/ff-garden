import {canOccupy} from './layout.js';

const TAU=Math.PI*2;
const lerp=(a,b,u)=>({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function environmentPlan(plan){return{...plan,colliders:plan.colliders.filter(c=>!c.id.startsWith('person-')&&!c.id.startsWith('city-neighbor-'))};}
function clearSegment(plan,a,b,r){const n=Math.max(1,Math.ceil(dist(a,b)/.12));for(let i=0;i<=n;i++){const p=lerp(a,b,i/n);if(!canOccupy(plan,p.x,p.z,r))return false;}return true;}

// Local grid routing only repairs obstructed connectors. Graph roads remain
// the source of neighborhood routes; no new GPU or language-model calls.
export function connectSafe(plan,start,end,r=.3){
  if(clearSegment(plan,start,end,r))return[start,end];
  const cell=.5,key=p=>Math.round(p.x/cell)+','+Math.round(p.z/cell),point=k=>{const[x,z]=k.split(',').map(Number);return{x:x*cell,z:z*cell};};
  function snap(p){const choices=[];for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++){const q={x:Math.round(p.x/cell)*cell+x*cell,z:Math.round(p.z/cell)*cell+z*cell};if(clearSegment(plan,p,q,r))choices.push(q);}return choices.sort((a,b)=>dist(a,p)-dist(b,p))[0];}
  const s=snap(start),e=snap(end);if(!s||!e)throw new Error('Resident endpoint is obstructed: '+JSON.stringify({start,end,r,s,e}));
  const first=key(s),last=key(e),open=[{key:first,f:dist(s,e)}],g=new Map([[first,0]]),parents=new Map(),closed=new Set();let visited=0;
  while(open.length&&visited++<30000){open.sort((a,b)=>a.f-b.f);const current=open.shift().key;if(closed.has(current))continue;closed.add(current);if(current===last){const path=[point(current)];let k=current;while(parents.has(k)){k=parents.get(k);path.push(point(k));}path.reverse();path.unshift(start);path.push(end);const simplified=[path[0]];let at=0;while(at<path.length-1){let next=at+1;for(let j=at+2;j<path.length&&j<at+25;j++)if(clearSegment(plan,path[at],path[j],r))next=j;simplified.push(path[next]);at=next;}return simplified;}
    const p=point(current);for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]){const q={x:p.x+dx*cell,z:p.z+dz*cell},k=key(q);if(closed.has(k)||!clearSegment(plan,p,q,r))continue;const value=g.get(current)+dist(p,q);if(value<(g.get(k)??Infinity)){g.set(k,value);parents.set(k,current);open.push({key:k,f:value+dist(q,e)});}}
  }throw new Error('No safe city-life connector');
}
function routeFromNodes(plan,ids){const result=[];for(let i=1;i<ids.length;i++){const a=ids[i-1],b=ids[i],edge=plan.roads.find(r=>(r.a===a&&r.b===b)||(r.a===b&&r.b===a));if(!edge)throw new Error('Missing resident graph edge '+a+'/'+b);const p=edge.a===a?edge.points:[...edge.points].reverse();if(!result.length)result.push(p[0]);result.push(...p.slice(1));}return result;}
function simplify(points,plan,r){if(points.length<=2)return points;if(dist(points[0],points.at(-1))<.005){const m=Math.floor(points.length/2);return[...simplify(points.slice(0,m+1),plan,r).slice(0,-1),...simplify(points.slice(m),plan,r)];}let best=0,at=0;const a=points[0],b=points.at(-1),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;for(let i=1;i<points.length-1;i++){const d=Math.abs((points[i].x-a.x)*dz-(points[i].z-a.z)*dx)/l;if(d>best){best=d;at=i;}}if(best<.09&&clearSegment(plan,a,b,r))return[a,b];if(!at)at=Math.floor(points.length/2);return[...simplify(points.slice(0,at+1),plan,r).slice(0,-1),...simplify(points.slice(at),plan,r)];}
export function makeLoop(plan,points,r){const safe=[];for(let i=1;i<points.length;i++){const p=connectSafe(plan,points[i-1],points[i],r);if(!safe.length)safe.push(p[0]);safe.push(...p.slice(1));}if(dist(safe[0],safe.at(-1))>.01){const p=connectSafe(plan,safe.at(-1),safe[0],r);safe.push(...p.slice(1));}const base=simplify(safe.filter((p,i)=>!i||dist(p,safe[i-1])>.002),plan,r).slice(0,-1),compact=[];
  for(let i=0;i<base.length;i++){const a=base[(i-1+base.length)%base.length],b=base[i],c=base[(i+1)%base.length],cut=Math.min(1.7,dist(a,b)*.30,dist(b,c)*.30),p=lerp(b,a,cut/dist(a,b)),q=lerp(b,c,cut/dist(b,c)),curve=[];for(let j=0;j<=12;j++){const u=j/12;curve.push(lerp(lerp(p,b,u),lerp(b,q,u),u));}if(curve.every((v,k)=>canOccupy(plan,v.x,v.z,r)&&(!k||clearSegment(plan,curve[k-1],v,r))))compact.push(...curve);else compact.push(b);}compact.push(compact[0]);const lengths=[0];for(let i=1;i<compact.length;i++)lengths.push(lengths.at(-1)+dist(compact[i-1],compact[i]));return{points:compact,lengths,length:lengths.at(-1)};}

export function sampleLoop(route,d){d=((d%route.length)+route.length)%route.length;let i=1;while(i<route.lengths.length-1&&route.lengths[i]<d)i++;const a=route.points[i-1],b=route.points[i],p=lerp(a,b,(d-route.lengths[i-1])/(route.lengths[i]-route.lengths[i-1]));const l=dist(a,b)||1;return{...p,dx:(b.x-a.x)/l,dz:(b.z-a.z)/l};}
export function makeCityLifeSpecs(plan){const env=environmentPlan(plan);
  const patrolNodes=['entry','workshops-north','workshops-mid','main-cross','west-cross','market-court','market-mid','west-entry','entry'];
  const patrol=makeLoop(env,routeFromNodes(plan,patrolNodes),.40),specs=[];
  for(let i=0;i<10;i++)specs.push({id:'patrol-'+i,kind:'mage',role:'patrol',rank:i,r:.38,speed:.72,route:patrol,offset:(i%2?1:-1)*.88,distance:19-i*1.28,wait:0});
  for(const [i,p]of plan.people.entries()){
    let route=null,speed=0,role='reading';
    if(p.species==='moogle'){role='hopping';speed=.38;route=makeLoop(env,i===0?[p,{x:-4.8,z:-23.0},{x:-4.2,z:-24.3}]:[{x:-17.1,z:19.5},{x:-17.05,z:18.6},{x:-17.2,z:21.1}],.31);}
    if(p.species==='chocobo'){role='roaming';speed=.72;route=makeLoop(env,[p,{x:3.8,z:-19.0},{x:-1.9,z:-17.3},{x:-6.5,z:-28.0},{x:-3.8,z:-31.8},{x:6.7,z:-30.1}],.64);}
    specs.push({id:'neighbor-'+i,kind:p.species,role,r:p.r,speed,route,distance:0,offset:0,anchor:{x:p.x,z:p.z},facing:p.facing||0,wait:0});
  }
  // A patrol has a reserved main/market circuit. Pedestrians circulate in
  // residential, courtyard and upper-city loops instead of entering its ranks.
  const shuttle=['weavers-entry','east-entry','east-cross','east-square','square-east','square'];
  const residential=makeLoop(env,routeFromNodes(plan,[...shuttle,...shuttle.slice(0,-1).reverse()]),.32);
  const courtyard=makeLoop(env,[{x:-14.6,z:1.5},{x:-10.5,z:1.1},{x:-10.5,z:-.8},{x:-14.6,z:-.8}],.32);
  const upperWest=makeLoop(env,routeFromNodes(plan,['square','upper-center','royal-center','royal-west','upper-west','west-square','square-west','square']),.32);
  const upperEast=makeLoop(env,routeFromNodes(plan,['square','upper-center','royal-center','royal-east','upper-east','east-square','square-east','square']),.32);
  const eastCourt=makeLoop(env,[{x:10.4,z:23.0},{x:10.4,z:29},{x:9.5,z:29},{x:9.5,z:23}],.32);
  const npcRoutes=[residential,upperWest,courtyard,upperEast,eastCourt];
  for(let i=0;i<18;i++){const route=npcRoutes[i%npcRoutes.length];specs.push({id:'townsfolk-'+i,kind:'npc',role:'townsfolk',style:i%6,seed:1907+i*31,r:.29,speed:.48+(i%4)*.09,route,distance:route.length*((i*.173+.11)%1),offset:((i%3)-1)*.08,wait:0});}
  return{specs,environment:env,patrol,counts:{patrol:10,npcs:18,moogles:2,chocobos:1,stationaryMages:2}};
}
export function createCityLife(plan,actors,{reduced=false}={}){
  const recipe=makeCityLifeSpecs(plan),env=recipe.environment,agents=recipe.specs.map(s=>({...s,actor:actors.get(s.id),distance:s.distance,time:s.kind==='npc'?(s.seed%97)*.13:0,wait:0,clip:null,moved:0,blocked:0,hop:0,yieldGoal:null,recovery:null,replanAt:0,recoveries:0}));
  const runtimePlan={...plan,colliders:[...env.colliders]};let active=!reduced,clock=0,patrolTravel=0,currentVisitor=null;const colliders=new Map();
  function desired(a,d=a.distance,offset=a.offset){if(!a.route)return{...a.anchor,dx:Math.sin(a.facing),dz:Math.cos(a.facing)};const p=sampleLoop(a.route,d);if(a.role==='patrol'){const before=sampleLoop(a.route,d-1.0),after=sampleLoop(a.route,d+1.0),dot=before.dx*after.dx+before.dz*after.dz;offset*=currentVisitor&&dist(p,currentVisitor)<3.0?1:Math.max(.30,Math.min(1,(dot-.72)/.23));}for(const u of[offset,offset*.5,0]){const q={...p,x:p.x-p.dz*u,z:p.z+p.dx*u};if(a.role==='patrol'&&currentVisitor){const delta=dist(q,currentVisitor),protect=a.r+.55;if(delta<protect){const sign=offset<0?-1:1,nx=-p.dz*sign,nz=p.dx*sign,dx=q.x-currentVisitor.x,dz=q.z-currentVisitor.z,dot=dx*nx+dz*nz,u=-dot+Math.sqrt(Math.max(0,dot*dot+protect*protect-delta*delta));q.x+=nx*u;q.z+=nz*u;}}if(canOccupy(env,q.x,q.z,a.r))return q;}return p;}
  function put(a,p){a.actor.root.position.x=p.x;a.actor.root.position.z=p.z;a.actor.root.position.y=plan.height(p.x,p.z)+.063+a.hop;const c=colliders.get(a.id);if(c){c.x=p.x;c.z=p.z;}}
  function clear(a,p,player){if(!canOccupy(env,p.x,p.z,a.r))return false;if(player&&Math.hypot(p.x-player.x,p.z-player.z)<a.r+.35&&dist(p,player)<=dist(a.actor.root.position,player)+.00001)return false;for(const b of agents){if(b===a||!b.actor)continue;const q=b.actor.root.position;if(Math.hypot(q.x-p.x,q.z-p.z)<a.r+b.r+.07)return false;}return true;}
  // Staggered two-column formation remains separated even when an obstacle
  // makes one guard use the centre of the lane.
  const placed=[];
  for(const a of agents){if(!a.actor)continue;let p=desired(a);for(let attempt=0;a.route&&placed.some(b=>dist(p,b.actor.root.position)<(a.role!=='patrol'&&b.role==='patrol'?1.85:a.r+b.r+.10))&&attempt<120;attempt++){a.distance+=.73;p=desired(a);}if(placed.some(b=>dist(p,b.actor.root.position)<a.r+b.r+.07))throw new Error('No personal space at resident spawn '+a.id);put(a,p);a.actor.root.rotation.y=Math.atan2(p.dx||0,p.dz||1);const c={id:a.id,type:'circle',x:p.x,z:p.z,r:a.r};colliders.set(a.id,c);runtimePlan.colliders.push(c);placed.push(a);}
  for(const a of agents)a.originDistance=a.distance;
  function update(dt,player,{paused=false}={}){if(paused||!active)return;dt=Math.min(dt,.08);clock+=dt;currentVisitor=player;const squad=agents.filter(a=>a.actor&&a.role==='patrol');if(squad.every(a=>dist(a.actor.root.position,desired(a,a.originDistance+patrolTravel))<.50&&clear(a,desired(a,a.originDistance+patrolTravel+.72*dt),player)))patrolTravel+=.72*dt;
    for(const a of agents){if(!a.actor)continue;a.time+=dt;const root=a.actor.root,old={x:root.position.x,z:root.position.z};a.hop=0;let walked=false;
      if(a.route){a.wait=Math.max(0,a.wait-dt);const step=a.wait?0:a.speed*dt;let next=a.role==='patrol'?a.originDistance+patrolTravel:a.distance+step,target=desired(a,next);
        if(a.recovery){while(a.recovery.cursor<a.recovery.points.length&&dist(old,a.recovery.points[a.recovery.cursor])<.065)a.recovery.cursor++;if(a.recovery.cursor>=a.recovery.points.length){a.distance=a.recovery.nextD;a.recovery=null;next=a.distance;}else{next=a.distance;target=a.recovery.points[a.recovery.cursor];}}
        if(a.kind==='npc'&&a.route){const near=agents.filter(b=>b.actor&&b.role==='patrol').sort((b,c)=>dist(old,b.actor.root.position)-dist(old,c.actor.root.position))[0];const nearDistance=near?dist(old,near.actor.root.position):100;if(a.yieldGoal&&dist(old,a.yieldGoal)>.12&&!clear(a,a.yieldGoal,player))a.yieldGoal=null;if(nearDistance<2.5&&!a.yieldGoal){const lane=sampleLoop(near.route,near.distance);pickYield:for(const offset of[2.1,-2.1,1.85,-1.85])for(const forward of[0,.8,-.8]){const q={x:lane.x-lane.dz*offset+lane.dx*forward,z:lane.z+lane.dx*offset+lane.dz*forward};if(clear(a,q,player)){a.yieldGoal=q;break pickYield;}}}if(a.yieldGoal&&nearDistance>3.3)a.yieldGoal=null;if(a.yieldGoal&&!a.recovery){next=a.distance;target=a.yieldGoal;}}
        const dx=target.x-old.x,dz=target.z-old.z,d=Math.hypot(dx,dz),amount=Math.min(d,Math.max(a.speed,1.0)*dt),p=d>.0001?{x:old.x+dx/d*amount,z:old.z+dz/d*amount}:old;
        if(clear(a,p,player)){a.distance=next;a.moved+=dist(old,p);walked=dist(old,p)>.0001;put(a,p);a.blocked=0;}else{a.blocked+=dt;/* Local avoidance also handles visitors and opposite-direction walkers. */if(a.blocked>.6||(player&&dist(old,player)<2.0)){const base=sampleLoop(a.route,a.distance);for(const side of[1,-1]){const q={x:old.x-base.dz*side*.80*dt,z:old.z+base.dx*side*.80*dt};if(clear(a,q,player)){put(a,q);a.moved+=dist(old,q);walked=true;break;}}}}
        if(a.blocked>1.3&&a.role!=='patrol'&&a.time>a.replanAt){a.replanAt=a.time+2.5;const nearby=agents.filter(b=>b!==a&&b.actor&&dist(old,b.actor.root.position)<4.5).map(b=>({id:b.id,type:'circle',x:b.actor.root.position.x,z:b.actor.root.position.z,r:b.r+.07}));if(player&&dist(old,player)<5)nearby.push({id:'visitor',type:'circle',x:player.x,z:player.z,r:.37});const dynamic={...env,colliders:[...env.colliders,...nearby]};for(const ahead of a.yieldGoal?[0]:[2.0,3.3,4.5]){const q=a.yieldGoal||desired(a,a.distance+ahead,0);if(!canOccupy(dynamic,q.x,q.z,a.r))continue;try{const points=connectSafe(dynamic,old,q,a.r);a.recovery={points,cursor:1,nextD:a.distance+ahead};a.recoveries++;a.blocked=0;break;}catch{}}}
        const p2=sampleLoop(a.route,a.distance+.45),yaw=walked?Math.atan2(root.position.x-old.x,root.position.z-old.z):Math.atan2(p2.dx,p2.dz),diff=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));root.rotation.y+=diff*Math.min(1,dt*6);
        if(a.kind==='moogle'&&walked){const u=(a.time%1.25)/1.25;a.hop=u<.74?.16*Math.sin(u/.74*Math.PI):0;root.position.y=plan.height(root.position.x,root.position.z)+.063+a.hop;root.scale.y=1+(u>.74?-.025*Math.sin((u-.74)/.26*Math.PI):0);}
        if(a.kind==='npc'&&a.time>6&&Math.floor((a.time-dt)/12)!==Math.floor(a.time/12))a.wait=1.4+(a.seed%3)*.35;
      }
      let clip=walked?'Walk':'Idle';if(a.role==='reading')clip=a.time%16>11?'Magic':'Idle';if(a.kind==='moogle'&&!walked&&a.time%12>9)clip='Wave';
      if(a.actor.play&&a.clip!==clip){a.actor.play(clip,.18);a.clip=clip;}if(a.actor.mixer)a.actor.mixer.timeScale=walked?Math.max(.65,Math.min(1.8,dist(old,root.position)/(dt*(a.kind==='mage'?.53:a.kind==='moogle'?.24:.60)))):1;a.actor.update(dt,walked);if(!walked&&a.kind==='moogle')root.scale.y=1;
    }
  }
  return{plan:runtimePlan,agents,update,setActive(value){active=Boolean(value);},get active(){return active;},snapshot(){return{active,time:clock,counts:recipe.counts,agents:agents.filter(a=>a.actor).map(a=>({id:a.id,kind:a.kind,role:a.role,x:a.actor.root.position.x,y:a.actor.root.position.y,z:a.actor.root.position.z,clip:a.clip,moved:a.moved,routeProgress:a.distance-a.originDistance,recoveries:a.recoveries,hop:a.hop,waiting:a.wait>0,blocked:a.blocked,yielding:Boolean(a.yieldGoal)}))};},view(name){
    const group=agents.filter(a=>a.actor&&(name==='patrol'?a.role==='patrol':name==='moogle'?a.kind==='moogle':a.kind===name));if(!group.length)return null;
    const lead=group[0],p=lead.actor.root.position;if(name==='patrol'){const q=sampleLoop(lead.route,lead.distance-15.0),target=sampleLoop(lead.route,lead.distance-3);return{position:[q.x,2.2+plan.height(q.x,q.z),q.z],target:[target.x,1.0+plan.height(target.x,target.z),target.z]};}
    for(const [x,z]of[[p.x+1.6,p.z+2.8],[p.x-1.6,p.z+2.8],[p.x,p.z-3.1]])if(canOccupy(runtimePlan,x,z,.3))return{position:[x,plan.height(x,z)+1.7,z],target:[p.x,plan.height(p.x,p.z)+(name==='chocobo'?1.1:.7),p.z]};return null;
  }};
}
