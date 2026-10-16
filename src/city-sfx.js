// Procedural sound for the city: no audio files. The context opens on the first
// key press or tap (browser policy) and the preference is remembered.
const KEY='ff-garden.city-sound';
const PENTA=[523.25,587.33,659.25,783.99,880,1046.5,1174.66,1318.51,1567.98];

export function createCitySfx(){
  let on=true,ctx=null,master=null;try{on=localStorage.getItem(KEY)!=='off';}catch{}
  function ensure(){
    if(!on)return null;
    if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);}catch{ctx=null;return null;}}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    return ctx.state==='closed'?null:ctx;
  }
  for(const type of['pointerdown','keydown'])addEventListener(type,()=>ensure(),{passive:true});
  function tone(freq,{dur=.4,type='sine',gain=.12,attack=.006,delay=0,bend=0}={}){
    const c=ensure();if(!c||c.state!=='running')return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);if(bend)o.frequency.exponentialRampToValueAtTime(freq*bend,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.05);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function noise({dur=.3,gain=.08,freq=1200,q=1,delay=0,to=0}={}){
    const c=ensure();if(!c||c.state!=='running')return;const t=c.currentTime+delay,n=Math.ceil(c.sampleRate*dur),buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=buf;f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(freq,t);if(to)f.frequency.exponentialRampToValueAtTime(to,t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+dur*.2);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(master);s.start(t);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  const bell=(f,delay=0,dur=1.6,gain=.09)=>{tone(f,{dur,gain,delay});tone(f*2.01,{dur:dur*.6,gain:gain*.35,delay});tone(f*3.02,{dur:dur*.3,gain:gain*.12,delay});};
  const sfx={
    get on(){return on;},
    setOn(value){on=Boolean(value);try{localStorage.setItem(KEY,on?'on':'off');}catch{}if(!on&&ctx?.state==='running')ctx.suspend().catch(()=>{});if(on)ensure();},
    tick(){tone(1650+Math.random()*120,{dur:.035,gain:.018,type:'triangle'});},
    advance(){tone(988,{dur:.09,gain:.035,type:'triangle'});},
    prompt(){tone(1318.5,{dur:.12,gain:.03});tone(1975.5,{dur:.1,gain:.016,delay:.04});},
    pickup(){tone(783.99,{dur:.18,gain:.07});tone(1174.66,{dur:.32,gain:.06,delay:.08});tone(1567.98,{dur:.45,gain:.04,delay:.16});},
    paper(){noise({dur:.22,gain:.05,freq:3200,q:.7,to:1800});noise({dur:.18,gain:.03,freq:2400,q:.8,delay:.12});},
    surprise(){tone(880,{dur:.16,gain:.06,type:'triangle',bend:1.5});},
    charge(){noise({dur:1.2,gain:.05,freq:300,q:2,to:2400});tone(220,{dur:1.2,gain:.03,type:'sawtooth',bend:3});},
    whoosh(){noise({dur:.6,gain:.06,freq:600,q:1.4,to:2600});},
    ignite(i=0){noise({dur:.18,gain:.05,freq:1800,q:1.2,to:600});bell(PENTA[Math.min(PENTA.length-1,i)],.03,1.3,.07);},
    quest(){[0,2,4].forEach((k,i)=>tone(PENTA[k],{dur:.5,gain:.06,delay:i*.11}));tone(PENTA[7],{dur:1.4,gain:.05,delay:.36});},
    blink(long=false){bell(long?659.25:880,0,long?2.6:.5,long?.1:.07);},
    finale(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>bell(f,i*.18,2.4,.06));}
  };
  return sfx;
}
