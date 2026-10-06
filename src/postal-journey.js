import {chapters,discoveries} from './postal-content.js';
import {QUEST_KEY as LEGACY_KEY} from './letter-quest.js';

export const JOURNEY_KEY='ff-garden.postal-journey.v2';
export const LEGACY_BACKUP_KEY='ff-garden.postal-journey.legacy-backup.v1';
export const UNREADABLE_BACKUP_KEY='ff-garden.postal-journey.unreadable-backup';
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
  function readLegacy(){
    legacyRaw=null;
    for(const key of [LEGACY_BACKUP_KEY,LEGACY_KEY]){
      try{const raw=storage.getItem(key);if(raw!==null){decodeLegacy(raw);legacyRaw=raw;return;}}catch{}
    }
  }
  function persist(){
    if(protectedData){saved=false;return false;}
    try{storage.setItem(JOURNEY_KEY,JSON.stringify(progress));saved=true;storageIssue=null;return true;}
    catch{saved=false;storageIssue='unavailable';return false;}
  }
  function restore(){
    progress=blank();saved=true;resetPending=false;recoveryPending=false;protectedData=false;storageIssue=null;legacyRaw=null;
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
    let previous;
    try{previous=storage.getItem(LEGACY_KEY);}catch{saved=false;protectedData=true;storageIssue='unavailable';return;}
    if(previous!==null){
      try{
        progress=decodeLegacy(previous);legacyRaw=previous;
        try{if(storage.getItem(LEGACY_BACKUP_KEY)===null)storage.setItem(LEGACY_BACKUP_KEY,previous);}catch{}
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
    snapshot:()=>({...progress,discoveries:[...progress.discoveries],saved,resetPending,recoveryPending,hasLegacyBackup:legacyRaw!==null,storageIssue,ending:progress.chapter===chapters.length-1&&progress.state==='completed'}),
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
    requestReset(){recoveryPending=false;resetPending=true;},
    cancelReset(){resetPending=false;},
    confirmReset(){
      if(!resetPending)return false;
      resetPending=false;progress=blank();persist();return true;
    },
    requestRecovery(){if(legacyRaw===null)return false;resetPending=false;recoveryPending=true;return true;},
    cancelRecovery(){recoveryPending=false;},
    confirmRecovery(){
      if(!recoveryPending||legacyRaw===null)return false;
      recoveryPending=false;progress=decodeLegacy(legacyRaw);persist();return true;
    },
    restore
  };
}
