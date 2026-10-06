export const THEATER_REVISION='tantalus-theater-v1';
export function makeTheaterStage(){return{
 revision:THEATER_REVISION,
 booth:{x:-6.30,z:-18.70,rotation:.55},
 poster:{x:-3.75,z:-18.85,rotation:.30},
 camera:{x:-1.1,y:1.95,z:-16.6,target:{x:-5.3,y:1.65,z:-18.55}},
 counterView:{x:-4.92,z:-17.15},
 ship:{x:7,y:23,z:-38,rotation:-.18,scale:1.25}
};}
export function theaterColliders(stage){return[
 {id:'theater-booth',type:'box',...stage.booth,w:2.40,d:2.00},
 {id:'theater-poster',type:'box',...stage.poster,w:1.35,d:.85}
];}
