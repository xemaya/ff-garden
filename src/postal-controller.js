import {chapters,ending,discoveries} from './postal-content.js';
import {JOURNEY_KEY,PREVIOUS_JOURNEYS_KEY,LEGACY_BACKUP_KEY} from './postal-journey.js';
import {postalView} from './postal-view.js';
import {observationSummary} from './postal-observations.js';

// Own the notebook UI; world rendering, navigation and storage rules stay outside.
export function createPostalController({document,events,journey,world,toast,openMap,returnToStreet,clearInput,getObservation=()=>null,onEnding=()=>{},onVisibilityChange=()=>{}}){
  const $=id=>document.getElementById(id),setText=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};
  let open=journey.snapshot().state!=='available'||journey.snapshot().chapter>0,feedback='',tab='letters';
  let previousOpen=null;
  const observationCards=new Map();
  for(const entry of discoveries){
    const card=document.createElement('section'),title=document.createElement('strong'),text=document.createElement('p'),keepsake=document.createElement('p');
    card.className='postal-observation';title.textContent=entry.title;text.textContent=entry.text;keepsake.textContent=entry.keepsake;card.append(title,text,keepsake);$('postal-observation-records').append(card);observationCards.set(entry.id,card);
  }
  const recoveryErrors={
    'backup-unavailable':'无法安全保存当前旅程备份，因此没有替换进度。备份格式异常或本地空间不足时，原记录仍保留；可以取消后再试。',
    'save-failed':'当前旅程备份已保留，但新进度无法写入。本次操作没有改变当前旅程，可以取消或重试。',
    'source-unavailable':'要恢复的记录已失效或无法读取。当前旅程没有改变，原数据没有被删除。',
    'protected':'原存档无法读取或来自更高版本，恢复操作已停下，避免覆盖它。本次仍可临时游玩。',
    'changed-elsewhere':'另一页更新了存档，已读取较新进度并取消本次操作。'
  };
  const replyButtons=new Map();
  for(const option of chapters.find(chapter=>chapter.options).options){
    const button=document.createElement('button');button.type='button';button.textContent=option.label;button.dataset.reply=option.id;
    button.addEventListener('click',event=>{
      if(event.detail>1)return;
      const snapshot=journey.snapshot(),chapter=chapters[snapshot.chapter],result=journey.answer(option.id,world.interaction(chapter.recipient));
      if(result.ok){world.replay(chapter.recipient);feedback=chapter.replySuccess;toast('回应已记下：两短一长。');}
      else if(result.reason==='wrong-answer')feedback=chapter.wrongAnswer;
      else feedback='请先走近陆行鸟，等它加载好后再回应。';
      update();if(result.ok)$('postal-continue').focus();
    });
    $('postal-replies').append(button);replyButtons.set(option.id,button);
  }
  function update(){
    const snapshot=journey.snapshot(),target=world.currentTarget(snapshot),chapter=chapters[snapshot.chapter];
    const context=world.interaction(snapshot.state==='available'?chapter.sender:chapter.recipient),model=postalView(snapshot,target,context,world.view().mode);
    if(snapshot.syncNotice)feedback='';$('postal-sync-notice').hidden=!snapshot.syncNotice;
    $('letter-quest-panel').hidden=!open;$('letter-quest-open').setAttribute('aria-expanded',String(open));
    if(previousOpen!==open){previousOpen=open;onVisibilityChange(open);}
    setText('postal-title',tab==='letters'?model.title:'邮差手记 · 见闻');setText('letter-quest-step',model.step);setText('letter-quest-text',model.body);
    $('postal-letter-page').hidden=tab!=='letters';$('postal-observations-page').hidden=tab!=='observations';
    for(const name of ['letters','observations']){$('postal-tab-'+name).setAttribute('aria-selected',String(tab===name));$('postal-tab-'+name).setAttribute('tabindex',tab===name?'0':'-1');}
    const summary=observationSummary(snapshot);$('postal-observation-empty').hidden=!!summary.entries.length;
    for(const [id,card] of observationCards)card.hidden=!snapshot.discoveries.includes(id);
    setText('postal-objective',model.objective);$('postal-objective').hidden=!target;
    setText('letter-quest-hint',model.hint);setText('postal-feedback',feedback);$('postal-feedback').hidden=!feedback;
    $('letter-quest-save').hidden=snapshot.saved;
    setText('letter-quest-save',snapshot.storageIssue==='unreadable'?'原存档无法读取或来自更高版本，已保留原数据；本次旅程不覆盖它，刷新后不能恢复本次进度。':'本地保存暂不可用；本次仍能继续，但刷新后可能无法恢复。旧版数据不会被删除。');
    $('letter-quest-action').hidden=!model.showAction;$('letter-quest-action').disabled=!model.canAct;setText('letter-quest-action',model.actionLabel);
    $('letter-quest-guide').hidden=snapshot.state==='completed'||snapshot.resetPending||snapshot.recoveryPending;$('letter-quest-guide').disabled=!model.canLocate;setText('letter-quest-guide','在地图上找目标');
    $('postal-replies').hidden=!model.showReplies;for(const button of replyButtons.values())button.disabled=!model.canAct;
    $('postal-replay').hidden=!model.showReplies;$('postal-replay').disabled=!model.canAct;
    $('postal-continue').hidden=!model.showContinue;
    $('postal-ending').hidden=!snapshot.ending;setText('postal-remembrance',ending.remembrance+' '+summary.text);
    $('letter-quest-reset').hidden=snapshot.resetPending||snapshot.recoveryPending;$('letter-quest-reset-confirmation').hidden=!snapshot.resetPending;
    setText('letter-quest-reset-title',snapshot.protectedData?'只重新开始本次临时邮路吗？原存档无法读取，仍会保留；本次进度不能写入，刷新后不能恢复。':'确定重新开始整段邮路吗？新的委托与见闻进度会重置；重置前先保存当前旅程备份。旧版原始进度和显示质量保留。');
    $('postal-recover-legacy').hidden=!snapshot.hasLegacyBackup||snapshot.resetPending||snapshot.recoveryPending;
    $('postal-recover-journey').hidden=!snapshot.hasJourneyBackup||snapshot.resetPending||snapshot.recoveryPending;
    $('postal-recover-legacy').disabled=snapshot.protectedData;$('postal-recover-journey').disabled=snapshot.protectedData;
    setText('postal-backup-status',snapshot.protectedData?'原存档受保护，不能用恢复操作覆盖它。':(snapshot.hasLegacyBackup?'旧版第一封信可恢复，原始旧键始终保留。':'没有可识别的旧版第一封信。')+(snapshot.hasJourneyBackup?' 上次重置或恢复前的旅程备份可用。':'')+(snapshot.legacyIssue?' 有旧版记录无法识别，原数据仍保留。':'')+(snapshot.backupIssue?' 旅程备份无法读取或保存，未清空它。':''));
    $('postal-recovery-confirmation').hidden=!snapshot.recoveryPending;
    const previous=snapshot.recoverySummary||snapshot.previousSummary,stageLabel={available:'待接信',carrying:'携信途中',reply:'等待记录节拍',completed:'已送达'};
    setText('postal-recovery-title',snapshot.recoverySource==='journey'?'恢复上次旅程备份（委托 '+((previous?.chapter??0)+1)+' · '+stageLabel[previous?.state]+'，已记 '+(Array.isArray(previous?.discoveries)?previous.discoveries.length:previous?.discoveries??0)+'处见闻）吗？恢复前先备份当前旅程，旧版数据保留。':'恢复旧版第一封信（'+stageLabel[snapshot.legacySummary]+'）吗？三封信主线将回到第一章的旧进度，见闻使用旧版空白记录；恢复前先备份当前旅程，旧版原始记录保留。');
    setText('postal-recovery-error',recoveryErrors[snapshot.recoveryError]||'');$('postal-recovery-error').hidden=!snapshot.recoveryError;
    setText('map-quest-target',model.mapLabel+(target&&!target.loaded?'（位置参考，角色尚未加载）':''));
    return target;
  }
  function cancelConfirmations(){journey.cancelReset();journey.cancelRecovery();}
  function cancelReset(){const source=journey.snapshot().recoverySource;cancelConfirmations();update();if(open&&world.view().mode==='street')$(source?'postal-recover-'+source:'letter-quest-reset').focus();}
  function show(){returnToStreet();clearInput();tab='letters';open=true;update();$('postal-tab-letters').focus();}
  function close(restoreFocus=true){cancelConfirmations();clearInput();open=false;update();if(restoreFocus)$('letter-quest-open').focus();}
  function selectTab(name){tab=name;update();}
  for(const name of ['letters','observations']){
    $('postal-tab-'+name).addEventListener('click',()=>selectTab(name));
    $('postal-tab-'+name).addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.code))return;event.preventDefault();const next=event.code==='Home'?'letters':event.code==='End'?'observations':name==='letters'?'observations':'letters';selectTab(next);$('postal-tab-'+next).focus();});
  }
  $('postal-observe').addEventListener('click',()=>{
    if(open)return;
    const observation=getObservation();if(!observation||(!observation.recorded&&!observation.canObserve)||world.view().mode!=='street')return;
    if(!observation.recorded&&!journey.discover({id:observation.entry.id,near:observation.near,streetMode:true}))return;
    feedback='';tab='observations';open=true;clearInput();update();$('postal-observation-title').focus();if(!observation.recorded)toast(observation.entry.keepsake);
  });
  $('letter-quest-open').addEventListener('click',()=>{const fromMap=world.view().mode!=='street';returnToStreet();if(open&&!fromMap){close();return;}clearInput();open=true;update();$('postal-tab-'+tab).focus();});
  $('letter-quest-close').addEventListener('click',()=>close());
  $('letter-quest-guide').addEventListener('click',()=>{const snapshot=journey.snapshot(),target=world.currentTarget(snapshot);if(!target?.exists||snapshot.resetPending||snapshot.recoveryPending)return;openMap();update();});
  $('letter-quest-action').addEventListener('keydown',event=>{if(event.repeat&&['Enter','Space'].includes(event.code))event.preventDefault();});
  $('letter-quest-action').addEventListener('click',event=>{
    if(event.detail>1)return;
    const snapshot=journey.snapshot(),chapter=chapters[snapshot.chapter],target=world.currentTarget(snapshot),kind=snapshot.state==='available'?'accept':'deliver';
    const species=kind==='accept'?chapter.sender:chapter.recipient,context=world.interaction(species);
    if(!postalView(snapshot,target,context,world.view().mode).canAct||!['available','carrying'].includes(snapshot.state))return;
    if(!world.handoff(kind,species))return;
    const changed=kind==='accept'?journey.accept(context):journey.deliver(context);
    if(changed){if(journey.snapshot().ending)onEnding();feedback='';toast(kind==='accept'?'已收下：'+chapter.title:journey.snapshot().state==='reply'?'陆行鸟有一个回应，打开手记把它记下来。':'这一封已送达。');}
    update();
    if(changed){if(journey.snapshot().state==='reply')replyButtons.values().next().value.focus();else if(journey.snapshot().ending)$('postal-title').focus();else if(journey.snapshot().state==='completed')$('postal-continue').focus();else $('letter-quest-guide').focus();}
  });
  $('postal-replay').addEventListener('click',()=>{if(journey.snapshot().state!=='reply')return;if(world.replay(chapters[journey.snapshot().chapter].recipient)){feedback='';update();}});
  $('postal-continue').addEventListener('click',event=>{if(event.detail>1)return;if(journey.continue()){feedback='';update();$('letter-quest-guide').focus();$('letter-quest-text').scrollIntoView({block:'nearest'});}});
  $('letter-quest-reset').addEventListener('click',()=>{journey.requestReset();$('postal-save-tools').open=true;clearInput();update();$('letter-quest-reset-cancel').focus();});
  $('letter-quest-reset-cancel').addEventListener('click',cancelReset);
  $('letter-quest-reset-confirm').addEventListener('click',()=>{const ok=journey.confirmReset();update();if(!ok)return;feedback='';tab='letters';update();$('letter-quest-reset').focus();toast(journey.snapshot().saved?'整段邮路已重新开始，之前旅程已备份，旧版原始进度保留。':'本次邮路已临时重新开始，原存档仍保留。');});
  for(const [id,source] of [['postal-recover-legacy','legacy'],['postal-recover-journey','journey']])$(id).addEventListener('click',()=>{if(journey.requestRecovery(source)){$('postal-save-tools').open=true;clearInput();update();$('postal-recovery-cancel').focus();}else update();});
  $('postal-recovery-cancel').addEventListener('click',()=>{const source=journey.snapshot().recoverySource;cancelConfirmations();update();$('postal-recover-'+source).focus();});
  $('postal-recovery-confirm').addEventListener('click',()=>{const ok=journey.confirmRecovery();update();if(!ok)return;feedback='';tab='letters';update();$('postal-title').focus();toast('旅程已恢复；恢复前的旅程保留在备份里。');});
  $('postal-save-tools').addEventListener('toggle',()=>{if(!$('postal-save-tools').open){cancelConfirmations();update();}});
  events.addEventListener('storage',event=>{if(event.key===JOURNEY_KEY||event.key===null){if(event.key===null)journey.restore();else journey.syncStoredJourney();feedback='';update();}else if([PREVIOUS_JOURNEYS_KEY,LEGACY_BACKUP_KEY].includes(event.key)){journey.refreshBackups();update();}});
  update();
  return {update,show,hide:()=>close(false),cancelConfirmations,isOpen:()=>open,
    handleEscape(){if(journey.snapshot().resetPending||journey.snapshot().recoveryPending){cancelReset();clearInput();return true;}if(!open)return false;close();clearInput();return true;}
  };
}
