import * as THREE from 'three';
import {plain,glow} from './materials.js';
import {cityWindowMaterials,CITY_LAMPS} from './city-assets.js';
import {cityHeight} from './city-plan.js';

// Sky, distant ranges, haze and time of day for the walled city.
// Everything here is procedural: no new downloads, and one extra draw call per layer.
const CENTER=new THREE.Vector3(0,0,-30);
const c=hex=>new THREE.Color(hex);
export const CITY_TIMES={
  day:{label:'晴日',sun:[-45,72,30],sunColor:0xffe5b6,sunIntensity:2.7,hemiSky:0xd3efff,hemiGround:0xafa37a,hemiIntensity:.65,fill:0x879bbc,fillIntensity:.33,exposure:.98,environment:.24,
    fog:0xd5dfdc,fogDensity:.0021,zenith:0x5b8fb4,horizon:0xd8e4e3,band:0xf2e3c6,bandStrength:.35,glowColor:0xfff1d6,cloudLit:0xfdfcf8,cloudShade:0xb4c3cf,cloudCover:.50,
    ridges:[0x8ea592,0x92a5a9,0xa5b5bf],windows:0,lampHeads:0,halo:0,castle:0,hero:0,lanterns:.12,lamps:0,smoke:0xe9e6df,smokeOpacity:.22},
  dusk:{label:'黄昏',sun:[-150,30,-75],sunColor:0xffa058,sunIntensity:2.4,hemiSky:0x9796c6,hemiGround:0x8a6450,hemiIntensity:.78,fill:0x7d89c6,fillIntensity:.48,exposure:1.1,environment:.15,
    fog:0xdca88e,fogDensity:.0024,zenith:0x2f4f86,horizon:0xf3b483,band:0xff9b68,bandStrength:.85,glowColor:0xffb36b,cloudLit:0xffc49c,cloudShade:0x857596,cloudCover:.56,
    ridges:[0x76687a,0x8a7387,0xa18394],windows:1.9,lampHeads:2.6,halo:.6,castle:1.25,hero:1.1,lanterns:3.2,lamps:9,smoke:0xc9b8b4,smokeOpacity:.32}
};

function skyDome(){
  const material=new THREE.ShaderMaterial({depthWrite:false,depthTest:false,side:THREE.BackSide,fog:false,
    uniforms:{zenith:{value:c(0)},horizon:{value:c(0)},band:{value:c(0)},bandStrength:{value:0},glowColor:{value:c(0)},sunDir:{value:new THREE.Vector3(0,1,0)},cloudLit:{value:c(0)},cloudShade:{value:c(0)},cloudCover:{value:.5},time:{value:0}},
    vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 zenith,horizon,band,glowColor,cloudLit,cloudShade,sunDir;uniform float bandStrength,cloudCover,time;varying vec3 vDir;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      void main(){vec3 d=normalize(vDir);float h=d.y;
        vec3 col=mix(horizon,zenith,pow(clamp(h,0.,1.),.5));
        col=mix(col,band,exp(-abs(h)*9.)*bandStrength);
        float s=max(dot(d,normalize(sunDir)),0.);col+=glowColor*(pow(s,6.)*.28+pow(s,90.)*.55);
        if(h>.0){vec2 p=d.xz/(h+.16)*1.25+vec2(time*.004,time*.0015);float n=fbm(p),m=fbm(p*2.6+3.1);
          float cover=smoothstep(1.-cloudCover,1.-cloudCover+.28,n*.78+m*.32)*smoothstep(.0,.16,h)*(1.-smoothstep(.55,.95,h)*.6);
          vec3 cloud=mix(cloudShade,cloudLit,clamp(.35+.65*(m-.25)+pow(s,3.)*.5,0.,1.));col=mix(col,cloud,cover*.92);}
        col=mix(col,horizon,smoothstep(.0,-.08,h));
        gl_FragColor=vec4(col,1.);}`});
  const dome=new THREE.Mesh(new THREE.SphereGeometry(300,48,24),material);dome.renderOrder=-10;dome.frustumCulled=false;return dome;
}

// Three rings of ridges. Exponential fog fades the outer rings toward the horizon.
function ridges(){
  const g=new THREE.Group(),layers=[{r:236,h:24,base:-6,seed:3},{r:292,h:40,base:-8,seed:11},{r:350,h:62,base:-12,seed:23}];
  for(const L of layers){const n=192,pos=[],idx=[];
    const phase=[0,1,2,3].map(i=>Math.sin(L.seed*12.9898+i*78.233)*43758.5453%6.283);
    for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;
      let y=.55+.30*Math.sin(a*3+phase[0])+.18*Math.sin(a*7+phase[1])+.10*Math.sin(a*17+phase[2])+.05*Math.sin(a*41+phase[3]);
      // Keep a lower notch behind the palace so the sword tower stays against open sky.
      const behindCastle=Math.exp(-((Math.atan2(Math.sin(a+Math.PI/2),Math.cos(a+Math.PI/2)))**2)/.045);y*=1-.55*behindCastle;
      const x=Math.cos(a)*L.r,z=Math.sin(a)*L.r;pos.push(x,L.base-20,z,x,L.base+Math.max(.08,y)*L.h,z);
      if(i<n)idx.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide}));m.position.copy(CENTER);m.castShadow=false;m.receiveShadow=false;g.add(m);}
  return g;
}

function smokeSprite(){const s=64,canvas=document.createElement('canvas');canvas.width=canvas.height=s;const x=canvas.getContext('2d'),r=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);r.addColorStop(0,'rgba(255,255,255,.9)');r.addColorStop(.5,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=r;x.fillRect(0,0,s,s);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
function chimneySmoke(scene){
  scene.updateMatrixWorld(true);const tops=[];scene.traverse(o=>{if(o.userData.chimneyTop)tops.push(o.getWorldPosition(new THREE.Vector3()));});
  const per=12,count=tops.length*per,geo=new THREE.BufferGeometry(),pos=new Float32Array(count*3);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const material=new THREE.PointsMaterial({map:smokeSprite(),size:1.6,transparent:true,depthWrite:false,opacity:.25,color:0xffffff});
  const points=new THREE.Points(geo,material);points.frustumCulled=false;points.userData.dynamic=true;
  function update(t){for(let k=0;k<tops.length;k++)for(let i=0;i<per;i++){const u=((t*.07+i/per+k*.37)%1),j=(k*per+i)*3,top=tops[k];
    pos[j]=top.x+u*u*2.6+Math.sin(t*.6+i+k)*.18*u;pos[j+1]=top.y+u*4.2;pos[j+2]=top.z-u*u*1.1;}geo.attributes.position.needsUpdate=true;}
  update(0);return{points,update,count:tops.length};
}

export function createCityAtmosphere({scene,renderer,sun,fill,hemi,reduced,halo,extraLamps=[],castleWindows=null}){
  const dome=skyDome(),range=ridges(),smoke=chimneySmoke(scene),{lit,unlit,lamp}=cityWindowMaterials(),heroPane=plain(0x253d47,.39),lantern=glow(0xffdb9a,.12);
  scene.background=null;scene.add(dome,range,smoke.points);
  const lamps=[...CITY_LAMPS,...extraLamps].map(([x,z])=>{const l=new THREE.PointLight(0xffb066,0,15,1.8);l.position.set(x,cityHeight(x,z)+3.1,z);scene.add(l);return l;});
  for(const m of[lit,heroPane,castleWindows].filter(Boolean))m.emissive=new THREE.Color(0xffb45e);lamp.emissive=new THREE.Color(0xffc172);
  let current='day';
  function set(name){const p=CITY_TIMES[name]||CITY_TIMES.day;current=CITY_TIMES[name]?name:'day';const u=dome.material.uniforms;
    for(const k of['zenith','horizon','band','glowColor','cloudLit','cloudShade'])u[k].value.setHex(p[k]);u.bandStrength.value=p.bandStrength;u.cloudCover.value=p.cloudCover;
    u.sunDir.value.set(...p.sun).normalize();sun.position.copy(sun.target.position).addScaledVector(u.sunDir.value,200);sun.shadow.camera.far=420;sun.shadow.camera.updateProjectionMatrix();
    sun.color.setHex(p.sunColor);sun.intensity=p.sunIntensity;hemi.color.setHex(p.hemiSky);hemi.groundColor.setHex(p.hemiGround);hemi.intensity=p.hemiIntensity;fill.color.setHex(p.fill);fill.intensity=p.fillIntensity;
    renderer.toneMappingExposure=p.exposure;scene.environmentIntensity=p.environment;scene.fog.color.setHex(p.fog);scene.fog.density=p.fogDensity;
    range.children.forEach((m,i)=>m.material.color.setHex(p.ridges[i]));
    lit.emissiveIntensity=p.windows;heroPane.emissiveIntensity=p.hero;lantern.emissiveIntensity=p.lanterns;lamp.emissiveIntensity=p.lampHeads;if(castleWindows)castleWindows.emissiveIntensity=p.castle;if(halo){halo.opacity=p.halo;halo.visible=p.halo>0;}lamps.forEach(l=>l.intensity=p.lamps);
    smoke.points.material.color.setHex(p.smoke);smoke.points.material.opacity=p.smokeOpacity;return current;}
  return{set,get time(){return current;},labels:Object.fromEntries(Object.entries(CITY_TIMES).map(([k,v])=>[k,v.label])),
    update(seconds,camera){dome.position.copy(camera.position);if(!reduced){dome.material.uniforms.time.value=seconds;smoke.update(seconds);}},
    snapshot(){return{time:current,chimneys:smoke.count,lamps:lamps.length,windowsLit:lit.userData.count||0,windowsUnlit:unlit.userData.count||0};}};
}
