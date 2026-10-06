export const THEATER_REVISION='tantalus-theater-v1';
// Keep the postal keepsake table and its approach clear; the booth sits west of it.
export function makeTheaterStage(){return{
 revision:THEATER_REVISION,
 booth:{x:-10.00,z:-24.00,rotation:.55},
 poster:{x:-10.20,z:-26.50,rotation:.30},
 camera:{x:-7.5,y:1.95,z:-19.6,target:{x:-10,y:1.65,z:-24}},
 counterView:{x:-8.5,z:-22.6},
 ship:{x:7,y:23,z:-38,rotation:-.18,scale:1.25}
};}
export function theaterColliders(stage){return[
 {id:'theater-booth',type:'box',...stage.booth,w:2.40,d:2.00},
 {id:'theater-poster',type:'box',...stage.poster,w:1.35,d:.85}
];}

export function theaterPanelVisible({stage,player,focused=false,mode='street',notebookOpen=false,npcVisible=false}){
 return !!stage&&mode==='street'&&!notebookOpen&&!npcVisible&&(focused||Math.hypot(stage.booth.x-player.x,stage.booth.z-player.z)<4.8);
}
