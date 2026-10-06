import {createTheaterPaperLoader} from './theater-papers.js';
import * as THREE from 'three';
import {batchStatic} from './batch.js';
import {plain} from './materials.js';
import {makeTheaterStage,THEATER_REVISION} from './theater-plan.js';
let papers;
export const loadTheaterPapers=()=>papers.load();
export const failedTheaterPapers=()=>papers?.failed()||[];
let facade,wood,woodLight,slate,brass,iron,cloth,paper,poster,ticket,ink;
const stats={revision:THEATER_REVISION,booths:0,posterBoards:0,tickets:0,hullPanels:0,rotors:0,newImageGenerationCalls:0};
export function theaterMetrics(){return {...stats};}
export function initTheaterMaterials(hero){
 const clone=(source,color,strength,key)=>{const map=source.map.clone();map.repeat.set(.35,.35);map.needsUpdate=true;const m=new THREE.MeshStandardMaterial({color,map,roughness:.89});m.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\ndiffuseColor.rgb=mix(diffuse,diffuseColor.rgb,${strength});`);};m.customProgramCacheKey=()=>key;return m;};
 facade=clone(hero.plaster,0xbfa883,.35,'theater-plaster');wood=clone(hero.wood,0x77503b,.72,'theater-walnut');woodLight=clone(hero.wood,0xb2956c,.48,'theater-oak');slate=clone(hero['roof-teal'],0x526862,.45,'theater-slate');brass=plain(0xb1975d,.67,.35);iron=plain(0x50524b,.76,.25);cloth=plain(0x7f3b42,.95);cloth.side=THREE.DoubleSide;paper=plain(0xe3d2ad,1);ink=plain(0x383b30,1);
 papers=createTheaterPaperLoader();({poster,ticket}=papers.materials);
 Object.assign(stats,{booths:0,posterBoards:0,tickets:0,hullPanels:0,rotors:0});
}
function mesh(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,m,x=0,y=0,z=0){return mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function beam(g,a,b,r,m=brass){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);const o=mesh(g,new THREE.CylinderGeometry(r,r,v.length(),7),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
function tube(g,pts,r,m=brass,n=24){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),n,r,6,false),m);}
function ball(g,r,m,x,y,z,sx=1,sy=1,sz=1){const o=mesh(g,new THREE.SphereGeometry(r,12,8),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function label(text,w,h,size=56){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#744e3b';ctx.fillRect(0,0,1024,256);ctx.strokeStyle='#cdb17a';ctx.lineWidth=3;ctx.strokeRect(12,12,1000,232);ctx.fillStyle='#e1cb9b';ctx.font=size+'px Georgia, "Noto Serif SC", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,130);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return{geo:new THREE.PlaneGeometry(w,h),mat:new THREE.MeshStandardMaterial({map,roughness:1})};}
function textPlate(g,text,w,h,x,y,z){const a=label(text,w,h);return mesh(g,a.geo,a.mat,x,y,z);}
function scroll(g,x,y,z,side=1,scale=1){tube(g,[[x,y,z],[x+side*.32*scale,y+.19*scale,z],[x+side*.50*scale,y+.12*scale,z],[x+side*.39*scale,y-.04*scale,z],[x+side*.29*scale,y+.01*scale,z]],.023*scale);}
function roof(g,w,d,h,y){const pos=[],uv=[],n=16;for(const side of[-1,1])for(let i=0;i<n;i++){const u=i/n,v=(i+1)/n,point=t=>[side*w*.5*t,y+h*Math.pow(1-t,1.55)+.11*t*t,0];for(const [t,z]of[[u,-d/2],[v,-d/2],[u,d/2],[v,-d/2],[v,d/2],[u,d/2]]){const p=point(t);pos.push(p[0],p[1],z);uv.push(t*2,(z+d/2)/d*2);}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const m=slate.clone();m.side=THREE.DoubleSide;mesh(g,geo,m);for(const z of[-d/2,d/2])for(const side of[-1,1])tube(g,Array.from({length:15},(_,i)=>{const t=i/14;return[side*w/2*t,y+h*(1-t)**1.55+.12*t*t,z];}),.035,brass);beam(g,[0,y+h,-d/2-.10],[0,y+h,d/2+.10],.035,brass);}
function gable(g,w,h,y,z,m=woodLight,hole=null){const s=new THREE.Shape();s.moveTo(-w/2,y);for(let i=0;i<=32;i++){const x=-w/2+i*w/32,t=Math.abs(x)/(w/2);s.lineTo(x,y+h*(1-t)**1.55+.11*t*t);}s.lineTo(w/2,y);s.closePath();if(hole)s.holes.push(new THREE.Path(hole.getPoints(24).reverse()));return mesh(g,new THREE.ExtrudeGeometry(s,{depth:.11,bevelEnabled:true,bevelSize:.012,bevelThickness:.015,bevelSegments:1}),m,0,0,z);}
function theaterFront(g){const s=new THREE.Shape();s.moveTo(-3.65,.24);s.lineTo(-3.65,5.02);for(let i=0;i<=32;i++){const x=-3.65+i*7.3/32,t=Math.abs(x)/3.65;s.lineTo(x,5.02+1.33*(1-t)**1.55+.11*t*t);}s.lineTo(3.65,.24);s.closePath();const hole=new THREE.Shape();hole.moveTo(-2.86,.32);hole.lineTo(-2.86,3.67);hole.bezierCurveTo(-2.35,4.34,-.95,4.67,0,4.68);hole.bezierCurveTo(.95,4.67,2.35,4.34,2.86,3.67);hole.lineTo(2.86,.32);hole.closePath();s.holes.push(new THREE.Path(hole.getPoints(32).reverse()));mesh(g,new THREE.ExtrudeGeometry(s,{depth:.13,bevelEnabled:true,bevelSize:.012,bevelThickness:.018,bevelSegments:1}),facade,0,0,.50);for(const side of[-1,1]){box(g,.13,4.52,.16,woodLight,side*3.42,2.60,.68);scroll(g,side*2.06,5.12,.69,side,1.0);}const bird=new THREE.Shape();bird.moveTo(-.25,-.05);bird.quadraticCurveTo(-.64,.30,-.49,.54);bird.quadraticCurveTo(-.16,.34,.10,.24);bird.quadraticCurveTo(.35,.49,.51,.25);bird.lineTo(.63,.20);bird.lineTo(.48,.14);bird.quadraticCurveTo(.15,-.18,-.25,-.05);const o=mesh(g,new THREE.ExtrudeGeometry(bird,{depth:.04,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1}),brass,0,5.65,.70);}
export function buildTicket(scale=1){const g=new THREE.Group();box(g,.38,.006,.17,paper);const face=mesh(g,new THREE.PlaneGeometry(.38,.17),ticket,0,.004,0);face.rotation.x=-Math.PI/2;g.scale.setScalar(scale);stats.tickets++;return g;}
function curtain(g,x,y,z,w,h,side=1){const geo=new THREE.PlaneGeometry(w,h,28,14),p=geo.attributes.position;for(let i=0;i<p.count;i++){const u=(p.getX(i)+w/2)/w,v=(p.getY(i)+h/2)/h;p.setZ(i,.10*Math.sin(u*Math.PI*10)+.025*Math.cos(v*3));p.setX(i,p.getX(i)+side*.16*Math.sin(v*Math.PI));}geo.computeVertexNormals();mesh(g,geo,cloth,x,y,z);tube(g,[[x-w*.45,y-h*.22,z],[x,y-h*.26,z+.10],[x+w*.45,y-h*.22,z]],.028);}
export function buildTicketBooth(place=makeTheaterStage().booth){const g=new THREE.Group();box(g,2.13,.18,1.65,woodLight,0,.12,0);box(g,1.88,1.06,1.42,wood,0,.74,0);
 for(const x of[-.89,.89])for(const z of[-.66,.66]){box(g,.105,2.77,.11,woodLight,x,1.55,z);for(const y of[.30,1.30,2.66])box(g,.17,.085,.17,brass,x,y,z);}
 // The serving bay is physically open, with a rear wall and side panels.
 box(g,1.79,1.19,.065,wood,0,1.91,-.69);for(const x of[-.93,.93])box(g,.065,1.25,1.39,wood,x,1.94,0);box(g,2.10,.09,.44,woodLight,0,1.28,.74);
 for(let x=-.75;x<=.75;x+=.25){box(g,.032,.78,.035,brass,x,.79,.724);}for(const y of[.42,1.19])box(g,1.78,.04,.04,brass,0,y,.735);
 box(g,1.98,.16,1.50,woodLight,0,2.89,0);gable(g,2.45,.65,2.81,.82,woodLight);gable(g,2.45,.65,2.81,-.92,woodLight);
 textPlate(g,'TANTALUS · 空中剧场',1.85,.30,0,2.63,.76);roof(g,2.45,2.00,.65,2.81);
 for(const side of[-1,1]){curtain(g,side*.71,2.01,.68,.40,1.10,side);scroll(g,side*.68,2.84,1.04,side,.65);}
 textPlate(g,'今 夜 开 演',1.03,.20,0,.90,.755);
 for(let i=0;i<3;i++){const t=buildTicket();t.position.set(-.33+i*.014,1.335+i*.008,.79);t.rotation.y=.08+i*.03;g.add(t);}const t=buildTicket();t.position.set(.27,1.335,.80);t.rotation.y=-.25;g.add(t);
 // Brass desk bell and a tiny ticket punch, both grounded on the counter.
 mesh(g,new THREE.CylinderGeometry(.067,.081,.018,18),brass,.67,1.34,.75);ball(g,.058,brass,.67,1.355,.75,1,.60,1);ball(g,.018,iron,.67,1.398,.75);box(g,.075,.055,.14,iron,-.65,1.35,.78);
 const framed=mesh(g,new THREE.PlaneGeometry(.46,.66),poster,0,1.94,-.642);box(g,.53,.74,.045,brass,0,1.94,-.678);
 // Warm lanterns hang below the eaves.
 for(const x of[-1.05,1.05]){beam(g,[x,2.63,.38],[x,2.36,.38],.016);const lamp=mesh(g,new THREE.CylinderGeometry(.080,.080,.23,6),plain(0xdac697,.48),x,2.26,.38);for(let j=0;j<6;j++){const a=j*Math.PI/3;beam(g,[x+Math.cos(a)*.08,2.13,.38+Math.sin(a)*.08],[x+Math.cos(a)*.08,2.39,.38+Math.sin(a)*.08],.008,iron);}mesh(g,new THREE.ConeGeometry(.13,.12,6),brass,x,2.435,.38);}
 g.position.set(place.x||0,0,place.z||0);g.rotation.y=place.rotation||0;stats.booths++;return g;}
export function buildPosterBoard(place=makeTheaterStage().poster){const g=new THREE.Group();for(const x of[-.46,.46]){beam(g,[x,.02,.34],[x,2.20,-.06],.039,wood);beam(g,[x,.03,-.35],[x,1.62,.02],.039,wood);beam(g,[x,.35,-.26],[x,.35,.28],.026,brass);}
 box(g,1.15,1.60,.06,wood,0,1.37,0);box(g,1.06,1.50,.055,brass,0,1.37,.032);mesh(g,new THREE.PlaneGeometry(.99,1.43),poster,0,1.37,.064);textPlate(g,'本 日 演 目',1.16,.18,0,2.30,.055);for(const side of[-1,1])scroll(g,side*.36,2.40,.04,side,.45);g.position.set(place.x||0,0,place.z||0);g.rotation.y=place.rotation||0;stats.posterBoards++;return g;}
export function buildTheaterCorner(stage=makeTheaterStage()){const g=new THREE.Group();g.add(buildTicketBooth(stage.booth),buildPosterBoard(stage.poster));return g;}
function hullPoint(u,a){const x=-7.4+u*14.8,f=Math.pow(Math.max(.005,1-(x/7.6)**2),.53),z=Math.cos(a)*2.22*f,y=1.04-Math.sin(a)**.70*(2.65*f);return[x,y,z];}
function hullGeometry(){const pos=[],uv=[],nx=48,na=22;for(let i=0;i<nx;i++)for(let j=0;j<na;j++)for(const [a,b]of[[i,j],[i,j+1],[i+1,j],[i+1,j],[i,j+1],[i+1,j+1]]){pos.push(...hullPoint(a/nx,b/na*Math.PI));uv.push(a/nx*8,b/na*4);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();stats.hullPanels=nx*na;return geo;}
function cupola(g,x,y,z,r=.7,h=2.0){const pts=[[r*1.2,0],[r*1.25,.13],[r,.32],[r*.62,h*.50],[r*.23,h*.84],[0,h]].map(([a,b])=>new THREE.Vector2(a,b));mesh(g,new THREE.LatheGeometry(pts,28),slate,x,y,z);for(const u of[.15,.40,.65]){const ring=mesh(g,new THREE.TorusGeometry(r*(1-u)**1.30,.020,4,28),brass,x,y+h*u,z);ring.rotation.x=Math.PI/2;}beam(g,[x,y+h,z],[x,y+h+.53,z],.025);ball(g,.068,brass,x,y+h+.55,z);}
function gear(g,x,y,z,r){const o=mesh(g,new THREE.TorusGeometry(r,.033,5,32),brass,x,y,z);o.rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6;const t=box(g,.070,.08,.12,brass,x+Math.cos(a)*r,y,z+Math.sin(a)*r);t.rotation.y=-a;}}
export function buildRefinedTheaterShip(animated,place=makeTheaterStage().ship){const g=new THREE.Group();g.userData.dynamic=true;g.userData.theaterRevision=THEATER_REVISION;const hull=mesh(g,hullGeometry(),wood);hull.material.side=THREE.DoubleSide;
 // Thin longitudinal strakes and individual frames follow the actual hull.
 for(let j=1;j<12;j++){const a=j/12*Math.PI;const pts=Array.from({length:40},(_,i)=>hullPoint(.018+i/39*.964,a));tube(g,pts,j===6?.055:.025,j===6?brass:woodLight,38);}
 for(let i=0;i<15;i++){const u=.05+i*.9/14;const pts=Array.from({length:24},(_,j)=>{const p=hullPoint(u,j/23*Math.PI);p[1]-=.018;return p;});tube(g,pts,.040,brass,23);}
 // A closed deck, planked floor and shaped sheer rail replace the old oval ball.
 const deck=new THREE.Shape();for(let i=0;i<=48;i++){const p=hullPoint(i/48,0);i?deck.lineTo(p[0],p[2]):deck.moveTo(p[0],p[2]);}for(let i=48;i>=0;i--){const p=hullPoint(i/48,Math.PI);deck.lineTo(p[0],p[2]);}deck.closePath();const d=mesh(g,new THREE.ExtrudeGeometry(deck,{depth:.13,bevelEnabled:false}),woodLight);d.rotation.x=Math.PI/2;d.position.y=1.18;
 for(const side of[-1,1]){for(let i=0;i<27;i++){const u=.045+i*.91/26,p=hullPoint(u,side>0?0:Math.PI);beam(g,[p[0],1.08,p[2]],[p[0],1.83,p[2]],.025,iron);ball(g,.04,brass,p[0],1.85,p[2]);}const pts=Array.from({length:50},(_,i)=>{const p=hullPoint(.02+i/49*.96,side>0?0:Math.PI);return[p[0],1.82,p[2]];});tube(g,pts,.055,brass,48);}
 const prow=new THREE.Group();g.add(prow);tube(prow,[[6.7,.3,0],[7.7,1.18,0],[8.7,1.7,0],[9.0,2.20,0],[8.7,2.38,0],[8.45,2.04,0]],.085);for(const side of[-1,1]){tube(prow,[[8.6,2.10,0],[8.2,2.6,side*.25],[7.75,2.9,side*.55],[7.28,2.54,side*.82]],.045);tube(prow,[[7.0,.25,side*.3],[6.3,.55,side*.90],[5.6,.36,side*1.38]],.035);}
 // Open proscenium: recessed scenic wall, gathered curtains and gilded arch.
 const stage=new THREE.Group();stage.position.set(-1.0,1.18,0);g.add(stage);box(stage,7.05,.22,2.7,woodLight,0,.12,.25);box(stage,6.20,3.55,.16,ink,0,2.03,-1.04);
 for(let i=0;i<13;i++){const x=-2.8+i*.45;const star=mesh(stage,new THREE.OctahedronGeometry(.045),brass,x,1.6+(i*7%9)*.16,-.934);star.scale.z=.20;}
 for(const side of[-1,1]){box(stage,.33,3.55,.52,woodLight,side*3.07,2.02,.66);box(stage,.55,.20,.69,brass,side*3.07,.38,.66);box(stage,.48,.13,.64,brass,side*3.07,3.62,.66);curtain(stage,side*2.40,2.02,.74,1.1,3.0,side);scroll(stage,side*2.85,3.77,.82,side,1.1);}
 tube(stage,[[-3.06,3.70,.68],[-2.5,4.18,.68],[-1.3,4.6,.68],[0,4.78,.68],[1.3,4.6,.68],[2.5,4.18,.68],[3.06,3.70,.68]],.090,brass,40);
 for(let i=0;i<11;i++){const x=-2.5+i*.5,y=3.84+.70*(1-(x/2.75)**2);ball(stage,.068,brass,x,y,.69);}
 curtain(stage,0,4.03,.64,5.20,.46,1);textPlate(stage,'TANTALUS',2.30,.43,0,4.94,.78);
 theaterFront(stage);
 const canopy=new THREE.Group();canopy.position.set(0,5.02,-.3);stage.add(canopy);roof(canopy,7.30,3.1,1.33,0);for(const x of[-3.25,3.25])cupola(stage,x,4.20,-.63,.45,1.7);
 // A stern gallery has actual window recesses and narrow decorative rails.
 const stern=new THREE.Group();stern.position.set(-5.45,1.10,-.1);g.add(stern);box(stern,2.63,.16,2.76,woodLight,0,.08,0);box(stern,2.55,2.00,2.68,wood,0,1.12,0);for(const side of[-1,1])for(let i=0;i<4;i++){const x=-.87+i*.58;box(stern,.44,1.10,.06,ink,x,1.25,side*1.36);box(stern,.025,1.15,.065,brass,x,1.25,side*1.40);box(stern,.47,.04,.09,brass,x,1.18,side*1.41);}cupola(stern,0,2.18,0,1.70,2.7);
 const tail=new THREE.Shape();tail.moveTo(0,0);tail.lineTo(-2.0,-.15);tail.lineTo(-1.60,-.95);tail.lineTo(-2.15,-1.6);tail.lineTo(0,-1.45);tail.closePath();const flag=mesh(g,new THREE.ShapeGeometry(tail),cloth,-6.8,3.0,0);flag.rotation.y=Math.PI/2;
 // Four framed engines with mast bracing, gear collars and tapered wooden blades.
 const rotors=[];for(const [x,z]of[[-4.3,-3.2],[4.1,-3.2],[-4.3,3.2],[4.1,3.2]]){beam(g,[x,.6,z*.45],[x,3.6,z],.072,iron);beam(g,[x,1.1,z*.45],[x,5.20,z],.043,brass);beam(g,[x-1.1,1.1,z*.45],[x,3.6,z],.036,brass);beam(g,[x,3.6,z],[x,5.35,z],.048,iron);
 mesh(g,new THREE.CylinderGeometry(.29,.35,.65,16),iron,x,3.42,z);gear(g,x,3.80,z,.38);gear(g,x,3.13,z,.37);const rotor=new THREE.Group();rotor.userData.dynamic=true;rotor.position.set(x,5.45,z);g.add(rotor);
 for(let i=0;i<4;i++){const blade=new THREE.Group();blade.rotation.y=i*Math.PI/2;rotor.add(blade);const s=new THREE.Shape();s.moveTo(.12,-.085);s.lineTo(1.7,-.17);s.quadraticCurveTo(2.35,-.08,2.4,.09);s.lineTo(.25,.16);s.closePath();const o=mesh(blade,new THREE.ExtrudeGeometry(s,{depth:.047,bevelEnabled:false}),woodLight);o.rotation.x=-Math.PI/2;beam(blade,[1.9,.025,-.06],[2.20,.025,.08],.012,brass);}
 ball(rotor,.18,brass,0,.10,0,1,.55,1);rotors.push(rotor);}
 batchStatic(g);g.position.set(place.x||0,place.y||0,place.z||0);g.rotation.y=place.rotation||0;g.scale.setScalar(place.scale||1);animated.airship=g;animated.rotors=rotors;stats.rotors=rotors.length;return g;}
