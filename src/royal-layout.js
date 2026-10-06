import {compileStreet} from './kit.js';
import {canOccupy} from './layout.js';

// Ground-level solids are the single source for both visible architecture and collision.
export function compileRoyalLayout(raw){
  if(raw.district!=='royal'||raw.royal?.name!=='听风王城')throw new Error('王城布局无效');
  const plan=compileStreet(raw,canOccupy),solids=[];
  const block=(id,x,z,w,d,h,kind='wall')=>solids.push({id,type:'box',x,z,w,d,h,kind});
  const tower=(id,x,z,r,h)=>solids.push({id,type:'circle',x,z,r,h,kind:'tower'});
  for(const side of[-1,1]){
    block('city-wall-'+side,side*23,-6,1.2,96,7.2);
    block('gate-wall-'+side,side*15,42,16,1.5,7.2);
    tower('entry-tower-'+side,side*7.5,41,2.5,13.5);
    tower('wall-corner-'+side,side*23,-53,2,11);
    block('court-wall-'+side,side*15,-37,16,1.1,3.8);
    block('court-pillar-'+side,side*5.8,-37,1.2,1.4,6.8);
    block('court-side-'+side,side*17,-47,1,19,3.8);
    block('court-bed-'+side,side*10,-47,4,8,.48,'garden');
    block('palace-wing-'+side,side*14,-65,10,12,11,'palace');
    tower('palace-tower-'+side,side*22,-65,3.2,22);
  }
  block('palace-hall',0,-65,18,12,16,'palace');
  // The old street's decorative gateway is replaced by the actual city entrance.
  plan.colliders=plan.colliders.filter(c=>!c.id.startsWith('royal-gate-'));
  plan.colliders.push(...solids);
  plan.structures=solids;plan.bounds={...raw.royal.bounds};
  plan.onGround=(x,z,r=.27)=>(z>=-59+r&&z<=41.5&&Math.abs(x)<22.4-r)||(z>41.5&&z<=50-r&&Math.abs(x)<5-r);
  plan.path=[];
  const waypoint=[{x:0,z:48},{x:0,z:33},{x:plan.center(30),z:30},{x:plan.center(-13),z:-13},{x:1.5,z:-19},{x:3.2,z:-24},{x:3.2,z:-32},{x:0,z:-40},{x:0,z:-55}];
  for(let i=1;i<waypoint.length;i++){
    const a=waypoint[i-1],b=waypoint[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);
    for(let j=0;j<n;j++){const u=j/n;plan.path.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});}
  }
  plan.path.push(waypoint.at(-1));plan.spawn={x:0,z:48};plan.destination=plan.path.at(-1);
  plan.stops=[{id:'entry',title:'敞开的听风城门',x:0,z:44},{id:'garden',title:'青瓦主街',z:8},{id:'square',title:'风铃喷泉广场',x:3.2,z:-24},{id:'castle',title:'王宫外庭',x:0,z:-55}];
  plan.length=0;
  for(let i=0;i<plan.path.length;i++){
    const p=plan.path[i];if(!canOccupy(plan,p.x,p.z,.3))throw new Error('王城导览通路被遮挡：'+i);
    if(i)plan.length+=Math.hypot(p.x-plan.path[i-1].x,p.z-plan.path[i-1].z);
  }
  plan.landmarks=[{name:'听风城门',x:0,z:42},{name:'青瓦主街',x:0,z:8},{name:'喷泉广场',x:-1,z:-24},{name:'王宫外庭',x:0,z:-49}];
  plan.portal={x:0,z:47,href:'/?street=residential',name:'回到住宅巷',text:'城门外的巷道通往住宅、集市和工坊。邮差手记随旅程保存。'};
  return plan;
}

export function royalLocation(z){return z>35?'听风城门':z>-14?'青瓦主街':z>-36?'风铃喷泉广场':'王宫外庭';}
export function mapProjection(bounds,width=240,height=320){
  const padding=22,scale=Math.min((width-padding*2)/(bounds.maxX-bounds.minX),(height-padding*2)/(bounds.maxZ-bounds.minZ));
  return{xScale:scale,zScale:scale,ox:(width-(bounds.maxX+bounds.minX)*scale)/2,oy:(height-(bounds.maxZ+bounds.minZ)*scale)/2};
}
