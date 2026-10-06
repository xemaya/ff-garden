import {discoveries} from './postal-content.js';

// Observation locations are physical stops, independent of story progression.
export function observationSites(plan,district){
  return discoveries.filter(entry=>entry.district===district&&entry.position).map(entry=>({...entry,position:{...entry.position}}));
}
export function attachObservationSites(plan,sites){
  for(const entry of sites)plan.colliders.push({id:'observation-'+entry.id,type:'box',x:entry.position.x,z:entry.position.z,w:1.4,d:.6});
  return plan;
}
export function observationView(sites,player,mode,recorded){
  const nearest=sites.map(entry=>({entry,distance:Math.hypot(entry.position.x-player.x,entry.position.z-player.z)})).sort((a,b)=>a.distance-b.distance)[0];
  if(!nearest||nearest.distance>3.1||mode!=='street')return null;
  const {entry,distance}=nearest,dx=entry.position.x-player.x,dz=entry.position.z-player.z;
  const facing=distance<.65||(-Math.sin(player.yaw||0)*dx-Math.cos(player.yaw||0)*dz)/distance>.35;
  return {entry,near:true,facing,recorded:recorded.includes(entry.id),canObserve:facing};
}
export function observationSummary(snapshot){
  const entries=discoveries.filter(entry=>snapshot.discoveries.includes(entry.id));
  return {entries,text:entries.length?'你记下了'+entries.length+'处旅途细节。它们留在手记里，邮路已经完整。':'邮路已经完整。听风王城的城门、喷泉与外庭还有一些可以走近观察的细节。'};
}
