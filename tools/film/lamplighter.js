// The shot list for 「寄给点灯人的信」. Runs inside the page on virtual time.
(()=>{
const F=window.__film,Q=window.__cityQA,E=Q.episode,D=Q.director;
const st=()=>JSON.parse(document.getElementById('city-state').textContent);
const wait=s=>F.wait(s);
const css=document.createElement('style');css.textContent=`
header,.places,.top-right,footer,.touch-pad,#map-panel,#moogle-panel,#nearby,.story-skip,#royal-greeting{display:none!important}
.film-vignette{position:fixed;inset:0;pointer-events:none;z-index:3;background:radial-gradient(ellipse at center,transparent 55%,rgba(20,12,6,.38) 100%)}
.film-veil{position:fixed;inset:0;background:#0d0a08;z-index:20;opacity:1;transition:opacity 1.2s ease;pointer-events:none}
.film-veil.off{opacity:0}
.film-title{position:fixed;inset:0;z-index:21;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f1e3c2;font-family:"Songti SC","Noto Serif SC",serif;opacity:0;transition:opacity 1.4s ease;pointer-events:none;text-align:center}
.film-title.on{opacity:1}
.film-title small{font:13px Georgia,serif;letter-spacing:9px;color:#d9b673}
.film-title h1{font-weight:normal;font-size:64px;letter-spacing:22px;margin:26px 0 14px;text-shadow:0 0 40px #ffbf6b44}
.film-title p{font-size:20px;letter-spacing:8px;margin:0;opacity:.85}
.film-title i{display:block;width:180px;height:1px;background:linear-gradient(90deg,transparent,#d9b673,transparent);margin:28px auto}
.film-place{position:fixed;left:64px;bottom:72px;z-index:6;color:#fff6e2;font-family:"Songti SC",serif;text-shadow:0 2px 14px rgba(0,0,0,.6);opacity:0;transform:translateX(-14px);transition:opacity 1s ease,transform 1.2s ease;pointer-events:none}
.film-place.on{opacity:1;transform:none}
.film-place small{display:block;font:12px Georgia,serif;letter-spacing:6px;color:#f0d49a}
.film-place b{display:block;font-weight:normal;font-size:38px;letter-spacing:12px;margin-top:8px}
.film-place i{display:block;width:240px;height:1px;margin-top:12px;background:linear-gradient(90deg,#f0d49a,transparent)}
`;document.head.append(css);
const el=(cls,html='')=>{const e=document.createElement('div');e.className=cls;e.innerHTML=html;document.body.append(e);return e;};
el('film-vignette');const veil=el('film-veil'),title=el('film-title'),place=el('film-place');
async function fadeOut(s=1.2){veil.style.transitionDuration=s+'s';veil.classList.remove('off');await wait(s+.1);}
async function fadeIn(s=1.2){veil.style.transitionDuration=s+'s';veil.classList.add('off');await wait(s);}
async function caption(kicker,name,hold=3.2){place.innerHTML=`<small>${kicker}</small><b>${name}</b><i></i>`;place.classList.add('on');await wait(hold);place.classList.remove('on');}
function key(code,k){const opts={code,key:k,bubbles:true};document.body.dispatchEvent(new KeyboardEvent('keydown',opts));document.body.dispatchEvent(new KeyboardEvent('keyup',opts));}

// Walking: corners become arcs, the eye looks a few metres down the path, and the head turns with capped,
// eased angular speed (no snap at waypoints). Outside uses setPose, inside the shop setShopPose.
const pose={x:0,z:0,yaw:0,pitch:-.03};
function place3(x,z,yaw,pitch=-.03,inside=false){Object.assign(pose,{x,z,yaw,pitch});if(inside)Q.setShopPose(x,z,yaw,pitch);else Q.setPose(x,z,yaw,pitch);}
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const bearing=(fx,fz,tx,tz)=>Math.atan2(-(tx-fx),-(tz-fz));
const put=inside=>inside?Q.setShopPose(pose.x,pose.z,pose.yaw,pose.pitch):Q.setPose(pose.x,pose.z,pose.yaw,pose.pitch);
function roundedPath(points,radius){
  const P=[[pose.x,pose.z],...points],out=[P[0]];
  for(let i=1;i<P.length-1;i++){
    const [a,b,c]=[P[i-1],P[i],P[i+1]],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const r=Math.min(radius,l1*.45,l2*.45);if(r<.05){out.push(b);continue;}
    const p0=[b[0]+(a[0]-b[0])/l1*r,b[1]+(a[1]-b[1])/l1*r],p2=[b[0]+(c[0]-b[0])/l2*r,b[1]+(c[1]-b[1])/l2*r];
    for(let k=0;k<=12;k++){const t=k/12,u=1-t;out.push([u*u*p0[0]+2*u*t*b[0]+t*t*p2[0],u*u*p0[1]+2*u*t*b[1]+t*t*p2[1]]);}
  }
  out.push(P[P.length-1]);
  const pts=[out[0]],len=[0];for(let i=1;i<out.length;i++){const d=Math.hypot(out[i][0]-pts[pts.length-1][0],out[i][1]-pts[pts.length-1][1]);if(d<1e-4)continue;pts.push(out[i]);len.push(len[len.length-1]+d);}
  const at=s=>{s=Math.max(0,Math.min(len[len.length-1],s));let i=1;while(i<len.length-1&&len[i]<s)i++;const t=(s-len[i-1])/Math.max(1e-6,len[i]-len[i-1]);return[pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t];};
  return{total:len[len.length-1],at};
}
// Yaw follower: angular speed eases up and down, never above maxRate (rad/s).
function yawFollower(maxRate=.85,accel=1.6){let w=0;return(want,dt)=>{const err=angle(pose.yaw,want),goal=Math.sign(err)*Math.min(maxRate,Math.sqrt(2*accel*Math.abs(err))*.9);w+=Math.max(-accel*dt,Math.min(accel*dt,goal-w));if(Math.abs(err)<.004&&Math.abs(w)<.05)w=0;pose.yaw+=Math.abs(w*dt)>Math.abs(err)?err:w*dt;return err;};}
function walk(points,{speed=2.0,inside=false,pitch=-.03,lookAt=null,until=null,radius=inside?.6:3.2,ahead=inside?1.2:3.2}={}){
  const path=roundedPath(points,radius),follow=yawFollower();
  return new Promise(resolve=>{let s=0,v=0;const task=dt=>{
    const left=path.total-s;
    const aim=left<ahead*.6&&lookAt?lookAt:path.at(s+ahead),here=[pose.x,pose.z];
    const want=Math.hypot(aim[0]-here[0],aim[1]-here[1])>.05?bearing(here[0],here[1],aim[0],aim[1]):pose.yaw;
    const err=follow(want,dt);
    // Slow down while the eye is still catching up with the path, and ease into the stop.
    const goal=Math.min(speed*Math.max(.3,1-Math.abs(err)/1.4),left*1.1+.15);v+=(goal-v)*Math.min(1,dt*1.8);
    s=Math.min(path.total,s+v*dt);[pose.x,pose.z]=path.at(s);
    pose.pitch+=(pitch-pose.pitch)*Math.min(1,dt*1.5);put(inside);
    const settled=!lookAt||Math.abs(angle(pose.yaw,bearing(pose.x,pose.z,lookAt[0],lookAt[1])))<.03;
    if((until&&until())||(path.total-s<.01&&settled)){F.tasks.delete(task);resolve();}
  };F.tasks.add(task);});
}
// Turn on the spot with smoothstep easing; slow enough that a big turn never whips the view.
function turnTo(target,seconds=1.2,inside=false,pitch=pose.pitch){return new Promise(res=>{let t=0;const y0=pose.yaw,p0=pose.pitch,want=bearing(pose.x,pose.z,target[0],target[1]),d=angle(y0,want),dur=Math.max(seconds,Math.abs(d)/.6);const task=dt=>{t+=dt;const u=Math.min(1,t/dur),e=u*u*(3-2*u);pose.yaw=y0+d*e;pose.pitch=p0+(pitch-p0)*e;put(inside);if(u>=1){F.tasks.delete(task);res();}};F.tasks.add(task);});}

// Let the story play: read each line at a comfortable pace, then advance.
async function play(maxSeconds=200){
  let line=null,shown=0;const t0=F.vt;
  for(;;){
    const s=D.snapshot();
    if(!(s.running||s.talking||s.card||s.letter)){await wait(.2);const again=D.snapshot();if(!(again.running||again.talking||again.card||again.letter))return;}
    if(s.talking){if(s.line!==line){line=s.line;shown=F.vt;}const need=line.length/34+1.15+line.length*.085;if((F.vt-shown)/1000>need){key('KeyE','e');line=null;await wait(.35);continue;}}
    else if(s.card){await wait(s.card?6:0);key('KeyE','e');await wait(.6);continue;}
    if((F.vt-t0)/1000>maxSeconds)return;
    await wait(1/30);
  }
}

window.__runFilm=async()=>{
  // Start from scratch, in the day.
  E.qa.reset();
  F.music('day');
  title.innerHTML='<small>FF GARDEN</small><h1>幻想小城的邮差</h1><i></i><p>支线 · 寄给点灯人的信</p>';
  await wait(.8);title.classList.add('on');await wait(4.6);title.classList.remove('on');await wait(1.6);

  // 1 · morning, the gate street → market lane → bakery door
  place3(0,36.2,0,-.02);await wait(.5);
  fadeIn(2.2);caption('MORNING · 清晨','城门大街');
  await walk([[0,31.8],[-6,31.3],[-18.4,31.1]],{speed:2.1});
  await walk([[-18.8,27.4],[-16.95,24.57]],{speed:1.8,lookAt:[-16,24.57]});
  await turnTo([-16,24.57],1.0,false,-.02);await wait(1.6);
  key('KeyE','e');await wait(1.6);

  // 2 · inside the bakery
  caption('BAKERY · 面包房','集市巷 · 面包房',2.6);
  let b=st().shop.baker;place3(1.568,-1.0,0,-.06,true);await wait(.6);
  await walk([[1.2,-1.5],[.2,-1.65]],{speed:1.2,inside:true,lookAt:[b.x,b.z],pitch:-.08,until:()=>D.snapshot().prompt?.id==='baker'&&Math.hypot(pose.x-st().shop.baker.x,pose.z-st().shop.baker.z)<1.9});
  b=st().shop.baker;await turnTo([b.x,b.z],.8,true,-.07);await wait(1.4);
  key('KeyE','e');await wait(.3);await play();
  await wait(1.2);key('KeyR','r');await wait(11.5);key('KeyE','e');await wait(1.2);
  await walk([[1.568,-1.0],[1.568,-.1]],{speed:1.4,inside:true});
  await wait(1.2);

  // 3 · the fountain square: the reading mage
  await fadeOut(.9);
  place3(1.1,-11.5,Math.atan2(-(0.75-1.1),-(-21.5+11.5)),-.04);await wait(.4);fadeIn(1.2);caption('NOON · 正午','喷泉广场');
  await walk([[0.9,-15.5],[0.45,-19.5]],{speed:1.9,lookAt:[0.75,-21.5],until:()=>D.snapshot().prompt?.id==='mage'});
  await turnTo([0.75,-21.5],.7,false,.02);await wait(1.3);key('KeyE','e');await wait(.3);await play();await wait(1);

  // 4 · the patrol on the workshop street
  await fadeOut(.9);
  // Under the veil: read which way the squad is marching, then wait a few metres ahead of its front rank.
  const snap=()=>st().life.agents.filter(a=>a.role==='patrol');
  let ahead=null,face=null;
  for(let tries=0;tries<40&&!ahead;tries++){
    const a0=snap();await wait(.7);const a1=snap();
    const v=a1.map((a,i)=>({...a,dx:a.x-a0[i].x,dz:a.z-a0[i].z}));const mx=v.reduce((s,a)=>s+a.dx,0)/v.length,mz=v.reduce((s,a)=>s+a.dz,0)/v.length,l=Math.hypot(mx,mz);
    if(l<.05)continue;const dx=mx/l,dz=mz/l,front=v.sort((a,b)=>(b.x*dx+b.z*dz)-(a.x*dx+a.z*dz))[0];
    if(Math.abs(dz)<.8)continue; // only on the long north-south streets
    for(const d of[8,9,7,10,6])for(const lat of[0,.8,-.8]){const x=front.x+dx*d+dz*lat,z=front.z+dz*d-dx*lat;if(Q.teleport(x,z,0)){ahead=[x,z];face=[front.x,front.z];break;}}
    if(ahead)break;await wait(1.5);
  }
  place3(ahead[0],ahead[1],Math.atan2(-(face[0]-ahead[0]),-(face[1]-ahead[1])),.0);
  await wait(.3);fadeIn(1.0);caption('AFTERNOON · 午后','工坊主街');
  for(let k=0;k<450&&D.snapshot().prompt?.id!=='patrol';k++){const near=st().life.agents.filter(a=>a.role==='patrol').sort((a,b)=>Math.hypot(a.x-pose.x,a.z-pose.z)-Math.hypot(b.x-pose.x,b.z-pose.z))[0];
    pose.yaw+=angle(pose.yaw,Math.atan2(-(near.x-pose.x),-(near.z-pose.z)))*.06;Q.setPose(pose.x,pose.z,pose.yaw,pose.pitch);await wait(1/30);}
  await wait(.6);key('KeyE','e');await wait(.3);await play();await wait(2.2);

  // 5 · late afternoon at the gate: wait for dusk
  await fadeOut(1.1);
  place3(-1.2,32.2,Math.atan2(-(2.75+1.2),-(37.3-32.2)),-.05);await wait(.4);fadeIn(1.2);caption('LATE AFTERNOON · 傍晚','城门石凳');
  await walk([[1.2,34.5],[2.3,36.2]],{speed:1.5,lookAt:[2.75,37.6],until:()=>D.snapshot().prompt?.id==='seat'&&Math.hypot(pose.x-2.75,pose.z-37.3)<1.25});
  await wait(1.4);F.music('quiet');key('KeyE','e');await wait(3);F.music('dusk');await play(260);await wait(1.2);

  // 6 · the letter to Vivi
  {const s=st();Object.assign(pose,{x:s.pose.x,z:s.pose.z});}
  await walk([[1.6,38.4]],{speed:1.0,lookAt:[.2,39.6],until:()=>D.snapshot().prompt?.id==='vivi'&&Math.hypot(pose.x-.2,pose.z-39.6)<1.7});
  await turnTo([.2,39.6],.8,false,-.12);await wait(1.2);key('KeyE','e');await wait(.3);await play(200);await wait(1.5);

  // 7 · up to the wind post with the lantern
  await fadeOut(1.1);
  place3(1.5,-23,Math.atan2(-(2.6-1.5),-(-30+23)),-.02);await wait(.4);fadeIn(1.2);caption('DUSK · 黄昏','上城西角');
  await walk([[2.6,-30],[.6,-36],[0,-44],[0,-48.6],[-8,-49],[-16.6,-49.2],[-17,-58],[-17,-61.6],[-17.7,-63.2]],{speed:2.0,lookAt:[-18.85,-64.62],until:()=>D.snapshot().prompt?.id==='post'&&Math.hypot(pose.x+17.7,pose.z+63.2)<.5});
  await turnTo([-18.85,-64.62],1.0,false,.12);await wait(1.5);
  F.music('finale');key('KeyE','e');await wait(.3);await play(260);

  // 8 · closing
  await wait(2.5);
  await fadeOut(2.0);F.music('none');
  title.innerHTML='<small>FIN · 第一封信</small><h1>寄给点灯人的信</h1><i></i><p>每一封信，都会有回音。</p>';
  title.classList.add('on');await wait(5.5);title.classList.remove('on');await wait(2.0);
  F.done=true;
};
})();
