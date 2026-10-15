export const ROYAL_CAST=Object.freeze({
 steiner:{name:'Steiner · 斯坦纳',height:2.19,r:.47,x:-2.1,z:-49,facing:.15,description:'王城阶前，铠甲里的守护者。',signature:'向王城致意'},
 zidane:{name:'Zidane · 吉坦',height:1.85,r:.36,x:-3.3,z:-17,facing:.6,description:'金发、尾巴，还有一点轻快的冒险心。',signature:'轻快地打个招呼'},
 garnet:{name:'Garnet · 嘉妮特',height:1.78,r:.35,x:-5.5,z:-26.6,facing:1.0,description:'穿着旅行服，走进城里的日常。',signature:'安静地向你致意'}
});
export function addRoyalColliders(plan){return{...plan,colliders:[...plan.colliders,...Object.entries(ROYAL_CAST).map(([id,p])=>({id:'royal-'+id,type:'circle',x:p.x,z:p.z,r:p.r}))]};}
