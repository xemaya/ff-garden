import {postalDialogue} from './postal-dialogue.js';

export function createNpcConversation({document,world,journey,clearInput,openNotebook}){
  const $=id=>document.getElementById(id),setText=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};
  const names={moogle:'邮差莫古利',mage:'书桌旁的魔导士',chocobo:'树荫边的陆行鸟'};
  let active=null,responseKey=null;
  function update(){
    active=world.nearbyPerson();$('moogle-panel').hidden=!active;
    if(!active){responseKey=null;return null;}
    const snapshot=journey.snapshot(),dialogue=postalDialogue(active.species,snapshot),context=world.interaction(active.species);
    setText('npc-name',active.name||names[active.species]);setText('moogle-status',context.approaching?'正在走近，请稍候':context.busy?'正在整理邮包':snapshot.ending?'今天的邮路已收工':active.species==='moogle'?'在广场边等信':active.species==='mage'?'把笔暂时放下':'向你歪了歪头');
    setText('npc-response',responseKey===dialogue.key?dialogue.response:dialogue.greeting);
    $('npc-talk').disabled=!context.near||context.busy;setText('npc-talk',active.species==='chocobo'?'看看它的回应':'听一句街坊话');
    $('moogle-letter').disabled=false;setText('moogle-letter','打开委托手记');
    $('npc-preview').href='/'+active.species+'.html';
    return active;
  }
  $('npc-talk').addEventListener('click',()=>{
    const person=world.nearbyPerson();if(!person||!world.replay(person.species))return;
    responseKey=postalDialogue(person.species,journey.snapshot()).key;clearInput();update();
  });
  $('moogle-letter').addEventListener('click',openNotebook);
  return {update};
}
