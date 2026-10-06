export const postalChime=Object.freeze([
  Object.freeze({offset:0,duration:.18,frequency:659.25}),
  Object.freeze({offset:.3,duration:.18,frequency:659.25}),
  Object.freeze({offset:.6,duration:.68,frequency:523.25})
]);

// Called only by a successful final handoff. Never resume a context or enable sound.
export function playPostalChime(audio){
  if(!audio?.on||audio.ac?.state!=='running'||!audio.master)return false;
  const {ac,master}=audio,now=ac.currentTime;
  try{
    cancelPostalChime(audio);
    if(audio.ambientGain){audio.ambientGain.gain.cancelScheduledValues(now);audio.ambientGain.gain.setValueAtTime(.001,now);}
    audio.chimeUntil=now+1.8;
    for(const note of postalChime){
      const start=now+note.offset,osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.value=note.frequency;
      gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(.07,start+.025);gain.gain.setValueAtTime(.07,start+note.duration);gain.gain.exponentialRampToValueAtTime(.001,start+note.duration+.12);
      osc.connect(gain);gain.connect(master);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+note.duration+.14);
      audio.postalNodes.push({osc,gain});
    }
    audio.completionChimesPlayed=(audio.completionChimesPlayed||0)+1;return true;
  }catch{cancelPostalChime(audio);return false;}
}

export function cancelPostalChime(audio){
  if(!audio)return;
  for(const {osc,gain} of audio.postalNodes||[]){try{osc.stop(audio.ac.currentTime);osc.disconnect();gain.disconnect();}catch{}}
  audio.postalNodes=[];audio.chimeUntil=0;
}
