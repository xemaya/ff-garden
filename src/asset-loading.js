export const ASSET_NETWORK_TIMEOUT_MS=5*60*1000;
export const ASSET_DECODE_TIMEOUT_MS=2*60*1000;
export class AssetLoadTimeoutError extends Error{
  constructor(phase){super(phase==='decode'?'Asset decoding timed out':'Asset download timed out');this.name='AssetLoadTimeoutError';this.phase=phase;}
}
export class AssetLoadCancelledError extends Error{
  constructor(){super('Asset loading cancelled');this.name='AssetLoadCancelledError';}
}

// One download/decode and one shared waiting cohort per asset. Native decoders
// cannot be preempted: a retry subscribes to the surviving decode rather than
// starting another. Only the current cohort may commit a result.
export function createAssetLoader(load,{timeoutMs=0,decodeTimeoutMs=timeoutMs,setTimer=setTimeout,clearTimer=clearTimeout,accept=()=>{},dispose=()=>{}}={}) {
  let cached=null,operation=null,attempt=null;
  const release=value=>{try{dispose(value);}catch{/* Cleanup must not reject a detached promise. */}};
  function clearDeadline(waiter){if(waiter.timer!==null)clearTimer(waiter.timer);waiter.timer=null;}
  function stop(error){
    const waiter=attempt;if(!waiter)return false;attempt=null;clearDeadline(waiter);waiter.reject(error);
    if(waiter.operation.phase==='network'){
      if(operation===waiter.operation)operation=null;
      waiter.operation.controller.abort(error);
    }
    return true;
  }
  function armDeadline(waiter){
    clearDeadline(waiter);const duration=waiter.operation.phase==='decode'?decodeTimeoutMs:timeoutMs;
    if(duration>0)waiter.timer=setTimer(()=>{if(attempt===waiter)stop(new AssetLoadTimeoutError(waiter.operation.phase));},duration);
  }
  function finish(op,value,error,failed=false){
    if(operation===op)operation=null;
    const waiter=attempt;
    if(!waiter||waiter.operation!==op){if(!failed)release(value);return;}
    attempt=null;clearDeadline(waiter);
    if(!failed){try{accept(value);}catch(validationError){release(value);error=validationError;failed=true;}}
    if(failed)waiter.reject(error);else{cached=waiter.promise;waiter.resolve(value);}
  }
  function loadAsset(){
    if(cached)return cached;if(attempt)return attempt.promise;
    let op=operation;
    if(!op){
      op={phase:'network',controller:new AbortController()};operation=op;
      const context={signal:op.controller.signal,downloaded(){
        if(operation!==op||op.phase!=='network')return;op.phase='decode';
        if(attempt?.operation===op)armDeadline(attempt);
      }};
      Promise.resolve().then(()=>{if(context.signal.aborted)throw context.signal.reason||new AssetLoadCancelledError();return load(context);}).then(value=>finish(op,value,null),error=>finish(op,undefined,error,true));
    }
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    attempt={operation:op,promise,resolve,reject,timer:null};armDeadline(attempt);return promise;
  }
  loadAsset.cancel=()=>stop(new AssetLoadCancelledError());
  return loadAsset;
}

// Optional characters must not turn a working street into a loading error.
export async function loadCharacterAssets(loaders, onSettled = () => {}) {
  const entries = Object.entries(loaders);
  const results = await Promise.allSettled(entries.map(([name, load]) => Promise.resolve().then(load).then(
    value => { onSettled(name, {status: 'fulfilled', value}); return value; },
    reason => { onSettled(name, {status: 'rejected', reason}); throw reason; },
  )));
  return Object.fromEntries(entries.map(([name], index) => [name, results[index]]));
}
