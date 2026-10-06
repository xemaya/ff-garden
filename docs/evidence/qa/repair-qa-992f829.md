# 992f829针对性独立QA

提交992f82927e7e1d378e9576ebca8f8e99d052a6d2；git archive隔离至 /Users/mib/Documents/Codex/2026-10-06/task/royal-992f829，只链接已核实node_modules，不安装。src/main.js提交/快照SHA256均a9dd93bc9133317f6e9752f239a2f3edafc73e2bd30ce375acfeb9dd0b89ae26。未改主工作区/源码/push/部署。Chrome extension CUA，只运行127.0.0.1:5209。

## 结果

没有新增阻断。

- **旧山体侵入已修复**：主街、广场到外庭看宫殿，左翼/门前不再被绿色斜坡覆盖。外庭有连续平地，门廊、檐口、窗框和门环实际可见；上一版报告的缺陷关闭。宫门层次显著改善。主街园圃树木、长凳、路缘也改善空地感，仍有大片对称草地，但属于美术密度选择，不是错误。
- **三处石牌**：城门x-4.7,z38，广场x-8.6,z-20.2，外庭x7.1,z-51，实际通过走近/转向点击记录，每处出现对应故事与纪念文本。记录后重读集合不增加，最终仅3个不同ID，主线一直保持chapter2 completed ending=true；未重跑三封信。
- **门槛**：城门近处背对，以及外庭石牌在侧方时均显示“转身看看石牌”disabled；转向后“停下来看看”enabled。离城门去广场远处没有可点击观察入口，集合仍1条。这里核验的是背对/太远；未声称测了所有俯仰、遮挡或真触摸条件。
- **600×1024**：观察卡、移动按钮、footer和手记各可用；首次记录后的见闻页/委托页无操作遮挡。长见闻内容在卡片内滚动，不盖footer；截图repair-notebook600.jpg、repair-task600.jpg、repair-observe600.jpg。
- **地图四路线**：600×1024四条均完整可见；1024×768第四路线完整在y563.69–594.69，面板底614.69，无上一版底部裁切，也无重复toast覆盖。未逐条触发导览，路线可见性为截图/DOM几何证据。
- **备份/恢复**：完成且3见闻→确认重置→chapter0 available空见闻（上一完成旅程备份可用）→请求恢复/取消仍空白→确认恢复chapter2 completed+3→再次恢复上次备份撤销到空白→再次恢复回完成+3→刷新仍恢复该状态。确认文案逐次说明章节、阶段、见闻数；所有记录saved=true，显示质量保持画质优先。
- 最终console warn/error为空。测试结束Vite已Ctrl-C停止，5209无监听，视口reset，测试标签关闭。

## 未测范围

备份最大3条的上限、存储配额/拒绝、unknown version保护及跨页并发检查未做浏览器注入（当前接口无支持的存储写入/故障注入）。此次恢复链只涉及两个实际不同旅程状态，不把它说成3条上限验证。交接的58逻辑check/build通过属于开发证据，未再次重复跑。真实iPad、触摸/多指、GPU性能未测。主工作区并行内容未验收。

原始状态 repair-evidence.json。视觉截图 repair-entry.jpg、repair-mainstreet.jpg、repair-plaza.jpg、repair-palace-front.jpg、repair-court.jpg；600布局与恢复 repair-observe600.jpg、repair-notebook600.jpg、repair-task600.jpg、repair-restored600.jpg；地图 repair-map600.jpg、repair-map1024.jpg。
