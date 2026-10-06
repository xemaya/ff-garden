# 1bca670 有限视觉复验

检查点1bca6706c41795fcb35f47aaf0e19dfda0821f5e，独立git archive快照；现有Chrome extension CUA；127.0.0.1:5209。2026-10-06。

## 通过

- 600×1024首次入口：用已授权本地测试旅程重置为chapter0/available。副标题与迎客说明可见，#nearby hidden=false/display=flex；卡片x359–584/y729–909，出口链接x404–570/y851–895，高44px。位于触控移动按钮右侧，出口elementFromPoint命中district-link。开手记后卡隐藏，关闭恢复flex。此前600px通用CSS永久隐藏的问题关闭。未点击出口执行跳转。
- 六家门牌在1024×768从主街合理距离转向后可辨认：回声旅舍、青瓦邮局、钟匠小屋、晨光面包房、纸页书坊、旅人茶屋；牌面位于装饰前，未再见原先木梁/吊牌/灯杆穿过店名字面的遮挡。近距离需适当抬头/转向，顶部UI仍可能盖到牌面，这是视角限制，不能保证所有距离角度无遮挡。面包房补充截图从x1.29,z15.68朝店面看，全名完整可读。
- 实际走近城门留言、点击停下来看看，新增royal-gate-message见闻。主线chapter0/stateavailable保持。
- 邮差出现可展开“给来客留一句话”；600px三个按钮欢迎回来/慢一点也没关系/这里有你的座位实际逐个点击，均显示对应不同回复。展开卡在右侧，末按钮仍在底栏上方，未与左侧移动按钮相交。
- 所有选择后chapter0/stateavailable/discoveries=[royal-gate-message]，未接信、推进章节或完成主线。
- 打开委托手记后NPC与三回应整卡hidden=true/display=none，手记独占；关闭后NPC恢复hidden=false/display=block，回应区收起，重新展开和选择仍可用。

## 问题与限制

未发现本次范围内新的阻断问题。重置完成后的短暂toast覆盖迎客卡标题部分；toast消失后无遮挡，最终截图记录稳定界面。门牌在非常近处可超出视口或被顶部UI覆盖，需要调整视角；未承诺任意视角可读。

未测：真实iPad/触摸/多指；600px逐家门牌；其他显示尺寸；出口实际导航；回应跨刷新持久化；未读城门留言时的隐藏前置条件；完整回信、加载器、历史功能回归。

## 清理

本地测试旅程最终chapter0/available，只有城门见闻；重置前已完成旅程由内置恢复备份保留。服务session96723已Ctrl-C退出；lsof5209 exit1，无监听；viewport.reset，browser.tabs.list=[]。没有更改开发副本、源码、提交、推送、部署、依赖或权限。

证据：revision-evidence-1bca670.json；revision-gate600-1bca670.jpg；revision-greeting600-1bca670.jpg；revision-greeting-selected600-1bca670.jpg；revision-shop-{inn,postoffice,clock,bakery,books,tea}-1bca670.jpg。
