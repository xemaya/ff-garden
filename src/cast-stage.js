// Authored neighborhood staging, separate from the 4B building recipes.
// Reuses accepted character GLBs and existing material library.
export const CAST_STAGE_VERSION='fountain-neighbors-v2';
export function makeCastStage(){return{
 id:CAST_STAGE_VERSION,
 camera:{x:-.6,y:2.05,z:-14.8,target:{x:-.35,y:.92,z:-23.15}},
 people:[
  {x:-4.45,z:-21.85,species:'moogle',facing:.62,r:.36,role:'postal',label:'花车旁的邮差'},
  {x:5.2,z:-23.2,species:'chocobo',facing:-.62,r:.65,role:'stable',label:'树荫边的陆行鸟'},
  {x:.75,z:-21.5,species:'mage',facing:-.18,r:.38,role:'reading',label:'书桌旁的魔导士',view:{x:.75,y:1.42,z:-18.8}}
 ],
 benches:[{x:-7.8,z:-25.3,rotation:1.38},{x:4.5,z:-25.8,rotation:-1.25}],
 props:[
  {id:'cast-postbox',kind:'postBox',x:-5.8,z:-22.4,r:.45,rotation:.48,seed:713},
  {id:'cast-flowercart',kind:'flowerCart',x:-6.8,z:-23.4,r:.69,rotation:.3,seed:719},
  {id:'cast-booktable',kind:'bookTable',x:1.55,z:-22.0,r:.38,rotation:-.2,seed:727},
  {id:'cast-trough',kind:'feedTrough',x:5.85,z:-22.1,r:.60,rotation:.25,seed:733},
  {id:'cast-rail',kind:'hitchRail',x:6.45,z:-23.3,w:1.6,d:.28,rotation:Math.PI/2,seed:739}
 ]
};}
