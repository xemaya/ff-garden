export const renderProfiles={quality:{pixelRatio:1.5,shadowSize:2048,ao:true},smooth:{pixelRatio:1,shadowSize:1024,ao:false}};
export function readPreference(storage,key,fallback){try{return storage.getItem(key)||fallback;}catch{return fallback;}}
export function writePreference(storage,key,value){try{storage.setItem(key,value);return true;}catch{return false;}}
