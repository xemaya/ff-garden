// Film session only (never shipped): virtual time, offline audio, music.
// Every frame advances exactly 1/30 s; timers, rAF, CSS animations and Web Audio follow.
(()=>{
  const realSetTimeout=window.setTimeout.bind(window);
  let vt=0;const timers=new Map();let timerId=1;let rafQ=[];let rafId=1;
  performance.now=()=>vt;
  document.hasFocus=()=>true;
  window.setTimeout=(fn,ms=0,...args)=>{const id=timerId++;timers.set(id,{at:vt+Math.max(0,ms),fn,args});return id;};
  window.clearTimeout=id=>timers.delete(id);
  window.setInterval=(fn,ms,...args)=>{const id=timerId++;const tick=()=>{timers.set(id,{at:vt+ms,fn:()=>{tick();fn(...args);},args:[]});};tick();return id;};
  window.clearInterval=id=>timers.delete(id);
  window.requestAnimationFrame=cb=>{const id=rafId++;rafQ.push({id,cb});return id;};
  window.cancelAnimationFrame=id=>{rafQ=rafQ.filter(r=>r.id!==id);};

  // Audio: one OfflineAudioContext whose clock is the virtual clock.
  const RATE=44100,MAXS=600;
  const offline=new OfflineAudioContext(1,RATE*MAXS,RATE);
  const proxy=new Proxy(offline,{get(t,p){if(p==='currentTime')return vt/1000;if(p==='state')return'running';if(p==='resume'||p==='suspend'||p==='close')return()=>Promise.resolve();const v=Reflect.get(t,p,t);return typeof v==='function'?v.bind(t):v;}});
  window.AudioContext=function(){return proxy;};window.webkitAudioContext=window.AudioContext;

  const film={get vt(){return vt;},tasks:new Set(),waits:[],moods:[],
    async step(ms=1000/30,{animate=true}={}){
      vt+=ms;
      for(const [id,t]of[...timers])if(t.at<=vt){timers.delete(id);try{t.fn(...t.args);}catch(e){console.error(e);}}
      for(const task of[...film.tasks])try{task(ms/1000);}catch(e){console.error(e);film.tasks.delete(task);}
      const q=rafQ;rafQ=[];for(const r of q)try{r.cb(vt);}catch(e){console.error(e);}
      if(animate)for(const a of document.getAnimations()){if(a.__vt===undefined){a.pause();a.__vt=0;}a.__vt+=ms;const end=a.effect?.getComputedTiming().endTime;if(Number.isFinite(end)&&a.__vt>=end){a.finish();continue;}a.currentTime=a.__vt;}
      const due=film.waits.filter(w=>w.at<=vt);film.waits=film.waits.filter(w=>w.at>vt);for(const w of due)w.resolve();
      await new Promise(r=>realSetTimeout(r,0));await new Promise(r=>realSetTimeout(r,0));
      return film.done?'done':'run';
    },
    wait(sec){return new Promise(resolve=>film.waits.push({at:vt+sec*1000,resolve}));},
    music(mood){film.moods.push({t:vt/1000,mood});},
    done:false,
    // ---- music, scheduled into the offline context after the film is shot ----
    scheduleMusic(endT){
      const ctx=offline,bus=ctx.createGain();bus.gain.value=.62;bus.connect(ctx.destination);
      const hz=m=>440*Math.pow(2,(m-69)/12);
      function box(m,t,v,seg){const f=hz(m);for(const [mul,g,d]of[[1,.085,1.7],[2,.022,.7],[3.01,.008,.35],[4.2,.004,.18]]){const o=ctx.createOscillator(),e=ctx.createGain();o.frequency.value=f*mul;e.gain.setValueAtTime(.0001,t);e.gain.exponentialRampToValueAtTime(g*v,t+.006);e.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(e);e.connect(seg);o.start(t);o.stop(t+d+.05);}}
      function bass(m,t,d,seg){const o=ctx.createOscillator(),e=ctx.createGain(),lp=ctx.createBiquadFilter();o.type='triangle';o.frequency.value=hz(m);lp.type='lowpass';lp.frequency.value=700;e.gain.setValueAtTime(.0001,t);e.gain.exponentialRampToValueAtTime(.07,t+.02);e.gain.exponentialRampToValueAtTime(.012,t+d);e.gain.exponentialRampToValueAtTime(.0001,t+d+.3);o.connect(lp);lp.connect(e);e.connect(seg);o.start(t);o.stop(t+d+.35);}
      function pad(notes,t,d,seg,lvl){for(const m of notes)for(const det of[-7,7]){const o=ctx.createOscillator(),e=ctx.createGain(),lp=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.value=hz(m);o.detune.value=det;lp.type='lowpass';lp.frequency.value=820;e.gain.setValueAtTime(.0001,t);e.gain.linearRampToValueAtTime(lvl,t+Math.min(1.2,d*.4));e.gain.setValueAtTime(lvl,t+d*.75);e.gain.linearRampToValueAtTime(.0001,t+d+.9);o.connect(lp);lp.connect(e);e.connect(seg);o.start(t);o.stop(t+d+1);}}
      const C=[48,[60,64,67]],G=[43,[59,62,67]],Am=[45,[60,64,69]],F=[41,[60,65,69]],Em=[40,[59,64,67]],Dm=[50,[57,62,65]],E7=[40,[56,62,64]];
      const THEMES={
        day:{bpm:96,mel:[[[76,1],[79,1],[84,1]],[[83,2],[79,1]],[[81,1],[79,1],[76,1]],[[79,3]],[[77,1],[81,1],[84,1]],[[83,1],[81,1],[79,1]],[[76,1],[74,1],[76,1]],[[72,3]]],chords:[C,G,Am,Em,F,G,C,C],pad:.005},
        dusk:{bpm:72,mel:[[[69,1],[72,1],[76,1]],[[77,2],[76,1]],[[74,1],[72,1],[74,1]],[[76,3]],[[69,1],[72,1],[76,1]],[[79,1],[77,1],[76,1]],[[74,1],[71,1],[72,1]],[[69,3]]],chords:[Am,F,G,C,Am,Dm,E7,Am],pad:.007},
        finale:{bpm:66,mel:[[[76,1],[79,1],[84,1]],[[83,2],[79,1]],[[81,1],[79,1],[76,1]],[[79,3]],[[77,1],[81,1],[84,1]],[[83,1],[81,1],[79,1]],[[76,1],[74,1],[79,1]],[[84,3]]],chords:[C,G,Am,Em,F,G,F,C],pad:.011},
        quiet:{bpm:72,mel:null,chords:[Am,F,C,G],pad:.006}
      };
      const segs=film.moods.map((m,i)=>({...m,end:i+1<film.moods.length?film.moods[i+1].t:endT}));
      for(const s of segs){const th=THEMES[s.mood];if(!th)continue;const seg=ctx.createGain(),t0=s.t,t1=s.end;seg.gain.setValueAtTime(.0001,t0);seg.gain.linearRampToValueAtTime(1,t0+1.6);seg.gain.setValueAtTime(1,Math.max(t0+1.6,t1-1.8));seg.gain.linearRampToValueAtTime(.0001,t1+.2);seg.connect(bus);
        const beat=60/th.bpm,bar=beat*3;let t=t0,k=0;
        while(t<t1){const chord=th.chords[k%th.chords.length],loop=Math.floor(k/th.chords.length);
          bass(chord[0],t,beat*1.6,seg);for(const b of[1,2])for(const m of chord[1])box(m,t+b*beat,.22,seg);
          pad(chord[1],t,bar,seg,th.pad);
          if(th.mel&&!(s.mood==='day'&&loop%3===2)){let u=t;for(const [m,len]of th.mel[k%th.mel.length]){box(m+(loop%2&&s.mood==='day'?-12:0),u,loop%2&&s.mood==='day'?.7:1,seg);u+=len*beat;}}
          t+=bar;k++;}
      }
    },
    async renderAudio(endT){film.scheduleMusic(endT);const buf=await offline.startRendering();const n=Math.min(buf.length,Math.ceil(endT*RATE)),d=buf.getChannelData(0);
      const out=new DataView(new ArrayBuffer(44+n*2));const w=(o,s)=>{for(let i=0;i<s.length;i++)out.setUint8(o+i,s.charCodeAt(i));};
      w(0,'RIFF');out.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');out.setUint32(16,16,true);out.setUint16(20,1,true);out.setUint16(22,1,true);out.setUint32(24,RATE,true);out.setUint32(28,RATE*2,true);out.setUint16(32,2,true);out.setUint16(34,16,true);w(36,'data');out.setUint32(40,n*2,true);
      let peak=0;for(let i=0;i<n;i++)peak=Math.max(peak,Math.abs(d[i]));const gain=peak>.89?.89/peak:1;
      for(let i=0;i<n;i++)out.setInt16(44+i*2,Math.max(-1,Math.min(1,d[i]*gain))*32767,true);
      film.wav=new Uint8Array(out.buffer);return{bytes:film.wav.length,peak};},
    wavChunk(i,size){const s=film.wav.subarray(i,i+size);let b='';for(let k=0;k<s.length;k+=32768)b+=String.fromCharCode.apply(null,s.subarray(k,k+32768));return btoa(b);}
  };
  window.__film=film;
})();
