// Pure placement for the street-dressing kit. Runs inside compileCity, so the
// node checks see the same ground colliders the browser walks against.
import {rng,canOccupy} from './layout.js';

const KITS={
  market:[['crates',.42],['barrel',.36],['produce',.38],['sacks',.34]],
  residential:[['pots',.32],['pots',.32],['bench-pot',.30],['barrel',.36]],
  arrival:[['barrel',.36],['crates',.42],['pots',.32]],
  upper:[['pots',.32],['planter',.36],['pots',.32]]
};
const SMALL=[['pot',.22],['sack',.24]];
// Ground props keep this much free distance from every road centerline and the tour,
// so the patrol formation, passers-by and the walking checks keep their lanes.
const LANE=1.9;

function segDist(px,pz,a,b){const dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((px-a.x)*dx+(pz-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(px-a.x-u*dx,pz-a.z-u*dz);}
function polyDist(px,pz,points){let d=Infinity;for(let i=1;i<points.length;i++)d=Math.min(d,segDist(px,pz,points[i-1],points[i]));return d;}

export function planCityDressing(plan){
  const random=rng(plan.seed*7+31),urban=plan.buildings.filter(b=>b.detail==='urban');
  const out={props:[],lanterns:[],vines:[],lines:[]},colliders=[];
  const frame=b=>{const r=b.rotation||0;return{n:{x:Math.sin(r),z:Math.cos(r)},t:{x:Math.cos(r),z:-Math.sin(r)}};};
  const at=(b,u,off)=>{const{n,t}=frame(b);return{x:b.x+t.x*u+n.x*off,z:b.z+t.z*u+n.z*off};};
  const laneClear=(x,z,r)=>plan.roads.every(road=>polyDist(x,z,road.points)>=r+LANE)&&polyDist(x,z,plan.tour)>=r+LANE;
  const free=(x,z,r,own)=>canOccupy({...plan,colliders:plan.colliders.filter(c=>c.id!==own)},x,z,r)||!plan.onGround(x,z,r);
  const notInside=(x,z,r,own)=>plan.colliders.every(c=>c.id===own||c.type!=='box'||(()=>{const co=Math.cos(c.rotation||0),si=Math.sin(c.rotation||0),dx=x-c.x,dz=z-c.z,lx=dx*co-dz*si,lz=dx*si+dz*co;return Math.hypot(Math.max(0,Math.abs(lx)-c.w/2),Math.max(0,Math.abs(lz)-c.d/2))>=r;})());
  function place(b,kind,r,u){const off=.42+r,p=at(b,u,off),id='dress-'+b.id+'-'+out.props.length;
    if(!laneClear(p.x,p.z,r)||!notInside(p.x,p.z,r,b.id)||!free(p.x,p.z,r,b.id))return false;
    out.props.push({id,kind,x:p.x,z:p.z,y:b.y,rotation:b.rotation||0,r,seed:Math.floor(random()*1e6)});colliders.push({id,type:'circle',x:p.x,z:p.z,r});return true;}

  for(const b of urban){const w=b.width,shop=b.kind!=='home'&&b.kind!=='inn',kit=KITS[b.district]||KITS.residential;
    // Between the ground-floor window and the door.
    const winEdge=-w*.22+(shop?.83:.53),doorEdge=w*.28-.55,mid=(winEdge+doorEdge)/2;
    if(random()<.72){const[k,r]=kit[Math.floor(random()*kit.length)];if(doorEdge-winEdge>=2*r+.1)place(b,k,r,mid);}
    // A small pot or sack at the right-hand corner, clear of the door.
    if(random()<.45){const[k,r]=SMALL[Math.floor(random()*SMALL.length)];place(b,k,r,w/2-.3);}
    if(random()<.62){const p=at(b,w*.28+.78,.2);out.lanterns.push({x:p.x,z:p.z,y:b.y+2.45,rotation:b.rotation||0});}
    if(random()<.34){const p=at(b,-w/2+.14,.1);out.vines.push({x:p.x,z:p.z,y:b.y,rotation:b.rotation||0,height:b.height*(.45+random()*.35),seed:Math.floor(random()*1e6)});}
  }

  // Laundry and bunting between facing facades across the narrow lanes.
  for(let i=0;i<urban.length;i++)for(let j=i+1;j<urban.length;j++){const a=urban[i],b=urban[j],fa=frame(a),fb=frame(b);
    if(fa.n.x*fb.n.x+fa.n.z*fb.n.z>-.95||a.y!==b.y)continue;
    const dx=b.x-a.x,dz=b.z-a.z,across=dx*fa.n.x+dz*fa.n.z,lateral=Math.abs(dx*fa.t.x+dz*fa.t.z);
    if(across<3.5||across>8.2||lateral>1.6)continue;
    const y=a.y+Math.min(a.height,b.height)-1.25,u=-.4,pa=at(a,u,.12),pb=at(b,-u,.12);
    const kind=a.district==='residential'||(a.district==='upper'&&random()<.5)?'laundry':'bunting';
    if(random()<.8)out.lines.push({kind,a:{x:pa.x,y,z:pa.z},b:{x:pb.x,y:y+(random()-.5)*.3,z:pb.z},seed:Math.floor(random()*1e6)});
  }
  return{dressing:out,colliders};
}
