import {postalDialogue} from './postal-dialogue.js';
import {royalGreetings,canLeaveRoyalGreeting,royalGreetingReply} from './royal-greetings.js';

export function createNpcConversation({document,world,journey,clearInput,openNotebook,isNotebookOpen=()=>false,royal=false}){
  const $=id=>document.getElementById(id),setText=(id,text)=>{if($(id).textContent!==text)$(id).textContent=text;};
  const names={moogle:'邮差莫古利',mage:'书桌旁的魔导士',chocobo:'树荫边的陆行鸟'};
  let active=null,responseKey=null,greetingChoice=null;
  const greetingButtons=[];
  for(const choice of royalGreetings){
    const button=document.createElement('button');button.type='button';button.textContent=choice.label;button.dataset.greeting=choice.id;
    button.addEventListener('click',event=>{
      if(event.detail>1||isNotebookOpen())return;
      const person=world.nearbyPerson(),snapshot=journey.snapshot();
      if(person?.species!=='moogle'||!canLeaveRoyalGreeting(snapshot,royal)||!world.interaction('moogle').near)return;
      if(greetingChoice===choice.id){update();return;}
      if(!world.replay('moogle'))return;greetingChoice=choice.id;clearInput();update();
    });
    greetingButtons.push(button);$('royal-greeting-options').append(button);
  }
  function hideGreeting(){$('royal-greeting').hidden=true;$('royal-greeting').open=false;}
  function update(){
    if(isNotebookOpen()){active=null;$('moogle-panel').hidden=true;hideGreeting();return null;}
    active=world.nearbyPerson();$('moogle-panel').hidden=!active;
    if(!active){responseKey=null;hideGreeting();return null;}
    const snapshot=journey.snapshot(),dialogue=postalDialogue(active.species,snapshot),context=world.interaction(active.species);
    setText('npc-name',active.name||names[active.species]);setText('moogle-status',context.approaching?'正在走近，请稍候':context.busy?'正在整理邮包':snapshot.ending?'今天的邮路已收工':active.species==='moogle'?'在广场边等信':active.species==='mage'?'把笔暂时放下':'向你歪了歪头');
    setText('npc-response',responseKey===dialogue.key?dialogue.response:dialogue.greeting);
    $('npc-talk').disabled=!context.near||context.busy;setText('npc-talk',active.species==='chocobo'?'看看它的回应':'听一句街坊话');
    $('moogle-letter').disabled=false;setText('moogle-letter','打开委托手记');
    $('npc-preview').href='/'+active.species+'.html';
    const greetingAvailable=canLeaveRoyalGreeting(snapshot,royal);if(!greetingAvailable)greetingChoice=null;
    if(active.species!=='moogle'||!greetingAvailable)hideGreeting();else $('royal-greeting').hidden=false;
    for(const button of greetingButtons)button.disabled=active.species!=='moogle'||!greetingAvailable||!context.near||context.busy;
    const reply=greetingChoice?royalGreetingReply(greetingChoice,snapshot,royal):null;
    $('royal-greeting-feedback').hidden=!reply;setText('royal-greeting-feedback',reply||'');
    return active;
  }
  $('npc-talk').addEventListener('click',()=>{
    if(isNotebookOpen())return;
    const person=world.nearbyPerson();if(!person||!world.replay(person.species))return;
    responseKey=postalDialogue(person.species,journey.snapshot()).key;clearInput();update();
  });
  $('moogle-letter').addEventListener('click',openNotebook);
  return {update};
}
