# 6ed8a33 定向浏览器复验

2026-10-06；Chrome 扩展 CUA；独立 git archive 快照；localhost 127.0.0.1:5209。

## 结果

- 1024×768、600×1024：靠近书桌旁魔导士，打开委托手记并展开保存/恢复和帮助，NPC卡隐藏（hidden=true、computed display=none），可访问树不再呈现NPC按钮。此前双卡覆盖和误触问题已关闭。
- 两个尺寸均实际操作确认对话与Esc：先取消确认，手记保留；再关闭手记，NPC卡恢复，document.activeElement.id=letter-quest-open。1024测试重置取消，600测试恢复备份取消。截图和现场DOM确认最终状态。
- 旅程维持chapter=2/state=completed/discoveries=[]，没有确认重置/恢复，没有重跑三封信。
- 正常PNG纹理显示木材、墙面、青瓦/陶瓦与路面；hero.failedTextures=[]，五种generatedMaterials均有记录。见正常纹理截图。

## 精确限制

NPC按钮原生disabled仍为false；不能宣称HTML disabled属性通过。隐藏使它们无法通过普通可见UI点击，源码另有isNotebookOpen动作守卫。若验收标准要求显式disabled=true，仍需实现调整；功能遮挡缺陷已消除。

world.dataset.state由渲染帧更新，600px的即时Esc记录落后一帧：600-esc-recovery-cancel仍见recoveryPending=true，下一条已为false；600-esc-close的questOpen仍为true，后续正常纹理记录为false。以操作后DOM、焦点和截图确认界面结果，不将即时状态字段当成同步结果。

浏览器仅提供viewport和pageAssets能力，没有请求拦截。5PNG并发、16×16失败回退、失败重试刷新共享克隆未做浏览器故障注入；已有单元测试结果由开发任务提供，此次未重跑。没有安装依赖、启用权限或开放调试端口。结果为桌面浏览器尺寸模拟，不代表真实iPad性能。

## 清理与证据

服务session[临时标识省略]已Ctrl-C退出；lsof5209无监听（exit1）；viewport.reset已执行；browser.tabs.list=[]。未改源码、提交、push或部署。

- overlay-evidence.json：DOM读取的world状态、NPC隐藏属性、焦点记录。
- overlay-fixed1024.jpg / overlay-fixed600.jpg：手记展开，NPC隐藏。
- overlay-npc-restored1024.jpg / overlay-npc-restored600.jpg：关闭后NPC恢复。
- overlay-textures-normal.jpg：正常纹理画面。
