# 8cf0e326合并独立QA

提交8cf0e326308684e2d945da1d26fab4005e41db5b；git archive隔离 /Users/mib/Documents/Codex/2026-10-06/task/royal-8cf0e32。src/main.js SHA256与提交一致17fc8cbda962a507069302ddbde5b23ce9c56e2e5b45cdba6a908571001184d3，仅链接已有node_modules。未改源码/主工作区/push/部署。Chrome extension CUA，localhost127.0.0.1:5209专用测试。

## 需修：1024×768 NPC卡与手记按钮重叠

同时打开NPC卡和手记，并展开“保存与恢复/怎么开始与走动”，NPC的“听一句街坊话”在手记后面。实际点击该可访问DOM按钮会命中手记的地图定位，进入地图；下一次类似状态读取其中心命中postal-recover-journey，即恢复备份按钮。虽未误推进主线，也不会直接绕过恢复确认，但用户会执行另一个操作。

复现：1024×768，接近莫古利/魔导士→打开委托手记→展开保存/帮助→点击NPC对话按钮。截图final-overlap1024.jpg。NPC按钮rect x764–852,y550–594；中心elementFromPoint返回postal-recover-journey。原因是src/style.css #letter-quest-panel高z-index右侧自222px向下，而#moogle-panel也是右侧底部卡，NPC可访问树仍暴露其按钮。建议手记打开时隐藏NPC卡，或使用并排/互斥布局，避免显示后方可点按钮；不要仅降低前景z-index导致反向遮挡。

## 通过及实际证据

- 默认/进入王城；显式住宅/集市/工坊仍对应旧街；未知district=qa-unknown回王城。旧入口sample+study仍样板；moogle/mage/chocobo独立展示页正常，莫古利展示页“去街上”仍工坊；无district的?moogle=1仍住宅巷而非新默认。
- 三NPC完成阶段均主动回应，文字有角色差异，章节/见闻/纪念不改变。另抽样莫古利available和陆行鸟reply回应不推进；覆盖这些关键阶段，不声称30组合逐一浏览器测试。需关闭手记避免上述遮挡。
- 600×1024 NPC卡和帮助可见；帮助summary点击获得SUMMARY焦点，文字包含移动、Home/M/Esc、声音默认关闭、见闻非强制。未注入held Enter事件，长按Enter的repeat阻止属代码/交接自动测试证据。
- 快速地图开→关，x=.75,z=-18.8,yaw=0,pitch=-.19739556保持；y从尚未稳定1.6366自然回1.68，不将相机高度收敛称地图位移缺陷。未被锚定到入口。
- 纪念从重置后的空桌到实际结束后的花、羽毛与风铃。data-state始终parts=24、keepsakeBatches=4，仅completed=false→true。浏览器能证明可见性/统计一致；没有内存分配探针，不能据此单独声称零重建。
- 音频状态：完成存档首次加载enabled=false/state=not-created/count0；实际结尾前主动开启enabled=true/running/count0；最后交接dblclick后立即静音得到enabled=false/suspended/count1；后续画面更新仍count1；reload后completed=true但not-created/count0。这验证仅实际完成调度一次，不声称听到了实际音效。pending节点取消未暴露DOM，仅suspended与源码cancelPostalChime路径证据，不声称听音/波形验证。
- 最终warn/error为空。为实际完成铃声必要交接走了一次最短流程，没有重复旧负面矩阵/山体/三石牌全路径，也未重复77test/check/build。

## 可玩性观感

NPC短回应让交接之间有生活感，回信写给玩家的感谢与铃桌形成较完整回报。铃桌近看花和羽毛清楚，但侧视时三根风铃重叠很细，玩家要绕到正面才能读出两短一长；可考虑完成时提示“广场小铃桌已留下纪念”并更清楚指向位置，当前莫古利结局回应已提供文字指引。

## 未测与清理

真实iPad/触摸/多指/音频听感、全部10阶段×3NPC组合、跨页存档冲突故障注入与长按Enter硬件repeat未实测。交接77tests/check/build通过未再次重复。此次结束localhost保存completed、0新见闻（原3见闻保存在旅程备份），声音关闭；旧线上不动。Vite已Ctrl-C停止、5209无监听，视口reset，QA标签已关闭。

证据final-evidence.json；截图final-overlap1024.jpg、final-help600.jpg、final-npc600.jpg、final-memorial-before.jpg、final-memorial-after.jpg、final-memorial-restored.jpg。final-memorial-front.jpg实际镜头不含铃桌，不用于纪念验收证据。
