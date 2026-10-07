import * as THREE from 'three';
import {batchStatic} from './batch.js';
const materials=new Map();function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.94}));return materials.get(color);}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat(m));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function oval(g,r,color,x,y,z,sx=1,sy=1,sz=1){const o=mesh(g,new THREE.SphereGeometry(r,16,12),color,x,y,z);o.scale.set(sx,sy,sz);return o;}
function box(g,w,h,d,color,x,y,z){return mesh(g,new THREE.BoxGeometry(w,h,d),color,x,y,z);}
function profile(rows){const pos=[],uv=[],ids=[],n=18;for(const[y,rx,rz]of rows)for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;pos.push(Math.sin(a)*rx,y,Math.cos(a)*rz);uv.push(i/n,y);}for(let j=0;j<rows.length-1;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;ids.push(...(rows.at(-1)[0]>rows[0][0]?[a,a+1,a+n+1,a+1,a+n+2,a+n+1]:[a,a+n+1,a+1,a+1,a+n+1,a+n+2]));}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ids);geo.computeVertexNormals();return geo;}
const palettes=[[0xe2d3b1,0x927651,0x786a58],[0x7b8470,0xb89b72,0x5d5649],[0x7c6577,0xbfb699,0x5a6470],[0x718695,0xc6b797,0x74685a],[0xbe9270,0x788773,0x796959],[0x989270,0xbabda9,0x765f51]];
export function createTownsfolk(style=0,seed=0){const colors=palettes[style%6],root=new THREE.Group();root.name='TownNeighbor-'+seed;root.userData.dynamic=true;const model=new THREE.Group();root.add(model);const h=1.5+(seed%3)*.05;
  mesh(model,profile([[.60,.19,.125],[.75,.15,.12],[.93,.18,.14],[1.10,.205,.13],[1.19,.145,.105]]),colors[0]);
  box(model,.35,.072,.27,colors[2],0,.79,0);box(model,.05,.058,.02,0xc0aa77,0,.79,.15);
  if(style===0||style===4){const apron=mesh(model,profile([[.52,.19,.135],[.73,.16,.127],[1.03,.10,.142]]),colors[1]);apron.scale.z=.99;}
  const skin=[0xd3b291,0xc6a380,0xb59477][seed%3];oval(model,.147,skin,0,1.36,0,.93,1.2,.92);oval(model,.034,skin,0,1.34,.14,.8,.75,1.25);
  for(const side of[-1,1]){oval(model,.022,skin,side*.135,1.36,0,.7,1.1,.6);oval(model,.012,0x343937,side*.055,1.39,.127,.7,1,.38);box(model,.055,.015,.018,0x66554a,side*.055,1.42,.126);}
  oval(model,.15,[0x70624a,0x5b5147,0x9b8967][seed%3],0,1.445,-.025,1.03,.48,.89);
  if(style===0||style===5){const cap=oval(model,.156,style===0?0xe5dac0:colors[2],0,1.50,-.02,1.05,.53,1.0);const brim=mesh(model,new THREE.CylinderGeometry(.17,.17,.028,20),style===0?0xd5c5a7:colors[2],0,1.46,.025);void cap;void brim;}
  const legs=[],arms=[];
  for(const side of[-1,1]){const hip=new THREE.Group();hip.position.set(side*.092,.60,0);model.add(hip);const shin=new THREE.Group();shin.position.y=-.28;hip.add(shin);mesh(hip,profile([[0,.078,.08],[-.13,.078,.082],[-.29,.061,.064]]),colors[1]);mesh(shin,profile([[0,.061,.064],[-.20,.055,.057],[-.27,.057,.057]]),colors[1]);oval(shin,.08,colors[2],0,-.28,.053,.85,.72,1.45);legs.push({hip,shin,side});
    const arm=new THREE.Group();arm.position.set(side*.19,1.10,0);arm.rotation.z=side*.09;model.add(arm);mesh(arm,profile([[.015,.066,.065],[-.17,.070,.065],[-.30,.058,.055]]),colors[0]);oval(arm,.052,skin,0,-.36,.015,.85,1.3,.80);arms.push({arm,side});
  }
  if(style===2||style===3){box(model,.13,.21,.12,colors[2],.22,.68,-.035);const strap=box(model,.035,.57,.028,colors[2],.06,.98,.147);strap.rotation.z=.5;}
  for(const {hip}of legs)hip.userData.dynamic=true;for(const {arm}of arms)arm.userData.dynamic=true;batchStatic(model);model.scale.setScalar(h/1.62);let time=seed*.13,walking=false;
  return{root,play(name){walking=name==='Walk';},update(dt,moving){time+=dt;walking=moving??walking;const phase=time*2*Math.PI/1.1,weight=walking?1:0;for(const{hip,shin,side}of legs){const v=Math.sin(phase+(side<0?Math.PI:0));hip.rotation.x=v*.29*weight;shin.rotation.x=Math.max(0,-v)*.19*weight;}for(const{arm,side}of arms)arm.rotation.x=-Math.sin(phase+(side<0?Math.PI:0))*.24*weight;model.position.y=walking?.03+.012*Math.abs(Math.sin(phase)):.03;model.rotation.y=walking?0:Math.sin(time*.6)*.018;}};
}
