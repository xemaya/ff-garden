import {chapters,ending} from './postal-content.js';
import {JOURNEY_KEY} from './postal-journey.js';
import {postalView} from './postal-view.js';

// Own the notebook UI; world rendering, navigation and storage rules stay outside.
export function createPostalController({document,events,journey,world,toast,openMap,returnToStreet,clearInput}){
  const $=id=>document.getElementById(id),setText=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};
  let open=journey.snapshot().state!=='available'||journey.snapshot().chapter>0,feedback='';
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
    $('letter-quest-panel').hidden=!open;$('letter-quest-open').setAttribute('aria-expanded',String(open));
    setText('postal-title',model.title);setText('letter-quest-step',model.step);setText('letter-quest-text',model.body);
    setText('postal-objective',model.objective);$('postal-objective').hidden=!target;
    setText('letter-quest-hint',model.hint);setText('postal-feedback',feedback);$('postal-feedback').hidden=!feedback;
    $('letter-quest-save').hidden=snapshot.saved;
    setText('letter-quest-save',snapshot.storageIssue==='unreadable'?'原存档无法读取或来自更高版本，已保留原数据；本次旅程不覆盖它，刷新后不能恢复本次进度。':'本地保存暂不可用；本次仍能继续，但刷新后可能无法恢复。旧版数据不会被删除。');
    $('letter-quest-action').hidden=!model.showAction;$('letter-quest-action').disabled=!model.canAct;setText('letter-quest-action',model.actionLabel);
    $('letter-quest-guide').hidden=snapshot.state==='completed'||snapshot.resetPending;$('letter-quest-guide').disabled=!model.canLocate;setText('letter-quest-guide','在地图上找目标');
    $('postal-replies').hidden=!model.showReplies;for(const button of replyButtons.values())button.disabled=!model.canAct;
    $('postal-replay').hidden=!model.showReplies;$('postal-replay').disabled=!model.canAct;
    $('postal-continue').hidden=!model.showContinue;
    $('postal-ending').hidden=!snapshot.ending;setText('postal-remembrance',ending.remembrance);
    $('letter-quest-reset').hidden=snapshot.resetPending;$('letter-quest-reset-confirmation').hidden=!snapshot.resetPending;
    setText('map-quest-target',model.mapLabel+(target&&!target.loaded?'（位置参考，角色尚未加载）':''));
    return target;
  }
  function cancelConfirmations(){journey.cancelReset();journey.cancelRecovery();}
  function cancelReset(){cancelConfirmations();update();if(open&&world.view().mode==='street')$('letter-quest-reset').focus();}
  function show(){returnToStreet();open=true;update();}
  $('letter-quest-open').addEventListener('click',()=>{const fromMap=world.view().mode!=='street';returnToStreet();open=fromMap?true:!open;if(!open)cancelConfirmations();update();});
  $('letter-quest-close').addEventListener('click',()=>{cancelConfirmations();open=false;update();$('letter-quest-open').focus();});
  $('letter-quest-guide').addEventListener('click',()=>{const snapshot=journey.snapshot(),target=world.currentTarget(snapshot);if(!target?.exists||snapshot.resetPending)return;openMap();update();});
  $('letter-quest-action').addEventListener('keydown',event=>{if(event.repeat&&['Enter','Space'].includes(event.code))event.preventDefault();});
  $('letter-quest-action').addEventListener('click',event=>{
    if(event.detail>1)return;
    const snapshot=journey.snapshot(),chapter=chapters[snapshot.chapter],target=world.currentTarget(snapshot),kind=snapshot.state==='available'?'accept':'deliver';
    const species=kind==='accept'?chapter.sender:chapter.recipient,context=world.interaction(species);
    if(!postalView(snapshot,target,context,world.view().mode).canAct||!['available','carrying'].includes(snapshot.state))return;
    if(!world.handoff(kind,species))return;
    const changed=kind==='accept'?journey.accept(context):journey.deliver(context);
    if(changed){feedback='';toast(kind==='accept'?'已收下：'+chapter.title:journey.snapshot().state==='reply'?'陆行鸟有一个回应，打开手记把它记下来。':'这一封已送达。');}
    update();
    if(changed){if(journey.snapshot().state==='reply')replyButtons.values().next().value.focus();else if(journey.snapshot().ending)$('postal-title').focus();else if(journey.snapshot().state==='completed')$('postal-continue').focus();else $('letter-quest-guide').focus();}
  });
  $('postal-replay').addEventListener('click',()=>{if(journey.snapshot().state!=='reply')return;if(world.replay(chapters[journey.snapshot().chapter].recipient)){feedback='';update();}});
  $('postal-continue').addEventListener('click',event=>{if(event.detail>1)return;if(journey.continue()){feedback='';update();$('letter-quest-guide').focus();$('letter-quest-text').scrollIntoView({block:'nearest'});}});
  $('letter-quest-reset').addEventListener('click',()=>{journey.requestReset();clearInput();update();$('letter-quest-reset-cancel').focus();});
  $('letter-quest-reset-cancel').addEventListener('click',cancelReset);
  $('letter-quest-reset-confirm').addEventListener('click',()=>{if(!journey.confirmReset())return;feedback='';update();$('letter-quest-reset').focus();toast(journey.snapshot().saved?'整段邮路已重新开始，旧版原始进度与显示偏好保留。':'本次邮路已重新开始，但未能保存。');});
  events.addEventListener('storage',event=>{if(event.key===JOURNEY_KEY||event.key===null){journey.restore();feedback='';update();}});
  update();
  return {update,show,cancelConfirmations,isOpen:()=>open,
    handleEscape(){if(!journey.snapshot().resetPending&&!journey.snapshot().recoveryPending)return false;cancelReset();clearInput();return true;}
  };
}
