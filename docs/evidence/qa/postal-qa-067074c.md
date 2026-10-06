# 三封关联委托独立 QA

提交：067074cdc34238a02015078dc11b1be3f71ebf32。
隔离快照：[QA工作目录]。使用 git archive，仅提交中受版本控制的内容；未复制 .git、账号配置或未提交文件。src/main.js SHA256 为 02ccc39ba048f98701006dd6eadbac7554fceb7b8c010ec1ccf4ab23182c7233，与 git show 指定提交一致。已有 node_modules 仅作为依赖链接；无安装。未修改主工作区、源码、提交、push 或部署。

Chrome extension CUA 可用。仅运行快照 Vite 在127.0.0.1:5209，启动前无监听。完成后Ctrl-C停止，端口无监听；视口已reset，QA标签已关闭。

## 结论

未发现阻断。住宅巷从第一章待接信完整走到第三章邮路完成，未切街强制找人；环境声音保持关闭。角色快捷入口用于靠近，交接仍逐次主动操作。

| 核验 | 实际结果 |
| --- | --- |
| 三封因果链 | 问候→魔导士想起旧曲/询问陆行鸟→两短一长→带羽毛印回信→邮差读完与纪念手记。章节转折有明确文字且可完成 |
| 重复动作 | 接问候、交问候、正确答节拍、交最终回信均dblclick；状态仅到各自下一阶段，无跳章/重复纪念/卡死 |
| 错误重答 | 选择三个短音保留reply，错误反馈清楚；再看一次回应成功；刷新reply恢复，靠近后两短一长成功 |
| 距离/加载 | 初始接信与第二章携信时远处交接禁用。reply刷新时真实观察到加载提示、三个答案/重看按钮disabled；加载完成远处仍disabled，靠近后enabled |
| 刷新续接 | 第一章carrying、第二章reply、第三章completed/ending=true分别刷新恢复；saved=true，无storageIssue |
| 地图返回 | 初始pose完整一致：x=0,z=30,y=1.68,yaw=-.04,pitch=.13；定位/返回保持chapter0 available |
| resetcancel | 结局请求重置显示确认，点击取消后chapter2 completed ending=true保留 |
| 600px地图 | 600×1024首次定位无重复toast；信标记、当前目标与01–04四路线完整可见，无之前提示覆盖 |
| console | 最后warn/error读取为空 |

## 自动证据与未测

只运行对应 npm run test:journey 一次：20/20通过，包括旧available/carrying/completed迁移、备份先行、v1保留、新版本优先、拒绝/配额降级、确认恢复、重复转移和地图/加载门槛。未重复全量check/build。

浏览器初始hasLegacyBackup=false，所以不声称实际浏览器迁移旧存档。迁移与存储拒绝/配额属于上述纯逻辑测试证据；当前接口没有支持的存储写入/故障注入。真实iPad、触摸/多指、真实GPU性能未测。王城不在此切片内，也未查看开发中的变化。

## 玩法体验建议（非阻断）

- 三封链条情绪和原因清楚，错误节拍反馈直接给出重读方向，无声也能完成。
- 莫古利快捷靠近后短时间“正向你走来”，卡片仍提示“走近”，按钮禁用；数秒后启用。建议用“邮差正在走近/稍候交接”说明busy，减少已在身边仍以为距离不够的困惑（src/main.js旅程提示与角色busy上下文）。
- 结局文案与纪念形成完整回报。此切片文字引用“补记街角见闻”但尚无见闻页；按设计后续集成时应对齐可用入口，或在最终削减见闻时删掉该指引。

原始状态：postal-evidence.json。截图：postal-map600.jpg、postal-rhythm-far.jpg、postal-ending.jpg。
