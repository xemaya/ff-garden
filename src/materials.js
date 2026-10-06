import * as THREE from 'three';
import {rng} from './layout.js';
export const palette={coral:0x9e573e,sage:0x497577,blue:0x435d79,lavender:0x785165,cream:0xe1cda5,butter:0xd3b079,peach:0xd1aa89,mint:0xb6b5a0,wood:0x68513d,stone:0xcbb895,leaf:0x7fac6b};
const cache=new Map(),textures={};
function texture(draw,n=512){const c=document.createElement('canvas');c.width=c.height=n;draw(c.getContext('2d'),n);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
function grain(c,n,seed,amount=.09){const random=rng(seed);for(let i=0;i<11000;i++){c.fillStyle=random()>.5?`rgba(255,248,220,${random()*amount})`:`rgba(90,64,42,${random()*amount})`;c.fillRect(random()*n,random()*n,random()*2+1,random()*2+1);}}
export function initMaterials(){
  textures.plaster=texture((c,n)=>{c.fillStyle='#f0e4c7';c.fillRect(0,0,n,n);grain(c,n,10,.20);for(let i=0;i<32;i++){c.fillStyle='#765c3d11';c.fillRect((i*157)%n,(i*211)%n,30+i%30,5+i%11);}});
  textures.wood=texture((c,n)=>{c.fillStyle='#a58057';c.fillRect(0,0,n,n);const r=rng(11);for(let i=0;i<220;i++){c.strokeStyle=`rgba(75,45,22,${r()*.17})`;let x=r()*n;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+15,n*.3,x-13,n*.7,x+7,n);c.stroke();}for(let x=0;x<n;x+=85){c.fillStyle='#5a42222d';c.fillRect(x,0,2,n);}grain(c,n,12,.1);});
  textures.roof=texture((c,n)=>{c.fillStyle='#d7bd9d';c.fillRect(0,0,n,n);for(let y=-32;y<n;y+=64)for(let x=-64;x<n;x+=85){const xx=x+(Math.floor(y/64)%2)*42;c.fillStyle='#fff9e61d';c.beginPath();c.moveTo(xx,y);c.lineTo(xx+81,y);c.lineTo(xx+81,y+49);c.quadraticCurveTo(xx+40,y+78,xx,y+49);c.closePath();c.fill();c.strokeStyle='#6f55362e';c.lineWidth=2;c.stroke();}grain(c,n,13,.11);});
  textures.stone=texture((c,n)=>{c.fillStyle='#e5d6b4';c.fillRect(0,0,n,n);const r=rng(14);for(let row=0;row<8;row++)for(let col=-1;col<9;col++){const x=col*64+(row%2)*32,y=row*64;c.fillStyle=`hsl(${34+r()*7} ${20+r()*8}% ${72+r()*12}%)`;c.fillRect(x+2,y+2,60,60);c.fillStyle='#fff8e729';c.fillRect(x+3,y+3,58,2);}grain(c,n,15,.1);});
  textures.pavers=texture((c,n)=>{c.fillStyle='#c4b994';c.fillRect(0,0,n,n);const r=rng(16);for(let row=0;row<8;row++)for(let col=-1;col<7;col++){const x=col*92+(row%2)*46,y=row*64;c.fillStyle=`hsl(${35+r()*7} ${14+r()*7}% ${69+r()*14}%)`;c.beginPath();c.roundRect(x+2,y+2,87,59,7);c.fill();}grain(c,n,17,.09);});
  textures.grass=texture((c,n)=>{c.fillStyle='#94b879';c.fillRect(0,0,n,n);const r=rng(18);for(let i=0;i<8000;i++){c.strokeStyle=r()>.5?'#d4dc9529':'#44784525';const x=r()*n,y=r()*n;c.beginPath();c.moveTo(x,y);c.lineTo(x+r()*4-2,y-r()*7);c.stroke();}});
}
export function plain(color,roughness=.85,metalness=0){const key=`p-${color}-${roughness}-${metalness}`;if(!cache.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.userData.shared=true;cache.set(key,m);}return cache.get(key);}
export function mat(kind,color=0xffffff,w=4,h=4){const key=`${kind}-${color}-${w}-${h}`;if(!cache.has(key)){const map=textures[kind].clone();map.needsUpdate=true;map.repeat.set(w/4,h/4);const m=new THREE.MeshStandardMaterial({color,map,bumpMap:kind==='pavers'?null:map,bumpScale:.012,roughness:.92});m.userData.shared=true;cache.set(key,m);}return cache.get(key);}
export function glow(color,power=.1){const key=`g-${color}-${power}`;if(!cache.has(key)){const m=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:power,roughness:.55});m.userData.shared=true;cache.set(key,m);}return cache.get(key);}
export function shopSign(name,kind){
  const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.fillStyle='#f2e5c5';x.fillRect(0,0,1024,512);grain(x,1024,38,.1);
  x.strokeStyle='#a69058';x.lineWidth=9;x.strokeRect(23,23,978,466);x.lineWidth=2;x.strokeRect(40,40,944,432);
  x.fillStyle='#3e573e';x.textAlign='center';x.textBaseline='middle';x.font="500 110px 'Noto Serif SC','Hiragino Mincho ProN','Songti SC',serif";x.fillText(name,512,220,910);
  x.fillStyle='#a17c48';x.font="32px 'Cormorant Garamond',serif";x.fillText({bakery:'BREAD & SMALL HAPPINESS',florist:'FLOWERS FOR YOUR DAY',inn:'A REST UNDER THE MOON',toys:'A LITTLE BIT OF WONDER',cafe:'TEA & A SLOW AFTERNOON',books:'STORIES FOR THE ROAD',home:'A HOME IN THE SUN',apothecary:'GIFTS FROM THE FOREST'}[kind],512,347,850);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
export function skyTexture(){return texture((c,n)=>{const g=c.createLinearGradient(0,0,0,n);g.addColorStop(0,'#729da9');g.addColorStop(.46,'#b8cbd0');g.addColorStop(.68,'#f0dfc4');g.addColorStop(1,'#d7c9a3');c.fillStyle=g;c.fillRect(0,0,n,n);},1024);}
