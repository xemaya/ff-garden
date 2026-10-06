// Guidance describes the existing quest; it never changes progress or position.
export function questTargetName(species,person){
  const place=person?.z>17?'入口旁':'广场边';
  if(species==='moogle')return person?.label?person.label+' · 邮差莫古利':place+'的邮差莫古利';
  return person?.label||place+'的魔导士';
}
export function questGuidance({state,resetPending=false,targetName='',targetExists=false,loaded=false,failed=false,near=false,busy=false,mode='street'}){
  if(state==='completed')return {step:'3 / 3 · 已送达',next:'送信完成，魔导士已收到问候。',hint:'可以继续逛街；重新开始需要确认。',canAct:false,canLocate:false,mapLabel:'送信已完成'};
  const accepting=state==='available',step=accepting?'1 / 3 · 向邮差接信':'2 / 3 · 给魔导士送信';
  const next=accepting?'下一步：走近'+targetName+'，接取送信委托。':'下一步：走近'+targetName+'，交出问候信。';
  let hint;
  if(resetPending)hint='正在确认是否重新开始；取消会保留当前进度。';
  else if(!targetExists)hint='当前街道没有对应人物，请换到三条街道之一。';
  else if(!loaded)hint=failed?targetName+'加载失败；可用上方“重试角色”，地图位置仍可查看。':targetName+'正在加载；先查看地图位置，加载完成后才能交接信。';
  else if(mode!=='street')hint=mode==='transition'?'视角切换中，请稍候再交接信。':'先返回街道，再走近目标人物交接信。';
  else if(!near)hint='先用地图上的标记找到目标，再走近人物；也可用上方角色按钮查看它。';
  else if(accepting&&busy)hint='邮差正在递信，请稍候再接取委托。';
  else hint=accepting?'已到邮差身边，点击“接取送信委托”。':'已到收件人身边，点击“交出问候信”。';
  return {step,next,hint,canAct:!resetPending&&targetExists&&loaded&&near&&mode==='street'&&(!accepting||!busy),canLocate:!resetPending&&targetExists,mapLabel:'当前目标：'+targetName+' · '+(accepting?'信':'收')+'标记'};
}
