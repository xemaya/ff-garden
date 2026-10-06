import {createAssetLoader,AssetLoadCancelledError,ASSET_NETWORK_TIMEOUT_MS} from './asset-loading.js';

// JSON is required input, not an optional scene substitute. Keep the network
// deadline active until the complete body has parsed, then guard a late result.
export function createStartupJsonLoader(url,{fetcher=fetch,timeoutMs=ASSET_NETWORK_TIMEOUT_MS,...timers}={}){
 return createAssetLoader(async context=>{
  const response=await fetcher(url,{signal:context.signal,credentials:'same-origin'});
  if(context.signal.aborted)throw context.signal.reason||new AssetLoadCancelledError();
  if(!response.ok)throw new Error('资料请求失败（HTTP '+response.status+'）');
  const value=await response.json();if(context.signal.aborted)throw context.signal.reason||new AssetLoadCancelledError();return value;
 },{timeoutMs,...timers});
}

// Scoped to a single startup wait. Reload is deliberately a fresh page, not a
// second scene initialization with surviving listeners and partial GPU state.
export async function waitForStartup(load,{document,events,root}){
 const cancel=document.createElement('button');cancel.type='button';cancel.className='startup-cancel';cancel.textContent='停止等待';
 const stop=()=>load.cancel();cancel.addEventListener('click',stop);events.addEventListener('pagehide',stop);root.append(cancel);root.setAttribute('aria-busy','true');
 try{return await load();}
 finally{cancel.removeEventListener('click',stop);events.removeEventListener('pagehide',stop);cancel.remove();root.setAttribute('aria-busy','false');}
}
