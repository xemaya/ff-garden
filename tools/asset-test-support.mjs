export function clock(){
 let now=0,id=0;const tasks=new Map();
 return {
  setTimer(fn,delay){tasks.set(++id,{fn,time:now+delay});return id;},
  clearTimer(key){tasks.delete(key);},
  advance(ms){
   const target=now+ms;
   while(true){const entry=[...tasks].filter(([,task])=>task.time<=target).sort((a,b)=>a[1].time-b[1].time)[0];if(!entry)break;
    const [key,task]=entry;now=task.time;tasks.delete(key);task.fn();
   }
   now=target;
  },
  count:()=>tasks.size
 };
}
export function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
export async function flush(){for(let i=0;i<12;i++)await Promise.resolve();}
