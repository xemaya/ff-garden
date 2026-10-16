import * as THREE from 'three';
import './story.css';

// A small story layer over the city: dialogue with a typewriter and name plate,
// cutscenes on a timeline the frame loop drives (so they pause with the page and
// can be skipped), a camera the cutscene owns, world-space prompts and quest
// markers, a quest tracker, title cards, a letter reader and the held item.
export const EASE={linear:u=>u,inOut:u=>u<.5?4*u*u*u:1-(-2*u+2)**3/2,out:u=>1-(1-u)**3,in:u=>u*u*u,soft:u=>u*u*(3-2*u)};
const v3=p=>p instanceof THREE.Vector3?p.clone():Array.isArray(p)?new THREE.Vector3(...p):new THREE.Vector3(p.x,p.y,p.z);
const MOVE=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']);

export function poseCamera(pose){const cp=Math.cos(pose.pitch);const pos=new THREE.Vector3(pose.x,pose.y,pose.z);return{pos,look:pos.clone().add(new THREE.Vector3(-Math.sin(pose.yaw)*cp,Math.sin(pose.pitch),-Math.cos(pose.yaw)*cp).multiplyScalar(6))};}

export function createStoryDirector({camera,getPose,sfx,names={},root=document.body}){
  const el=(tag,cls,parent,html='')=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;parent.append(e);return e;};
  const ui=el('div','story',root);ui.setAttribute('aria-live','polite');
  el('div','story-bar story-bar-top',ui);el('div','story-bar story-bar-bottom',ui);
  const veil=el('div','story-veil',ui);
  const tracker=el('section','story-tracker',ui,'<span class="story-tracker-kicker"></span><strong></strong><p></p><ul></ul>');tracker.hidden=true;
  const prompt=el('button','story-prompt',ui,'<kbd>E</kbd><span></span><small></small>');prompt.type='button';prompt.hidden=true;
  const markerLayer=el('div','story-markers',ui),markers=[];
  const bubbleEl=el('div','story-bubble',ui);bubbleEl.hidden=true;
  const dialog=el('div','story-dialog',ui,'<span class="story-name"></span><p></p><i class="story-caret">▼</i>');dialog.hidden=true;
  const skipHint=el('div','story-skip',ui,'<kbd>Esc</kbd> 跳过');
  const cardEl=el('div','story-card',ui,'<div><span class="story-card-kicker"></span><h2></h2><p class="story-card-sub"></p><p class="story-card-keep"></p><nav></nav><small>按 E 继续</small></div>');cardEl.hidden=true;
  const letterEl=el('div','story-letter',ui,'<article><p class="story-letter-to"></p><div class="story-letter-body"></div><p class="story-letter-from"></p><button type="button">收好信 <kbd>E</kbd></button></article>');letterEl.hidden=true;
  const hand=el('button','story-hand',ui,'<span class="story-hand-label">手中</span><strong></strong><em></em>');hand.type='button';hand.hidden=true;
  const itemEl=el('div','story-item',ui,'<span>获得</span><strong></strong><p></p>');itemEl.hidden=true;

  // Timeline: every wait and tween is advanced by update(dt), never by setTimeout.
  let timers=[],running=false,skippable=true,skipping=false,camOwned=false,fovBase=camera.fov;
  const cam={pos:new THREE.Vector3(),look:new THREE.Vector3(),fov:camera.fov};
  function tween(seconds,fn=null,ease='inOut'){return new Promise(resolve=>{timers.push({t:0,d:Math.max(0,seconds),fn,ease:EASE[ease]||ease,resolve});});}
  const wait=s=>tween(s);

  // Dialogue.
  let talk=null;
  function say(lines){
    if(!lines?.length)return Promise.resolve();
    if(skipping)return Promise.resolve();
    return new Promise(resolve=>{talk={lines,i:0,chars:0,ticked:0,resolve};showLine();});
  }
  function showLine(){const line=talk.lines[talk.i],who=line.who?(names[line.who]||line.who):'';dialog.hidden=false;dialog.classList.toggle('narration',!who);dialog.querySelector('.story-name').textContent=who;dialog.querySelector('.story-name').hidden=!who;dialog.querySelector('p').textContent='';dialog.classList.remove('done');talk.chars=0;talk.ticked=0;}
  function endTalk(){if(!talk)return;const r=talk.resolve;talk=null;dialog.hidden=true;r();}
  function advance(){if(!talk)return false;const text=talk.lines[talk.i].text;if(talk.chars<text.length){talk.chars=text.length;return true;}sfx?.advance();talk.i++;if(talk.i>=talk.lines.length)endTalk();else showLine();return true;}

  // Cards and the letter reader resolve when closed.
  let card=null,letter=null;
  function showCard({kicker='',title='',subtitle='',keepsake='',buttons=[]},{auto=0}={}){
    return new Promise(resolve=>{cardEl.querySelector('.story-card-kicker').textContent=kicker;cardEl.querySelector('h2').textContent=title;cardEl.querySelector('.story-card-sub').textContent=subtitle;const keep=cardEl.querySelector('.story-card-keep');keep.textContent=keepsake;keep.hidden=!keepsake;
      const nav=cardEl.querySelector('nav');nav.replaceChildren();for(const b of buttons){const button=el('button','',nav);button.type='button';button.textContent=b.label;button.addEventListener('click',e=>{e.stopPropagation();closeCard(b.value);});}
      cardEl.hidden=false;requestAnimationFrame(()=>cardEl.classList.add('on'));card={resolve,auto,t:0};});
  }
  function closeCard(value=null){if(!card)return;const r=card.resolve;card=null;cardEl.classList.remove('on');cardEl.hidden=true;r(value);}
  cardEl.addEventListener('click',()=>closeCard());
  function readLetter({to,body,from}){
    return new Promise(resolve=>{letterEl.querySelector('.story-letter-to').textContent=to;const b=letterEl.querySelector('.story-letter-body');b.replaceChildren(...body.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));letterEl.querySelector('.story-letter-from').textContent=from;letterEl.hidden=false;requestAnimationFrame(()=>letterEl.classList.add('on'));sfx?.paper();letter={resolve};});
  }
  function closeLetter(){if(!letter)return;const r=letter.resolve;letter=null;letterEl.classList.remove('on');letterEl.hidden=true;sfx?.paper();r();}
  letterEl.querySelector('button').addEventListener('click',closeLetter);

  // Cutscenes own the camera until they end, then hand it back with a blend.
  function setCam(target){if(target.pos)cam.pos.copy(v3(target.pos));if(target.look)cam.look.copy(v3(target.look));if(target.fov)cam.fov=target.fov;}
  function camTo(target,seconds=1,ease='inOut'){
    const from={pos:cam.pos.clone(),look:cam.look.clone(),fov:cam.fov};
    return tween(seconds,u=>{const t=typeof target==='function'?target():target;if(t.pos)cam.pos.lerpVectors(from.pos,v3(t.pos),u);if(t.look)cam.look.lerpVectors(from.look,v3(t.look),u);if(t.fov)cam.fov=from.fov+(t.fov-from.fov)*u;},ease);
  }
  const ctx={wait,tween,say,camTo,setCam,
    follow:(seconds,fn,ease='linear')=>tween(seconds,u=>setCam(fn(u)),ease),
    fade:(to,seconds=.5)=>{const from=Number(veil.style.opacity||0);return tween(seconds,u=>{veil.style.opacity=String(from+(to-from)*u);},'soft');},
    poseCam:()=>poseCamera(getPose()),
    get skipping(){return skipping;},
    camera:()=>({pos:cam.pos.clone(),look:cam.look.clone()})};
  async function run(script,{letterbox=true,skip=true}={}){
    if(running)return false;running=true;skippable=skip;skipping=false;camOwned=true;
    const start=poseCamera(getPose());cam.pos.copy(camera.position);cam.look.copy(start.look);cam.fov=camera.fov;fovBase=camera.fov;
    document.body.classList.add('story-cinematic');document.body.classList.toggle('story-letterbox',letterbox);skipHint.hidden=!skip;
    try{await script(ctx);}catch(e){console.error(e);}
    endTalk();const wasSkipping=skipping;skipping=false;
    const back=poseCamera(getPose());await camTo({pos:back.pos,look:back.look,fov:fovBase},wasSkipping?.25:.8,'inOut');
    if(Number(veil.style.opacity||0)>0)await ctx.fade(0,.35);
    camOwned=false;camera.fov=fovBase;camera.updateProjectionMatrix();running=false;document.body.classList.remove('story-cinematic','story-letterbox');return true;
  }
  function skip(){if(!running||!skippable||skipping)return false;skipping=true;endTalk();return true;}

  // World-space UI.
  let promptTarget=null,markerTargets=[],bubble=null;
  prompt.addEventListener('click',e=>{e.stopPropagation();act();});
  function act(){if(!promptTarget||locked())return false;const t=promptTarget;sfx?.advance();t.act();return true;}
  function setPrompt(p){if(p?.id!==promptTarget?.id&&p)sfx?.prompt();promptTarget=p||null;if(p){prompt.querySelector('span').textContent=p.verb;prompt.querySelector('small').textContent=p.name||'';}}
  function setMarkers(list){markerTargets=list||[];while(markers.length<markerTargets.length){const m=el('div','story-marker',markerLayer,'<b>!</b><i></i>');markers.push(m);}}
  function setTracker(t){
    if(!t){tracker.hidden=true;return;}
    tracker.hidden=false;const strong=tracker.querySelector('strong'),p=tracker.querySelector('p'),ul=tracker.querySelector('ul');tracker.querySelector('.story-tracker-kicker').textContent=t.kicker||'支线';
    const changed=p.textContent!==t.text||strong.textContent!==t.title;strong.textContent=t.title;p.textContent=t.text;
    const key=JSON.stringify(t.items||[]);if(ul.dataset.key!==key){ul.dataset.key=key;ul.replaceChildren(...(t.items||[]).map(i=>{const li=document.createElement('li');li.textContent=i.text;li.classList.toggle('done',!!i.done);return li;}));}
    if(changed){tracker.classList.remove('flash');void tracker.offsetWidth;tracker.classList.add('flash');}
  }
  let handAction=null;
  function setHand(h){hand.hidden=!h;handAction=h?.onAction||null;if(h){hand.querySelector('strong').textContent=h.name;hand.querySelector('em').innerHTML=h.action?h.action+(h.key?` <kbd>${h.key}</kbd>`:''):'';hand.classList.toggle('actionable',!!h.onAction);}}
  hand.addEventListener('click',e=>{e.stopPropagation();if(handAction&&!locked())handAction();});
  let itemTimer=0;function item({name,text=''}){itemEl.querySelector('strong').textContent=name;itemEl.querySelector('p').textContent=text;itemEl.hidden=false;itemEl.classList.remove('on');void itemEl.offsetWidth;itemEl.classList.add('on');itemTimer=3.4;sfx?.pickup();}
  function showBubble(world,text='！',seconds=1.6){bubble={world,t:seconds};bubbleEl.textContent=text;bubbleEl.hidden=false;bubbleEl.classList.remove('pop');void bubbleEl.offsetWidth;bubbleEl.classList.add('pop');}

  const tmp=new THREE.Vector3();
  function project(world){const w=typeof world==='function'?world():world;if(!w)return null;tmp.copy(w).applyMatrix4(camera.matrixWorldInverse);const behind=tmp.z>-.1;tmp.copy(w).project(camera);return{x:(tmp.x+1)/2*innerWidth,y:(1-tmp.y)/2*innerHeight,behind,on:!behind&&Math.abs(tmp.x)<1&&Math.abs(tmp.y)<1};}
  function place(e,x,y){e.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;}

  function locked(){return running||!!letter||!!card||!!talk;}
  function update(dt){
    const list=timers;timers=[];const keep=[];
    for(const t of list){t.t+=dt;const u=skipping||t.d===0?1:Math.min(1,t.t/t.d);t.fn?.(t.ease(u));if(u>=1)t.resolve();else keep.push(t);}
    timers=keep.concat(timers);
    if(talk){const text=talk.lines[talk.i].text,before=Math.floor(talk.chars);talk.chars=Math.min(text.length,talk.chars+dt*34);const n=Math.floor(talk.chars);if(n!==before){dialog.querySelector('p').textContent=text.slice(0,n);if(n-talk.ticked>=2){talk.ticked=n;sfx?.tick();}}dialog.classList.toggle('done',n>=text.length);}
    if(card?.auto){card.t+=dt;if(card.t>card.auto)closeCard();}
    if(itemTimer>0){itemTimer-=dt;if(itemTimer<=0)itemEl.classList.remove('on');}
    if(bubble){bubble.t-=dt;if(bubble.t<=0){bubble=null;bubbleEl.hidden=true;}}
  }
  // After the frame loop has placed the camera: take it over during a cutscene, then lay out the world UI.
  function frame(){
    if(camOwned){camera.position.copy(cam.pos);camera.lookAt(cam.look);if(Math.abs(camera.fov-cam.fov)>.01){camera.fov=cam.fov;camera.updateProjectionMatrix();}}
    camera.updateMatrixWorld();
    const showPrompt=!!promptTarget&&!locked();prompt.hidden=!showPrompt;
    if(showPrompt){const s=project(promptTarget.world);if(s?.on)place(prompt,Math.min(innerWidth-prompt.offsetWidth+6,Math.max(22,s.x)),Math.min(innerHeight-60,Math.max(200,s.y)));else place(prompt,innerWidth/2,innerHeight*.62);}
    markers.forEach((m,i)=>{const t=markerTargets[i];if(!t||running||showPrompt){m.hidden=true;return;}const s=project(t.world);if(!s){m.hidden=true;return;}m.hidden=false;
      const edge=!s.on,pad=34;let x=s.x,y=s.y;if(s.behind){x=innerWidth-x;y=innerHeight-pad;}x=Math.min(innerWidth-pad,Math.max(pad,x));y=Math.min(innerHeight-pad-60,Math.max(pad+50,y));m.classList.toggle('edge',edge);place(m,x,y);m.querySelector('i').textContent=t.label||'';});
    if(bubble){const s=project(bubble.world);if(s?.on)place(bubbleEl,s.x,s.y);}
  }
  function handleKey(e){
    const code=e.code,confirm=code==='KeyE'||code==='Enter'||code==='Space';
    if(letter){if(confirm||code==='Escape'||code==='KeyR')closeLetter();return true;}
    if(card){if(confirm||code==='Escape')closeCard();return true;}
    if(talk){if(e.repeat)return true;if(confirm)advance();else if(code==='Escape'){if(!skip())endTalk();}return true;}
    if(running){if(code==='Escape')skip();return confirm||code==='Escape'||MOVE.has(code);}
    if(code==='KeyE'&&!e.repeat&&promptTarget)return act();
    if(code==='KeyR'&&!e.repeat&&handAction){handAction();return true;}
    return false;
  }
  function tap(){if(letter){closeLetter();return true;}if(card){closeCard();return true;}if(talk){advance();return true;}return running;}
  dialog.addEventListener('click',e=>{e.stopPropagation();advance();});

  return{clearItem(){itemTimer=0;itemEl.classList.remove('on');},run,skip,say:lines=>say(lines),card:showCard,letter:readLetter,item,bubble:showBubble,setPrompt,setMarkers,setTracker,setHand,update,frame,handleKey,tap,locked,
    get running(){return running;},get prompt(){return promptTarget;},
    snapshot:()=>({running,talking:!!talk,line:talk?talk.lines[talk.i].text:null,card:!!card,letter:!!letter,prompt:promptTarget?{id:promptTarget.id,verb:promptTarget.verb}:null,markers:markerTargets.length,tracker:tracker.hidden?null:tracker.querySelector('p').textContent,hand:hand.hidden?null:hand.querySelector('strong').textContent})};
}
