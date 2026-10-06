# 合并版独立 Chromium 浏览器验收

候选基础58c9f26，验收后仅调整售票亭总览和600px船首两处相机；下列最终检查与截图均基于这两处修复后的正式构建。

用户明确批准后，在项目以外的独立测试目录安装官方npm playwright **1.63.0** 与配套 Chromium **153.0.8010.12**。使用隔离非持久化上下文，1200×800和600×800，deviceScaleFactor 1、减少动画；只向本地5218预览写入测试进度。未改项目依赖或日常浏览器设置。官方方法参考：https://playwright.dev/docs/library 与 https://playwright.dev/docs/browsers。

实际完成17项正常入口/交互检查、5项注入失败恢复检查，并正常交接全部三封信、记录结尾和走完整条王城外庭导览。没有pageerror。截图逐张人工查看；不是仅检查DOM存在。

- 售票亭、石牌、回信小铃桌独立可辨；通过键盘实际步行到柜台和纪念桌。完成后三铃、小花、信纸羽毛与剧场在对应实际视角无重叠穿插。
- 桌面/600px手记遮挡时人物卡和剧场卡隐藏；阅读持W不移动；从手记按看剧场关闭手记；地图与人物切换正常。
- 剧场600px船首完整，双模式、关闭动画、戏票/海报弹窗及关闭正常。独立页回工坊、再去王城并刷新仍保留正常接取的信件。旧街、样板、三角色页和ship深链接正常。
- 本地隔离路由人为失败：街道/剧场SVG失败仍可游览并可重试；必需JSON失败提供重新载入，挂起JSON可以停止等待再恢复；角色GLB失败不阻断街道且可重试。未在生产环境注入故障。
- 完整旅程以真实点击依次接取、交付、选择两短一长完成；未注入完成状态。结尾ending、保存为真，目标为空，方向回到“此刻，走到这里”；王城导览实际结束于外庭。

边界：此为隔离Chromium的新headless模式真实页面渲染，不代表真实iPad/Safari、多点触控、音频听感或长期GPU/慢网压力测试。没有用截图宣称所有角度无穿插。

测试脚本与原始JSON、截图保留在工作区的 `browser-qa/`（与项目并列），项目仅保存本摘要、日志和截图校验值。

| 截图 | SHA-256 |
| --- | --- |
| `final-royal-theater-desktop.jpg` | `356fc9693834d5d9f22bec067d73e08756027eb87acbf67345d3c6dc67656b0c` |
| `final-royal-theater-600.jpg` | `231920c1123409a84eb530bf92a1f7b2e2a60161f522868a15b841d55dec5541` |
| `final-notebook-600.jpg` | `561a0b9414716af82b1b74db9719d175c23cf04a4d2167943eb15b4e83895ae6` |
| `final-counter-walk.jpg` | `9a81c64b1a3db0486ec35b1f5f10c1896a3a03497f155cee96d1ee8ed2eef6c8` |
| `final-keepsake-table-near.jpg` | `8e9eeeff8c7bf6ad577087c01aaf71704daad9691d320cdc294b34235e6b2d52` |
| `final-completed-memorial.jpg` | `f206f69aa095659b1887875eff4d7d2d2796c0cc0c0a965620ab37cebb925615` |
| `final-royal-courtyard.jpg` | `6578ab0f4aff772be3cad723c1ff7ae28144eccbe2123dcd36d8bdebce774cb2` |
| `final-theater-ship-600.jpg` | `9f074d6545d314777283da50613d32a3ddd80dcb0574429c24d257e3f44ff764` |
| `final-ticket-600.jpg` | `459a6fdda49659215eb9d598509c81d0c5f6cd9494271e6ece9442148819bd18` |
| `final-poster-600.jpg` | `b66deb55ce2a797668bb72688641a6f2b6c423990e6c9c25c7fbcc7e0f305c6e` |
| `fault-street-paper-fallback.jpg` | `e402474668a38b10f4bd88377085b7aa80f3d41bc99ce2438a2d1dcad5a687ef` |
| `fault-required-json-recovery.jpg` | `9297d9a50f498e95949fd6c3923e5674d2f7a3aa822e23a5b4b83a258a975438` |
