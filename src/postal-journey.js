import {chapters,discoveries} from './postal-content.js';
import {QUEST_KEY as LEGACY_KEY} from './letter-quest.js';

export const JOURNEY_KEY='ff-garden.postal-journey.v2';
export const LEGACY_BACKUP_KEY='ff-garden.postal-journey.legacy-backup.v1';
export const UNREADABLE_BACKUP_KEY='ff-garden.postal-journey.unreadable-backup';
export const PREVIOUS_JOURNEYS_KEY='ff-garden.postal-journey.previous.v1';
const discoveryIds=new Set(discoveries.map(entry=>entry.id));
const stages=new Set(['available','carrying','reply','completed']);
const blank=()=>({version:2,chapter:0,state:'available',discoveries:[]});

export function decodeJourney(raw){
  const value=JSON.parse(raw);
  if(value?.version!==2||!Number.isInteger(value.chapter)||value.chapter<0||value.chapter>=chapters.length||!stages.has(value.state)||!Array.isArray(value.discoveries))throw new Error('Invalid journey');
  if(value.state==='reply'&&!chapters[value.chapter].correctAnswer)throw new Error('Unexpected reply stage');
  if(value.discoveries.some(id=>!discoveryIds.has(id))||new Set(value.discoveries).size!==value.discoveries.length)throw new Error('Invalid discovery');
  return {version:2,chapter:value.chapter,state:value.state,discoveries:[...value.discoveries]};
}

function decodeLegacy(raw){
  const value=JSON.parse(raw);
  if(value?.version!==1||!['available','carrying','completed'].includes(value.state))throw new Error('Invalid legacy quest');
  return {...blank(),state:value.state};
}

// Pure story rules and optional local persistence; no actors, DOM or networking.
export function createPostalJourney(storage){
  let progress=blank(),saved=true,resetPending=false,recoveryPending=false,legacyRaw=null,storageIssue=null,protectedData=false;
  let previous=[],backupIssue=false,legacyIssue=false,recoveryError=null,recoverySource=null,recoveryId=null;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const summary=p=>p?{chapter:p.chapter,state:p.state,discoveries:p.discoveries.length}:null;
  function readPrevious(){
    const raw=storage.getItem(PREVIOUS_JOURNEYS_KEY);if(raw===null)return [];
    const value=JSON.parse(raw);
    if(value?.version!==1||!Array.isArray(value.entries)||value.entries.length>3)throw new Error('Invalid backup journal');
    let lastId=0;
    return value.entries.map(entry=>{if(!Number.isSafeInteger(entry.id)||entry.id<=lastId)throw new Error('Invalid backup id');lastId=entry.id;return {id:entry.id,progress:decodeJourney(JSON.stringify(entry.progress))};});
  }
  function backUpCurrent(){
    try{
      previous=readPrevious();
      if(same(previous.at(-1)?.progress,progress))return true;
      const entry={id:(previous.at(-1)?.id||0)+1,progress:decodeJourney(JSON.stringify(progress))};
      if(!Number.isSafeInteger(entry.id))throw new Error('Backup counter exhausted');
      const next=[...previous.slice(-2),entry];storage.setItem(PREVIOUS_JOURNEYS_KEY,JSON.stringify({version:1,entries:next}));previous=next;backupIssue=false;return true;
    }catch{backupIssue=true;recoveryError='backup-unavailable';return false;}
  }
  function replaceProgress(next){
    if(protectedData){recoveryError='protected';return false;}
    // Recheck immediately before a destructive write; another tab may have
    // supplied a future-version save while the confirmation was open.
    try{
      const raw=storage.getItem(JOURNEY_KEY);
      if(raw!==null){
        let current;try{current=decodeJourney(raw);}catch{protectedData=true;saved=false;storageIssue='unreadable';recoveryError='protected';return false;}
        if(saved&&!same(current,progress)){progress=current;resetPending=false;recoveryPending=false;recoveryError='changed-elsewhere';return false;}
      }
    }catch{protectedData=true;saved=false;storageIssue='unavailable';recoveryError='protected';return false;}
    if(!backUpCurrent())return false;
    try{storage.setItem(JOURNEY_KEY,JSON.stringify(next));}
    catch{recoveryError='save-failed';return false;}
    progress=next;saved=true;storageIssue=null;recoveryError=null;return true;
  }
  function readLegacy(){
    legacyRaw=null;legacyIssue=false;
    for(const key of [LEGACY_BACKUP_KEY,LEGACY_KEY]){
      try{const raw=storage.getItem(key);if(raw!==null){decodeLegacy(raw);legacyRaw=raw;legacyIssue=false;return;}}catch{legacyIssue=true;}
    }
  }
  function persist(){
    if(protectedData){saved=false;return false;}
    try{storage.setItem(JOURNEY_KEY,JSON.stringify(progress));saved=true;storageIssue=null;return true;}
    catch{saved=false;storageIssue='unavailable';return false;}
  }
  function restore(){
    progress=blank();saved=true;resetPending=false;recoveryPending=false;protectedData=false;storageIssue=null;legacyRaw=null;recoveryError=null;recoverySource=null;recoveryId=null;
    try{previous=readPrevious();backupIssue=false;}catch{previous=[];backupIssue=true;}
    let raw;
    try{raw=storage.getItem(JOURNEY_KEY);}catch{saved=false;protectedData=true;storageIssue='unavailable';return;}
    if(raw!==null){
      try{progress=decodeJourney(raw);}catch{
        saved=false;protectedData=true;storageIssue='unreadable';
        // Retain the original key, including future versions. Never silently
        // overwrite an unreadable save when a session action occurs.
        try{if(storage.getItem(UNREADABLE_BACKUP_KEY)===null)storage.setItem(UNREADABLE_BACKUP_KEY,raw);}catch{}
      }
      readLegacy();return;
    }
    let legacyPrevious;
    try{legacyPrevious=storage.getItem(LEGACY_KEY);}catch{saved=false;protectedData=true;storageIssue='unavailable';return;}
    if(legacyPrevious!==null){
      try{
        progress=decodeLegacy(legacyPrevious);legacyRaw=legacyPrevious;
        try{if(storage.getItem(LEGACY_BACKUP_KEY)===null)storage.setItem(LEGACY_BACKUP_KEY,legacyPrevious);}catch{}
        // v1 itself always remains unchanged, even if its backup cannot be made.
        persist();
      }catch{saved=false;storageIssue='invalid-legacy';}
    }
    readLegacy();
  }
  const blocked=()=>resetPending||recoveryPending;
  const nearby=(context,species)=>context?.actorReady&&context.species===species&&context.near&&context.streetMode&&!context.busy;
  restore();
  return {
    snapshot:()=>({...progress,discoveries:[...progress.discoveries],saved,resetPending,recoveryPending,recoverySource,recoveryError,protectedData,backupIssue,legacyIssue,hasLegacyBackup:legacyRaw!==null,hasJourneyBackup:!!previous.length&&!same(previous.at(-1).progress,progress),recoverySummary:recoveryId?summary(previous.find(entry=>entry.id===recoveryId)?.progress):null,legacySummary:legacyRaw===null?null:decodeLegacy(legacyRaw).state,previousSummary:summary(previous.at(-1)?.progress),storageIssue,ending:progress.chapter===chapters.length-1&&progress.state==='completed'}),
    accept(context){
      if(blocked()||progress.state!=='available'||!nearby(context,chapters[progress.chapter].sender))return false;
      progress.state='carrying';persist();return true;
    },
    deliver(context){
      if(blocked()||progress.state!=='carrying'||!nearby(context,chapters[progress.chapter].recipient))return false;
      progress.state=chapters[progress.chapter].correctAnswer?'reply':'completed';persist();return true;
    },
    answer(id,context){
      if(blocked()||progress.state!=='reply'||!nearby(context,chapters[progress.chapter].recipient))return {ok:false,reason:'not-ready'};
      if(id!==chapters[progress.chapter].correctAnswer)return {ok:false,reason:'wrong-answer'};
      progress.state='completed';persist();return {ok:true};
    },
    continue(){
      if(blocked()||progress.state!=='completed'||progress.chapter===chapters.length-1)return false;
      progress.chapter++;progress.state='available';persist();return true;
    },
    discover({id,near=false,streetMode=false}={}){
      if(blocked()||!discoveryIds.has(id)||!near||!streetMode||progress.discoveries.includes(id))return false;
      progress.discoveries.push(id);persist();return true;
    },
    requestReset(){recoveryPending=false;recoveryError=null;resetPending=true;},
    cancelReset(){resetPending=false;recoveryError=null;},
    confirmReset(){
      if(!resetPending)return false;
      // A protected/future save permits a session-only restart, never a rewrite.
      if(protectedData){resetPending=false;progress=blank();saved=false;return true;}
      if(!replaceProgress(blank()))return false;
      resetPending=false;return true;
    },
    requestRecovery(source='legacy'){
      recoveryError=null;if(protectedData){recoveryError='protected';return false;}
      if(!['legacy','journey'].includes(source))return false;
      if(source==='legacy'&&legacyRaw===null)return false;
      if(source==='journey'&&(!previous.length||same(previous.at(-1).progress,progress)))return false;
      resetPending=false;recoveryPending=true;recoverySource=source;recoveryId=source==='journey'?previous.at(-1).id:null;return true;
    },
    cancelRecovery(){recoveryPending=false;recoverySource=null;recoveryId=null;recoveryError=null;},
    confirmRecovery(){
      if(!recoveryPending)return false;
      let next;
      try{
        if(recoverySource==='legacy'){readLegacy();if(legacyRaw===null)throw new Error('Legacy missing');next=decodeLegacy(legacyRaw);}
        else {const entry=readPrevious().find(entry=>entry.id===recoveryId);if(!entry)throw new Error('Backup missing');next=entry.progress;}
      }catch{recoveryError='source-unavailable';return false;}
      if(!replaceProgress(next))return false;
      recoveryPending=false;recoverySource=null;recoveryId=null;return true;
    },
    restore
  };
}
