# 发布前静态审查与拟发布文件清单

范围：相对远端59cf85b的全部拟提交内容；产品行为冻结在2837269，新独立QA测的是包含同一产品的e0fc7e6。此记录只做静态审查/文档整理，没有重新测试、构建、push、部署或改变产品逻辑。最终执行结果见[封存记录](FINAL_DELIVERY.md)，远端核对/CI仍以实际交付结果为准。

## 发现与处理

- 未发现新增凭据、私钥或provider token；扫描仅报告位置/类别，不输出疑似值。代码和新增文件没有用户聊天、账号资料、浏览器存档导出或真实用户数据。测试里的阶段/错误/备份均是合成夹具。模式扫描与人工路径检查不能充当完整秘密扫描保证。
- 新增运行时代码无本机绝对目录依赖、远程调试标志、debugger或浏览器控制入口。报告归档中有本机绝对工作目录与临时浏览器/服务标识，现统一省略；原始报告的提交、测量、结果/限制保留。没有把隔离快照、node_modules链接、PNG截图或大JSON telemetry导出加入Git。
- 保留基线已有的console.error失败日志和canvas.dataset.state只读诊断，新增的是已实现旅程/纪念/地图的状态字段，不包含原始保存字符串、受保护未来数据或凭据；没有新增console.log/debug打印、window调试控制函数或eval。不能把已有诊断存在说成零调试数据。
- package-lock.json与依赖版本未变。17个新增*.test.mjs都被六个test:*组覆盖，六组均由check执行；辅助asset-test-support.mjs由测试导入，不作为单独测试入口。后续8项新增测试已接入，最终125项聚合与正式build通过，见封存记录。
- 无新增运行时下载资产，public新增只有手工royal-city.json。新增txt是有意归档的中期check/build原始记录，新增md是说明和QA文本；未发现临时中间件、生成垃圾、缓存、测试快照、额外二进制或绝对软链接。
- 部署脚本/workflow未改变，npm deploy确实调用publish.py；默认先check/build再要求干净Git，--skip-build只接受已检查产物，CI只构建上传、不部署。部署README把含混的“六组校验”改为“全部自动测试与布局/角色校验”，与现有脚本一致；本轮没有执行发布、SSH、DNS或回滚。既有部署主机约定是基线内容，不是本轮新增凭据。

## 当前浏览器实证与待验证

同一冻结产品原生1200×782已验证阅读停步、地图路线、关闭后保持暂停/主动继续、四入口正常加载；续验已关闭手记隐藏时重置/恢复到无城门见闻清空旧留言、木钟/茶具近距辨识、桌牌五字可读及目标提示/按钮/说明卡无交叠。

仍未测600px新提示/触控、真正失焦/缩放、长时间持键、JSON及角色取消/失败的浏览器恢复。故障恢复仅有6项单元证据；底栏对比偏淡未被QA判为阻断。真实iPad/音频听感/慢网/GPU压力仍是边界。详情只更新同一[矩阵](ACCEPTANCE_MATRIX.md)和[冻结报告](evidence/qa/frozen-e0fc7e6-partial.md)，不复制重复文档。

最终候选为包含封存文档/原始日志的干净HEAD，完整SHA和远端/CI结果由最终交付回复报告。产品没有为静态审查重构。已知未修复可复现阻断仍为0；验收未覆盖项不冒称通过。

## 相对基线新增文件

共69个新增文件（含本审查与最终封存）：源码/样式23、测试/辅助18、文档/报告27、布局数据1。以下清单不包含修改已有文件，也不意味着修改仓库可见性。

### 源码与样式

- `src/asset-transport.js`
- `src/hero-textures.js`
- `src/npc-conversation.js`
- `src/observation-markers.js`
- `src/postal-chime.js`
- `src/postal-content.js`
- `src/postal-controller.js`
- `src/postal-dialogue.js`
- `src/postal-journey.js`
- `src/postal-memorial.js`
- `src/postal-observations.js`
- `src/postal-view.js`
- `src/postal-world.js`
- `src/royal-city.js`
- `src/royal-greetings.js`
- `src/royal-layout.js`
- `src/royal-shop-displays.js`
- `src/startup-feedback.css`
- `src/startup-feedback.js`
- `src/startup-loading.js`
- `src/street-guidance.js`
- `src/street-selection.js`
- `src/view-transitions.js`

### 布局数据

- `public/data/royal-city.json`

### 测试与辅助

- `tools/asset-deadlines.test.mjs`
- `tools/asset-test-support.mjs`
- `tools/asset-transport.test.mjs`
- `tools/hero-textures.test.mjs`
- `tools/postal-dialogue.test.mjs`
- `tools/postal-entry-sound.test.mjs`
- `tools/postal-integration.test.mjs`
- `tools/postal-journey.test.mjs`
- `tools/postal-observations.test.mjs`
- `tools/postal-recovery.test.mjs`
- `tools/postal-sync.test.mjs`
- `tools/royal-greetings.test.mjs`
- `tools/royal-layout.test.mjs`
- `tools/royal-story-displays.test.mjs`
- `tools/royal-wayfinding.test.mjs`
- `tools/startup-loading.test.mjs`
- `tools/street-guidance.test.mjs`
- `tools/view-transitions.test.mjs`

### 文档与审计证据

- `docs/ACCEPTANCE_MATRIX.md`
- `docs/ASSET_LOADING_REQUIREMENTS.md`
- `docs/EXPERIENCE_SCRIPT.md`
- `docs/INTEGRATION_MILESTONE.md`
- `docs/PERFORMANCE_RELIABILITY_AUDIT.md`
- `docs/PLAYABILITY_REVIEW.md`
- `docs/POSTAL_PLAYER_GUIDE.md`
- `docs/PRE_RELEASE_REVIEW.md`
- `docs/RELEASE_NOTES.md`
- `docs/ROYAL_VISUAL_POLISH.md`
- `docs/STARTUP_RECOVERY.md`
- `docs/evidence/midpoint-build.txt`
- `docs/evidence/midpoint-check.txt`
- `docs/evidence/qa/README.md`
- `docs/evidence/qa/experience-qa-4a0e8e1.md`
- `docs/evidence/qa/final-qa-8cf0e32.md`
- `docs/evidence/qa/frozen-e0fc7e6-partial.md`
- `docs/evidence/qa/loader-qa-0d0fbd5.md`
- `docs/evidence/qa/overlay-qa-6ed8a33.md`
- `docs/evidence/qa/postal-qa-067074c.md`
- `docs/evidence/qa/repair-qa-992f829.md`
- `docs/evidence/qa/revision-qa-1bca670.md`
- `docs/evidence/qa/royal-qa-ea9be89.md`
- `docs/postal-journey-design.md`

- `docs/FINAL_DELIVERY.md`
- `docs/evidence/final-check.txt`
- `docs/evidence/final-build.txt`
