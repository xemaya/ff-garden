import * as THREE from 'three';
import {plain} from './materials.js';
import {rng} from './layout.js';
import {cityHeight} from './city-plan.js';
import {batchStatic} from './batch.js';

let kit;
export function initCityMaterials(hero){
  const plaster=[0xe8dcc1,0xcbd3bf,0xe0cfb6,0xd5c8ac].map(color=>new THREE.MeshStandardMaterial({map:hero.plaster.map,bumpMap:hero.plaster.map,bumpScale:.017,color,roughness:.96}));
  const wood=hero.wood.clone();wood.color.setHex(0xa39179);
  const roof=[hero['roof-clay'].clone(),hero['roof-teal'].clone()];
  roof[0].color.setHex(0xc7ac97);roof[1].color.setHex(0x9dada3);
  kit={plaster,wood,roof,paving:hero.pavers,stone:new THREE.MeshStandardMaterial({map:hero.plaster.map,color:0xc3baa5,roughness:.96}),dark:plain(0x293d40),gold:plain(0x978058,.63,.25),iron:plain(0x424c46,.78,.16),cloth:[plain(0xdfcda8),plain(0xa96751)],ivy:plain(0x6c7850)};
}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,m,x=0,y=0,z=0){return mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function beam(g,a,b,w=.1,m=kit.wood){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),v=to.clone().sub(from),o=mesh(g,new THREE.BoxGeometry(w,v.length(),w),m);o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function arch(w,h){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,h-w/2);s.quadraticCurveTo(-w/2,h,0,h);s.quadraticCurveTo(w/2,h,w/2,h-w/2);s.lineTo(w/2,0);s.closePath();return s;}
function window(g,x,y,z,w=.78,h=1.45){
  mesh(g,new THREE.ShapeGeometry(arch(w,h),10),kit.dark,x,y,z);
  const rim=arch(w+.21,h+.10);rim.holes.push(new THREE.Path(arch(w,h).getPoints(10)));mesh(g,new THREE.ExtrudeGeometry(rim,{depth:.085,bevelEnabled:false,curveSegments:8}),kit.wood,x,y-.02,z+.016);
  box(g,.045,h-.08,.04,kit.gold,x,y+h/2,z+.10);box(g,w,.045,.04,kit.gold,x,y+h*.43,z+.10);box(g,w+.3,.105,.24,kit.stone,x,y-.07,z+.1);
  for(const side of[-1,1]){const shutter=box(g,w*.25,h*.77,.08,kit.wood,x+side*w*.67,y+h*.41,z+.04);shutter.rotation.y=side*.20;box(g,w*.28,.075,.09,kit.gold,x+side*w*.67,y+.21,z+.09);}
}
function curvedRoof(w,d,rise,detail=true){const pos=[],uv=[],nx=detail?22:10,nz=detail?16:6;
  function vertex(i,j){const u=i/nx,v=j/nz,x=(u-.5)*w,z=(v-.5)*d,edge=Math.abs(x)/(w/2);return[x,rise*(1-edge)**1.5+.10*edge*edge+(detail?Math.sin(v*Math.PI*nz)*.025:0),z];}
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)for(const[a,b]of[[i,j],[i,j+1],[i+1,j],[i+1,j],[i,j+1],[i+1,j+1]]){pos.push(...vertex(a,b));uv.push(a/nx*w/2.4,b/nz*d/2.4);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;
}
function urbanHouse(b,far=false){const g=new THREE.Group(),w=b.width,h=b.height,d=b.depth,a=b.assembly,wall=kit.plaster[b.seed%kit.plaster.length];
  box(g,w,h,d,wall,0,h/2,-d/2);box(g,w+.16,.26,d+.12,kit.stone,0,.13,-d/2);
  mesh(g,curvedRoof(w+.8,d+.8,a.roofRise,!far),kit.roof[a.roof==='teal'?1:0],0,h,-d/2);
  for(const z of[.16,-d-.16]){const s=new THREE.Shape();s.moveTo(-w/2,0);for(let i=0;i<=16;i++){const x=-w/2+i*w/16;s.lineTo(x,a.roofRise*(1-Math.abs(x)/(w/2))**1.5);}s.lineTo(w/2,0);s.closePath();mesh(g,new THREE.ShapeGeometry(s),wall,0,h,z).material.side=THREE.DoubleSide;}
  beam(g,[0,h+a.roofRise,.45],[0,h+a.roofRise,-d-.45],.15);
  for(const x of[-w/2,w/2])beam(g,[x,h,.40],[x,h,-d-.40],.19);
  if(a.chimney==='tall-stone'){box(g,.65,3.0,.7,kit.stone,w*.29,h+1.0,-d*.65);box(g,.84,.17,.9,kit.wood,w*.29,h+2.55,-d*.65);}
  if(!far){
    for(const [z,angle]of[[.19,0],[-d-.19,Math.PI]]){const f=new THREE.Group();f.position.z=z;f.rotation.y=angle;g.add(f);window(f,0,h+.44,.06,.64,1.13);for(const side of[-1,1]){beam(f,[side*w*.42,h+.10,.08],[side*w*.10,h+a.roofRise*.70,.08],.11);for(let i=0;i<12;i++){const x0=side*(w+.8)/2*i/12,x1=side*(w+.8)/2*(i+1)/12,y0=h+a.roofRise*(1-i/12)**1.5+.10*(i/12)**2,y1=h+a.roofRise*(1-(i+1)/12)**1.5+.10*((i+1)/12)**2;beam(f,[x0,y0,.20],[x1,y1,.20],.10);}}}
    // Four complete faces support walking around blocks, not just a front facade.
    for(const [fw,depth,angle,px,pz]of[[w,d,0,0,0],[w,d,Math.PI,0,-d],[d,w,Math.PI/2,w/2,-d/2],[d,w,-Math.PI/2,-w/2,-d/2]]){
      const f=new THREE.Group();f.position.set(px,0,pz);f.rotation.y=angle;g.add(f);
      for(const y of[.25,3.3,h-.1])box(f,fw+.10,.15,.17,kit.wood,0,y,.12);
      for(const x of[-fw/2+.1,0,fw/2-.1])box(f,.16,h,.18,kit.wood,x,h/2,.12);
      for(const y of[4.0,...(a.stories===3?[6.38]:[])])for(const x of[-fw*.27,fw*.27])window(f,x,y,.12,.72,a.stories===3&&y>6?1.3:1.5);
      for(const side of[-1,1])beam(f,[side*fw*.42,3.48,.18],[side*fw*.12,h-.35,.18],.10);
      if(angle!==0)for(const x of[-fw*.27,fw*.27])window(f,x,1.0,.12,.65,1.45);
    }
    mesh(g,new THREE.ShapeGeometry(arch(1.03,2.38),10),kit.wood,w*.28,.10,.13);box(g,.07,2.08,.1,kit.gold,w*.28,1.15,.16);box(g,1.28,.13,.45,kit.stone,w*.28,.065,.28);
    const shop=b.kind!=='home'&&b.kind!=='inn';window(g,-w*.22,.84,.16,shop?1.66:1.05,1.62);
    if(shop){box(g,1.8,.13,.6,kit.wood,-w*.22,.76,.30);for(let i=0;i<5;i++)box(g,.18,.23+(i%3)*.04,.17,kit.plaster[i%4],-w*.22-.58+i*.27,1.07,.34);}
    if(a.awning==='striped'){for(let i=0;i<8;i++){const o=box(g,w*.095,.055,1.02,kit.cloth[i%2],-w*.38+i*w*.108,2.69,.65);o.rotation.x=.18;box(g,w*.095,.18,.04,kit.cloth[i%2],-w*.38+i*w*.108,2.5,1.14);}}
    if(a.balcony==='timber'){box(g,w*.60,.14,1.0,kit.wood,0,4.02,.6);beam(g,[-w*.29,4.78,1.08],[w*.29,4.78,1.08],.09);for(let i=0;i<7;i++)box(g,.045,.67,.05,kit.wood,-w*.27+i*w*.09,4.42,1.08);}
    if(a.bay==='octagonal'){const bay=mesh(g,new THREE.CylinderGeometry(.82,.82,1.9,8),wall,-w*.2,4.48,.34);for(const x of[-.42,.42])window(g,-w*.2+x,3.92,1.08,.38,1.25);mesh(g,new THREE.ConeGeometry(1.04,1.45,8),kit.roof[1],-w*.2,6.10,.34);void bay;}
    const sign=mesh(g,new THREE.CylinderGeometry(.33,.33,.09,16),kit.wood,-w*.41,3.6,.88);sign.rotation.x=Math.PI/2;beam(g,[-w*.41,4.14,.10],[-w*.41,4.14,.9],.038,kit.iron);beam(g,[-w*.41,4.14,.9],[-w*.41,3.88,.9],.024,kit.iron);
    for(const x of[-w*.4,w*.4]){mesh(g,new THREE.CylinderGeometry(.16,.11,.30,10),kit.stone,x,.15,.43);const leaves=mesh(g,new THREE.IcosahedronGeometry(.23,0),kit.ivy,x,.47,.43);leaves.scale.y=.72;}
  }else{
    for(const [fw,angle,x,z]of[[w,0,0,.02],[w,Math.PI,0,-d-.02],[d,Math.PI/2,w/2+.02,-d/2],[d,-Math.PI/2,-w/2-.02,-d/2]]){const f=new THREE.Group();f.position.set(x,0,z);f.rotation.y=angle;g.add(f);for(const y of[.3,3.3,h-.1])box(f,fw,.13,.09,kit.wood,0,y,.02);for(const xx of[-fw*.43,fw*.43])box(f,.14,h,.10,kit.wood,xx,h/2,.02);for(const yy of[1.1,4.1,...(a.stories===3?[6.5]:[])])for(const xx of[-fw*.25,fw*.25])mesh(f,new THREE.ShapeGeometry(arch(.65,1.25),5),kit.dark,xx,yy,.09);}
  }
  g.position.set(b.x,b.y,b.z);g.rotation.y=b.rotation;return g;
}
export function buildCityBlocks(plan){const groups=[],metrics={districtBatches:[],urbanBuildings:0};
  // Spatial chunks keep culling and detail reduction local as the city grows.
  const chunks=new Map();for(const b of plan.buildings.filter(b=>b.detail==='urban')){const key=b.district+'-'+Math.floor((b.z+70)/27);if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(b);}
  for(const [id,buildings]of chunks){const near=new THREE.Group(),far=new THREE.Group(),cx=buildings.reduce((n,b)=>n+b.x,0)/buildings.length,cz=buildings.reduce((n,b)=>n+b.z,0)/buildings.length;
    for(const b of buildings){near.add(urbanHouse(b));far.add(urbanHouse(b,true));metrics.urbanBuildings++;}
    const closeBatch=batchStatic(near),farBatch=batchStatic(far),lod=new THREE.LOD();lod.position.set(cx,0,cz);near.position.set(-cx,0,-cz);far.position.set(-cx,0,-cz);lod.addLevel(near,0);lod.addLevel(far,130,.10);lod.name='city-block-'+id;groups.push(lod);metrics.districtBatches.push({id,buildings:buildings.length,near:closeBatch.batches,far:farBatch.batches});
  }return{groups,metrics};
}
export function buildCityBacks(plan){const g=new THREE.Group();
  // The approved front street stays intact; its formerly hidden backs now
  // face courtyards and need the same architectural vocabulary.
  for(const b of plan.buildings.filter(b=>b.detail==='hero')){const root=new THREE.Group();root.position.set(b.x,0,b.z);root.rotation.y=b.rotation;g.add(root);const rear=new THREE.Group();rear.position.z=-b.depth-.04;rear.rotation.y=Math.PI;root.add(rear);
    for(const y of[.34,3.34,b.height-.12])box(rear,b.width,.16,.12,kit.wood,0,y,.03);
    for(const x of[-b.width/2+.1,0,b.width/2-.1])box(rear,.17,b.height,.14,kit.wood,x,b.height/2,.04);
    for(const x of[-b.width*.25,b.width*.25]){window(rear,x,4.07,.08,.82,1.48);beam(rear,[Math.sign(x)*b.width*.43,3.54,.09],[Math.sign(x)*b.width*.10,b.height-.38,.09],.11);}
    window(rear,-b.width*.24,1.08,.09,.75,1.45);mesh(rear,new THREE.ShapeGeometry(arch(.98,2.15),10),kit.wood,b.width*.26,.09,.08);box(rear,.06,1.8,.05,kit.gold,b.width*.26,1.10,.13);
  }return g;
}
function flat(g,w,d,x,y,z,m){const geo=new THREE.PlaneGeometry(w,d);geo.rotateX(-Math.PI/2);const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/4,uv.getY(i)*d/4);const o=mesh(g,geo,m,x,y,z);o.castShadow=false;return o;}
function roadRibbon(road){const pos=[],uv=[];let distance=0;
  for(let i=1;i<road.points.length;i++){const a=road.points[i-1],b=road.points[i],length=Math.hypot(b.x-a.x,b.z-a.z),segments=Math.max(1,Math.ceil(length/.20)),nx=-(b.z-a.z)/length*road.width/2,nz=(b.x-a.x)/length*road.width/2;
    for(let j=0;j<segments;j++){const aa={x:a.x+(b.x-a.x)*j/segments,z:a.z+(b.z-a.z)*j/segments},bb={x:a.x+(b.x-a.x)*(j+1)/segments,z:a.z+(b.z-a.z)*(j+1)/segments};for(const[p,side,u]of[[aa,-1,0],[aa,1,1],[bb,-1,0],[aa,1,1],[bb,1,1],[bb,-1,0]]){pos.push(p.x+side*nx,cityHeight(p.x,p.z)+.066,p.z+side*nz);uv.push(u*road.width/4,(distance+Math.hypot(p.x-a.x,p.z-a.z))/4);}}distance+=length;
  }const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();return geo;
}
export function buildCityGround(plan){const g=new THREE.Group();
  // Stone district floors join the street into a city. Outside is the meadow.
  box(g,67,.5,87,kit.stone,.5,-.27,5.5);flat(g,67,87,.5,.008,5.5,kit.paving);
  box(g,67,1.95,11,kit.stone,.5,.465,-45.5);flat(g,67,11,.5,1.461,-45.5,kit.paving);
  box(g,67,3.4,16,kit.stone,.5,1.2,-61);flat(g,67,16,.5,2.911,-61,kit.paving);
  for(const road of plan.roads){const o=mesh(g,roadRibbon(road),kit.paving);o.castShadow=false;}
  for(const start of[-38,-51]){
    const base=start===-38?0:1.45;
    for(const x of[-17,0,17])for(let i=0;i<8;i++){box(g,x===0?5.6:4.65,(i+1)*.18125,.251,kit.stone,x,base+(i+1)*.18125/2,start-(i+.5)*.25);}
    for(const [x,w]of[[-26,13],[-8.3,9.3],[8.3,9.3],[26,13]])box(g,w,1.4,.4,kit.stone,x,base+.7,start-.06);
    for(const x of[-20,-14, -3.4,3.4,14,20]){box(g,.28,.91,2.2,kit.stone,x,base+.76,start-1);box(g,.33,.11,2.3,kit.wood,x,base+1.28,start-1);}
  }
  // The royal backdrop has a real hillside foundation and a stair connection.
  box(g,49,7.1,38,kit.stone,-1,3.45,-119);flat(g,49,38,-1,7.006,-119,kit.paving);
  for(let i=0;i<12;i++)box(g,12.8,3.0+i*.34,.95,kit.stone,-1,(3.0+i*.34)/2-.1,-100.5-i*.94);
  for(const side of[-1,1])box(g,8.5,4.8,9,kit.stone,side*11.5,2.3,-103.5);
  // Courtyards are small inhabited pockets, with low planted edges.
  for(const c of plan.courtyards)flat(g,c.w,c.d,c.x,.084,c.z,kit.paving);
  for(const c of plan.courtyardPlanters){box(g,c.w,.48,c.d,kit.stone,c.x,.24,c.z);for(let i=0;i<5;i++){const f=mesh(g,new THREE.IcosahedronGeometry(.20,0),kit.ivy,c.x+(c.w>.5?(i-2)*c.w*.15:0),.58,c.z+(c.d>.5?(i-2)*c.d*.15:0));f.scale.set(.74,.65,1);}}

  // Raised planted strips, not leftover grass between isolated buildings.
  for(const [x,z,w,d]of[[-31.2,11,1,24],[32,10,1,26]]){box(g,w,.35,d,kit.stone,x,.17,z);box(g,w-.25,.035,d-.25,kit.ivy,x,.37,z);}
  return g;
}
function archway(g,x,z,width=5.4,y=0){for(const side of[-1,1]){box(g,.68,3.1,.8,kit.stone,x+side*(width/2+.35),y+1.55,z);box(g,.94,.2,1,kit.wood,x+side*(width/2+.35),y+3.0,z);}const s=arch(width+1.5,4.5);s.holes.push(new THREE.Path(arch(width,4.0).getPoints(20)));mesh(g,new THREE.ExtrudeGeometry(s,{depth:.6,bevelEnabled:false}),kit.stone,x,y,z-.3);}
export function buildCityEdges(plan){const g=new THREE.Group(),random=rng(plan.seed);
  for(const side of[-1,1]){box(g,1.1,3.2,111,kit.stone,side<0?-33:34,1.4,-10);box(g,1.4,.22,111.5,kit.wood,side<0?-33:34,3.1,-10);for(let z=43;z>-67;z-=7.3)box(g,1.5,.60,.95,kit.stone,side<0?-33:34,3.37,z);}
  for(const side of[-1,1])box(g,28.2,3.2,1.1,kit.stone,side*18.7,1.4,46.8);
  archway(g,0,46.8,6.5);for(const x of[-7.0,7.0]){box(g,3.1,6.9,3.5,kit.stone,x,3.45,46.8);mesh(g,new THREE.ConeGeometry(2.55,3.1,8),kit.roof[1],x,8.4,46.8);window(g,x,4.5,48.59,1,1.65);}
  // A clock over the market junction supplies a second local landmark.
  const tower=new THREE.Group();tower.position.set(-27.7,0,-12);g.add(tower);box(tower,3.1,12,3.3,kit.plaster[1],0,6,0);for(const y of[3,7.7,11.5])box(tower,3.4,.22,3.6,kit.wood,0,y,0);mesh(tower,new THREE.ConeGeometry(2.7,4.4,4),kit.roof[1],0,14.2,0).rotation.y=Math.PI/4;
  for(const r of[0,Math.PI/2]){const clock=new THREE.Group();clock.rotation.y=r;tower.add(clock);mesh(clock,new THREE.CircleGeometry(.91,24),kit.gold,0,9.7,1.69);mesh(clock,new THREE.CircleGeometry(.81,24),kit.dark,0,9.7,1.70);beam(clock,[0,9.7,1.73],[0,10.30,1.73],.045,kit.gold);beam(clock,[0,9.7,1.73],[.44,9.92,1.73],.045,kit.gold);}
  // Reused timber arches give side alleys an identity without new image assets.
  archway(g,-19,27.5,4.6);archway(g,20,27.5,4.5);
  for(const [x,z]of[[-19,26],[20,26],[-19,-8],[20,-8],[-17,-48],[17,-48]]){box(g,.13,3.5,.13,kit.iron,x+2.2,cityHeight(x,z)+1.75,z);box(g,.34,.43,.34,kit.gold,x+2.2,cityHeight(x,z)+3.35,z);mesh(g,new THREE.ConeGeometry(.31,.24,4),kit.iron,x+2.2,cityHeight(x,z)+3.68,z).rotation.y=Math.PI/4;}
  // Outside terrain is only a setting for the walled city.
  const terrain=new THREE.PlaneGeometry(430,340,55,50);terrain.rotateX(-Math.PI/2);terrain.translate(0,-.6,-30);const p=terrain.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),fade=THREE.MathUtils.smoothstep(Math.abs(x),39,86);p.setY(i,-.6+fade*(3.0+2.3*Math.sin(x*.04+z*.027)+1.0*Math.cos(z*.04)));}terrain.computeVertexNormals();const land=mesh(g,terrain,plain(0x84906d));land.castShadow=false;
  for(let i=0;i<13;i++){const x=-185+i*31,z=-195-random()*35,r=23+random()*17,hill=mesh(g,new THREE.SphereGeometry(r,16,10),plain([0x9ea994,0xaebaa3,0x93a790][i%3]),x,-4,z);hill.scale.set(1.5,.40+random()*.28,1.0);hill.castShadow=false;}

  return g;
}
