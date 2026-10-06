import {chapters,ending} from './postal-content.js';

export function postalView(snapshot,target,interaction,mode){
  const chapter=chapters[snapshot.chapter],confirming=snapshot.resetPending||snapshot.recoveryPending;
  const stage={available:'接取委托',carrying:'送往收件人',reply:'记下回应',completed:snapshot.ending?'邮路完成':'这一封已送达'}[snapshot.state];
  let body=snapshot.state==='available'?chapter.invitation:snapshot.state==='carrying'?chapter.letter:snapshot.state==='reply'?chapter.received+' '+chapter.replyPrompt:chapter.received+' '+chapter.next;
  if(snapshot.ending)body+=' '+ending.text;
  let hint;
  if(confirming)hint='正在确认是否重新开始；取消会保留整段旅程。';
  else if(snapshot.state==='completed')hint=snapshot.ending?'一日邮差手记已完成。你可以继续散步。':'点击“接下一段委托”，看看这封信带来的下一步。';
  else if(!target?.exists)hint='当前街区没有对应人物，请换到三条街道之一。';
  else if(!target.loaded)hint=target.failed?target.name+'暂时加载失败。重试角色前，可以先在地图查看位置。':target.name+'正在加载。请先看看信的内容，加载完成后才能交接。';
  else if(mode!=='street')hint=mode==='transition'?'视角切换中，请稍候。':'返回街道后走近目标人物，再继续这段委托。';
  else if(interaction.approaching)hint='邮差正在走近，请稍候；停下来等它到你身边。';
  else if(!interaction.near)hint='下一步：走近'+target.name+'。地图只标出位置，不会替你交接信。';
  else if(interaction.busy)hint='邮差正在整理邮包，请等它空出手。';
  else hint=snapshot.state==='reply'?'读一下陆行鸟的文字回应，再选择你记下的节拍。':'你已在'+target.name+'身边，可以'+(snapshot.state==='available'?'接取委托。':'交出信件。');
  return {
    title:chapter.title,step:'委托 '+(snapshot.chapter+1)+' / '+chapters.length+' · '+stage,body,hint,
    objective:target?'当前目标：'+target.name:'',
    actionLabel:snapshot.state==='available'?chapter.acceptLabel:chapter.deliverLabel,
    showAction:['available','carrying'].includes(snapshot.state)&&!confirming,
    canAct:!confirming&&!!target?.exists&&!!target?.loaded&&interaction.actorReady&&interaction.near&&interaction.streetMode&&!interaction.busy,
    showReplies:snapshot.state==='reply'&&!confirming,
    showContinue:snapshot.state==='completed'&&!snapshot.ending&&!confirming,
    canLocate:!confirming&&!!target?.exists,
    mapLabel:target?'当前目标：'+target.name+' · '+(snapshot.state==='available'?'信':'收')+'标记':snapshot.ending?'邮路已完成，可以自由散步。':'这一封已送达，回手记接下一段委托。'
  };
}
