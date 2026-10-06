export const QUEST_KEY='ff-garden.letter-quest.v1';
const valid=new Set(['available','carrying','completed']);
export function createLetterQuest(storage){
  let state='available',saved=true,resetPending=false;
  function restore(){
    resetPending=false;
    try{
      const raw=storage.getItem(QUEST_KEY);
      if(raw===null){state='available';saved=true;return;}
      const data=JSON.parse(raw);
      if(data?.version!==1||!valid.has(data.state))throw new Error('Invalid quest progress');
      state=data.state;saved=true;
    }catch{state='available';saved=false;}
  }
  function persist(){try{storage.setItem(QUEST_KEY,JSON.stringify({version:1,state}));saved=true;}catch{saved=false;}}
  restore();
  return {
    snapshot:()=>({state,saved,resetPending}),
    accept({courierReady=false,near=false,streetMode=false}={}){
      if(resetPending||state!=='available'||!courierReady||!near||!streetMode)return false;
      state='carrying';persist();return true;
    },
    deliver({recipientReady=false,near=false,streetMode=false}={}){
      if(resetPending||state!=='carrying'||!recipientReady||!near||!streetMode)return false;
      state='completed';persist();return true;
    },
    requestReset(){resetPending=true;},
    cancelReset(){resetPending=false;},
    confirmReset(){
      if(!resetPending)return false;
      resetPending=false;state='available';
      try{storage.removeItem(QUEST_KEY);saved=true;}catch{saved=false;}
      return true;
    },
    restore
  };
}
