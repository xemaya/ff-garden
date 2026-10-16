// Camera support follows a continuous ramp; the rendered/collision stairs stay stepped.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function cityCameraHeight(x,z){
  return 1.45*smooth((-38-z)/2)+1.45*smooth((-51-z)/2);
}
export function followCameraHeight(current,target,dt){
  return current+(target-current)*(-Math.expm1(-12*Math.max(0,dt)));
}
