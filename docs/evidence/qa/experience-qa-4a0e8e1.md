# 4a0e8e1 首次体验定向QA

检查点：4a0e8e154caa71be2bcd8a71581fce5231101fd3。2026-10-06；独立git archive快照qa-4a0e8e1；现有Chrome扩展CUA；127.0.0.1:5209；1024×768及600×1024。未改开发副本/源码、提交、推送或部署，未安装依赖或新增权限。

## 通过

- 用已授权本地测试旅程重置后关闭手记、重新加载，首次城门副标题为“到喷泉广场，找莫古利接信”；迎客卡说明穿城门沿青瓦主街，或用顶部“看莫古利”。住宅巷作为可选出口，未强制弹出手记。
- 按EXPERIENCE_SCRIPT走一次：阅读邀请→沿主街按W步行→用城门明示的顶部人物按钮找到喷泉邮差→收下问候→魔导士收信回应→节拍纸条→陆行鸟文字“两短一长”→羽毛印回信→邮差结尾→关闭手记与收工对话。全程声音关闭，文字足够继续；未发现导航死路或剧情推进阻碍。回邮差时交信按钮曾短暂禁用，提示正在走近，随后可用。
- 计时：城门起点至首次接信入口69084ms（约1:09）；至回信完成127905ms（约2:08）。包含工具调用/截图，使用顶部人物定位，并非真人计时实验，不能证明脚本3–5分钟估计。六店细查及窄屏QA在计时结束后进行。
- 六块实际店名均在场景门牌显示，1024px近处转向后可辨认：回声旅舍、青瓦邮局、钟匠小屋、晨光面包房、纸页书坊、旅人茶屋。图形店招仍保留。
- 600×1024地图图例完整可见；四路线依次城门、青瓦主街、喷泉、王宫外庭完整呈现。按钮中心elementFromPoint均命中自身，第四项y730.69–774.69；图例y557.69–572.69；面板底790.69，不被底栏遮挡。本次未再运行四条完整步行路线。
- 600px城门石牌实际走近：开手记前hidden=false/display=flex，打开后hidden=true/display=none，关闭后false/flex，DOM/截图均恢复。未触发记录见闻。
- 1024px城门出口卡：开手记前false/flex，打开true/none，关闭false/flex。

## 问题

### 600px城门迎客/出口卡被通用CSS永久隐藏

复现：设置600×1024，Home回城门（x0,z48），关闭手记。#nearby.hidden=false且内容为“听风城门 · 欢迎回来”和住宅巷出口，但computed display=none；打开再关闭手记仍不可见。初次城门卡也使用同一#nearby，按该CSS规则窄屏同样被隐藏（初次600卡未单独重置复现）。

位置：src/style.css:32，窄屏通用 #nearby{display:none!important}。:63仅body.observation-near #nearby:not([hidden])覆盖显示，因此石牌恢复通过，非石牌出口卡仍不显示。顶部住宅巷链接存在，可离开，但新迎客说明在600px不可见。建议原任务决定恢复出口/迎客卡，保留[hidden]优先规则。

### 门牌有前景构件局部遮字，属于可读性改进项

近处可辨认六店名，但木梁常压到首字/中间字；面包房木梁穿过“光”附近，灯杆压到“房”附近；回声旅舍斜向看有吊牌挡首字区域，青瓦邮局也有木构件遮到首字。主街默认远景并非六块都能一次读清，需要转向/靠近。截图保留实际遮挡，不将“六块均显示”扩大为“所有角度清晰”。纸页书坊与茶屋正看字体足够大；近距离抬头时顶部工具栏也可能覆盖牌面，可拖动调整视角。

## 未测

真实iPad Safari/触摸/多指/真机性能、真人完成时间与迷路率、音频听感；600px六店逐块可读性；其他两块石牌开关；四路线实际逐项走完；加载器与历史功能完整回归。

## 清理与证据

server session39257已Ctrl-C停止；lsof5209 exit1，无监听；viewport.reset并关闭测试tab。本次旅程最终completed，无新增见闻；重置前本地旅程备份仍可用。

experience-evidence-4a0e8e1.json包含时间、世界状态、地图矩形/命中与卡片hidden/display。

截图：experience-gate-4a0e8e1.jpg、experience-map600-4a0e8e1.jpg、experience-exit-missing600-4a0e8e1.jpg、experience-stone-hidden600-4a0e8e1.jpg、experience-stone-restored600-4a0e8e1.jpg；六店证据分布在experience-shops-left、experience-shop-postoffice、experience-shop-clock、experience-shop-bakery、experience-shop-books、experience-shop-tea（均后缀-4a0e8e1.jpg）。
