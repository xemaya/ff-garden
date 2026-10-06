// Keep keyboard and individual fingers independent, including duplicate keys.
export function createMovementInput(){
  const keyboard=new Set(),pointers=new Map();
  return {keyboard,
    press:(id,key)=>pointers.set(id,key),
    release:id=>pointers.delete(id),
    has:key=>keyboard.has(key)||[...pointers.values()].includes(key),
    clear(){keyboard.clear();pointers.clear();},
    get pointerCount(){return pointers.size;}
  };
}

export function createLookInput(threshold=8){
  let active=null;
  return {
    start(id,x,y){if(active)return false;active={id,x,y,startX:x,startY:y,moved:false};return true;},
    move(id,x,y){if(!active||active.id!==id)return null;const delta={x:x-active.x,y:y-active.y};active.moved ||= Math.hypot(x-active.startX,y-active.startY)>threshold;active.x=x;active.y=y;return delta;},
    end(id,cancelled=false){if(!active||active.id!==id)return null;const result={tap:!cancelled&&!active.moved,x:active.x,y:active.y};active=null;return result;},
    clear(){active=null;}
  };
}
