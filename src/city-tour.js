// Movement callbacks can advance only part of a request when a resident steps
// into the way. Count actual displacement and leave the waypoint unconsumed.
export function advanceCityTour(state,path,speed,dt,move){
 let remaining=Math.max(0,speed*dt),iterations=0,bearing=null;
 while(remaining>1e-5&&state.cursor<path.length&&iterations++<200){
  const target=path[state.cursor],dx=target.x-state.pose.x,dz=target.z-state.pose.z,d=Math.hypot(dx,dz);
  if(d<.003){state.cursor++;continue;}
  const step=Math.min(d,remaining),x=state.pose.x,z=state.pose.z;
  if(!move(dx/d*step,dz/d*step))return{finished:false,waiting:true,bearing};
  const actual=Math.hypot(state.pose.x-x,state.pose.z-z);state.travelled+=actual;remaining-=actual;bearing=Math.atan2(-dx,-dz);
  if(actual<1e-6||actual<step-.0001)return{finished:false,waiting:true,bearing};
  if(Math.hypot(target.x-state.pose.x,target.z-state.pose.z)<.003)state.cursor++;
 }
 return{finished:state.cursor>=path.length,waiting:false,bearing};
}
