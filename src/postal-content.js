export const chapters=[
  {
    id:'greeting',title:'一封问候',sender:'moogle',recipient:'mage',
    invitation:'邮差莫古利：听风城门今天也敞开着。能借用一下你的脚步吗？这封问候一直躺在邮包底。魔导士总说“等写完这一页”，我想让它先收到一句你好。',
    letter:'一封没有催促的问候。信封上画着一朵小花，提醒收件人抬头看看窗外。',
    received:'魔导士：原来不是什么急事……只是有人记得我。谢谢。我正在抄一首听风王城的旧风铃小曲，最后一句的节拍怎么也想不起来。陆行鸟似乎听过它。',
    next:'魔导士有一张想请陆行鸟看看的纸条。准备好后，接下一段委托。',
    acceptLabel:'收下问候信',deliverLabel:'把问候交给魔导士'
  },
  {
    id:'rhythm',title:'记得的节拍',sender:'mage',recipient:'chocobo',
    invitation:'魔导士：请把这张纸条带给陆行鸟。我只记得，那不是整齐的一串敲击，中间留了一点等待。你不必催它，听懂之后替我记下来就好。',
    letter:'纸条：旧风铃的最后一句是什么节拍？请用短音和长音告诉送信的人。',
    received:'陆行鸟轻点了两下脚，接着把脖子伸得长长的：“啾、啾——啾。”两次轻短的声音，最后一个慢慢拖长。它又做了一遍，等你把节拍记进回信。',
    replyPrompt:'你在回信上记下了哪一种节拍？不需要打开声音，按文字和动作判断即可。',
    options:[{id:'short-short-long',label:'两短一长'},{id:'long-short-short',label:'一长两短'},{id:'three-short',label:'三个短音'}],
    correctAnswer:'short-short-long',
    wrongAnswer:'陆行鸟摇摇头，又轻点两下脚，最后把声音拖长。纸条还在，请再读一遍它的回应。',
    replySuccess:'陆行鸟开心地抖了抖羽毛。你把“两短一长”记在回信上，它又在信角留下了一枚小小的羽毛印。',
    next:'这次轮到陆行鸟寄信：把大家一起想起的节拍带回莫古利。',
    acceptLabel:'收下节拍纸条',deliverLabel:'把纸条读给陆行鸟'
  },
  {
    id:'return',title:'回到寄信人',sender:'chocobo',recipient:'moogle',
    invitation:'陆行鸟把折好的回信推到你面前，朝邮差的方向歪了歪头。信里有节拍，有羽毛印，还有魔导士没来得及写的那句“谢谢”。',
    letter:'这封回信并不急。它记着两声轻敲和一个长音，也记着三个人愿意为彼此停下来的片刻。',
    received:'莫古利：两短一长，库啵！原来你们把这句找回来了。问候从这里出发，又带着新的故事回到这里。今天的邮路可以收工了，这张一日邮差手记送给你。',
    next:'主线完成。你可以继续散步、补记街角见闻，或者把这一页留在这里。',
    acceptLabel:'收下带羽毛印的回信',deliverLabel:'把回信交回莫古利'
  }
];

export const discoveries=[
  {id:'residential-window',street:'residential',stop:'garden',title:'窗台上的问候',
    prompt:'窗台边有一张压在花盆下的小纸片。停下来看看。',
    text:'“今天也替隔壁浇一下花。”字写得很小，没有署名。你想起邮差说的问候：有时不是一封信，只是有人顺手照顾了一点你没看见的生活。',
    keepsake:'手记里画下了一片窗台花叶。'},
  {id:'market-notice',street:'market',stop:'garden',title:'没有催促的约定',
    prompt:'市集街角留着一张手写告示，边缘被风卷起来。',
    text:'告示写着：“等最后一盏灯点亮，再一起听风铃。”下面有人补了一句：“来晚的人也有位置。”你没有把它当作必须赶上的时间表，只记住这条街给迟到的人留了空间。',
    keepsake:'手记里拓下一小块告示的边框。'},
  {id:'workshops-chime',street:'workshops',stop:'garden',title:'留给风的一拍',
    prompt:'工坊街角有一张画着风铃的小样稿，旁边写着一句备注。',
    text:'备注是：“不要把每一拍都填满。”你沿着图纸空出来的地方看了一会儿。木匠给风留了位置，就像一封信给回信留了位置。你把这一点空白也记在手记里。',
    keepsake:'手记里收下一枚画出来的风铃印。'}
];

export const ending={title:'今天的邮路，到这里',
  text:'你送出去的第一封信只是问候，带回来的最后一封信却装着三个人一起记起的小曲。没有人催促，也没有哪一步需要跑起来。愿你记得，这条街总有一封信在等一个愿意走近的人。',
  remembrance:'一日邮差纪念：一朵小花、一枚羽毛印，和两短一长的风铃节拍。'};
