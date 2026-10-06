// A small spoken response to an existing discovery, not another saved quest.
export const royalGreetings=[
  {id:'return',label:'欢迎回来',response:'莫古利：那就把“欢迎回来”留在问候的第一行。青瓦邮局替旅人保管信，回声旅舍替他们留灯。城门下面那行小字，也是在等一个人回来。库啵。'},
  {id:'slow',label:'慢一点也没关系',response:'莫古利：钟匠小屋修好钟，却不催着谁走。旅人茶屋也给等回信的人留一张小桌。你这句话，适合夹在纸页书坊抄的旧曲里。'},
  {id:'seat',label:'这里有你的座位',response:'莫古利：这句话，我想念给第一次进城的人听。回声旅舍的窗灯、晨光面包房的第一炉，都在说“你也有位置”。'}
];
export const canLeaveRoyalGreeting=(snapshot,royal)=>royal&&snapshot.discoveries.includes('royal-gate-message');
export function royalGreetingReply(id,snapshot,royal){
  if(!canLeaveRoyalGreeting(snapshot,royal))return null;
  const choice=royalGreetings.find(entry=>entry.id===id);if(!choice)return null;
  const detail=id==='slow'?(snapshot.discoveries.includes('royal-square-pause')?'你看过小谱留的空白，知道那一拍为什么不用敲满。':'喷泉旁的小谱，也给走得慢的人留了一拍。'):id==='seat'?(snapshot.discoveries.includes('royal-court-guest')?'外庭那块石牌不用填姓名，也给你留着歇脚的位置。':'有空去王宫外庭看看，来客石牌没有名单。'):'';
  return '你说：“'+choice.label+'。”\n'+choice.response+(detail?' '+detail:'');
}
