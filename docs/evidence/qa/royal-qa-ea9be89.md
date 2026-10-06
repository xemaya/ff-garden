# 听风王城独立QA — ea9be890

指定提交 ea9be89024f69773708e364d4973f15870707378，git archive隔离快照 /Users/mib/Documents/Codex/2026-10-06/task/royal-ea9be89。仅链接已有node_modules；src/main.js SHA256与提交一致（8941163fbad63b0880f7bfa3aaadd283ac895a01755d5ac7986da088f5e52b99）。未测试开发中的目录，未修改源码/主工作区，未安装/push/部署。

## 需要先修的视觉缺陷

**旧远景草坡侵入新王城外庭。** 从主街与喷泉广场向宫殿看，巨大绿色斜坡覆盖左翼、通门后左侧地面与宫门一部分；地图俯视同样可见城内被山体占据。实际相机仍在平地走入，视觉与通路不符。

复现：/?district=royal，关闭手记，W穿城门沿主街到 x≈2.7,z≈-19.5，继续穿外庭通门到x≈3.47,z≈-38.69。截图 royal-plaza.jpg、royal-court.jpg、royal-map.jpg。

定位：src/main.js:75 的 buildLandscape(royal?false:generated) 为royal选旧非polished山体；src/assets.js:174–175生成中心x最小约25但横向半径可达约49的丘陵，能伸入城域。建议为royal将远景移到边界之外或剔除侵入城域的山体，而非以遮挡掩盖。

没有发现主线/通行阻断；此视觉问题应在最终视觉验收前修复。

## 实际通过

- 1024×768画质优先，用受支持键盘W离散按键实际从z48城外步行到z-58.7188外庭北界；未用漫游/角色快捷跳过这段。城门→青瓦主街→喷泉广场→第二通门→王宫外庭连续可达。
- 北界继续W时z固定-58.7188；城域东边界继续D时x固定22.1284；右城门塔边继续D时x固定4.7380,z约41.49，未穿入塔体。本次抽样检验这些边界/塔体，不声称逐个验证全部21collider。
- 王城三封任务重新从空白完整接取/交接/正确节拍/最终回信到ending=true；使用角色按钮靠近，各交接主动点击。
- 地图有四个王城站点，当前收件人“书桌旁的魔导士 · 收标记”；魔导士附近地图往返保持完全相同pose x=.75,z=-18.8,y=1.68,yaw=0,pitch=-.19739556与carrying。
- 王城→住宅→集市→工坊→王城导航均加载正确街区并保留completed ending；不反复跑旧流程。
- 最终warn/error为空，王城模型pending/failed为空。该提交新增邮差busy提示有效。

## 批判性视觉评价

它有可穿城门、约百米纵深主街、广场、外庭、城墙及宫殿层级，确实是连通的室外城域，不是旧远景换名。近处复用房屋木梁/瓦顶/招牌细节和喷泉角色，使街区有亲切感；城门及宫殿量级足以构成地标。

但王城完成度仍偏早期：六栋房屋之外大片平草地，生活密度明显稀；宫殿正面重复窗片和大平墙，主入口缺台阶/门廊/檐口层次；绿色屋顶与墙塔整体轮廓清楚但还不足以像精修王城。优先移除侵入山体，再补主入口层次与外庭花园/路缘/街灯节奏即可提高质感，无需扩室内或新资产。地图1024×768第四站在面板底部，文字部分裁切，面板overflow:auto；本次未逐站跑导览，主通路已手动覆盖。

## Mac只读性能样本

来自现有#world data-state，未注入执行脚本。renderer.info在composer完整render后统计，包含阴影/后处理pass，不是唯一几何数量。meanFrameMs是180样本的requestAnimationFrame间隔，不是GPU耗时/压力基准。

| 地点 | draw calls | triangles/pass合计 | meanFrameMs |
| --- | ---: | ---: | ---: |
| 城门 | 822 | 3,932,853 | 16.67 |
| 主街 | 816 | 3,931,061 | 16.66 |
| 广场 | 564 | 2,615,605 | 16.66 |
| 外庭 | 431 | 2,057,493 | 16.67 |

当前Mac Chrome这些样本约60Hz，不能推出iPad稳定帧率。旧街刚加载后的瞬时均值住宅38.16ms/工坊27.27ms夹杂加载与采样时机，本次无重复性能矩阵。真实iPad/触摸/GPU未测，无新增性能探针。

原始证据 royal-evidence.json；截图 royal-gate-walk.jpg、royal-mainstreet.jpg、royal-plaza.jpg、royal-court.jpg、royal-map.jpg、royal-target-map.jpg、royal-collision.jpg、royal-ending.jpg。

验收后临时视口已reset，标签已关闭，自己启动的Vite已停止，5209无监听。未重复45logiccheck/build（交接通过，不把交接结果称此次浏览器实测）。
