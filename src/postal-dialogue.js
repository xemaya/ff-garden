const reactions={
  '0:available':{
    moogle:'库啵，邮包里有一封不急的问候。魔导士又把一天埋进书页了，你愿意替我走一趟吗？',
    mage:'这页旧曲抄了很久。等写完这一行……也许我该先看看窗外。',
    chocobo:'陆行鸟在树荫里歪了歪头。它看一眼邮包，又看一眼你。'
  },
  '0:carrying':{
    moogle:'信已经交给你了。书桌旁的魔导士是收件人，小花画在信封角上，别忘了让它看见。',
    mage:'你手里的信画着一朵小花。是寄给我的吗？我可以先把笔放下。',
    chocobo:'它望着信封上的小花，轻轻抖了抖颈边的羽毛。'
  },
  '0:completed':{
    moogle:'它收到了？库啵，原来一句你好也能让人暂时放下笔。',
    mage:'那封问候让我想起，这首小曲是写给走在路上的人。最后一句……陆行鸟也许还记得。',
    chocobo:'魔导士念出旧曲的名字时，它忽然抬起了头。'
  },
  '1:available':{
    moogle:'魔导士有一张纸条要送。我的邮包轻了一点，今天的问候却还在往前走。',
    mage:'纸条准备好了。请替我问问陆行鸟，旧曲最后一句是怎么敲的。',
    chocobo:'它朝书桌的方向看了一眼，嘴边像留着一句没有说完的“啾”。'
  },
  '1:carrying':{
    moogle:'这回是给陆行鸟的纸条。想不起一句曲子，也可以请别人帮忙。',
    mage:'不必替我催它。小谱留了一格空白，就是让记忆慢慢跟上的。',
    chocobo:'陆行鸟认出了纸条，抬起头等你读给它听。'
  },
  '1:reply':{
    moogle:'别急着封回信，先把它的回答听明白，或者读进手记里。',
    mage:'也许答案比我写的谱子简单。先记下来，回来再补进谱子。',
    chocobo:'“啾、啾、啾——。”手记里记着两声短音，最后一声慢慢拖长。'
  },
  '1:completed':{
    moogle:'两短一长找回来了？问候从我这里出发，已经带回一点新故事了。',
    mage:'两短一长……对，是这句。最后的长音给回来的脚步留了位置。谢谢你们。',
    chocobo:'陆行鸟在回信角落留下羽毛印，把折好的纸推近一点。'
  },
  '2:available':{
    moogle:'我还在这里。等回信的时候，看看路上的脚步也很好。',
    mage:'我把谢谢写在小曲旁边了。这次，该让寄信的人也收到一句问候。',
    chocobo:'它朝邮差那边歪了歪头：带着羽毛印的回信，可以出发了。'
  },
  '2:carrying':{
    moogle:'那枚羽毛印我认得。回信绕过书桌和树荫，又走回广场了。',
    mage:'这封回信也记着你的脚步。收工以后，来书桌边坐一会儿吧。',
    chocobo:'陆行鸟看着你把回信带向邮差，安静地收起了翅膀。'
  },
  '2:completed':{
    moogle:'库啵，今天不用再等交接了。小花、羽毛印和三根风铃留在广场的小铃桌，给你记住这一天。',
    mage:'小曲终于抄完了。我把最后一行留得宽一点，写下今天帮我想起它的人。',
    chocobo:'陆行鸟抬起头：“啾、啾、啾——。”像在向今天的邮差道别。'
  }
};
const extra={
  moogle:{id:'royal-gate-message',text:'你读过城门的第二行字了？从前的守门人把“回来”补在“请进”后面。我很喜欢那一笔。'},
  mage:{id:'royal-square-pause',text:'小谱页角只署“当值的人”。这段旧曲最早在城门口响起：两声请进，一声等回来。那格空白，我也想保留。'},
  chocobo:{id:'royal-court-guest',text:'陆行鸟看见你手记里那片空出来的外庭，往旁边挪了挪脖子，好像也给晚来的旅人留了一个位置。'}
};
export function postalDialogue(species,snapshot){
  const line=reactions[snapshot.chapter+':'+snapshot.state]?.[species];if(!line)return null;
  const detail=extra[species];
  return {greeting:line,response:line+(snapshot.discoveries.includes(detail.id)?' '+detail.text:''),key:[species,snapshot.chapter,snapshot.state,snapshot.discoveries.join(',')].join(':')};
}
