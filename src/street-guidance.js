const directions=['前方','右前方','右侧','右后方','后方','左后方','左侧','左前方'];
const names={moogle:'邮差',mage:'魔导士',chocobo:'陆行鸟'};
export function targetDirection(player,target){
 if(![player?.x,player?.z,player?.yaw,target?.x,target?.z].every(Number.isFinite))return null;
 const dx=target.x-player.x,dz=target.z-player.z,side=Math.cos(player.yaw)*dx-Math.sin(player.yaw)*dz,forward=-Math.sin(player.yaw)*dx-Math.cos(player.yaw)*dz;
 const index=(Math.round(Math.atan2(side,forward)/(Math.PI/4))+8)%8;
 return {direction:directions[index],meters:Math.max(1,Math.round(Math.hypot(dx,dz)))};
}
// Reuse the existing footer caption, with a fixed two-line budget, rather than another overlay.
export function streetGuidance({snapshot,target,interaction,player,mode='street',notebookOpen=false,width=1024,height=768}){
 if(mode!=='street'||notebookOpen||width<320||height<400||snapshot.ending||snapshot.resetPending||snapshot.recoveryPending)return null;
 if(snapshot.state==='completed')return {kind:'next',text:'这一封已送达\n手记：接下一段委托'};
 if(!target?.exists)return null;
 const name=names[target.species]||'收件人';
 if(!target.loaded)return {kind:'loading',text:name+(target.failed?'暂未加载':'正在加载')+'\n可先在地图看位置'};
 if(interaction.near){
  const action=interaction.busy?'稍候，正在整理邮包':snapshot.state==='reply'?'手记：记下节拍回应':snapshot.state==='available'?'手记：接取委托':'手记：交出信件';
  return {kind:'near',text:name+'就在身边\n'+action};
 }
 if(interaction.approaching)return {kind:'approaching',text:'邮差正在走近\n停下等它到身边'};
 const bearing=targetDirection(player,target.position);if(!bearing)return null;
 const narrow=width<=600,heading=narrow?bearing.direction.replace(/方|侧/g,'')+'·'+name+'·约'+bearing.meters+'米':name+' '+bearing.direction+' 约'+bearing.meters+'米';
 return {kind:'direction',text:heading+'\n'+(narrow?'直线估计·沿路绕行':'直线估计 · 沿路绕行')};
}
