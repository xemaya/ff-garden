# 六小时开发 · 最终交付封存

基线远端main：59cf85b8243bdce5b2185bb0cef935de425b3b83。产品行为冻结于2837269；独立Chrome实际验收取自同一产品的e0fc7e6。最终检查前候选bdeb812，检查后只整理文档/报告/日志，产品未扩充或重构。本文件与日志随最终main提交封存，完整SHA以包含它们的提交为准。

## 最终本地结果

- npm run check退出0：**125项测试全部通过**，分组资源34、输入6、旧委托6、指引10、旅程57、王城12；verify、verify:v4、verify:cast及三角色GLB校验全部退出0。[原始check](evidence/final-check.txt)。
- npm run build退出0：正式四入口构建成功，914ms。现有超过500KB共享包提示仍保留，不是失败。[原始build](evidence/final-build.txt)。
- package-lock.json、依赖、vite.config.js与CI配置相对基线未变；源码/布局/入口/package相对实际验收产品e0fc7e6未变。未加入截图、原始浏览器JSON、私密信息、node_modules、dist或缓存；报告本机目录和临时标识已省略。
- 最终check和build只执行这一轮，未发现需修复的产品失败。GitHub既有CI只校验/构建/上传产物，没有自动部署；最终正常push及远端/CI实测结果在交付回复中报告。本封存文档不提前宣称远端更新或CI成功。

## 实际浏览器证据

1200×782正常入口与三角色展示、阅读停步、手记→地图→路线、关闭手记保持暂停并主动继续通过；隐藏人物卡时重置/恢复到无城门见闻，旧留言反馈清空；近距三木钟/茶具和桌牌可辨。末次正常游戏交接三封信完成，chapter2/completed/ending/saved为真、目标null，收起手记后方向结束；桌牌与三铃/小花/信纸羽毛同屏可辨，在该实际近景无互挡。具体范围及未测声明保留于[同一冻结报告](evidence/qa/frozen-e0fc7e6-partial.md)，没有重复追加新报告。

历史600px迎客/出口、石牌/地图和NPC互斥有相应快照实证；**最新600px方位/触控、真实blur/缩放、长时持键、浏览器JSON/角色取消或失败恢复仍未测**。6项启动故障单元测试不代替真实故障注入。真实iPad、音频听感、真人时间/迷路率、慢网和GPU长期压力未验证。没有把不同快照或单视角性能数字合成最终全覆盖。[验收矩阵](ACCEPTANCE_MATRIX.md)。

## 最终构建体积（实际UTF-8文件字节）

| 类别 | 最终字节 |
| --- | ---: |
| 全部dist | 88,053,156 |
| JS合计 | 870,287 |
| CSS合计 | 21,783 |
| 全部PNG/GLB | 87,121,289 |

全部PNG/GLB包括基线历史/非活跃资产，不能视为首页实际传输；五张表面PNG和三个活跃GLB仍为45,241,842原始字节，无新增下载资产。相较本轮早期已有dist总计+12,834字节（JS+10,181/CSS+1,975）；该产物基线不假定对应某个精确提交。

| bundle | 字节 | gzip字节 |
| --- | ---: | ---: |
| `RoomEnvironment-BGomz7rB.css` | 2,759 | 1,189 |
| `RoomEnvironment-DDUpUvWJ.js` | 20,767 | 5,091 |
| `chocobo-CL-saJ9a.js` | 4,235 | 2,140 |
| `fantasy-BO04Qb4e.css` | 793 | 410 |
| `fantasy-d_nEpEzk.js` | 695,284 | 185,144 |
| `mage-BTN95Jy5.js` | 4,240 | 2,132 |
| `moogle-Cb3vGRkT.js` | 4,259 | 2,140 |
| `street-BMhgP_XF.js` | 141,502 | 56,798 |
| `street-DPPO8MwN.css` | 18,231 | 4,499 |

## 发布范围与回退

本轮只按授权正常更新xemaya/ff-garden main，不force、不部署、不触碰其他项目；生产仍保留此前版本。后续若另行部署才做线上版本/缓存、JSON/PNG/GLB路径、四入口/旧街链接、实际origin下迁移/刷新、声音默认关闭和结尾纪念检查。恢复与旧版软件回退边界见[更新说明](RELEASE_NOTES.md)，现有部署/回滚脚本没有运行。
