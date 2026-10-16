// 支线「寄给点灯人的信」: the words and the rules. No three.js or DOM here, so
// the state machine and its save can be tested in Node.
export const LAMPLIGHTER_KEY='ff-garden.lamplighter.v1';
export const STEPS=['invite','read','ask','wait','meet','carry','done'];
export const CLUES=['mage','patrol'];
export const TITLE='寄给点灯人的信';

export const SPEAKERS={baker:'面包师',mage:'书桌旁的魔导士',patrol:'巡逻队的魔导士',vivi:'维维',unknown:'小小的黑魔导士'};

export const LETTER={
  to:'致 每天黄昏，点亮第一盏灯的人：',
  body:['我住在城西山坡的风车上。','每天太阳落下去，城里的灯就从城门那头亮起来。一盏，接着一盏，一直亮到王宫门口。我数过，一共八盏。','我磨面粉总要磨到很晚，山坡上黑黑的。可只要看见那一串灯，我就知道回家的路在哪儿。','谢谢你。','如果你愿意，也给我回一点什么吧——什么都好。'],
  from:'风车上的 小麦'
};

export const LINES={
  bakerInvite:[
    {who:'baker',text:'啊，邮差！来得正好，我正想去广场找你们呢。'},
    {who:'baker',text:'今早从城西风车磨坊运来的面粉袋里，夹着这个。'},
    {who:'baker',text:'信封上只写了一行字：“致 每天黄昏，点亮第一盏灯的人”。没有地址，也没有门牌。'},
    {who:'baker',text:'我问了一早上，谁也说不上来。……可你是邮差呀。没有地址的信，也是信吧？'}
  ],
  bakerAfter:[{who:'baker',text:'那封信，找到收信的人了吗？不急，面包会等你，信也会。'}],
  mageClue:[
    {who:'mage',text:'点灯的人？……说起来，我一直以为灯是自己亮的。'},
    {who:'mage',text:'不过每天黄昏，巡逻队收队之前，总会在城门口停一小会儿。'},
    {who:'mage',text:'你去问问他们吧。我得把这一页抄完。'}
  ],
  patrolClue:[
    {who:'patrol',text:'点灯？我们只管巡逻。'},
    {who:'patrol',text:'……不过，队伍里最小的那个，每天都落在最后。问他，他就说要“把回家的路照亮”。'},
    {who:'patrol',text:'黄昏的时候，他总一个人留在城门口。'}
  ],
  mageAgain:[{who:'mage',text:'巡逻队黄昏会在城门停一下。我只知道这么多啦。'}],
  patrolAgain:[{who:'patrol',text:'最小的那个？黄昏去城门口找他吧。'}],
  dusk:[{who:null,text:'太阳落到了城墙后面。街上的灯，一盏也还没亮。'}],
  arrive:[{who:'unknown',text:'今天……也要好好亮起来哦。'}],
  noticed:[{who:'unknown',text:'哇啊！你、你一直坐在那里吗？'}],
  give:[
    {who:'unknown',text:'给……给我的信？'},
    {who:null,text:'他把信读了两遍。帽檐下的两点黄光，一闪，一闪。'},
    {who:'vivi',text:'我叫维维，是巡逻队的见习魔导士。大家的火球都很大，只有我，只放得出这么一点点小火苗。'},
    {who:'vivi',text:'所以我总是落在最后，一盏一盏地把灯点上。这样，走得慢的人，也能找到回家的路。'},
    {who:'vivi',text:'原来有人在看。原来……有人数过。'},
    {who:'vivi',text:'可是我不会写信。邮差，你能帮我把这个带给她吗？'}
  ],
  lantern:[{who:'vivi',text:'去上城西角吧，那是全城最高的地方。挂在观风柱上，风车那边一定看得见。'}],
  hang:[{who:null,text:'提灯挂好了。城西的山坡上，风车黑黑的。'}],
  answer:[{who:null,text:'风车上的灯亮了三下——两短，一长。'}],
  viviAfter:[
    [{who:'vivi',text:'今天，风车那边也亮了。……我看见了哦。'}],
    [{who:'vivi',text:'两短一长，是“谢谢”的意思吧？我猜的。'}],
    [{who:'vivi',text:'明天我还会一盏一盏点灯。慢一点也没关系。'}]
  ]
};

export const CARDS={
  start:{kicker:'支线委托',title:TITLE,subtitle:'没有地址的信，也是信。'},
  end:{kicker:'支线完成',title:TITLE,subtitle:'每一封信，都会有回音。',keepsake:'收进手记：一枚被小火苗烤卷了边的邮戳。'}
};

export const ITEMS={letter:{name:'没有地址的信',text:'信封上写着：致 每天黄昏，点亮第一盏灯的人'},lantern:{name:'装着小火苗的提灯',text:'维维的火苗，小小的，很暖'}};

export function objective(state,{dusk=false}={}){
  switch(state.step){
    case'invite':return{text:'面包房的面包师好像在找邮差',items:[]};
    case'read':return{text:'读一读这封没有地址的信（按 R，或点手中的信）',items:[]};
    case'ask':return{text:'打听：谁会在黄昏点亮第一盏灯？',items:[{text:'问问喷泉边看书的魔导士',done:state.clues.includes('mage')},{text:'拦住巡逻队问一问',done:state.clues.includes('patrol')}]};
    case'wait':return{text:dusk?'天黑了，灯却没亮。到城门石阶上坐一坐':'等到黄昏，到城门石阶上坐一坐',items:[]};
    case'meet':return{text:'把信交给城门口的小黑魔导士',items:[]};
    case'carry':return{text:'把提灯挂到上城西角的观风柱上',items:[]};
    default:return{text:'支线完成。黄昏时，城西的风车也会亮着灯。',items:[]};
  }
}

function decode(raw){
  try{const s=JSON.parse(raw);if(s?.v!==1||!STEPS.includes(s.step)||!Array.isArray(s.clues))return null;return{v:1,step:s.step,clues:CLUES.filter(c=>s.clues.includes(c))};}catch{return null;}
}

export function createLamplighterState(storage=null){
  let state=(()=>{try{return decode(storage?.getItem(LAMPLIGHTER_KEY));}catch{return null;}})()||{v:1,step:'invite',clues:[]};
  const listeners=new Set();
  function save(){try{storage?.setItem(LAMPLIGHTER_KEY,JSON.stringify(state));}catch{}for(const f of listeners)f(snapshot());}
  const at=step=>state.step===step;
  const go=(from,to)=>{if(!at(from))return false;state={...state,step:to};save();return true;};
  function snapshot(){return{step:state.step,clues:[...state.clues],index:STEPS.indexOf(state.step)};}
  return{
    snapshot,onChange(f){listeners.add(f);return()=>listeners.delete(f);},
    reached:step=>STEPS.indexOf(state.step)>=STEPS.indexOf(step),
    accept:()=>go('invite','read'),
    read:()=>go('read','ask'),
    clue(id){if(!at('ask')||!CLUES.includes(id)||state.clues.includes(id))return false;const clues=[...state.clues,id];state={...state,clues,step:CLUES.every(c=>clues.includes(c))?'wait':'ask'};save();return true;},
    lit:()=>go('wait','meet'),
    give:()=>go('meet','carry'),
    hang:()=>go('carry','done'),
    reset(){state={v:1,step:'invite',clues:[]};save();return true;},
    // QA only: jump straight to a step with the clues it implies.
    jump(step){if(!STEPS.includes(step))return false;const i=STEPS.indexOf(step);state={v:1,step,clues:i>STEPS.indexOf('ask')?[...CLUES]:[]};save();return true;}
  };
}
